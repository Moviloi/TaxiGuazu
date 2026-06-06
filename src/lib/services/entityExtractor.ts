// Entity Extractor — known location lookup without LLM.
// v5.0 FASE 5B: runs after regexExtractor, before LLM fallback.
// Detects registered hotels, POIs, and structured points of interest.
// Only matches when the entity name appears as a primary mention.

import type { TripExtraction } from "@/lib/ai/extraction-schema";

// Known hotels and landmarks. These are safe to assign to destination
// when mentioned without directional context (users mention hotels
// as their intended drop-off point).
const KNOWN_HOTELS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\bamerian\b/i, canonical: "Amerian" },
  { pattern: /\bmeli[áa]\b/i, canonical: "Meliá" },
  { pattern: /\brafain\b/i, canonical: "Rafain" },
  { pattern: /\bmabu\b/i, canonical: "Mabu" },
  { pattern: /\bpanoramic\b/i, canonical: "Panoramic" },
  { pattern: /falls\s+hotel\b/i, canonical: "Falls Hotel" },
  { pattern: /iguaz[uú]\s+grand\b/i, canonical: "Iguazú Grand" },
  { pattern: /lo\s+de\s+ramona/i, canonical: "Lo de Ramona" },
  { pattern: /gran\s+hotel\b/i, canonical: "Gran Hotel" },
  { pattern: /hotel\s+igua[zúu]/i, canonical: "Hotel Iguazú" },
];

// Known POIs and structured reference points
const KNOWN_POIS: { pattern: RegExp; canonical: string }[] = [
  { pattern: /\baduana\b/i, canonical: "Aduana" },
  { pattern: /centro\s+igua[zúu]/i, canonical: "Centro Iguazú" },
  { pattern: /puerto\s+igua[zúu]/i, canonical: "Puerto Iguazú" },
  { pattern: /\bcataratas\b/i, canonical: "Cataratas" },
  { pattern: /\bterminal\s+de\s+[oó]mnibus\b/i, canonical: "Terminal de Ómnibus" },
  { pattern: /\bterminal\b/, canonical: "Terminal" },
];

// Generic ambiguous terms that should NOT trigger entity extraction
const GENERIC_TERMS_RE = /^(centro|microcentro|hotel|ciudad|aeropuerto|puerto|cerca|zona|alrededores|la\s+ciudad|el\s+centro)$/i;

function findHotelMatch(text: string): string | null {
  for (const hotel of KNOWN_HOTELS) {
    if (hotel.pattern.test(text)) {
      return hotel.canonical;
    }
  }
  return null;
}

function findPOIMatch(text: string): string | null {
  for (const poi of KNOWN_POIS) {
    if (poi.pattern.test(text)) {
      return poi.canonical;
    }
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
