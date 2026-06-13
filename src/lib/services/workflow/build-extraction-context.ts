import type { ExtractionContext, RoleLock, SlotStabilityMap } from "@/lib/ai/types";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/workflow/slot-workflow";
import type { PricingResult } from "@/lib/services/pricing/resolvePricingForSlots";

export function buildExtractionContext(
  _parsedData: TripExtraction | undefined,
  confidenceResult: ExtractionResult | undefined,
  workflowResult: SlotWorkflowContext | undefined,
  pricing: PricingResult | undefined,
  roleLock?: RoleLock,
  slotStability?: SlotStabilityMap,
  prevSlots?: Record<string, string>,
): ExtractionContext | undefined {
  if (!workflowResult) return undefined;

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

  if (roleLock?.origin) {
    slots.origin = {
      value: roleLock.origin,
      score: 1.0,
      reason: "core_role_lock",
    };
  }
  if (roleLock?.destination) {
    slots.destination = {
      value: roleLock.destination,
      score: 1.0,
      reason: "core_role_lock",
    };
  }

  return {
    slots,
    overallConfidence: confidenceResult?.overall_confidence ?? 0,
    workflowState: workflowResult.state,
    clarifyField: workflowResult.clarifyField ?? null,
    askForConfirmation: workflowResult.askForConfirmation ?? false,
    tariff: pricing
      ? {
          matched: pricing.final_price > 0,
          price: pricing.final_price > 0 ? pricing.final_price : undefined,
          canonicalOrigin: pricing.origin.canonical_name ?? undefined,
          canonicalDestination: pricing.destination.canonical_name ?? undefined,
          method: "v3",
        }
      : undefined,
    roleLock: roleLock ?? { origin: null, destination: null },
    slotStability: slotStability ?? { origin: "open", destination: "open" },
  };
}
