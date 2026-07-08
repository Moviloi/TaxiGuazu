// Passenger Count Parser — Extraction domain.
// Extracted from lead.service.ts (Roadmap Fase 2 — A3).
// Deterministic regex-based passenger count extraction. Layer 1 of the hybrid regex+LLM pattern.

/** Mapa de números en español a dígitos. */
const WORD_TO_NUM: Record<string, number> = {
  un: 1, uno: 1, una: 1,
  dos: 2, tres: 3, cuatro: 4, cinco: 5,
  seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10,
  once: 11, doce: 12, trece: 13, catorce: 14, quince: 15,
  veinte: 20, treinta: 30, cincuenta: 50, cien: 100,
};

/**
 * Intenta extraer un número de pasajeros del texto del usuario.
 * Capa determinista (0ms, sin LLM) del híbrido regex+LLM.
 * Retorna null si no puede determinarlo → invocar fallback LLM.
 */
export function parsePassengerCount(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;

  const resolveNum = (raw: string): number | null => {
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      return n >= 1 && n <= 99 ? n : null;
    }
    return WORD_TO_NUM[raw] ?? null;
  };

  const patterns = [
    /\b(?:un\s+)?(?:grupo|familia|compañ[íi]a|equipo)\s+(?:de|con)\s+(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,
    /\b(?:somos?|viajamos?|vamos?|hay|son|tenemos?|ser[éa]mos?|andamos?)\s+(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,
    /\b(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(?:personas?|pax|pasajeros?|adultos?|nenes?|chicos?|ni[ñn]os?|amigos?|familiares?|bebés?|mayor(?:es)?)\b/i,
    /\b(?:pasajeros?|personas?|pax)\s+(son\s+)?(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,
    /^\s*(\d{1,2})\s*$/,
  ];

  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) {
      const group = m.length >= 3 ? (m[2] || m[1]) : m[1];
      const n = resolveNum(group);
      if (n != null && n >= 1 && n <= 99) return n;
    }
  }

  return null;
}
