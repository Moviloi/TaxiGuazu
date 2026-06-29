// ⚠️ Geo Engine — geographic reasoning engine.
// DEPRECATED: Location resolution lives in location-resolver.ts.
// Legacy — route/proximity logic only.
// Only route/proximity logic should survive long-term.
// SUBZONE_MAP and NODE_ZONE_MAP removed — superseded by places/aliases DB tables.

// ── Types ──

export interface ZoneResolution {
  originZone: string | null;
  destinationZone: string | null;
  distanceClass: "SHORT" | "MEDIUM" | "LONG";
}

interface ProximityFactors {
  distance: number;
  roadAccess: number;
  aduanaPenalty: number;
  corridorAlignment: number;
}

export interface ProximityScore {
  score: number;
  factors: ProximityFactors;
}

interface ExpansionProbabilities {
  core: number;
  boundary: number;
  transition: number;
}

interface ExpansionNode {
  probs: ExpansionProbabilities;
  subzone?: { name: string };
}

export interface ZoneExpansionResult {
  origin?: ExpansionNode;
  destination?: ExpansionNode;
}

interface GeoRoute {
  originNode: string;
  destinationNode: string;
  originZone: string | null;
  destinationZone: string | null;
  routeType: "SHORT" | "MEDIUM" | "LONG";
  proximityScore: number;
}

// ── Proximity matrix ──

const PAIR_BASE: Record<string, number> = {
  "Z_AIRPORT→Z_CITY_CORE": 0.65,
  "Z_AIRPORT→Z_HOTEL_ZONE": 0.55,
  "Z_AIRPORT→Z_LANDMARK": 0.4,
  "Z_AIRPORT→Z_BORDER": 0.25,
  "Z_CITY_CORE→Z_AIRPORT": 0.65,
  "Z_CITY_CORE→Z_HOTEL_ZONE": 0.8,
  "Z_CITY_CORE→Z_LANDMARK": 0.5,
  "Z_CITY_CORE→Z_BORDER": 0.35,
  "Z_HOTEL_ZONE→Z_AIRPORT": 0.55,
  "Z_HOTEL_ZONE→Z_CITY_CORE": 0.8,
  "Z_HOTEL_ZONE→Z_LANDMARK": 0.45,
  "Z_HOTEL_ZONE→Z_BORDER": 0.3,
  "Z_LANDMARK→Z_AIRPORT": 0.4,
  "Z_LANDMARK→Z_CITY_CORE": 0.5,
  "Z_LANDMARK→Z_HOTEL_ZONE": 0.45,
  "Z_LANDMARK→Z_BORDER": 0.2,
  "Z_BORDER→Z_AIRPORT": 0.25,
  "Z_BORDER→Z_CITY_CORE": 0.35,
  "Z_BORDER→Z_HOTEL_ZONE": 0.3,
  "Z_BORDER→Z_LANDMARK": 0.2,
};

const CORRIDOR_PAIRS = new Set([
  "Z_AIRPORT→Z_CITY_CORE", "Z_CITY_CORE→Z_AIRPORT",
  "Z_AIRPORT→Z_HOTEL_ZONE", "Z_HOTEL_ZONE→Z_AIRPORT",
  "Z_HOTEL_ZONE→Z_CITY_CORE", "Z_CITY_CORE→Z_HOTEL_ZONE",
]);

const ADUANA_PENALTY = 0.5;
const CORRIDOR_BONUS = 0.15;

// ── Proximity algorithm ──

function computeProximity(a: string | null, b: string | null): number {
  if (!a || !b) return 0.3;
  const pairKey = `${a}→${b}`;
  let baseScore = PAIR_BASE[pairKey] ?? 0.3;
  if (a === "Z_BORDER" || b === "Z_BORDER") {
    baseScore = Math.max(0.1, baseScore - ADUANA_PENALTY);
  }
  if (CORRIDOR_PAIRS.has(pairKey)) {
    baseScore = Math.min(1.0, baseScore + CORRIDOR_BONUS);
  }
  let roadAccess = 0.6;
  if (a === "Z_AIRPORT" || b === "Z_AIRPORT") roadAccess = 0.8;
  else if (a === "Z_BORDER" || b === "Z_BORDER") roadAccess = 0.4;
  return Math.round(baseScore * (0.5 + roadAccess * 0.5) * 100) / 100;
}

// ── Trip leg classification ──

export type TripLegType = "airport_to_hotel" | "hotel_to_airport" | "airport_to_airport" | "hotel_to_hotel" | "other";

export function classifyTripLeg(origin: string, destination: string): { type: TripLegType; hotelZone: boolean } {
  const AIRPORT_RE = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
  const HOTEL_RE = /hotel|centro/i;
  const originLower = origin.toLowerCase();
  const destLower = destination.toLowerCase();
  const oAir = AIRPORT_RE.test(originLower);
  const dAir = AIRPORT_RE.test(destLower);
  const oHotel = HOTEL_RE.test(originLower);
  const dHotel = HOTEL_RE.test(destLower);
  const type: TripLegType = oAir && dHotel ? "airport_to_hotel"
    : oHotel && dAir ? "hotel_to_airport"
    : oAir && dAir ? "airport_to_airport"
    : oHotel && dHotel ? "hotel_to_hotel"
    : "other";
  return { type, hotelZone: HOTEL_RE.test(originLower) || HOTEL_RE.test(destLower) };
}

// ── Unified entry point ──
// Zone resolution removed (superseded by location-resolver.ts → places/aliases DB).
// Keeps proximity scoring as algorithmic config.

export function resolveGeoRoute(slots: Record<string, any>): GeoRoute {
  // Zone types no longer resolved from hardcoded maps; DB-backed
  // resolveLocation() in tariff-resolver provides place_id + zone_id.
  const originNode = String(slots?.origin ?? "");
  const destinationNode = String(slots?.destination ?? "");
  const prox = computeProximity(null, null);

  return {
    originNode,
    destinationNode,
    originZone: null,
    destinationZone: null,
    routeType: "MEDIUM",
    proximityScore: prox,
  };
}
