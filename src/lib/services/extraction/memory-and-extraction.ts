import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, getChatSession, upsertChatSession } from "@/lib/db/database";
import { updateChatSessionComprehension, insertF4Log, setChatSessionEscalationReason } from "@/lib/db/domains/learning";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { buildSlotClarify, buildEscalationMessage } from "@/lib/ai/response-builder";
import { buildMemory } from "@/lib/services/memory/memory";
import { buildPredictedContext, enrichComprehensionSignals } from "@/lib/services/memory/predictive-routing";
import { logIntentDetected, logEntityDetected, logEscalation } from "@/lib/services/learning/event-tracking";
import { recordComprehensionOutcome, getComprehensionThresholdAdjustment } from "@/lib/services/learning/learning-utils";
import { buildComprehensionSignals, computeComprehensionScore, getComprehensionState, getRecoveryMessage } from "@/lib/services/extraction/comprehension";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/workflow/slot-workflow";
import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolvePricingForSlots";
import { assertCoreRouterPolicy } from "@/lib/ai/guard";
import { core } from "@/lib/ai/core";
type CoreResult = ReturnType<typeof core>;
import { calculateSlotConfidence } from "@/lib/services/extraction/confidence";
import { loadContext, mergeContext } from "@/lib/services/memory/context-memory";
import { detectLeadLang } from "@/lib/services/i18n/detect-lang";
import { formatConfidenceNote } from "@/lib/services/extraction/format-confidence-note";
import { loadPreviousSlots } from "@/lib/services/workflow/load-previous-slots";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { log } from "@/lib/utils/logger";

interface FallbackExtractionResult {
  pricing: PricingResult;
  confidenceResult: ExtractionResult;
  workflowResult: SlotWorkflowContext;
  extractionNote: string;
}

