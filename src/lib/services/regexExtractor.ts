// Regex Extractor — deterministic slot extraction without LLM.
// v5.0 FASE 5B: runs before entityExtractor and LLM fallback.
// Patterns detect explicit origin/destination markers only.
// No inference, no defaults, no geocoding.

import type { TripExtraction } from "@/lib/ai/extraction-schema";

// Airport codes that can appear as standalone location mentions
const AIRPORT_CODE_RE = /\b(IGR|IGU|AEP|EZE|FTE|COR|ROS|MDZ|BRC|BHI|CTC|CRD|REL|RES|SLA|UAQ|IRJ|PRA|NCJ)\b/i;

// "estoy en X" — user states their current location
const ESTOY_EN_RE = /estoy\s+(?:en|en el|en la|parado en|situado en|ubicado en)\s+(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+|\s+para\s+|\s+a\s+)/i;

// "desde X" / "de X" — explicit origin
const DESDE_RE = /(?:desde|salgo de|parto de|salida de|saliendo de)\s+(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+|\s+a\s+|\s+hacia\s+|\s+para\s+)/i;

// "origen X" — explicit marker (complements CORE's ORIGEN_DESTINO_RE)
const ORIGEN_MARKER_RE = /origen(?:\s*:\s*|\s+)(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+(?:destino|para)\s+)/i;

// "aeropuerto X" — e.g. "aeropuerto IGR", "el aeropuerto"
const AEROPUERTO_RE = /(?:el\s+)?aeropuerto\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,8})\b/i;

// "a X" / "hacia X" / "para X" — explicit destination
const HACIA_RE = /(?:voy\s+)?(?:a|hacia|para|voy a|me dirijo a|vamos a|viajo a|quiero ir a|necesito ir a|tengo que ir a)\s+(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+|\s+desde\s+|\s+de\s+)/i;

// "destino X" — explicit marker
const DESTINO_MARKER_RE = /destino(?:\s*:\s*|\s+)(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+(?:origen|desde)\s+)/i;

// "salida X" / "llegada X" — trip context
const SALIDA_RE = /salida(?:\s*:\s*|\s+)(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+)/i;
const LLEGADA_RE = /llegada(?:\s*:\s*|\s+)(.+?)(?:\s*[,;.!?]|\s*$|\s+y\s+)/i;

function extractAirportCode(text: string): string | null {
  const match = text.match(AIRPORT_CODE_RE);
  if (match) return match[1].toUpperCase();
  return null;
}

function normalize(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function regexExtractSlots(text: string): TripExtraction | null {
  let origin: string | null = null;
  let destination: string | null = null;

  // ── ORIGIN PATTERNS ──

  // 1. "estoy en aeropuerto IGR" or "estoy en el centro"
  const estoyMatch = text.match(ESTOY_EN_RE);
  if (estoyMatch) {
    const raw = normalize(estoyMatch[1]);
    const lower = raw.toLowerCase();
    if (lower === "aeropuerto") {
      const code = extractAirportCode(text);
      origin = code || "Aeropuerto";
    } else {
      // Check if the value contains an airport code (e.g., "aeropuerto IGR")
      const aeroMatch = raw.match(/aeropuerto\s+([A-ZÁÉÍÓÚÑa-záéíóúñ]{2,8})/i);
      if (aeroMatch) {
        origin = aeroMatch[1].toUpperCase();
      } else {
        origin = raw;
      }
    }
  }

  // 2. "desde X" / "salgo de X"
  if (!origin) {
    const desdeMatch = text.match(DESDE_RE);
    if (desdeMatch) {
      origin = normalize(desdeMatch[1]);
    }
  }

  // 3. "origen: X"
  if (!origin) {
    const origenMatch = text.match(ORIGEN_MARKER_RE);
    if (origenMatch) {
      origin = normalize(origenMatch[1]);
    }
  }

  // 4. "salida: X"
  if (!origin) {
    const salidaMatch = text.match(SALIDA_RE);
    if (salidaMatch) {
      origin = normalize(salidaMatch[1]);
    }
  }

  // 5. Standalone "aeropuerto X" (without "estoy en")
  if (!origin) {
    const aeroMatch = text.match(AEROPUERTO_RE);
    if (aeroMatch) {
      origin = aeroMatch[1].toUpperCase();
    }
  }

  // ── DESTINATION PATTERNS ──

  // 6. "voy a X" / "a X" / "hacia X"
  const haciaMatch = text.match(HACIA_RE);
  if (haciaMatch) {
    destination = normalize(haciaMatch[1]);
  }

  // 7. "destino: X"
  if (!destination) {
    const destinoMatch = text.match(DESTINO_MARKER_RE);
    if (destinoMatch) {
      destination = normalize(destinoMatch[1]);
    }
  }

  // 8. "llegada: X"
  if (!destination) {
    const llegadaMatch = text.match(LLEGADA_RE);
    if (llegadaMatch) {
      destination = normalize(llegadaMatch[1]);
    }
  }

  // 9. Pure airport code as destination (e.g., "voy a IGR")
  if (!destination) {
    const code = extractAirportCode(text);
    if (code) {
      // Only assign as destination if there's a directional pattern or no origin assigned
      const hasDirectionalTo = /\b(?:a|hacia|para|hasta)\s+IGR\b/i.test(text);
      if (hasDirectionalTo) {
        destination = code;
      }
    }
  }

  // ── RETURN ──
  if (origin || destination) {
    return {
      origin: origin || null,
      destination: destination || null,
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
