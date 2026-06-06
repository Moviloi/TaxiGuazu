// Fare Matrix — base tariff matrix by zone pair + adjustment rules.
// Fase 7: deterministic fare computation from zone geometry.

export type FareCategory = "LOW" | "MEDIUM" | "MEDIUM+" | "HIGH" | "VARIABLE";

export interface FareCell {
  category: FareCategory;
  basePrice: number;
}

// Base fare matrix by zone pair (origin → destination)
const FARE_MATRIX: Record<string, FareCell> = {
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

export const SUBZONE_MODIFIERS: Record<string, number> = {
  Amerian: 1.1,
  Meliá: 1.05,
  Rafain: 1.0,
  Mabu: 0.95,
  Panoramic: 1.0,
  "Iguazú Grand": 1.05,
  "Selva Iryapú": 0.9,
};

export const CORRIDORS = new Set([
  "Z_AIRPORT→Z_CITY_CORE",
  "Z_CITY_CORE→Z_AIRPORT",
  "Z_AIRPORT→Z_HOTEL_ZONE",
  "Z_HOTEL_ZONE→Z_AIRPORT",
  "Z_HOTEL_ZONE→Z_CITY_CORE",
  "Z_CITY_CORE→Z_HOTEL_ZONE",
]);

export const BORDER_PENALTY = 1.3;
export const CORRIDOR_DISCOUNT = 0.9;

export function lookupBaseFare(originZone: string | null, destinationZone: string | null): FareCell {
  if (!originZone || !destinationZone) {
    return { category: "VARIABLE", basePrice: 0 };
  }
  const key = `${originZone}→${destinationZone}`;
  return FARE_MATRIX[key] ?? { category: "VARIABLE", basePrice: 0 };
}

export function isCorridor(originZone: string | null, destinationZone: string | null): boolean {
  if (!originZone || !destinationZone) return false;
  return CORRIDORS.has(`${originZone}→${destinationZone}`);
}

export function hasBorder(originZone: string | null, destinationZone: string | null): boolean {
  return originZone === "Z_BORDER" || destinationZone === "Z_BORDER";
}