async function tryFallbackExtraction(
  text: string,
  phone: string,
  prevConfidence: ExtractionResult | undefined,
): Promise<FallbackExtractionResult | null> {
  try {
    log.info("[EXTRACTION] Intentando fallback regex...");
    let originMatch: string | undefined;
    let destMatch: string | undefined;
    const dirMatch = text.match(/(?:de|desde)\s+(.+?)\s+(?:a|hasta|para|hacia)\s+(.+?)(?:\s*[,;.!?]|\s*$)/i);
    if (dirMatch) {
      originMatch = dirMatch[1].trim();
      destMatch = dirMatch[2].trim();
    }
    if (!originMatch || !destMatch) {
      const originRx = /\b(aeropuerto|aero|igr|igu)\b/i;
      const destRx = /\b(ciudad|la ciudad|a la ciudad|centro|centro iguazu|centro puerto|puerto iguazu|puerto|foz|cataratas)\b/i;
      originMatch = text.match(originRx)?.[1];
      destMatch = text.match(destRx)?.[1];
    }

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
        const fbConfidence: ExtractionResult = {
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

export interface MemoryAndExtractionResult {
  extractionNote?: string;
  workflowResult?: SlotWorkflowContext;
  parsed?: { success: true; data: TripExtraction } | { success: false; error: any };
  confidenceResult?: ExtractionResult;
  pricing?: PricingResult;
  prevSlotsEarly: Record<string, string>;
}

export async function handleMemoryAndExtraction(
  phone: string,
  text: string,
  conversationId: number,
  leadCore: CoreResult,
  history: any[],
  customerName: string | null,
): Promise<MemoryAndExtractionResult | null> {
  const f5Session = await getChatSession(phone);
  const f5Core = leadCore;
  const f5Memory = buildMemory(f5Session, history);
  const f5Context = buildPredictedContext(text, f5Core.intent, f5Memory);
  logIntentDetected(String(conversationId), f5Core.intent, f5Context.intentPrediction.confidence);
  const detectedEntities = f5Context.entityPrediction.candidates;
  if (detectedEntities.length > 0) logEntityDetected(String(conversationId), detectedEntities);

  // COMPREHENSION CHECK
  {
    log.info("[TRACE INPUT]", { event: "comprehension_check", phone: phone.slice(-4), textLen: text.length });
    const f4Signals = enrichComprehensionSignals(
      buildComprehensionSignals({
        text,
        coreIntent: f5Core.intent,
        slotStability: f5Core.slotStability,
        roleLock: f5Core.roleLock,
        session: f5Session,
      }),
      f5Context.entityPrediction,
      f5Context.intentPrediction,
    );
    const f4Score = computeComprehensionScore(f4Signals);
    const f4ThresholdAdj = await getComprehensionThresholdAdjustment();
    const f4State = getComprehensionState(f4Score, f4ThresholdAdj);

    log.info("[TRACE COMPREHENSION]", {
      state: f4State,
      score: f4Score,
      thresholdAdj: f4ThresholdAdj,
      intent: f5Core.intent,
      roleLock: f5Core.roleLock,
      slotStability: f5Core.slotStability,
    });

    await Promise.all([
      updateChatSessionComprehension(phone, f4State, f4Score),
      insertF4Log(String(conversationId), f4Score, f4State, null),
    ]);

    recordComprehensionOutcome(f4State === "ESCALATION");

    if (f4State === "ESCALATION") {
      const reason = `comprehension_score=${f4Score.toFixed(2)} state=${f4State}`;
      await setChatSessionEscalationReason(phone, reason);
      logEscalation(String(conversationId), reason, f4Score);
      await notifyAdmin(`⚠️ *ESCALACIÓN — Bajo nivel de comprensión*\n\nTeléfono: ******${phone.slice(-4)}\nScore: ${f4Score.toFixed(2)}`);
      const escMsg = buildEscalationMessage();
      log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_ESCALATION", text: escMsg });
      await sendWhatsAppMessage(phone, escMsg);
      await insertMessage(conversationId, "assistant", escMsg);
      return null;
    }

    if (f4State === "RECOVERY") {
      log.info("[TRACE RECOVERY]", {
        state: f4State,
        score: f4Score,
        phone: phone.slice(-4),
        textLen: text.length,
      });
      const recoveryMsg = getRecoveryMessage(f4State, f5Session);
      log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_RECOVERY", text: recoveryMsg });
      await sendWhatsAppMessage(phone, recoveryMsg);
      await insertMessage(conversationId, "assistant", recoveryMsg);
      return null;
    }
  }

  // CONFIDENCE-BASED EXTRACTION
  let extractionNote: string | undefined;
  let workflowResult: SlotWorkflowContext | undefined;
  let parsed: { success: true; data: TripExtraction } | { success: false; error: any } | undefined;
  let confidenceResult: ExtractionResult | undefined;
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

    const completeness = evaluateCompleteness(raw);
    if (completeness.status === "ASK") {
      const msg = buildSlotClarify(completeness.field!, detectLeadLang(text));
      log.info("[COMPLETENESS] bloqueado", { field: completeness.field });
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversationId, "assistant", msg);
      return null;
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
            let fbOrigin: string | undefined;
            let fbDest: string | undefined;
            const dirMatch = text.match(/(?:de|desde)\s+(.+?)\s+(?:a|hasta|para|hacia)\s+(.+?)(?:\s*[,;.!?]|\s*$)/i);
            if (dirMatch) {
              fbOrigin = dirMatch[1].trim();
              fbDest = dirMatch[2].trim();
            }
            if (!fbOrigin || !fbDest) {
              const originRx = /\b(aeropuerto|aero|igr|igu)\b/i;
              const destRx = /\b(ciudad|la ciudad|a la ciudad|centro|centro iguazu|centro puerto|puerto iguazu|puerto|foz|cataratas)\b/i;
              fbOrigin = text.match(originRx)?.[1];
              fbDest = text.match(destRx)?.[1];
            }
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

        const mergedWithMemory = mergeContext(mergedSlotsForDb, ctxMemory, confidenceResult.overall_confidence);
        log.info("[CONTEXT] merge completado:", Object.keys(mergedWithMemory).join(", "));

        await upsertChatSession(phone, mergedWithMemory, confByField, workflowResult.state, workflowResult.clarifyField ?? undefined);

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
