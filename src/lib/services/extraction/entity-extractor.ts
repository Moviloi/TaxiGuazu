// Entity Extractor — known location candidate detection without LLM.
// Runs after regexExtractor, before LLM fallback.
// Only DETECTS candidates (returns raw matched text) — does NOT resolve canonical names.
// Resolution happens downstream via resolveAlias() → aliases/places DB tables.
//
// ARCHITECTURE:
//   Extractor: detects candidates (this file)
//   Resolver: confirms entity from DB (confidence.ts → resolveAlias)

import type { TripExtraction } from "@/lib/ai/extraction-schema";

// Known hotel detection patterns. Matched text is returned raw (not canonical).
const KNOWN_HOTELS: RegExp[] = [
  /\bamerian\b/i,
  /\bmeli[áa]\b/i,
  /\brafain\b/i,
  /\bmabu\b/i,
  /\bpanoramic\b/i,
  /falls\s+hotel\b/i,
  /iguaz[uú]\s+grand\b/i,
  /lo\s+de\s+ramona/i,
  /gran\s+hotel\b/i,
  /hotel\s+igua[zúu]/i,
];

// Known POI detection patterns.
const KNOWN_POIS: RegExp[] = [
  /\baduana\b/i,
  /centro\s+igua[zúu]/i,
  /puerto\s+igua[zúu]/i,
  /\bcataratas\b/i,
  /\bterminal\s+de\s+[oó]mnibus\b/i,
  /\bterminal\b/,
];

// Generic ambiguous terms that should NOT trigger entity extraction
const GENERIC_TERMS_RE = /^(centro|microcentro|hotel|ciudad|aeropuerto|puerto|cerca|zona|alrededores|la\s+ciudad|el\s+centro)$/i;

function findHotelMatch(text: string): string | null {
  for (const pattern of KNOWN_HOTELS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

function findPOIMatch(text: string): string | null {
  for (const pattern of KNOWN_POIS) {
    const match = text.match(pattern);
    if (match) return match[0];
  }
  return null;
}

// Check if the entity appears as a primary noun phrase (not inside a larger
// ambiguous phrase like "en el centro" where "centro" is a generic descriptor).
function isDirectEntityMention(text: string, match: string): boolean {
  if (GENERIC_TERMS_RE.test(match)) return false;
  const lowerText = text.toLowerCase();
  const lowerMatch = match.toLowerCase();
  // Must appear as a standalone phrase, not embedded in another word
  const phraseRe = new RegExp(`\\b${lowerMatch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
  return phraseRe.test(lowerText);
}

export function entityExtractSlots(text: string): TripExtraction | null {
  const lower = text.toLowerCase();

  // ── HOTEL/LANDMARK DETECTION ──
  // Hotels are assigned to destination by default since users mention
  // them as their intended drop-off point.
  const hotel = findHotelMatch(text);
  if (hotel && isDirectEntityMention(text, hotel)) {
    return {
      origin: null,
      destination: hotel,
      passengers: null,
      price: null,
      scheduled_at: null,
      flight: null,
      urgency: null,
      customer_name: null,
    };
  }

  // ── POI DETECTION ──
  // Check if the text has a known POI without explicit directional markers
  // (if markers exist, regexExtractor would have caught it).
  const poi = findPOIMatch(text);
  if (poi && isDirectEntityMention(text, poi)) {
    // Determine if direction is explicit
    const hasOriginMarker = /(?:desde|de|salgo|origen|estoy)\s+.{0,30}?/.test(lower);
    const hasDestMarker = /(?:a|hacia|para|voy|llegada|destino)/.test(lower);

    if (hasOriginMarker && !hasDestMarker) {
      return {
        origin: poi,
        destination: null,
        passengers: null,
        price: null,
        scheduled_at: null,
        flight: null,
        urgency: null,
        customer_name: null,
      };
    }

    return {
      origin: null,
      destination: poi,
      passengers: null,
      price: null,
      scheduled_at: null,
      flight: null,
      urgency: null,
      customer_name: null,
    };
  }

  return null;
}
