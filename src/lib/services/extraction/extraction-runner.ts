import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, getChatSession, upsertChatSession, resetChatSession } from "@/lib/db/database";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { parseRouteFromText } from "@/lib/services/extraction/regex-extractor";
import { buildSlotClarify, buildCancellationMessage } from "@/lib/ai/response-builder";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult as ExtractionSchemaResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { assertCoreRouterPolicy } from "@/lib/ai/guard";
import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import type { CoreDecision, ConfidenceMap } from "@/lib/ai/types";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { calculateSlotConfidence } from "@/lib/services/extraction/confidence";
import { buildConfidenceMap } from "@/lib/services/extraction/confidence-map";
import { loadContext, mergeContext } from "@/lib/services/memory/context-memory";
import { detectLeadLang } from "@/lib/services/i18n/detect-lang";
import { formatConfidenceNote } from "@/lib/services/extraction/format-confidence-note";
import { loadPreviousSlots } from "@/lib/services/workflow/load-previous-slots";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { log } from "@/lib/utils/logger";

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
): Promise<FallbackExtractionResult | null> {
  try {
    log.info("[EXTRACTION] Intentando fallback regex...");
    const parsed = parseRouteFromText(text);
    let originMatch = parsed.origin;
    let destMatch = parsed.destination;

    if (!originMatch) {
      const session = await getChatSession(phone);
      if (session?.slots) {
        try {
          const slots = JSON.parse(session.slots);
          if (slots.origin) originMatch = slots.origin;
        } catch {}
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
  try {
    log.info("[EXTRACTION] Iniciando extraction, textLen:", text.length);
    const extractionGuard = assertCoreRouterPolicy();
    if (extractionGuard !== true) {
      log.info("[BLOCKED] generateGroqExtraction", extractionGuard);
      return null;
    }
    const [prevSlotsEarlyResult, ctxMemory] = await Promise.all([
      loadPreviousSlots(phone),
      loadContext(phone),
    ]);
    prevSlotsEarly = prevSlotsEarlyResult;
    log.info("[CONTEXT] cargado:", { origin: ctxMemory.origin, destination: ctxMemory.destination, intent: ctxMemory.intent });
    log.info("[TRACE EXTRACTION START]", {
      roleLock: coreDecisionEarly?.roleLock,
      slotStability: coreDecisionEarly?.slotStability,
      prevSlots: prevSlotsEarly,
    });
    const raw = await extractSlots(text, history, customerName || undefined, {
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
    if (convState === "awaiting_confirmation" && isAffirmativeMessage(text)) {
      log.info("[COMPLETENESS] awaiting_confirmation + affirmation: skipping completeness");
    } else if (convState === "awaiting_confirmation" && isNegativeMessage(text)) {
      const hasNewData = raw != null && Object.keys(raw).some(k => raw[k] != null && String(raw[k]).trim() !== "");
      if (hasNewData) {
        log.info("[CONFIRMATION] negative with new slot data — treating as correction, not cancellation");
        const completeness = evaluateCompleteness(raw, domain);
        if (completeness.status === "ASK") {
          const msg = buildSlotClarify(completeness.field!, detectLeadLang(text));
          log.info("[COMPLETENESS] bloqueado", { field: completeness.field });
          await sendWhatsAppMessage(phone, msg);
          await insertMessage(conversationId, "assistant", msg);
          return null;
        }
      } else {
        log.info("[CONFIRMATION] negative response, cancelling confirmation");
        const lang = detectLeadLang(text);
        const cancelMsg = buildCancellationMessage(lang);
        await sendWhatsAppMessage(phone, cancelMsg);
        await insertMessage(conversationId, "assistant", cancelMsg);
        await setConversationalState(phone, "idle");
        await resetChatSession(phone);
        return null;
      }
    } else {
      const completeness = evaluateCompleteness(raw, domain);
      if (completeness.status === "ASK") {
        const msg = buildSlotClarify(completeness.field!, detectLeadLang(text));
        log.info("[COMPLETENESS] bloqueado", { field: completeness.field });
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversationId, "assistant", msg);
        return null;
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
        if (coreDecisionEarly.roleLock?.origin) {
          confidenceResult.slots.origin = {
            value: coreDecisionEarly.roleLock.origin,
            score: 1.0,
            reason: "core_role_lock",
          };
        }
        if (coreDecisionEarly.roleLock?.destination) {
          confidenceResult.slots.destination = {
            value: coreDecisionEarly.roleLock.destination,
            score: 1.0,
            reason: "core_role_lock",
          };
        }

        workflowResult = await evaluateWorkflowTransition(phone, confidenceResult);

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

        await upsertChatSession(phone, mergedWithMemory, mergedConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined);

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
    const fb = await tryFallbackExtraction(text, phone, confidenceResult);
    if (fb) {
      pricing = fb.pricing;
      confidenceResult = fb.confidenceResult;
      workflowResult = fb.workflowResult;
      extractionNote = fb.extractionNote;
    }
  }

  return { extractionNote, workflowResult, parsed, confidenceResult, pricing, prevSlotsEarly };
}
