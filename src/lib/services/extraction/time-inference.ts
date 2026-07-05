// TIME INFERENCE — Operational Intelligence Layer (AIT-061)
//
// Heurística determinista que infiere un horario de pickup sugerido
// cuando el usuario menciona una fecha pero NO una hora, y el destino
// tiene horario de apertura conocido.
//
// ÁRBOL DE DECISIÓN (3 pasos):
//
//   1. ¿El usuario ya dio scheduled_at con hora explícita?
//        → No inferir (usuario ya especificó hora).
//
//   2. ¿El destino está en la lista de atracciones con horario fijo?
//        → Sugerir pickup = apertura - 15 min. Requiere confirmación.
//
//   3. Sin destino con horario conocido
//        → No inferir. El usuario debe especificar la hora.
//
// PRINCIPIO: SUGERIR, NO DECIDIR.
//   Toda inferencia con confidence "inferred" requiere confirmación
//   explícita del usuario vía botón (CONFIRMATION_PENDING en slot-state).
//
// NOTA: Este módulo NO decide el valor final del slot. Solo SUGIERE
//   una hora. La integración en el pipeline (extraction-runner) debe
//   combinar el resultado con la fecha existente de scheduled_at.
//   La confirmación se maneja en slot-state.ts vía buildSlotStates().

// ─── Tipos públicos ──────────────────────────────────────────────────────────

export interface TimeInferenceResult {
  /** Hora inferida en formato HH:MM (ej: "07:45"), null si no se infirió */
  inferredTime: string | null;
  /** Nombre del destino que disparó la inferencia */
  triggeredBy: string | null;
  /**
   * "explicit" → usuario ya dio hora, no se infiere nada.
   * "inferred" → sistema infirió hora basado en horario de atracción.
   * "none" → no aplica (sin destino conocido, sin fecha, etc.)
   */
  confidence: "explicit" | "inferred" | "none";
  /** true si se necesita confirmación del usuario antes de usar */
  requiresConfirmation: boolean;
  /** Texto descriptivo del porqué (ej: "apertura del parque 08:00") */
  displayReason: string | null;
}

// ─── Atracciones con horario fijo → pickup sugerido (apertura - 15 min) ────
//
// Fuente: data/knowledge/geo/attractions.json
// Solo se incluyen atracciones con horario de apertura fijo y conocido.
// Atracciones sin horario (Itaipú, Güirá Oga, Hito Argentino) y eventos
// especiales (Paseo Luna Llena, Macuco Safari) no se incluyen porque su
// horario varía por temporada, requiere reserva previa, o es 24/7.

const ATTRACTION_PICKUP: Record<string, { pickup: string; reason: string }> = {
  "Parque Nacional Iguazú (Lado Argentino)": {
    pickup: "07:45",
    reason: "apertura del parque 08:00",
  },
  "Parque Nacional do Iguaçu (Lado Brasileño)": {
    pickup: "08:45",
    reason: "apertura del parque 09:00",
  },
  "Parque das Aves (Foz do Iguaçu)": {
    pickup: "08:15",
    reason: "apertura 08:30",
  },
  "Minas de Wanda": {
    pickup: "07:15",
    reason: "apertura 07:30",
  },
  "San Ignacio Miní": {
    pickup: "07:15",
    reason: "apertura 07:30",
  },
  "Saltos del Moconá": {
    pickup: "09:15",
    reason: "apertura 09:30",
  },
  "Marco das Três Fronteiras (Brasil)": {
    pickup: "14:45",
    reason: "apertura 15:00 (mar-dom)",
  },
};

// ─── API pública ─────────────────────────────────────────────────────────────

/**
 * Inferir horario de pickup sugerido según el árbol de decisión de 3 pasos.
 *
 * @param destination - Nombre canónico del destino resuelto (de places DB).
 *   Puede ser null si no se ha resuelto aún.
 * @param facts - Facts del core() (para detectar si hay mención de fecha).
 * @param currentScheduledAt - Valor actual de scheduled_at en slots
 *   (null si no hay, string fecha ISO si ya se computó).
 *   Si contiene "T", el usuario ya especificó hora → no inferir.
 * @returns TimeInferenceResult con la sugerencia
 */
export function inferPickupTime(
  destination: string | null,
  facts: string[],
  currentScheduledAt: string | null,
): TimeInferenceResult {
  // ── PASO 1: Usuario ya dio scheduled_at con hora explícita ────────────────
  if (currentScheduledAt != null && currentScheduledAt.includes("T")) {
    return {
      inferredTime: null,
      triggeredBy: null,
      confidence: "explicit",
      requiresConfirmation: false,
      displayReason: null,
    };
  }

  // Si no hay fecha (ni en facts ni en scheduled_at), no tiene sentido inferir
  const hasDate =
    facts.some(f => f.startsWith("date:"))
    || currentScheduledAt != null;

  if (!hasDate) {
    return {
      inferredTime: null,
      triggeredBy: null,
      confidence: "none",
      requiresConfirmation: false,
      displayReason: null,
    };
  }

  // ── PASO 2: Destino con horario conocido → sugerir pickup ────────────────
  if (destination != null && ATTRACTION_PICKUP[destination] !== undefined) {
    const info = ATTRACTION_PICKUP[destination];
    return {
      inferredTime: info.pickup,
      triggeredBy: destination,
      confidence: "inferred",
      requiresConfirmation: true,
      displayReason: info.reason,
    };
  }

  // ── PASO 3: Sin destino con horario conocido ─────────────────────────────
  return {
    inferredTime: null,
    triggeredBy: null,
    confidence: "none",
    requiresConfirmation: false,
    displayReason: null,
  };
}

/**
 * Devuelve la lista completa de atracciones con horario inferible.
 * Útil para tests y documentación.
 */
export function getInferableDestinations(): string[] {
  return Object.keys(ATTRACTION_PICKUP);
}

/**
 * Devuelve el pickup sugerido para un destino si está en la lista.
 */
export function getPickupForDestination(destination: string): string | null {
  return ATTRACTION_PICKUP[destination]?.pickup ?? null;
}
