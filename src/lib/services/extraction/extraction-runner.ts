import { getChatSession, upsertChatSession, resetChatSession } from "@/lib/db/database";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { parseRouteFromText } from "@/lib/services/extraction/regex-extractor";
import { buildGenericClarify, buildCancellationMessage } from "@/lib/ai/response-builder";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult as ExtractionSchemaResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { priceMultiRideLegs, type LegPricingInput } from "@/lib/services/pricing/hub-discount";
import type { MultiRideBreakdown } from "@/lib/db/types";
// assertCoreRouterPolicy removed in DEBT-03 (no more global state in guard.ts)
import { isAffirmativeMessage, isNegativeMessage, isCorrectionMessage } from "@/lib/ai/patterns";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import type { CoreDecision, ConfidenceMap } from "@/lib/ai/types";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { calculateSlotConfidence } from "@/lib/services/extraction/confidence";
import { inferPickupTime } from "@/lib/services/extraction/time-inference";
import { inferBorderSide } from "@/lib/services/extraction/border-inference";
import { buildConfidenceMap } from "@/lib/services/extraction/confidence-map";
import { loadContext, mergeContext } from "@/lib/services/memory/context-memory";
import { detectLeadLang } from "@/lib/detect-lang";
import { formatConfidenceNote } from "@/lib/services/extraction/format-confidence-note";
import { loadPreviousSlots, loadPreviousSlotStates } from "@/lib/services/workflow/load-previous-slots";
import { buildSlotStates, type SlotStateEntry } from "@/lib/ai/slot-state";
import { resolveSimpleFieldGap } from "@/lib/ai/field-resolver";
import { log } from "@/lib/utils/logger";
import { parseSessionSlots } from "@/lib/services/shared/session-helpers";
import { sendAndPersist } from "@/lib/services/shared/message-helpers";
import { capturePipelineEvent, captureBKEEvent } from "@/lib/cognitive/collector";
import type { PipelineEventDetails } from "@/lib/cognitive/types";

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
          `Origen: "${originMatch}" â†’ ${ft.origin.canonical_name} (Confianza: 100%)`,
          `Destino: "${destMatch}" â†’ ${ft.destination.canonical_name} (Confianza: 100%)`,
          `PRECIO OFICIAL (calculado por backend): $${ft.final_price} ARS (precio hasta 4 pasajeros).`,
          `VALOR_PRECIO: ${ft.final_price}`,
          `Ruta oficial: ${ft.origin.canonical_name} â†’ ${ft.destination.canonical_name}.`,
          `NO calcules ni modifiques este precio. UsÃ¡ SOLO los valores oficiales del backend.`,
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
  multiRideBreakdown?: MultiRideBreakdown;
}

