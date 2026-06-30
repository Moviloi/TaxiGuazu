import { getChatSession, upsertChatSession, resetChatSession } from "@/lib/db/database";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { parseRouteFromText } from "@/lib/services/extraction/regex-extractor";
import { buildGenericClarify, buildCancellationMessage } from "@/lib/ai/response-builder";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult as ExtractionSchemaResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { assertCoreRouterPolicy } from "@/lib/ai/guard";
import { isAffirmativeMessage, isNegativeMessage, isCorrectionMessage } from "@/lib/ai/patterns";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import type { CoreDecision, ConfidenceMap } from "@/lib/ai/types";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { calculateSlotConfidence } from "@/lib/services/extraction/confidence";
import { buildConfidenceMap } from "@/lib/services/extraction/confidence-map";
import { loadContext, mergeContext } from "@/lib/services/memory/context-memory";
import { detectLeadLang } from "@/lib/detect-lang";
import { formatConfidenceNote } from "@/lib/services/extraction/format-confidence-note";
import { loadPreviousSlots, loadPreviousSlotStates } from "@/lib/services/workflow/load-previous-slots";
import { buildSlotStates, type SlotStateEntry } from "@/lib/ai/slot-state";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { log } from "@/lib/utils/logger";
import { parseSessionSlots } from "@/lib/services/shared/session-helpers";
import { sendAndPersist } from "@/lib/services/shared/message-helpers";

interface FallbackExtractionResult {
  pricing: PricingResult;
  confidenceResult: ExtractionSchemaResult;
  workflowResult: SlotConversationalContext;
  extractionNote: string;
}

