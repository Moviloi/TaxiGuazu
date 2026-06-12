// ⚠️ Fare Engine — legacy pricing type only.
// DEPRECATED: New pricing lives in pricing-engine.ts.
// calculateFare was removed (0 runtime callers).
// FareResult kept for backward compat with contextMemory.ts.

type FareCategory = "LOW" | "MEDIUM" | "MEDIUM+" | "HIGH" | "VARIABLE";

interface FareAdjustments {
  subzoneModifier: number;
  corridorBonus: number;
  borderPenalty: number;
  proximityModifier: number;
}

export interface FareResult {
  category: FareCategory;
  basePrice: number;
  finalPrice: number;
  adjustments: FareAdjustments;
  confidence: number;
}