export async function runExtractionPipeline(
  phone: string,
  text: string,
  conversationId: number,
  leadCore: CoreDecision,
  history: any[],
  customerName: string | null,
): Promise<ExtractionResult | null> {
  const pipelineStart = performance.now();
  const pipelineDetails: PipelineEventDetails = {
    pipeline: "extraction",
    phone: phone.slice(-4),
  };
  capturePipelineEvent(0, true, pipelineDetails);

  let extractionNote: string | undefined;
  let multiRideBreakdown: MultiRideBreakdown | undefined;
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
    // assertCoreRouterPolicy() eliminado (DEBT-03): sin estado global, no hay estado mixto que verificar.
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

    // [OBSERVABILITY] Remove after diagnosis â€” raw LLM output for this turn
    log.info("[OBSERVABILITY] RAW_LLM", {
      textLength: text.length,
      textPreview: text.substring(0, 300),
      rawExists: raw != null,
      rawFull: raw ? JSON.stringify(raw).substring(0, 3000) : null,
      roleLock: coreDecisionEarly?.roleLock,
      prevSlots: prevSlotsEarly,
    });

    const domain = mapIntentToDomain(leadCore.intent);
    const convState = await getConversationalState(phone);

    // FASE 18.2: Location confirmation â€” when core detects affirmation + existing ambiguous slots
    hasAffirmation = leadCore.facts?.some(f => f.startsWith("affirmation:"))
      || isAffirmativeMessage(text);
    const hasPrevSlotsLocation = prevSlotsEarly?.origin && prevSlotsEarly?.destination;
    // FASE 20.4: Correction detection â€” user correcting a previously extracted slot
    hasCorrection = isCorrectionMessage(text);

    if (convState === "awaiting_passenger") {
      log.info("[COMPLETENESS] awaiting_passenger: skipping completeness");
    } else if (convState === "awaiting_confirmation" && isAffirmativeMessage(text)) {
      log.info("[COMPLETENESS] awaiting_confirmation + affirmation: skipping completeness");
    } else if (hasAffirmation && hasPrevSlotsLocation && convState !== "awaiting_confirmation") {
      // User confirmed previously ambiguous location â€” promote existing slots
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
        log.info("[CONFIRMATION] negative with new slot data â€” treating as correction, not cancellation");
        const fieldGap = resolveSimpleFieldGap(raw!, domain);
        if (fieldGap.field !== null) {
          const msg = buildGenericClarify(fieldGap.field!, detectLeadLang(text));
          log.info("[COMPLETENESS] bloqueado", { field: fieldGap.field });
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
      // para determinar quÃ© campo falta preguntar
      const effectiveSlots = raw ?? {
        origin: coreDecisionEarly.roleLock.origin ?? prevSlotsEarly?.origin ?? null,
        destination: coreDecisionEarly.roleLock.destination ?? prevSlotsEarly?.destination ?? null,
      };
      const fieldGap = resolveSimpleFieldGap(effectiveSlots, domain);
      if (fieldGap.field !== null) {
        // FASE 22.1: bypass para afirmaciones y correcciones
        if (
          (hasAffirmation || hasCorrection) &&
          hasPrevSlotsLocation
        ) {
          log.info("[COMPLETENESS_BYPASS]", {
            reason: hasCorrection ? "user_correction" : "user_confirmation",
            previousState: convState,
          });
        } else {
          const msg = buildGenericClarify(fieldGap.field!, detectLeadLang(text));
          log.info("[COMPLETENESS] bloqueado", { field: fieldGap.field });
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

        // [OBSERVABILITY] Remove after diagnosis â€” slot state BEFORE prevSlots merge
        log.info("[OBSERVABILITY] SLOTS_BEFORE_MERGE", {
          textPreview: text.substring(0, 300),
          slots: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [
              k,
              { value: v.value, score: v.score, reason: v.reason }
            ])
          ),
          overallConfidence: confidenceResult.overall_confidence,
          action: confidenceResult.action,
          convState: convState,
        });

        // Multi-ride breakdown (compartido entre pricing y extractionNote)
        if (parsed.data.origin && parsed.data.destination) {
          const pax = parsed.data.passengers || 1;

          // Multi-ride: legs descriptas por el usuario
          if (parsed.data.legs && parsed.data.legs.length > 0) {
            log.info(`[EXTRACTION] Multi-ride detectado: ${parsed.data.legs.length} legs`);
            const legInputs: LegPricingInput[] = parsed.data.legs.map((leg, idx) => ({
              seq: idx + 1,
              origin: leg.origin,
              destination: leg.destination,
              time: leg.time ?? null,
            }));
            multiRideBreakdown = await priceMultiRideLegs(legInputs, pax);
            log.info(`[EXTRACTION] Multi-ride pricing: ${multiRideBreakdown.totalDiscounted} (ahorro: ${multiRideBreakdown.totalSaving})`);

            // Usar precio consolidado como pricing principal (backward compat)
            pricing = {
              final_price: multiRideBreakdown.totalDiscounted,
              base_price: multiRideBreakdown.totalOneWay,
              markup: 0,
              adjustments: [],
              tariff_id: null,
              origin: { place_id: null, canonical_name: parsed.data.origin, zone_id: null },
              destination: { place_id: null, canonical_name: parsed.data.destination ?? "", zone_id: null },
              level: "multi_ride",
              source: "package",
              explanation: [],
            };
            parsed.data.price = multiRideBreakdown.totalDiscounted;
            confidenceResult.slots.price = { value: multiRideBreakdown.totalDiscounted, score: 1.0, reason: "multi_ride_backend" };
          } else {
            log.info(`[EXTRACTION] Calculando precio: origin="${parsed.data.origin}" dest="${parsed.data.destination}" pax=${pax}`);
            const pricingStart = performance.now();
            const resolved = await resolvePricingForSlots({ origin: parsed.data.origin, destination: parsed.data.destination, passengers: pax });
            const pricingDuration = Math.round((performance.now() - pricingStart) * 100) / 100;
            pricing = resolved.pricingResult;
            captureBKEEvent(pricingDuration, !!pricing && pricing.final_price > 0, {
              domain: "pricing",
              query: `${parsed.data.origin} â†’ ${parsed.data.destination}`,
              resolutionSource: pricing?.final_price ? "backend" : "no_tariff",
              confidence: pricing?.final_price ? 1.0 : 0,
            });
            log.info(`[EXTRACTION] Pricing result: final_price=${pricing?.final_price} origin="${pricing?.origin.canonical_name}" dest="${pricing?.destination.canonical_name}"`);
            if (pricing && pricing.final_price > 0) {
              parsed.data.price = pricing.final_price;
              confidenceResult.slots.price = { value: pricing.final_price, score: 1.0, reason: "backend_tariff_match" };
            } else if (parsed.data.origin || parsed.data.destination) {
              const route = parseRouteFromText(text);
              const fbOrigin = route.origin;
              const fbDest = route.destination;
              if (fbOrigin && fbDest) {
                const fbPricingStart = performance.now();
                const fbResolved = await resolvePricingForSlots({ origin: fbOrigin, destination: fbDest, passengers: parsed.data.passengers || 1 });
                const fbPricingDuration = Math.round((performance.now() - fbPricingStart) * 100) / 100;
                const fbPricing = fbResolved.pricingResult;
                captureBKEEvent(fbPricingDuration, fbPricing.final_price > 0, {
                  domain: "pricing",
                  query: `${fbOrigin} â†’ ${fbDest}`,
                  resolutionSource: fbPricing.final_price > 0 ? "backend" : "no_tariff",
                  confidence: fbPricing.final_price > 0 ? 1.0 : 0,
                });
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
        }

        // AIT-061: Inferencia de horario post-extracciÃ³n
        // Si scheduled_at tiene fecha (date-only, ej: "2026-07-06" de relative_date_computed)
        // y el destino tiene horario de apertura conocido, el sistema sugiere un pickup.
        // La hora inferida se combina con la fecha existente y el reason cambia a
        // "inferred_opening_hours" para que buildSlotStates produzca CONFIRMATION_PENDING.
        if (confidenceResult.slots.scheduled_at?.value != null) {
          const destSlot = confidenceResult.slots.destination;
          const destinationName = destSlot?.value != null ? String(destSlot.value) : null;
          const currentScheduledAt = String(confidenceResult.slots.scheduled_at.value);
          const facts = leadCore.facts ?? [];

          const timeInference = inferPickupTime(destinationName, facts, currentScheduledAt);

          if (timeInference.confidence === "inferred" && timeInference.inferredTime != null) {
            const datePart = currentScheduledAt.includes("T")
              ? currentScheduledAt.split("T")[0]
              : currentScheduledAt;
            const combinedDatetime = `${datePart}T${timeInference.inferredTime}:00`;

            confidenceResult.slots.scheduled_at = {
              value: combinedDatetime,
              score: 0.8,
              reason: "inferred_opening_hours",
            };

            log.info("[TIME_INFERENCE] Hora inferida para pickup:", {
              destination: destinationName,
              inferredTime: timeInference.inferredTime,
              combinedDatetime,
              reason: timeInference.displayReason,
            });
          }
        }

        // AIT-062: Inferencia de frontera post-extracciÃ³n
        // Si destination u origin es tÃ©rmino de aduana ("aduana"/"customs"/"border"/"alfÃ¢ndega")
        // con reason "unknown_location", inferir el lado de frontera segÃºn el paÃ­s
        // del otro slot resuelto o del airport_code.
        // Se ejecuta ANTES del bloque prevSlotsEarly para que preserve prev pueda
        // restaurar CONFIRMED si el valor ya fue confirmado y no cambiÃ³.
        {
          const destSlotInfer = confidenceResult.slots.destination;
          const originSlotInfer = confidenceResult.slots.origin;
          const airportCodeSlot = confidenceResult.slots.airport_code;
          const airportCodeVal = airportCodeSlot?.value != null ? String(airportCodeSlot.value) : null;

          const borderInference = await inferBorderSide(
            destSlotInfer?.value != null ? String(destSlotInfer.value) : null,
            destSlotInfer?.score ?? 0,
            destSlotInfer?.reason ?? "",
            originSlotInfer?.value != null ? String(originSlotInfer.value) : null,
            originSlotInfer?.score ?? 0,
            originSlotInfer?.reason ?? "",
            airportCodeVal,
          );

          if (borderInference.confidence === "inferred" && borderInference.borderName != null) {
            // Determinar si el slot a reemplazar es destination u origin
            const destIsBorder = destSlotInfer?.value != null &&
              /\b(aduana|customs?|border|alfÃ¢ndega)\b/i.test(String(destSlotInfer.value)) &&
              destSlotInfer.reason === "unknown_location";

            if (destIsBorder) {
              confidenceResult.slots.destination = {
                value: borderInference.borderName,
                score: 0.8,
                reason: "inferred_border_crossing",
              };
              log.info("[BORDER_INFERENCE] destination inferido como cruce:", {
                borderName: borderInference.borderName,
                country: borderInference.inferredCountry,
                crossing: borderInference.crossing,
              });
            } else {
              // Si no es destination, reemplazar origin
              confidenceResult.slots.origin = {
                value: borderInference.borderName,
                score: 0.8,
                reason: "inferred_border_crossing",
              };
              log.info("[BORDER_INFERENCE] origin inferido como cruce:", {
                borderName: borderInference.borderName,
                country: borderInference.inferredCountry,
                crossing: borderInference.crossing,
              });
            }
          }
        }

        // RF-13: DetecciÃ³n explÃ­cita de impacto operacional
        // Se identifican los cambios en slots crÃ­ticos (origin, destination, passengers,
        // scheduled_at) que pueden afectar pricing, routing o ejecuciÃ³n.
        const operationalImpactDetected: string[] = [];
        for (const [k, v] of Object.entries(prevSlotsEarly)) {
          if (v != null && String(v).trim() !== "") {
            if (!confidenceResult.slots[k]) {
              confidenceResult.slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
            } else if (String(confidenceResult.slots[k].value) !== String(v)) {
              const currentValue = String(confidenceResult.slots[k].value).toLowerCase();
              if (!text.toLowerCase().includes(currentValue)) {
                confidenceResult.slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
              }
            }
            // Detectar cambios en slots con impacto operacional
            if (confidenceResult.slots[k] && String(confidenceResult.slots[k].value) !== String(v)) {
              if (["origin", "destination", "passengers", "scheduled_at", "flight"].includes(k)) {
                operationalImpactDetected.push(k);
              }
            }
          }
        }
        if (operationalImpactDetected.length > 0) {
          log.info("[OPERATIONAL_IMPACT] Cambios detectados en slots crÃ­ticos:", operationalImpactDetected);
          // Los cambios en origin/destination/passengers gatillan re-pricing
          // en el bloque de pricing mÃ¡s abajo (lÃ­nea ~346). scheduled_at afecta
          // disponibilidad y flight afecta ruta. Todos estos casos estÃ¡n cubiertos
          // por el pricing flow existente que se ejecuta condicionalmente segÃºn
          // la presencia de origin y destination.
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
          // else: slot ya existe con valor+confianza â†’ roleLock solo confirma el rol
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

        // [OBSERVABILITY] Remove after diagnosis â€” slot state AFTER all merges (prevSlots + roleLock + affirmation + slotStates)
        log.info("[OBSERVABILITY] SLOTS_AFTER_MERGE", {
          textPreview: text.substring(0, 300),
          prevSlots: prevSlotsEarly,
          currentSlots: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [
              k,
              { value: v.value, score: v.score, reason: v.reason, source: (v as any).source ?? null, status: (v as any).status ?? null }
            ])
          ),
          hasAffirmation,
          hasCorrection,
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

        // [OBSERVABILITY] Remove after diagnosis â€” pipeline branching decision
        log.info("[OBSERVABILITY] PIPELINE_DECISION", {
          textPreview: text.substring(0, 300),
          action: workflowResult.action,
          clarifyField: workflowResult.clarifyField,
          workflowState: workflowResult.state,
          askForConfirmation: workflowResult.askForConfirmation,
          isComplete: workflowResult.action !== "clarify",
          slotValues: Object.fromEntries(
            Object.entries(confidenceResult.slots).map(([k, v]) => [k, v.value])
          ),
          prevSlots: prevSlotsEarly,
        });

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

        // F02-DG (CDA Â§7): Persistir leadCore.intent para que prevIntent estÃ© disponible
        // en el prÃ³ximo turno. Sin esto, la lÃ³gica de preservaciÃ³n de core.ts:282-290 es
        // estructuralmente inalcanzable porque prevIntent siempre es undefined.
        // Solo guardamos intents operativos (no AMBIGUOUS, GREETING, ni undefined).
        if (leadCore.intent && !["AMBIGUOUS", "GREETING"].includes(leadCore.intent)) {
          mergedWithMemory.intent = leadCore.intent;
        }

        await upsertChatSession(phone, mergedWithMemory, mergedConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined, JSON.stringify(slotStates));

        extractionNote = formatConfidenceNote(parsed.data, confidenceResult, workflowResult, pricing, multiRideBreakdown);
        log.info("[EXTRACTION] extractionNote generado, len:", extractionNote.length);
      } else {
        log.info("[EXTRACTION] Parse fallÃ³:", JSON.stringify(parsed.error?.issues || []));
      }
    } else {
      log.info("[EXTRACTION] generateGroqExtraction retornÃ³ null");
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

  // PR-5F: Capturar pipeline completado
  const pipelineDuration = Math.round((performance.now() - pipelineStart) * 100) / 100;
  pipelineDetails.intent = leadCore.intent;
  pipelineDetails.slotsCount = Object.keys(confidenceResult?.slots ?? {}).length;
  capturePipelineEvent(pipelineDuration, !!extractionNote, pipelineDetails);

  return { extractionNote, workflowResult, parsed, confidenceResult, pricing, prevSlotsEarly, multiRideBreakdown };
}
