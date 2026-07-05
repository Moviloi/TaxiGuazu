/**
 * BORDER INFERENCE — AIT-062
 *
 * Árbol de decisión de 3 países (AR/BR/PY):
 *   Cuando el usuario menciona "aduana"/"customs"/"border" como destino
 *   u origen sin especificar lado, inferir el cruce y lado según el país
 *   del otro slot resuelto o del airport_code.
 *
 * PRINCIPIO: SUGERIR, NO DECIDIR.
 *   Toda inferencia con confidence "inferred" requiere confirmación
 *   explícita del usuario (CONFIRMATION_PENDING).
 *
 * CRUCES:
 *   - Tancredo Neves:  Puerto Iguazú (AR) ↔ Foz do Iguaçu (BR)
 *   - Puente Amistad:  Foz do Iguaçu (BR) ↔ Ciudad del Este (PY)
 */

import { getPlaceCountry } from "@/lib/db/database";

// ─── Tipos ─────────────────────────────────────────────────────────────

export type BorderCountry = "AR" | "BR" | "PY";

export type CrossingName = "tancredoNeves" | "puenteAmistad";

export interface BorderInferenceResult {
  /** Nombre canónico del cruce inferido (null si no se pudo inferir) */
  borderName: string | null;
  /** Confianza de la inferencia */
  confidence: "inferred" | "none";
  /** País inferido del contexto del pasajero */
  inferredCountry: BorderCountry | null;
  /** Cruce fronterizo específico */
  crossing: CrossingName | null;
  /** true → requiere confirmación del usuario */
  requiresConfirmation: boolean;
  /** Lado descriptivo para i18n */
  sideKey: string | null;
}

// ─── Constantes ────────────────────────────────────────────────────────

const BORDER_TERM_RE = /\b(aduana|customs?|border|alfândega)\b/i;

// Mapeo de país inferido → nombre de cruce canónico
// Se usa el país INFERIDO para determinar el lado del cruce.
const CROSSING_BY_COUNTRY: Record<BorderCountry, {
  crossing: CrossingName;
  displayName: string;
  sideKey: string;
}> = {
  AR: {
    crossing: "tancredoNeves",
    displayName: "Aduana Argentina (Puente Tancredo Neves)",
    sideKey: "border.ar",
  },
  BR: {
    crossing: "tancredoNeves", // default BR→AR, se sobreescribe si contexto es PY
    displayName: "Aduana Brasileira (Puente Tancredo Neves)",
    sideKey: "border.br",
  },
  PY: {
    crossing: "puenteAmistad",
    displayName: "Aduana Paraguay (Puente de la Amistad)",
    sideKey: "border.py",
  },
};

// (reservado para BR+PY cuando se implemente inferencia multi-tramo)
// const BR_WITH_PY = { crossing: "puenteAmistad" as const, displayName: "Aduana Brasileira (Puente de la Amistad)", sideKey: "border.br_py" };

// ─── Helpers ───────────────────────────────────────────────────────────

/** Determina si un texto es una mención genérica de aduana/frontera. */
export function isBorderTerm(text: string | null | undefined): boolean {
  if (!text) return false;
  return BORDER_TERM_RE.test(text.trim());
}

/**
 * Obtiene el país de un lugar ya resuelto (canonical_name) consultando DB.
 * Retorna null si no se encuentra o si el nombre no es un lugar válido.
 */
async function resolveCountry(canonicalName: string | null): Promise<BorderCountry | null> {
  if (!canonicalName || canonicalName.trim() === "") return null;
  const country = await getPlaceCountry(canonicalName);
  if (country === "Argentina") return "AR";
  if (country === "Brasil") return "BR";
  if (country === "Paraguay") return "PY";
  return null;
}

/**
 * Mapea airport_code a país.
 */
function airportCodeToCountry(code: string | null): BorderCountry | null {
  if (!code) return null;
  const upper = code.toUpperCase();
  if (upper === "IGR") return "AR";
  if (upper === "IGU") return "BR";
  if (upper === "AGT") return "PY";
  return null;
}

// ─── API pública ───────────────────────────────────────────────────────

/**
 * Inferir el lado de frontera según el árbol de decisión de 3 países.
 *
 * @param destinationName - Valor del slot destination (canonical_name o raw text)
 * @param destinationScore - Score del slot destination
 * @param destinationReason - Reason del slot destination
 * @param originName - Valor del slot origin
 * @param originScore - Score del slot origin
 * @param originReason - Reason del slot origin
 * @param airportCode - Valor del slot airport_code (IGR/IGU/AGT o null)
 * @returns BorderInferenceResult
 */
export async function inferBorderSide(
  destinationName: string | null,
  destinationScore: number,
  destinationReason: string,
  originName: string | null,
  originScore: number,
  originReason: string,
  airportCode: string | null,
): Promise<BorderInferenceResult> {
  // ── Detectar si destination u origin es un término de aduana ─────────
  const destIsBorder = isBorderTerm(destinationName) && destinationReason === "unknown_location";
  const originIsBorder = isBorderTerm(originName) && originReason === "unknown_location";

  // Si ninguno es término de aduana, no hay nada que inferir
  if (!destIsBorder && !originIsBorder) {
    return { borderName: null, confidence: "none", inferredCountry: null, crossing: null, requiresConfirmation: false, sideKey: null };
  }

  // ── Determinar el "otro slot" (el que NO es aduana) ─────────────────
  const otherSlotName = destIsBorder ? originName : destinationName;
  const otherSlotScore = destIsBorder ? originScore : destinationScore;

  // ── Señal A: País del otro slot ────────────────────────────────────
  let inferredCountry: BorderCountry | null = null;

  if (otherSlotName && otherSlotScore > 0) {
    inferredCountry = await resolveCountry(otherSlotName);
  }

  // ── Señal B: airport_code ───────────────────────────────────────────
  if (!inferredCountry && airportCode) {
    inferredCountry = airportCodeToCountry(airportCode);
  }

  // ── Si no hay señal, no inferir ─────────────────────────────────────
  if (!inferredCountry) {
    return {
      borderName: null,
      confidence: "none",
      inferredCountry: null,
      crossing: null,
      requiresConfirmation: false,
      sideKey: null,
    };
  }

  // ── Elegir cruce y lado según país inferido ─────────────────────────
  // BR → ambiguo (2 cruces posibles: Tancredo Neves hacia AR, Puente Amistad hacia PY)
  // Solo airport_code IGU (BR) no es suficiente para desambiguar
  if (inferredCountry === "BR") {
    return {
      borderName: null,
      confidence: "none",
      inferredCountry: "BR",
      crossing: null,
      requiresConfirmation: false,
      sideKey: null,
    };
  }

  // AR o PY → cruce determinado unívocamente
  const info = CROSSING_BY_COUNTRY[inferredCountry];
  return {
    borderName: info.displayName,
    confidence: "inferred",
    inferredCountry,
    crossing: info.crossing,
    requiresConfirmation: true,
    sideKey: info.sideKey,
  };
}
