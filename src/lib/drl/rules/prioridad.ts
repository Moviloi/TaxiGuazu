// DRL Rule — Prioridad: determina qué slots priorizar en extracción/respuesta.
// PR-5D: Nueva regla — guía al LLM sobre el orden de campos a solicitar.
//
// Basado en CE-2: para transfers, el orden canónico de campos es:
//   1. origin      (¿de dónde?)
//   2. destination  (¿adónde?)
//   3. passengers   (¿cuántos?)
//   4. scheduled_at (¿cuándo?)
//
// La prioridad se ajusta según:
//   - conversationState (si estábamos preguntando por un campo específico)
//   - slots ya presentes (no preguntar dos veces por lo mismo)
//   - clientObjective (booking_urgent → priorizar scheduled_at)

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

// ─── Tipos de prioridad ────────────────────────────────────────────────────

export interface PrioridadDetails {
  /** Campos ordenados por prioridad de extracción (mayor prioridad primero) */
  priorityFields: string[];
  /** Campo sugerido para preguntar ahora mismo */
  suggestedNextField: string | null;
  /** Razón de la prioridad */
  rationale: string;
  /** Modo de adquisición sugerido */
  acquisitionMode: "skip" | "minimal" | "normal";
  /** Campos que ya están completos y no deben re-preguntarse */
  completedFields: string[];
  /** Campos que faltan y deberían solicitarse */
  pendingFields: string[];
}

// Orden canónico de slots para transfer
const CANONICAL_ORDER = ["origin", "destination", "passengers", "scheduled_at"];
const ALL_SLOTS = [...CANONICAL_ORDER, "price", "flight", "urgency", "customer_name"];

function isFieldPresent(slots: Record<string, unknown>, field: string): boolean {
  const val = slots[field];
  return val !== undefined && val !== null && val !== "";
}

function isFieldEmpty(slots: Record<string, unknown>, field: string): boolean {
  return !isFieldPresent(slots, field);
}

export const prioridadRule: DRLRule<DRLInput, DRLRuleResult> = (input) => {
  const { slots, conversationState, requiredSlots = [] } = input;

  // Consumir clientObjective y strategyDecision (pasados a través de slots)
  const clientObjective = String(slots.clientObjective ?? "").toLowerCase();
  const urgency = String(slots.urgency ?? "").toLowerCase();

  // 1. Identificar campos completos vs pendientes
  const completedFields = ALL_SLOTS.filter(f => isFieldPresent(slots, f));
  // Los campos pendientes son los requiredSlots que faltan (en orden canónico)
  const canonicalRequiredSlots = CANONICAL_ORDER.filter(s => requiredSlots.includes(s));
  const pendingFields = canonicalRequiredSlots.filter(f => isFieldEmpty(slots, f));

  // 2. Determinar suggestedNextField considerando clientObjective
  let suggestedNextField: string | null = null;

  // Si conversationState indica un clarify_field específico, usarlo
  const clarifyFieldMatch = conversationState?.match(/clarify_field[:_]\s*(\w+)/i);
  if (clarifyFieldMatch && pendingFields.includes(clarifyFieldMatch[1])) {
    suggestedNextField = clarifyFieldMatch[1];
  }

  // Ajustar según ClientObjective
  if (!suggestedNextField) {
    if (clientObjective === "booking_urgent" || urgency === "ahora") {
      // Priorizar scheduled_at (cuándo sale) si es urgente
      if (pendingFields.includes("scheduled_at")) {
        suggestedNextField = "scheduled_at";
      } else if (pendingFields.includes("passengers")) {
        suggestedNextField = "passengers";
      }
    } else if (clientObjective === "inquiry_price") {
      // Priorizar price si preguntan por precio
      if (pendingFields.includes("price")) {
        suggestedNextField = "price";
      } else if (pendingFields.includes("destination")) {
        suggestedNextField = "destination";
      }
    } else if (clientObjective === "booking_future" || clientObjective === "booking_generic") {
      // Para booking futuro, lo más importante es destination + scheduled_at
      if (pendingFields.includes("destination")) {
        suggestedNextField = "destination";
      } else if (pendingFields.includes("scheduled_at")) {
        suggestedNextField = "scheduled_at";
      }
    } else if (clientObjective === "trust_check") {
      // Confianza: priorizar customer_name
      if (pendingFields.includes("customer_name")) {
        suggestedNextField = "customer_name";
      }
    }
  }

  // Si no hay ajuste específico por ClientObjective, usar orden canónico
  if (!suggestedNextField) {
    suggestedNextField = pendingFields[0] ?? null;
  }

  // 3. Construir orden de prioridad
  const priorityFields: string[] = [];

  // Primero el suggestedNextField
  if (suggestedNextField && !priorityFields.includes(suggestedNextField)) {
    priorityFields.push(suggestedNextField);
  }

  // Luego el resto de los pendientes en orden canónico
  for (const field of CANONICAL_ORDER) {
    if (field !== suggestedNextField && pendingFields.includes(field) && !priorityFields.includes(field)) {
      priorityFields.push(field);
    }
  }

  // Luego los campos no canónicos pendientes
  for (const field of ALL_SLOTS) {
    if (!CANONICAL_ORDER.includes(field) && pendingFields.includes(field) && !priorityFields.includes(field)) {
      priorityFields.push(field);
    }
  }

  // 4. Determinar acquisition mode
  const pendingCount = pendingFields.length;
  let acquisitionMode: "skip" | "minimal" | "normal";

  if (pendingCount === 0) {
    acquisitionMode = "skip";
  } else if (pendingCount <= 1) {
    acquisitionMode = "minimal";
  } else {
    acquisitionMode = "normal";
  }

  const rationale = pendingCount === 0
    ? "Todos los campos completos — no requiere adquisición"
    : `Campos pendientes: ${pendingFields.join(", ")} — siguiente: ${suggestedNextField} (clientObjective: ${clientObjective})`;

  const details: PrioridadDetails = {
    priorityFields,
    suggestedNextField,
    rationale,
    acquisitionMode,
    completedFields,
    pendingFields,
  };

  return {
    ruleFamily: "prioridad",
    ruleName: "prioridad-campos",
    passed: pendingCount <= 1, // passed si hay 0-1 campos pendientes
    decision: pendingCount === 0 ? "PROCEED" : "CLARIFY",
    reason: rationale,
    confidence: pendingCount === 0 ? 1.0 : pendingCount <= 2 ? 0.8 : 0.5,
    details: details as unknown as Record<string, unknown>,
  };
};
