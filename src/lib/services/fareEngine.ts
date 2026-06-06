// Fare Engine — main pricing engine combining zones + subzones + proximity score.
// Fase 7: transforms zone geometry into deterministic price estimates.
// Fase 8: optional applyLearningWeights hook for controlled feedback.

import { type ZoneExpansionResult, type ProximityScore } from "@/lib/services/geoEngine";
import { buildRouteKey, applyWeights } from "@/lib/services/fareLearningEngine";
import type { LearningWeights } from "@/lib/services/fareLearningEngine";
import {
  lookupBaseFare,
  isCorridor,
  hasBorder,
  SUBZONE_MODIFIERS,
  CORRIDOR_DISCOUNT,
  BORDER_PENALTY,
  type FareCategory,
} from "@/lib/services/fareMatrix";

export interface FareAdjustments {
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

export function calculateFare(
  expansion: ZoneExpansionResult | null,
  proximityScore: ProximityScore | null,
  learningWeights?: LearningWeights | null,
): FareResult {
  const originZone = expansion?.origin?.zone ?? null;
  const destinationZone = expansion?.destination?.zone ?? null;
  const originSubzone = expansion?.origin?.subzone ?? null;
  const destinationSubzone = expansion?.destination?.subzone ?? null;

  const cell = lookupBaseFare(originZone, destinationZone);
  const basePrice = cell.basePrice;

  let price = basePrice;
  const isBorderRoute = hasBorder(originZone, destinationZone);

  // 1. Subzone modifier (hotel-specific pricing)
  let subzoneModifier = 1.0;
  if (destinationSubzone && SUBZONE_MODIFIERS[destinationSubzone.name]) {
    subzoneModifier = SUBZONE_MODIFIERS[destinationSubzone.name];
    price = Math.round(price * subzoneModifier);
  } else if (originSubzone && SUBZONE_MODIFIERS[originSubzone.name]) {
    subzoneModifier = SUBZONE_MODIFIERS[originSubzone.name];
    price = Math.round(price * subzoneModifier);
  }

  // 2. Corridor bonus
  let corridorBonus = 1.0;
  if (isCorridor(originZone, destinationZone)) {
    corridorBonus = CORRIDOR_DISCOUNT;
    price = Math.round(price * corridorBonus);
  }

  // 3. Proximity modifier (light smoothing, never undoes border)
  let proximityModifier = 1.0;
  if (proximityScore && proximityScore.score > 0 && !isBorderRoute) {
    const factor = 0.85 + proximityScore.score * 0.15;
    proximityModifier = factor;
    price = Math.round(price * proximityModifier);
  }

  // 4. Border penalty (always last, always hard)
  let borderPenalty = 1.0;
  if (isBorderRoute) {
    borderPenalty = BORDER_PENALTY;
    price = Math.round(price * borderPenalty);
  }

  // 5. Learning weights (Fase 8 — controlled feedback from historical outcomes)
  if (learningWeights && learningWeights.zoneAdjustments) {
    const routeKey = buildRouteKey(originZone, destinationZone);
    const adjusted = applyWeights(price, routeKey, learningWeights);
    price = adjusted;
  }

  // Category: matrix is floor; only promote, never demote
  let category = cell.category;
  if (isBorderRoute) {
    category = "HIGH";
  }

  // Confidence: blend proximity confidence with base fare confidence
  const proxConf = proximityScore?.score ?? 0.5;
  const confidence = Math.round((0.6 + proxConf * 0.4) * 100) / 100;

  return {
    category,
    basePrice,
    finalPrice: price,
    adjustments: {
      subzoneModifier,
      corridorBonus,
      borderPenalty,
      proximityModifier,
    },
    confidence,
  };
}
