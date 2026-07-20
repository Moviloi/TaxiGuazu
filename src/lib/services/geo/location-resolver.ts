// ARCHITECTURE NOTE (Phase D): Geo domain — semi-frozen.
// Location resolution, trip classification, and route logic unified.
// DEPRECATED geo-engine.ts — merged into this file.

import { findPlaceByAlias, findPlaceByName } from "@/lib/db/database";

// ── Location types ──

export interface ResolveLocationResult {
  place_id: string | null;
  canonical_name: string | null;
  zone_id: string | null;
  confidence: "exact" | "alias" | "fuzzy" | "not_found";
}

// ── Route types (from deprecated geo-engine.ts) ──

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

// ── Trip leg classification (from deprecated geo-engine.ts) ──

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

// ── Route resolution (stub — zone resolution lives in location-resolver/DB) ──

export function resolveGeoRoute(slots: Record<string, any>): GeoRoute {
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

// ── Location resolution ──

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function removeAccents(text: string): string {
  return text.replace(/[áéíóúüñ]/g, (c) => {
    const map: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
    return map[c] || c;
  });
}

export async function resolveLocation(text: string): Promise<ResolveLocationResult> {
  if (!text || text.trim() === "") {
    return { place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" };
  }
  const raw = text.trim();
  const byAlias = await findPlaceByAlias(normalize(raw));
  if (byAlias) return { ...byAlias, confidence: "alias" };
  const byName = await findPlaceByName(normalize(raw));
  if (byName) return { ...byName, confidence: "exact" };
  const normalizedNoAccent = removeAccents(normalize(raw));
  const fuzzyAlias = await findPlaceByAlias(normalizedNoAccent);
  if (fuzzyAlias) return { ...fuzzyAlias, confidence: "fuzzy" };
  const fuzzyName = await findPlaceByName(normalizedNoAccent);
  if (fuzzyName) return { ...fuzzyName, confidence: "fuzzy" };
  return { place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" };
}

export async function resolveLocationToPlaceId(text: string): Promise<string | null> {
  const result = await resolveLocation(text);
  return result.place_id;
}

// ── Proximity (from deprecated geo-engine.ts) ──
// P1-08: Dual source — hardcoded defaults (fallback) + DB override.
// loadProximityFromDB() reemplaza estos valores con datos de zona_proximity/zone_corridors.
// La función se puede llamar durante startup del servidor.

let _pairBase: Record<string, number> = {
  "Z_AIRPORT→Z_CITY_CORE": 0.65, "Z_AIRPORT→Z_HOTEL_ZONE": 0.55,
  "Z_AIRPORT→Z_LANDMARK": 0.4, "Z_AIRPORT→Z_BORDER": 0.25,
  "Z_CITY_CORE→Z_AIRPORT": 0.65, "Z_CITY_CORE→Z_HOTEL_ZONE": 0.8,
  "Z_CITY_CORE→Z_LANDMARK": 0.5, "Z_CITY_CORE→Z_BORDER": 0.35,
  "Z_HOTEL_ZONE→Z_AIRPORT": 0.55, "Z_HOTEL_ZONE→Z_CITY_CORE": 0.8,
  "Z_HOTEL_ZONE→Z_LANDMARK": 0.45, "Z_HOTEL_ZONE→Z_BORDER": 0.3,
  "Z_LANDMARK→Z_AIRPORT": 0.4, "Z_LANDMARK→Z_CITY_CORE": 0.5,
  "Z_LANDMARK→Z_HOTEL_ZONE": 0.45, "Z_LANDMARK→Z_BORDER": 0.2,
  "Z_BORDER→Z_AIRPORT": 0.25, "Z_BORDER→Z_CITY_CORE": 0.35,
  "Z_BORDER→Z_HOTEL_ZONE": 0.3, "Z_BORDER→Z_LANDMARK": 0.2,
};

let _corridorPairs: Set<string> = new Set([
  "Z_AIRPORT→Z_CITY_CORE", "Z_CITY_CORE→Z_AIRPORT",
  "Z_AIRPORT→Z_HOTEL_ZONE", "Z_HOTEL_ZONE→Z_AIRPORT",
  "Z_HOTEL_ZONE→Z_CITY_CORE", "Z_CITY_CORE→Z_HOTEL_ZONE",
]);

/**
 * Carga proximidad y corredores desde DB (tablas zone_proximity / zone_corridors).
 * Reemplaza los defaults hardcodeados. Seguro de llamar múltiples veces.
 * Si la DB no está disponible, los defaults hardcodeados se conservan.
 */
export async function loadProximityFromDB(): Promise<void> {
  try {
    // No podemos importar query genérico aquí sin crear ciclo,
    // usamos las funciones de dominio específicas.
    // En lugar de hacer N queries, cargamos todo en una pasada.
    const { query } = await import("@/lib/db/core/helpers");
    const rows = await query<{ zone_a: string; zone_b: string; score: number }>(
      "SELECT zone_a, zone_b, score FROM zone_proximity"
    );
    if (rows && rows.length > 0) {
      const newBase: Record<string, number> = {};
      for (const r of rows) {
        newBase[`${r.zone_a}→${r.zone_b}`] = r.score;
      }
      _pairBase = newBase;
    }
    const corridorRows = await query<{ zone_a: string; zone_b: string }>(
      "SELECT zone_a, zone_b FROM zone_corridors"
    );
    if (corridorRows && corridorRows.length > 0) {
      _corridorPairs = new Set(corridorRows.map(r => `${r.zone_a}→${r.zone_b}`));
    }
  } catch {
    // DB no disponible — conservar defaults hardcodeados
  }
}

function computeProximity(a: string | null, b: string | null): number {
  if (!a || !b) return 0.3;
  const pairKey = `${a}→${b}`;
  let baseScore = _pairBase[pairKey] ?? 0.3;
  if (a === "Z_BORDER" || b === "Z_BORDER") baseScore = Math.max(0.1, baseScore - 0.5);
  if (_corridorPairs.has(pairKey)) baseScore = Math.min(1.0, baseScore + 0.15);
  let roadAccess = 0.6;
  if (a === "Z_AIRPORT" || b === "Z_AIRPORT") roadAccess = 0.8;
  else if (a === "Z_BORDER" || b === "Z_BORDER") roadAccess = 0.4;
  return Math.round(baseScore * (0.5 + roadAccess * 0.5) * 100) / 100;
}