async function tryFallbackExtraction(
  text: string,
  phone: string,
  prevConfidence: ExtractionSchemaResult | undefined,
  prevSlotStates: Record<string, SlotStateEntry> | null,
  hasCorrection: boolean,
  hasAffirmation: boolean,
  prevSlotValues: Record<string, string>,
): Promise<FallbackExtractionResult | null> {
  try {
    log.info("[EXTRACTION] Intentando fallback regex...");
    const parsed = parseRouteFromText(text);
    let originMatch = parsed.origin;
    let destMatch = parsed.destination;

    if (!originMatch) {
      const session = await getChatSession(phone);
      if (session?.slots) {
        const slots = parseSessionSlots(session.slots);
        if (slots.origin) originMatch = slots.origin as string;
      }
    }

    if (originMatch && destMatch) {
      log.info(`[EXTRACTION] Fallback: origin="${originMatch}" dest="${destMatch}"`);
      const ft = (await resolvePricingForSlots({ origin: originMatch, destination: destMatch, passengers: 1 })).pricingResult;
      if (ft.final_price > 0) {
        const slots: Record<string, { value: string | number; score: number; reason: string }> = {};
        if (prevConfidence) {
          Object.assign(slots, prevConfidence.slots);
        }
        slots.origin = { value: ft.origin.canonical_name ?? originMatch, score: 1.0, reason: "regex_fallback" };
        slots.destination = { value: ft.destination.canonical_name ?? destMatch, score: 1.0, reason: "regex_fallback" };
        slots.price = { value: ft.final_price, score: 1.0, reason: "backend_tariff_match" };
        const fbConfidence: ExtractionSchemaResult = {
          slots,
          overall_confidence: 1.0,
          action: "proceed",
        };
        const fbWorkflow = await evaluateWorkflowTransition(phone, {
          slots: fbConfidence.slots as Record<string, any>,
          overall_confidence: 1.0,
          action: "proceed",
        });
        const fbExtractionNote = [
          `Confianza general: 100%. Estado: collecting_slots.`,
          `Origen: "${originMatch}" → ${ft.origin.canonical_name} (Confianza: 100%)`,
          `Destino: "${destMatch}" → ${ft.destination.canonical_name} (Confianza: 100%)`,
          `PRECIO OFICIAL (calculado por backend): $${ft.final_price} ARS (precio hasta 4 pasajeros).`,
          `VALOR_PRECIO: ${ft.final_price}`,
          `Ruta oficial: ${ft.origin.canonical_name} → ${ft.destination.canonical_name}.`,
          `NO calcules ni modifiques este precio. Usá SOLO los valores oficiales del backend.`,
        ].join('\n');
        log.info("[EXTRACTION] Fallback exitoso, extractionNote generado con VALOR_PRECIO:", ft.final_price);
        const fbSlotStates = buildSlotStates(
          fbConfidence.slots,
          prevSlotStates,
          hasCorrection,
          hasAffirmation,
          prevSlotValues,
        );
        for (const [k, entry] of Object.entries(fbSlotStates)) {
          const existing = fbConfidence.slots[k] as any;
          if (existing) {
            existing.source = entry.source;
            existing.status = entry.status;
          }
        }
        return { pricing: ft, confidenceResult: fbConfidence, workflowResult: fbWorkflow, extractionNote: fbExtractionNote };
      }
      log.info("[EXTRACTION] Fallback: tariff no encontrado");
    } else {
      log.info("[EXTRACTION] Fallback: no se pudo extraer origin/dest del texto ni de session. textLen:", text.length, "originMatch:", originMatch, "destMatch:", destMatch);
    }
    return null;
  } catch (e) {
    log.error("[EXTRACTION] Fallback error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}

export interface ExtractionResult {
  extractionNote?: string;
  workflowResult?: SlotConversationalContext;
  parsed?: { success: true; data: TripExtraction } | { success: false; error: any };
  confidenceResult?: ExtractionSchemaResult;
  pricing?: PricingResult;
  prevSlotsEarly: Record<string, string>;
}

export async function runExtractionPipeline(
  phone: string,
  text: string,
  conversationId: number,
  leadCore: CoreDecision,
  history: any[],
  customerName: string | null,
): Promise<ExtractionResult | null> {
  let extractionNote: string | undefined;
  let workflowResult: SlotConversationalContext | undefined;
  let parsed: { success: true; data: TripExtraction } | { success: false; error: any } | undefined;
  let confidenceResult: ExtractionSchemaResult | undefined;
  let pricing: PricingResult | undefined;
  const coreDecisionEarly = leadCore;
  let prevSlotsEarly: Record<string, string> = {};
  let prevSlotStates: Record<string, SlotStateEntry> | null = null;
  let hasAffirmation = false;
  let hasCorrection = false;
  try {
    log.info("[EXTRACTION] Iniciando extraction, textLen:", text.length);
    const extractionGuard = assertCoreRouterPolicy();
    if (extractionGuard !== true) {
      log.info("[BLOCKED] generateGroqExtraction", extractionGuard);
      return null;
    }
    const [prevSlotsEarlyResult, prevSlotStatesResult, ctxMemory] = await Promise.all([
      loadPreviousSlots(phone),
      loadPreviousSlotStates(phone),
      loadContext(phone),
    ]);
    prevSlotsEarly = prevSlotsEarlyResult;
    prevSlotStates = prevSlotStatesResult;
    log.info("[CONTEXT] cargado:", { origin: ctxMemory.origin, destination: ctxMemory.destination, intent: ctxMemory.intent });
    log.info("[TRACE EXTRACTION START]", {
      roleLock: coreDecisionEarly?.roleLock,
      slotStability: coreDecisionEarly?.slotStability,
      prevSlots: prevSlotsEarly,
    });
    let raw = await extractSlots(text, history, customerName || undefined, {
      roleLock: coreDecisionEarly.roleLock,
      slotStability: coreDecisionEarly.slotStability,
      prevSlots: prevSlotsEarly,
    });
    log.info("[TRACE EXTRACTION RESULT]", {
      success: raw != null,
      raw: raw ? JSON.stringify(raw).substring(0, 200) : null,
    });

    const domain = mapIntentToDomain(leadCore.intent);
    const convState = await getConversationalState(phone);

    // FASE 18.2: Location confirmation — when core detects affirmation + existing ambiguous slots
    hasAffirmation = leadCore.facts?.some(f => f.startsWith("affirmation:"))
      || isAffirmativeMessage(text);
    const hasPrevSlotsLocation = prevSlotsEarly?.origin && prevSlotsEarly?.destination;
    // FASE 20.4: Correction detection — user correcting a previously extracted slot
    hasCorrection = isCorrectionMessage(text);

    if (convState === "awaiting_passenger") {
      log.info("[COMPLETENESS] awaiting_passenger: skipping completeness");
    } else if (convState === "awaiting_confirmation" && isAffirmativeMessage(text)) {
      log.info("[COMPLETENESS] awaiting_confirmation + affirmation: skipping completeness");
    } else if (hasAffirmation && hasPrevSlotsLocation && convState !== "awaiting_confirmation" && convState !== "idle") {
      // User confirmed previously ambiguous location — promote existing slots
      log.info("[CONFIRMATION_STATE] affirmation + existing slots, promoting previous slots");
      log.info("[CONFIRMATION_DETECTED]", {
        text: text.substring(0, 80),
        prevOrigin: String(prevSlotsEarly.origin).substring(0, 40),
        prevDest: String(prevSlotsEarly.destination).substring(0, 40),
        convState,
      });
      if (!raw) {
        const promoted = {
          origin: String(prevSlotsEarly.origin),
          destination: String(prevSlotsEarly.destination),
          ...(prevSlotsEarly.passengers ? { passengers: Number(prevSlotsEarly.passengers) } : {}),
          ...(prevSlotsEarly.scheduled_at ? { scheduled_at: prevSlotsEarly.scheduled_at } : {}),
          ...(prevSlotsEarly.flight ? { flight: prevSlotsEarly.flight } : {}),
        };
        raw = promoted as any;
        log.info("[CONFIRMATION_RESULT] promoted prevSlots to current extraction:", {
          origin: promoted.origin,
          destination: promoted.destination,
        });
      } else {
        const rawEmpty = Object.keys(raw!).filter(k => raw![k] != null && String(raw![k]).trim() !== "").length === 0;
        if (rawEmpty) {
          raw = {
          origin: String(prevSlotsEarly.origin),
          destination: String(prevSlotsEarly.destination),
          ...(prevSlotsEarly.passengers ? { passengers: Number(prevSlotsEarly.passengers) } : {}),
          ...(prevSlotsEarly.scheduled_at ? { scheduled_at: prevSlotsEarly.scheduled_at } : {}),
          ...(prevSlotsEarly.flight ? { flight: prevSlotsEarly.flight } : {}),
        } as any;
        log.info("[CONFIRMATION_RESULT] promoted prevSlots to current extraction:", {
          origin: String(prevSlotsEarly.origin),
          destination: String(prevSlotsEarly.destination),
        });
      }
      }
    } else if (convState === "awaiting_confirmation" && isNegativeMessage(text)) {
      const hasNewData = raw != null && Object.keys(raw!).some(k => raw![k] != null && String(raw![k]).trim() !== "");
      if (hasNewData) {
        log.info("[CONFIRMATION] negative with new slot data — treating as correction, not cancellation");
        const completeness = evaluateCompleteness(raw!, domain);
        if (completeness.status === "ASK") {
          const msg = buildGenericClarify(completeness.field!, detectLeadLang(text));
          log.info("[COMPLETENESS] bloqueado", { field: completeness.field });
          await sendAndPersist(phone, conversationId, msg);
          return null;
        }
      } else {
        log.info("[CONFIRMATION] negative response, cancelling confirmation");
        const lang = detectLeadLang(text);
        const cancelMsg = buildCancellationMessage(lang);
        await sendAndPersist(phone, conversationId, cancelMsg);
        await setConversationalState(phone, "idle");
        await resetChatSession(phone);
        return null;
      }
    } else {
      // Si raw es null, usar roleLock del core + prevSlots como fallback
      // para determinar qué campo falta preguntar
      const effectiveSlots = raw ?? {
        origin: coreDecisionEarly.roleLock.origin ?? prevSlotsEarly?.origin ?? null,
        destination: coreDecisionEarly.roleLock.destination ?? prevSlotsEarly?.destination ?? null,
      };
      const completeness = evaluateCompleteness(effectiveSlots, domain);
      if (completeness.status === "ASK") {
        // FASE 22.1: bypass para afirmaciones y correcciones
        if (
          (hasAffirmation || hasCorrection) &&
          hasPrevSlotsLocation &&
          convState !== "idle"
        ) {
          log.info("[COMPLETENESS_BYPASS]", {
            reason: hasCorrection ? "user_correction" : "user_confirmation",
            previousState: convState,
          });
        } else {
          const msg = buildGenericClarify(completeness.field!, detectLeadLang(text));
          log.info("[COMPLETENESS] bloqueado", { field: completeness.field });
          await sendAndPersist(phone, conversationId, msg);
          return null;
        }
      }
    }

    if (raw) {
      log.info("[EXTRACTION] Groq response:", JSON.stringify(raw).substring(0, 120));
      parsed = TripExtractionSchema.safeParse(raw);
      if (parsed.success) {
        log.info("[EXTRACTION] Parse exitoso, calculando confidence...");
        confidenceResult = await calculateSlotConfidence(parsed.data, text);

        if (parsed.data.origin && parsed.data.destination) {
          const pax = parsed.data.passengers || 1;
          log.info(`[EXTRACTION] Calculando precio: origin="${parsed.data.origin}" dest="${parsed.data.destination}" pax=${pax}`);
          const resolved = await resolvePricingForSlots({ origin: parsed.data.origin, destination: parsed.data.destination, passengers: pax });
          pricing = resolved.pricingResult;
          if (resolved.divergence) {
            log.info(`[PRICING] Divergence: v3=${resolved.divergence.v3Price} v2=${resolved.divergence.v2Price} level=${resolved.divergence.level}`);
          }
          log.info(`[EXTRACTION] Pricing result: final_price=${pricing?.final_price} origin="${pricing?.origin.canonical_name}" dest="${pricing?.destination.canonical_name}"`);
          if (pricing && pricing.final_price > 0) {
            parsed.data.price = pricing.final_price;
            confidenceResult.slots.price = { value: pricing.final_price, score: 1.0, reason: "backend_tariff_match" };
          } else if (parsed.data.origin || parsed.data.destination) {
            const route = parseRouteFromText(text);
            const fbOrigin = route.origin;
            const fbDest = route.destination;
            if (fbOrigin && fbDest) {
              const fbResolved = await resolvePricingForSlots({ origin: fbOrigin, destination: fbDest, passengers: parsed.data.passengers || 1 });
              const fbPricing = fbResolved.pricingResult;
              if (fbPricing.final_price > 0) {
                log.info(`[EXTRACTION] Fallback regex exitoso: origin="${fbOrigin}" dest="${fbDest}" price=${fbPricing.final_price}`);
                pricing = fbPricing;
                parsed.data.origin = fbOrigin;
                parsed.data.destination = fbDest;
                parsed.data.price = fbPricing.final_price;
                confidenceResult.slots.price = { value: fbPricing.final_price, score: 1.0, reason: "backend_tariff_match" };
                confidenceResult.slots.origin = { value: fbOrigin, score: 1.0, reason: "regex_fallback" };
                confidenceResult.slots.destination = { value: fbDest, score: 1.0, reason: "regex_fallback" };
              }
            }
          }
        }

        for (const [k, v] of Object.entries(prevSlotsEarly)) {
          if (v != null && String(v).trim() !== "") {
            if (!confidenceResult.slots[k]) {
              confidenceResult.slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
            }
          }
        }
        // FASE 20.4: RoleLock asigna rol pero preserva certeza existente
        if (coreDecisionEarly.roleLock?.origin) {
          if (!confidenceResult.slots.origin || confidenceResult.slots.origin.score === 0 || confidenceResult.slots.origin.value == null) {
            confidenceResult.slots.origin = {
              value: coreDecisionEarly.roleLock.origin,
              score: 0.6,
              reason: "core_role_lock",
            };
          }
          // else: slot ya existe con valor+confianza → roleLock solo confirma el rol
        }
        if (coreDecisionEarly.roleLock?.destination) {
          if (!confidenceResult.slots.destination || confidenceResult.slots.destination.score === 0 || confidenceResult.slots.destination.value == null) {
            confidenceResult.slots.destination = {
              value: coreDecisionEarly.roleLock.destination,
              score: 0.6,
              reason: "core_role_lock",
            };
          }
        }

        // FASE 18.2: Override to 1.0 for slots confirmed via location affirmation
        if (hasAffirmation) {
          if (confidenceResult.slots.origin && prevSlotsEarly.origin) {
            confidenceResult.slots.origin.score = 1.0;
            confidenceResult.slots.origin.reason = "user_confirmed";
          }
          if (confidenceResult.slots.destination && prevSlotsEarly.destination) {
            confidenceResult.slots.destination.score = 1.0;
            confidenceResult.slots.destination.reason = "user_confirmed";
          }
          log.info("[CONFIRMATION_RESULT] overridden confirmed slots to 1.0");
        }

        // Apply USER_CORRECTED for corrections
        if (hasCorrection) {
          for (const [k, slot] of Object.entries(confidenceResult.slots)) {
            if (k === "origin" || k === "destination") {
              const prevVal = prevSlotsEarly[k];
              if (slot.value != null && prevVal != null && String(slot.value) !== String(prevVal)) {
                (slot as any).source = "USER_CORRECTED";
                (slot as any).status = "CONFIRMATION_PENDING";
              }
            }
          }
        }
        // FASE 23: Build persisted slot_states from runtime state + previous states
        const slotStates = buildSlotStates(
          confidenceResult.slots,
          prevSlotStates,
          hasCorrection,
          hasAffirmation,
          prevSlotsEarly,
        );
        // Write source/status back to confidenceResult.slots for downstream compatibility
        for (const [k, entry] of Object.entries(slotStates)) {
          const existing = confidenceResult.slots[k] as any;
          if (existing) {
            existing.source = entry.source;
            existing.status = entry.status;
          }
        }
        log.info("[SLOT_STATE_TRANSITION]", {
          before: prevSlotsEarly,
          event: hasAffirmation ? "confirmation" : hasCorrection ? "correction" : "extraction",
          after: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [
              k,
              { value: v.value, score: v.score, source: (v as any).source ?? null, status: (v as any).status ?? null, reason: v.reason }
            ])
          ),
        });

        log.info("[EXTRACTION_RESULT]", {
          rawSlots: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [k, { value: v.value, score: v.score }])
          ),
          reasons: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [k, v.reason])
          ),
          ambiguity: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [k, v.reason === "ambiguous_term" || v.reason === "core_ambiguous"])
          ),
          overallConfidence: confidenceResult.overall_confidence,
          extractionCtxExists: confidenceResult != null,
          extractionCtxUndefined: confidenceResult == null,
          fallbackUsed: false,
        });

        workflowResult = await evaluateWorkflowTransition(phone, confidenceResult);

        log.info("[CONFIDENCE_RESULT]", {
          originConfidence: confidenceResult.slots.origin?.score ?? null,
          destConfidence: confidenceResult.slots.destination?.score ?? null,
          overall: confidenceResult.overall_confidence,
          action: workflowResult.action,
          clarifyField: workflowResult.clarifyField ?? null,
          workflowState: workflowResult.state,
          askForConfirmation: workflowResult.askForConfirmation ?? false,
          isComplete: workflowResult.action !== "clarify",
        });

        const mergedSlotsForDb: Record<string, any> = {};
        for (const [k, v] of Object.entries(confidenceResult.slots)) {
          if (v && v.value != null && String(v.value).trim() !== "") {
            mergedSlotsForDb[k] = v.value;
          }
        }
        const confByField: Record<string, number> = {};
        for (const [k, v] of Object.entries(confidenceResult.slots)) {
          confByField[k] = v.score;
        }

        const confidenceMap: ConfidenceMap = buildConfidenceMap(leadCore, confidenceResult, parsed.data);
        const mergedConfidence = { ...confByField, ...confidenceMap };

        const mergedWithMemory = mergeContext(mergedSlotsForDb, ctxMemory, confidenceResult.overall_confidence);
        log.info("[CONTEXT] merge completado:", Object.keys(mergedWithMemory).join(", "));

        await upsertChatSession(phone, mergedWithMemory, mergedConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined, JSON.stringify(slotStates));

        extractionNote = formatConfidenceNote(parsed.data, confidenceResult, workflowResult, pricing);
        log.info("[EXTRACTION] extractionNote generado, len:", extractionNote.length);
      } else {
        log.info("[EXTRACTION] Parse falló:", JSON.stringify(parsed.error?.issues || []));
      }
    } else {
      log.info("[EXTRACTION] generateGroqExtraction retornó null");
    }
  } catch (e) {
    log.error("[EXTRACTION] error:", e instanceof Error ? e.message : String(e));
  }

  if (!extractionNote) {
    const fb = await tryFallbackExtraction(text, phone, confidenceResult, prevSlotStates, hasCorrection, hasAffirmation, prevSlotsEarly);
    if (fb) {
      pricing = fb.pricing;
      confidenceResult = fb.confidenceResult;
      workflowResult = fb.workflowResult;
      extractionNote = fb.extractionNote;
      log.info("[EXTRACTION_FALLBACK_APPLIED]", {
        origin: pricing?.origin?.canonical_name ?? null,
        destination: pricing?.destination?.canonical_name ?? null,
        price: pricing?.final_price,
        used: true,
      });
    } else {
      log.info("[EXTRACTION_FALLBACK_APPLIED]", { used: false, reason: extractionNote ? "already_had_extraction" : "fallback_returned_null" });
    }
  }

  return { extractionNote, workflowResult, parsed, confidenceResult, pricing, prevSlotsEarly };
}
