// BKE Domain — Geo: resolución de lugares, alias y zonas.
// PR-5A: Foundation — stub original.
// PR-5B: Implementación real de desambiguación determinística (C3 replacement).

import type { BKEResult, GeoQuery, PlaceMatch } from "@/lib/bke/types";
import { resolveGeoAmbiguity } from "@/lib/bke/services/geo-resolver";
import type { GeoResolutionResult } from "@/lib/bke/services/geo-resolver";
import { resolveLocation } from "@/lib/services/geo/location-resolver";

const DOMAIN = "geo";

/**
 * Resuelve un lugar a partir de texto libre.
 * Usa location-resolver (alias → exact → fuzzy) para matching determinístico.
 */
export async function resolvePlace(query: GeoQuery): Promise<BKEResult<PlaceMatch> | null> {
  const resolved = await resolveLocation(query.text);
  if (resolved.confidence === "not_found" || !resolved.place_id || !resolved.canonical_name) {
    return { data: null, source: "geo-resolver", confidence: 0 };
  }

  const confidenceMap: Record<string, number> = { exact: 1.0, alias: 0.95, fuzzy: 0.8 };
  return {
    data: {
      placeId: resolved.place_id,
      canonicalName: resolved.canonical_name,
      zoneId: resolved.zone_id,
      city: "",
      country: "",
      score: confidenceMap[resolved.confidence] ?? 0.5,
      aliases: [],
    },
    source: "geo-resolver",
    confidence: confidenceMap[resolved.confidence] ?? 0.5,
  };
}

/** Shorthand para acceso directo al resolver de ambigüedad (PR-5B) */
export { resolveGeoAmbiguity };
export type { GeoResolutionResult };

export function getDomainName(): string {
  return DOMAIN;
}
