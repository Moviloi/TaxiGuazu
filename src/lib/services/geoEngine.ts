// Geo Engine — unified determinístic geographic reasoning.
// Fase 9.1: consolidates zoneEngine + zoneExpansionEngine + proximityScorer.
// Single entry point for all geo logic.

// ── Types ──

export type NodeType = "AIRPORT" | "HOTEL_ZONE" | "CITY_ZONE" | "BORDER" | "LANDMARK";

export interface Zone {
  id: string;
  label: string;
  basePrice?: number;
}

export interface Subzone {
  name: string;
  weight: number;
  confidence: number;
}

export interface ZoneResolution {
  originZone: string | null;
  destinationZone: string | null;
  distanceClass: "SHORT" | "MEDIUM" | "LONG";
  originSubzone?: Subzone | null;
  destinationSubzone?: Subzone | null;
}

export interface RadialProbs {
  core: number;
  boundary: number;
  transition: number;
}

export interface ExpandedZone {
  zone: string;
  label?: string;
  probs: RadialProbs;
  subzone?: Subzone | null;
}

export interface ZoneExpansionResult {
  origin: ExpandedZone | null;
  destination: ExpandedZone | null;
}

export interface ProximityFactors {
  distance: number;
  roadAccess: number;
  aduanaPenalty: number;
  corridorAlignment: number;
}

export interface ProximityScore {
  score: number;
  factors: ProximityFactors;
}

export interface GeoRoute {
  originNode: string;
  destinationNode: string;
  originZone: string | null;
  destinationZone: string | null;
  routeType: "SHORT" | "MEDIUM" | "LONG";
  proximityScore: number;
  originSubzone?: Subzone | null;
  destinationSubzone?: Subzone | null;
}

// ── Zone definitions ──

export const ZONES: Record<string, Zone> = {
  Z_AIRPORT: { id: "Z_AIRPORT", label: "Zona Aeropuerto" },
  Z_CITY_CORE: { id: "Z_CITY_CORE", label: "Centro / Casco Urbano" },
  Z_HOTEL_ZONE: { id: "Z_HOTEL_ZONE", label: "Zona Hotelera" },
  Z_BORDER: { id: "Z_BORDER", label: "Frontera / Aduana" },
  Z_LANDMARK: { id: "Z_LANDMARK", label: "Atracción Turística" },
  Z_EXTERIOR: { id: "Z_EXTERIOR", label: "Fuera de Área" },
};

export const SUBZONE_MAP: Record<string, Subzone> = {
  amerian: { name: "Amerian", weight: 1.0, confidence: 0.95 },
  meliá: { name: "Meliá", weight: 0.9, confidence: 0.9 },
  melia: { name: "Meliá", weight: 0.9, confidence: 0.9 },
  rafain: { name: "Rafain", weight: 0.85, confidence: 0.9 },
  mabu: { name: "Mabu", weight: 0.8, confidence: 0.85 },
  panoramic: { name: "Panoramic", weight: 0.75, confidence: 0.85 },
  "iguazú grand": { name: "Iguazú Grand", weight: 0.85, confidence: 0.9 },
  "iguazu grand": { name: "Iguazú Grand", weight: 0.85, confidence: 0.9 },
  "selva iryapú": { name: "Selva Iryapú", weight: 0.7, confidence: 0.8 },
  "selva iryapu": { name: "Selva Iryapú", weight: 0.7, confidence: 0.8 },
};

// ── Node → Zone mapping ──

const NODE_ZONE_MAP: Record<string, string> = {
  igr: "Z_AIRPORT",
  igu: "Z_AIRPORT",
  "aeropuerto igr": "Z_AIRPORT",
  aeropuerto: "Z_AIRPORT",
  "centro iguazú": "Z_CITY_CORE",
  "centro iguazu": "Z_CITY_CORE",
  centro: "Z_CITY_CORE",
  "puerto iguazú": "Z_CITY_CORE",
  "puerto iguazu": "Z_CITY_CORE",
  "terminal de ómnibus": "Z_CITY_CORE",
  terminal: "Z_CITY_CORE",
  "ciudad de foz": "Z_CITY_CORE",
  foz: "Z_CITY_CORE",
  "foz do iguacu": "Z_CITY_CORE",
  amerian: "Z_HOTEL_ZONE",
  meliá: "Z_HOTEL_ZONE",
  melia: "Z_HOTEL_ZONE",
  rafain: "Z_HOTEL_ZONE",
  mabu: "Z_HOTEL_ZONE",
  panoramic: "Z_HOTEL_ZONE",
  "iguazú grand": "Z_HOTEL_ZONE",
  "iguazu grand": "Z_HOTEL_ZONE",
  "gran hotel": "Z_HOTEL_ZONE",
  "hotel iguazú": "Z_HOTEL_ZONE",
  "hotel iguazu": "Z_HOTEL_ZONE",
  "lo de ramona": "Z_HOTEL_ZONE",
  "selva iryapú": "Z_HOTEL_ZONE",
  "selva iryapu": "Z_HOTEL_ZONE",
  aduana: "Z_BORDER",
  cataratas: "Z_LANDMARK",
  "iguazú falls": "Z_LANDMARK",
  "iguazu falls": "Z_LANDMARK",
};

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

