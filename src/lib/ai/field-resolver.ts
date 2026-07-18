// FIELD RESOLVER — single source of truth for "¿qué campo pedir después?"
//
// QB-04 UNIFICATION: This file is the SINGLE authority for field-resolution
// decisions. Downstream consumers must use these functions instead of
// implementing their own completeness checks.
//
// ── resolveNextRequiredField (full authority) ──
//   Used by policy-ahora.ts / policy-reserva.ts for full priority-based
//   field resolution with status (CONFIRMATION_PENDING, USER_CORRECTED) and
//   confidence thresholds.
//
// ── resolveSimpleFieldGap (early blocking) ──
//   Used by extraction-runner.ts for early pipeline blocking. Checks only
//   mandatory field presence (origin, destination). Works with raw values
//   (strings/numbers) OR scored slot objects. Replaces evaluateCompleteness.
//
// Prioridad FASE 20.4 (basada en status semántico, no en reason string):
//   1. CONFIRMATION_PENDING origin/destination (necesitan confirmación antes que todo)
//   2. USER_CORRECTED (corrección pendiente de re-confirmación)
//   3. RAW missing mandatory fields
//   4. Low confidence fields (< 0.7)
//   5. Core facts location_ambiguous (fallback)
//   6. Core facts time/passengers faltantes
//   7. null = todos completos

import type { HandlerContext, ConversationDomain } from "./types";

export interface RequiredField {
  field: "origin" | "destination" | "passengers" | "scheduled_at" | null;
  reason: "missing" | "ambiguous" | "low_confidence" | "complete";
}

/**
 * Simple field gap analysis — SINGLE authority for early pipeline blocking.
 * Replaces evaluateCompleteness as the extraction-runner's field-resolution
 * function. Works with both raw slot values (strings/numbers) AND scored
 * slot objects ({ value, score, ... }).
 *
 * Only checks origin and destination presence — passengers/scheduled_at are
 * handled downstream by resolveNextRequiredField in policy-ahora/reserva.
 *
 * @param slots — Raw slot map (values or scored objects)
 * @param domain — Conversation domain (information domain → always complete)
 * @returns { field: null, reason: "complete" } if all mandatory fields present,
 *          otherwise { field: "origin"|"destination", reason: "missing" }
 */
export function resolveSimpleFieldGap(
  slots: Record<string, any> | null | undefined,
  domain?: ConversationDomain,
): RequiredField {
  if (domain === "information") {
    return { field: null, reason: "complete" };
  }

  const getValue = (key: string): string | null => {
    const s = slots?.[key];
    if (s == null) return null;
    if (typeof s === "object" && s !== null) {
      const v = s.value ?? s;
      return v != null && String(v).trim() !== "" ? String(v).trim() : null;
    }
    return String(s).trim() !== "" ? String(s).trim() : null;
  };

  if (!getValue("origin")) return { field: "origin", reason: "missing" };
  if (!getValue("destination")) return { field: "destination", reason: "missing" };

  return { field: null, reason: "complete" };
}

export function resolveNextRequiredField(
  ctx?: HandlerContext,
  coreFacts?: string[],
): RequiredField {
  const extraction = ctx?.extraction;
  const slots = extraction?.slots ?? {};

  if (!extraction && !coreFacts) return { field: null, reason: "missing" };

  // ── Priority 1: CONFIRMATION_PENDING slots (status-based) ──
  const originStatus = (slots.origin as any)?.status;
  const destStatus = (slots.destination as any)?.status;
  const originSource = (slots.origin as any)?.source;
  const destSource = (slots.destination as any)?.source;

  if (originStatus === "CONFIRMATION_PENDING" && originSource !== "USER_CORRECTED") {
    return { field: "origin", reason: "ambiguous" };
  }
  if (destStatus === "CONFIRMATION_PENDING" && destSource !== "USER_CORRECTED") {
    return { field: "destination", reason: "ambiguous" };
  }

  // ── Priority 2: USER_CORRECTED (corrección pendiente de re-confirmación) ──
  if (originSource === "USER_CORRECTED") return { field: "origin", reason: "ambiguous" };
  if (destSource === "USER_CORRECTED") return { field: "destination", reason: "ambiguous" };

  // ── Priority 3: clarifyField del workflow ──
  const cf = extraction?.clarifyField;
  if (cf === "origin") return { field: "origin", reason: "missing" };
  if (cf === "destination") return { field: "destination", reason: "missing" };
  if (cf === "passengers") return { field: "passengers", reason: "missing" };
  if (cf === "scheduled_at" || cf === "scheduled_at_date" || cf === "scheduled_at_time") {
    return { field: "scheduled_at", reason: "missing" };
  }

  // Fallback a reason-based matching para slots sin status
  if (slots.origin?.reason === "ambiguous_term") return { field: "origin", reason: "ambiguous" };
  if (slots.destination?.reason === "ambiguous_term") return { field: "destination", reason: "ambiguous" };

  // ── Sin datos de extracción: delegar a core facts ──
  const hasExtractionData = Object.keys(slots).length > 0 &&
    Object.values(slots).some(s => s && s.score > 0);

  if (!hasExtractionData && coreFacts) {
    if (!coreFacts.some(f => f.startsWith("origin:"))) return { field: "origin", reason: "missing" };
    if (!coreFacts.some(f => f.startsWith("destination:"))) return { field: "destination", reason: "missing" };
    if (coreFacts.includes("location_ambiguous:true")) return { field: "origin", reason: "ambiguous" };
    if (!coreFacts.some(f => f.startsWith("passengers:"))) return { field: "passengers", reason: "missing" };
    if (!coreFacts.some(f => f.startsWith("time:")) && !coreFacts.some(f => f.startsWith("date:"))) {
      return { field: "scheduled_at", reason: "missing" };
    }
    return { field: null, reason: "missing" };
  }

  // ── Hay datos de extracción ──

  // Priority 4: Core facts origin/destination faltantes
  if (coreFacts) {
    if (!coreFacts.some(f => f.startsWith("origin:"))) return { field: "origin", reason: "missing" };
    if (!coreFacts.some(f => f.startsWith("destination:"))) return { field: "destination", reason: "missing" };
  }

  // Priority 5: Passengers missing/low
  const paxScore = slots.passengers?.score ?? 0;
  if (paxScore < 0.7) return { field: "passengers", reason: paxScore === 0 ? "missing" : "low_confidence" };

  // Priority 6: Scheduled_at missing/low
  const schedScore = slots.scheduled_at?.score ?? 0;
  if (schedScore < 0.7) return { field: "scheduled_at", reason: schedScore === 0 ? "missing" : "low_confidence" };

  // Priority 7: Core facts location_ambiguous (fallback)
  if (coreFacts?.includes("location_ambiguous:true")) return { field: "origin", reason: "ambiguous" };

  // Priority 8: Core facts time/passengers
  if (coreFacts) {
    if (!coreFacts.some(f => f.startsWith("passengers:"))) return { field: "passengers", reason: "missing" };
    if (!coreFacts.some(f => f.startsWith("time:")) && !coreFacts.some(f => f.startsWith("date:"))) {
      return { field: "scheduled_at", reason: "missing" };
    }
  }

  return { field: null, reason: "missing" };
}
