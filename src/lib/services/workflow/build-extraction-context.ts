import type { ExtractionContext, RoleLock, SlotStabilityMap, ConversationalState } from "@/lib/ai/types";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import type { PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { log } from "@/lib/utils/logger";

export function buildExtractionContext(
  _parsedData: TripExtraction | undefined,
  confidenceResult: ExtractionResult | undefined,
  workflowResult: SlotConversationalContext | undefined,
  pricing: PricingResult | undefined,
  roleLock?: RoleLock,
  slotStability?: SlotStabilityMap,
  prevSlots?: Record<string, string>,
): ExtractionContext | undefined {
  // CAMBIO 3: No perder contexto por workflowResult undefined.
  // Crear contexto mínimo en vez de retornar undefined, para que la policy
  // pueda continuar con clarificación en vez de caer al EXECUTE genérico.
  let effectiveWorkflow = workflowResult;
  if (!effectiveWorkflow) {
    log.warn("[EXTRACTION] workflowResult undefined, creating default collecting_slots context");
    effectiveWorkflow = {
      state: "collecting_slots",
      clarifyField: null,
      overallConfidence: confidenceResult?.overall_confidence ?? 0,
      action: (confidenceResult?.action ?? "clarify") as ExtractionResult["action"],
      askForConfirmation: false,
    } as SlotConversationalContext;
  }

  const slots: Record<string, { value: string | number | null; score: number; reason: string }> = {};
  if (prevSlots) {
    for (const [k, v] of Object.entries(prevSlots)) {
      if (v != null && String(v).trim() !== "") {
        slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
      }
    }
  }

  const baseSlots = confidenceResult?.slots ?? {};
  for (const [k, v] of Object.entries(baseSlots)) {
    if (v && v.value != null && String(v.value).trim() !== "") {
      slots[k] = v;
    }
  }

  // CAMBIO 4: RoleLock solo actúa como fallback, no sobrescribe alias resueltos
  // Score 0.6 (no 1.0) porque es inferencia del sistema, no confirmación del usuario.
  if (roleLock?.origin && (!slots.origin || slots.origin.score === 0)) {
    slots.origin = {
      value: roleLock.origin,
      score: 0.6,
      reason: "core_role_lock",
    };
  }
  if (roleLock?.destination && (!slots.destination || slots.destination.score === 0)) {
    slots.destination = {
      value: roleLock.destination,
      score: 0.6,
      reason: "core_role_lock",
    };
  }

  const ctx = {
    slots,
    overallConfidence: confidenceResult?.overall_confidence ?? 0,
    conversationalState: effectiveWorkflow.state as ConversationalState,
    clarifyField: effectiveWorkflow.clarifyField ?? null,
    askForConfirmation: effectiveWorkflow.askForConfirmation ?? false,
    tariff: pricing
      ? {
          matched: pricing.final_price > 0,
          price: pricing.final_price > 0 ? pricing.final_price : undefined,
          canonicalOrigin: pricing.origin.canonical_name ?? undefined,
          canonicalDestination: pricing.destination.canonical_name ?? undefined,
          displayOrigin: undefined,
          displayDestination: undefined,
          method: "v3",
        }
      : undefined,
    roleLock: roleLock ?? { origin: null, destination: null },
    slotStability: slotStability ?? { origin: "open", destination: "open" },
  };
  log.info("[EXTRACTION_CTX]", {
    slotsCount: Object.keys(slots).length,
    origin: slots.origin?.value ?? null,
    destination: slots.destination?.value ?? null,
    originScore: slots.origin?.score ?? null,
    destScore: slots.destination?.score ?? null,
    workflowState: effectiveWorkflow.state,
    askForConfirmation: effectiveWorkflow.askForConfirmation ?? false,
    tariffMatched: pricing?.final_price != null && pricing.final_price > 0,
    roleLockApplied: !!(roleLock?.origin || roleLock?.destination),
    fallbackWorkflow: !workflowResult,
  });
  return ctx;
}