// ── Helpers ──

function normalize(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[á]/g, "a").replace(/[é]/g, "e")
    .replace(/[í]/g, "i").replace(/[ó]/g, "o").replace(/[ú]/g, "u");
}

function mapNodeToZone(node: string | null | undefined): string | null {
  if (!node || String(node).trim() === "") return null;
  const key = normalize(String(node));
  if (NODE_ZONE_MAP[key]) return NODE_ZONE_MAP[key];
  for (const [name, zone] of Object.entries(NODE_ZONE_MAP)) {
    if (key.includes(name)) return zone;
  }
  return null;
}

function mapNodeToSubzone(node: string | null | undefined): Subzone | null {
  if (!node || String(node).trim() === "") return null;
  const key = normalize(String(node));
  if (SUBZONE_MAP[key]) return SUBZONE_MAP[key];
  for (const [name, sub] of Object.entries(SUBZONE_MAP)) {
    if (key.includes(name)) return sub;
  }
  return null;
}

function computeRouteType(a: string | null, b: string | null): "SHORT" | "MEDIUM" | "LONG" {
  if (!a || !b) return "MEDIUM";
  if (a === b) return "SHORT";
  if (
    (a === "Z_CITY_CORE" && b === "Z_HOTEL_ZONE") ||
    (a === "Z_HOTEL_ZONE" && b === "Z_CITY_CORE")
  ) return "SHORT";
  if (a === "Z_BORDER" || b === "Z_BORDER") return "LONG";
  return "MEDIUM";
}

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

// ── Public API (backward compat) ──

export function resolveZones(slots: Record<string, any>): ZoneResolution {
  const originRaw = slots?.origin ?? null;
  const destinationRaw = slots?.destination ?? null;
  const originZone = mapNodeToZone(originRaw);
  const destinationZone = mapNodeToZone(destinationRaw);
  const distanceClass = computeRouteType(originZone, destinationZone);
  const originSubzone = originZone === "Z_HOTEL_ZONE" ? mapNodeToSubzone(originRaw) : null;
  const destinationSubzone = destinationZone === "Z_HOTEL_ZONE" ? mapNodeToSubzone(destinationRaw) : null;
  return { originZone, destinationZone, distanceClass, originSubzone, destinationSubzone };
}

export function computeProximityScore(
  origin: ExpandedZone | null,
  destination: ExpandedZone | null,
): ProximityScore {
  const originZone = origin?.zone ?? null;
  const destinationZone = destination?.zone ?? null;
  const score = computeProximity(originZone, destinationZone);
  const aduanaPenalty = (originZone === "Z_BORDER" || destinationZone === "Z_BORDER") ? ADUANA_PENALTY : 0;
  const pairKey = originZone && destinationZone ? `${originZone}→${destinationZone}` : "";
  const corridorAlignment = CORRIDOR_PAIRS.has(pairKey) ? CORRIDOR_BONUS : 0;
  let roadAccess = 0.6;
  if (originZone === "Z_AIRPORT" || destinationZone === "Z_AIRPORT") roadAccess = 0.8;
  else if (originZone === "Z_BORDER" || destinationZone === "Z_BORDER") roadAccess = 0.4;
  return {
    score,
    factors: { distance: score, roadAccess, aduanaPenalty, corridorAlignment },
  };
}

export function expandZone(zoneId: string | null, subzone?: Subzone | null): ExpandedZone | null {
  if (!zoneId) return null;
  const profiles: Record<string, RadialProbs> = {
    Z_AIRPORT: { core: 1.0, boundary: 0.6, transition: 0.3 },
    Z_CITY_CORE: { core: 1.0, boundary: 0.7, transition: 0.4 },
    Z_HOTEL_ZONE: { core: 1.0, boundary: 0.65, transition: 0.35 },
    Z_BORDER: { core: 1.0, boundary: 0.5, transition: 0.2 },
    Z_LANDMARK: { core: 1.0, boundary: 0.55, transition: 0.25 },
    Z_EXTERIOR: { core: 1.0, boundary: 0.5, transition: 0.2 },
  };
  return { zone: zoneId, probs: profiles[zoneId] ?? { core: 1.0, boundary: 0.5, transition: 0.3 }, subzone: subzone ?? null };
}

export function expandZones(
  originZone: string | null, destinationZone: string | null,
  originSubzone?: Subzone | null, destinationSubzone?: Subzone | null,
): ZoneExpansionResult {
  return {
    origin: expandZone(originZone, originSubzone),
    destination: expandZone(destinationZone, destinationSubzone),
  };
}

// ── Unified entry point (Fase 9.1) ──

export function resolveGeoRoute(slots: Record<string, any>): GeoRoute {
  const zones = resolveZones(slots);
  const prox = computeProximity(zones.originZone, zones.destinationZone);

  return {
    originNode: String(slots?.origin ?? ""),
    destinationNode: String(slots?.destination ?? ""),
    originZone: zones.originZone,
    destinationZone: zones.destinationZone,
    routeType: zones.distanceClass,
    proximityScore: prox,
    originSubzone: zones.originSubzone,
    destinationSubzone: zones.destinationSubzone,
  };
}
