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
 * Patrones de afirmación/negación del usuario.
 * Usado por lead.service para detectar aceptación/rechazo de oportunidades y confirmaciones.
 * core.ts tiene su propio AFFIRMATION_RE para clasificación de intención (con patrones similares pero no idénticos).
 */
const AFFIRMATIVE_RE = /^(s[ií]|sim|yes|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|s[ií] dale|s[ií] gracias)(?=\s|$|[.,!?;])/i;

export function isAffirmativeMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (AFFIRMATIVE_RE.test(t)) return true;
  const clean = t.replace(/[^a-záéíóúñ\s]/g, "").trim();
  return /\b(ok\b|dale\b|confirmo\b|sim\b|adelante\b|acepto\b|de acuerdo\b|viajamos\b|bueno\b.*\bdale\b)/.test(clean);
}

const NEGATIVE_RE = /^(no\b|n[ãa]o\b|no gracias|no, gracias|no me interesa|no quiero|nop|nah)/i;
export function isNegativeMessage(text: string): boolean {
  return NEGATIVE_RE.test(text.trim().toLowerCase());
}

/**
 * Hoteles y landmarks que requieren clarificación específica.
 * Usado por policy-reserva para preguntar "¿te referís a X en el centro
 * o a otra dirección?".
 */
export const AMBIGUOUS_HOTEL_LANDMARKS_RE =
  /\b(amerian|meli[áa]|panoramic|gran\s+hotel|falls\s+hotel|iguaz[uú]\s+grand|lo\s+de\s+ramona|hotel\s+\w+)\b/i;


