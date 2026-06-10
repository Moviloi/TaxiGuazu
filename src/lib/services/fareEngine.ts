// ⚠️ Fare Engine — legacy pricing engine (Fase 7/8).
// DEPRECATED: New pricing lives in pricing-engine.ts.
// Kept for backward compat with executionEngine pipeline.
// Do NOT add new logic here.

import { type ZoneExpansionResult, type ProximityScore } from "@/lib/services/geoEngine";
import { buildRouteKey, applyWeights } from "@/lib/services/fareLearningEngine";
import type { LearningWeights } from "@/lib/services/fareLearningEngine";

// ── Inline fare data (formerly fareMatrix) for legacy compat ──

export type FareCategory = "LOW" | "MEDIUM" | "MEDIUM+" | "HIGH" | "VARIABLE";

const FARE_MATRIX: Record<string, { category: FareCategory; basePrice: number }> = {
  "Z_CITY_CORE→Z_CITY_CORE": { category: "LOW", basePrice: 5000 },
  "Z_CITY_CORE→Z_AIRPORT": { category: "MEDIUM", basePrice: 8000 },
  "Z_CITY_CORE→Z_HOTEL_ZONE": { category: "MEDIUM", basePrice: 7000 },
  "Z_CITY_CORE→Z_LANDMARK": { category: "MEDIUM+", basePrice: 10000 },
  "Z_CITY_CORE→Z_BORDER": { category: "HIGH", basePrice: 14000 },
  "Z_AIRPORT→Z_CITY_CORE": { category: "MEDIUM", basePrice: 8000 },
  "Z_AIRPORT→Z_AIRPORT": { category: "LOW", basePrice: 4000 },
  "Z_AIRPORT→Z_HOTEL_ZONE": { category: "MEDIUM+", basePrice: 9000 },
  "Z_AIRPORT→Z_LANDMARK": { category: "MEDIUM+", basePrice: 11000 },
  "Z_AIRPORT→Z_BORDER": { category: "HIGH", basePrice: 15000 },
  "Z_HOTEL_ZONE→Z_CITY_CORE": { category: "MEDIUM", basePrice: 7000 },
  "Z_HOTEL_ZONE→Z_AIRPORT": { category: "MEDIUM+", basePrice: 9000 },
  "Z_HOTEL_ZONE→Z_HOTEL_ZONE": { category: "LOW", basePrice: 6000 },
  "Z_HOTEL_ZONE→Z_LANDMARK": { category: "MEDIUM+", basePrice: 9500 },
  "Z_HOTEL_ZONE→Z_BORDER": { category: "HIGH", basePrice: 13000 },
  "Z_LANDMARK→Z_CITY_CORE": { category: "MEDIUM+", basePrice: 10000 },
  "Z_LANDMARK→Z_AIRPORT": { category: "MEDIUM+", basePrice: 11000 },
  "Z_LANDMARK→Z_HOTEL_ZONE": { category: "MEDIUM+", basePrice: 9500 },
  "Z_LANDMARK→Z_LANDMARK": { category: "LOW", basePrice: 5000 },
  "Z_LANDMARK→Z_BORDER": { category: "HIGH", basePrice: 16000 },
  "Z_BORDER→Z_CITY_CORE": { category: "HIGH", basePrice: 14000 },
  "Z_BORDER→Z_AIRPORT": { category: "HIGH", basePrice: 15000 },
  "Z_BORDER→Z_HOTEL_ZONE": { category: "HIGH", basePrice: 13000 },
  "Z_BORDER→Z_LANDMARK": { category: "HIGH", basePrice: 16000 },
  "Z_BORDER→Z_BORDER": { category: "VARIABLE", basePrice: 20000 },
};

function lookupBaseFare(originZone: string | null, destinationZone: string | null): { category: FareCategory; basePrice: number } {
  if (!originZone || !destinationZone) return { category: "VARIABLE", basePrice: 0 };
  return FARE_MATRIX[`${originZone}→${destinationZone}`] ?? { category: "VARIABLE", basePrice: 0 };
}

function hasBorder(originZone: string | null, destinationZone: string | null): boolean {
  return originZone === "Z_BORDER" || destinationZone === "Z_BORDER";
}

function isCorridor(originZone: string | null, destinationZone: string | null): boolean {
  if (!originZone || !destinationZone) return false;
  return new Set([
    "Z_AIRPORT→Z_CITY_CORE", "Z_CITY_CORE→Z_AIRPORT",
    "Z_AIRPORT→Z_HOTEL_ZONE", "Z_HOTEL_ZONE→Z_AIRPORT",
    "Z_HOTEL_ZONE→Z_CITY_CORE", "Z_CITY_CORE→Z_HOTEL_ZONE",
  ]).has(`${originZone}→${destinationZone}`);
}

const SUBZONE_MODIFIERS: Record<string, number> = {
  Amerian: 1.1, Meliá: 1.05, Rafain: 1.0, Mabu: 0.95,
  Panoramic: 1.0, "Iguazú Grand": 1.05, "Selva Iryapú": 0.9,
};

const BORDER_PENALTY = 1.3;
const CORRIDOR_DISCOUNT = 0.9;

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
