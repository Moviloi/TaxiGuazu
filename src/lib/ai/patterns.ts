// PATTERNS — patrones compartidos de ubicación ambigua y términos genéricos.
// Fuente ÚNICA para AMBIGUOUS_LOCATION_TERMS.
// Todos los archivos importan desde acá en lugar de definir sus propias listas.
//
// Historia: existían 3 definiciones distintas en core.ts, confidence.ts y
// policy-reserva.ts. Esta es la versión unificada que combina todas.

/**
 * Términos genéricos de ubicación que requieren clarificación.
 * Regex para pruebas de matching simple (isAmbiguous, slotStability).
 */
export const AMBIGUOUS_LOCATION_RE = /\b(centro|microcentro|ciudad|aeropuerto|puerto|la ciudad|a la ciudad|cerca|zona|alrededores|hotel|iguaz[uú])\b/i;

/**
 * Términos genéricos de ubicación como array.
 * Para fuzzy matching estilo `some(t => text.includes(t))`.
 */
export const AMBIGUOUS_LOCATION_TERMS = [
  "ciudad", "centro", "aeropuerto", "puerto", "microcentro",
  "la ciudad", "a la ciudad", "cerca", "zona", "alrededores",
  "hotel", "iguazú",
];

/**
 * Fuente ÚNICA para AFFIRMATION_RE.
 * Unifica los patrones que antes vivían duplicados en core.ts y patterns.ts.
 * Incluye tokens de afirmación en español, portugués (sim) e inglés (yes).
 * Usa negative lookahead `(?![a-záéíóúñ])` para no cortar palabras con acentos.
 */
export const AFFIRMATION_RE = /^(s[ií] confirmo|s[ií] dale|s[ií] gracias|as[ií] est[aá] bien|est[aá] bien as[ií]|todo correcto|de acuerdo|confirmado|perfecto|adelante|mandale|correcto|todo bien|est[aá] bien|confirmo|listo|s[ií]|sim|yes|yrs|yeah|yep|ok|okey|dale)(?![a-záéíóúñ])/i;

export function isAffirmativeMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (AFFIRMATION_RE.test(t)) return true;
  // Fallback: detectar tokens sueltos incluso con ruido (espacios extra, puntuación)
  const clean = t.replace(/[^a-záéíóúñ\s]/g, "").trim();
  return /\b(ok\b|dale\b|confirmo\b|sim\b|adelante\b|acepto\b|de acuerdo\b|viajamos\b|bueno\b.*\bdale\b|yrs\b|yeah\b|yep\b)/.test(clean);
}

const NEGATIVE_RE = /^(no\b|n[ãa]o\b|no gracias|no, gracias|no me interesa|no quiero|nop|nah)/i;
export function isNegativeMessage(text: string): boolean {
  return NEGATIVE_RE.test(text.trim().toLowerCase());
}

const CORRECTION_RE = /^\s*(no\s*,?\s+|me\s+equivoqu[ée]|es\s+otro\s+(lugar|sitio|destino|origen)|cambi[oóié]\s+(el\s+)?(origen|destino|direcci[óo]n)|corrijo|rectifico|en\s+realidad\s+(es|ser[íi]a)|dec[íi]a\s+mal|me\s+confund[ií]|no,\s*estoy\s+en|no,\s*voy\s+(a|para)|no\s+es\s+eso)/i;
export function isCorrectionMessage(text: string): boolean {
  return CORRECTION_RE.test(text.trim().toLowerCase());
}

/**
 * Hoteles y landmarks que requieren clarificación específica.
 * Usado por policy-reserva para preguntar "¿te referís a X en el centro
 * o a otra dirección?".
 */
export const AMBIGUOUS_HOTEL_LANDMARKS_RE =
  /\b(amerian|meli[áa]|panoramic|gran\s+hotel|falls\s+hotel|iguaz[uú]\s+grand|lo\s+de\s+ramona|hotel\s+\w+)\b/i;
