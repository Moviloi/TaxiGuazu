// ARCHITECTURE NOTE (Phase D): Geo domain — semi-frozen.
// Alongside geoEngine.ts (DEPRECATED but kept for backward compat).
// Location resolution should eventually be unified into a single geo service.
// No changes until Geo domain is unblocked for refactor.

import { findPlaceByAlias, findPlaceByName } from "@/lib/db/database";

export interface ResolveLocationResult {
  place_id: string | null;
  canonical_name: string | null;
  zone_id: string | null;
  confidence: "exact" | "alias" | "fuzzy" | "not_found";
}

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

  // 1. Exact alias match → place
  const byAlias = await findPlaceByAlias(normalize(raw));
  if (byAlias) {
    return { ...byAlias, confidence: "alias" };
  }

  // 2. Exact canonical name match → place
  const byName = await findPlaceByName(normalize(raw));
  if (byName) {
    return { ...byName, confidence: "exact" };
  }

  // 3. Fuzzy alias match (accent-insensitive)
  const normalizedNoAccent = removeAccents(normalize(raw));
  const fuzzyAlias = await findPlaceByAlias(normalizedNoAccent);
  if (fuzzyAlias) {
    return { ...fuzzyAlias, confidence: "fuzzy" };
  }

  // 4. Fuzzy canonical name match (accent-insensitive)
  const fuzzyName = await findPlaceByName(normalizedNoAccent);
  if (fuzzyName) {
    return { ...fuzzyName, confidence: "fuzzy" };
  }

  return { place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" };
}

export async function resolveLocationToPlaceId(text: string): Promise<string | null> {
  const result = await resolveLocation(text);
  return result.place_id;
}
