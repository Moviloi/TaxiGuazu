export interface SlotStateEntry {
  value: string | number;
  source: string;
  status: string;
}

interface SlotInput {
  value: string | number | null;
  score: number;
  reason?: string;
}

export function buildSlotStates(
  currentSlots: Record<string, SlotInput>,
  previousSlotStates: Record<string, SlotStateEntry> | null,
  hasCorrection: boolean,
  hasAffirmation: boolean,
  prevSlotValues: Record<string, string>,
): Record<string, SlotStateEntry> {
  const result: Record<string, SlotStateEntry> = {};

  const prevStates = previousSlotStates ?? {};

  for (const [k, slot] of Object.entries(currentSlots)) {
    if (slot.value == null || String(slot.value).trim() === "") continue;

    let source: string;
    let status: string;

    // Compute base source/status from extraction reason + score
    if (slot.reason === "user_confirmed") {
      source = "USER_CONFIRMED";
      status = "CONFIRMED";
    } else if (slot.reason === "ambiguous_term") {
      source = "SYSTEM_INFERRED";
      status = "CONFIRMATION_PENDING";
    } else if (slot.score >= 1.0) {
      source = "SYSTEM_INFERRED";
      status = "CONFIRMED";
    } else if (slot.score > 0) {
      source = "SYSTEM_INFERRED";
      status = "INFERRED";
    } else {
      source = "SYSTEM_INFERRED";
      status = "RAW";
    }

    // Preserve previous CONFIRMED status if value unchanged (not a correction/affirmation event)
    const prev = prevStates[k];
    if (prev && prev.status === "CONFIRMED" && !hasCorrection && !hasAffirmation) {
      if (String(slot.value) === String(prev.value)) {
        source = prev.source;
        status = "CONFIRMED";
      }
    }

    // AIT-060: airport_code — distingue entre código explícito del usuario
    // (CONFIRMED, no requiere confirmación) e inferencia del sistema
    // (CONFIRMATION_PENDING, requiere confirmación).
    if (k === "airport_code" && slot.value != null) {
      if (hasAffirmation) {
        source = "USER_CONFIRMED";
        status = "CONFIRMED";
      } else if (slot.reason === "user_confirmed") {
        source = "USER_CONFIRMED";
        status = "CONFIRMED";
      } else if (slot.reason === "explicit" || slot.score >= 1.0) {
        // Usuario escribió el código explícitamente (entity-extractor / regex)
        source = "USER_PROVIDED";
        status = "CONFIRMED";
      } else if (slot.score > 0) {
        // Sistema infirió basado en ciudad/contexto (airport-inference)
        source = "SYSTEM_INFERRED";
        status = "CONFIRMATION_PENDING";
      } else {
        // Sin puntaje ni razón — seguridad: requiere confirmación
        source = "SYSTEM_INFERRED";
        status = "CONFIRMATION_PENDING";
      }
    }

    // Apply correction override (value changed from previous)
    if (hasCorrection && (k === "origin" || k === "destination")) {
      const prevVal = prevSlotValues[k];
      if (prevVal != null && String(slot.value) !== String(prevVal)) {
        source = "USER_CORRECTED";
        status = "CONFIRMATION_PENDING";
      }
    }

    // Apply affirmation override
    if (hasAffirmation && (k === "origin" || k === "destination")) {
      source = "USER_CONFIRMED";
      status = "CONFIRMED";
    }

    result[k] = { value: slot.value, source, status };
  }

  // Carry over slots not in current extraction but present in previous states
  for (const [k, prev] of Object.entries(prevStates)) {
    if (!result[k]) {
      result[k] = { value: prev.value, source: prev.source, status: prev.status };
    }
  }

  return result;
}
