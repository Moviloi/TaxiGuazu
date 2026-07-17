// DRL Rule — Clasificación: categoriza la consulta para guiar al LLM.
// CE-3B §3.3: Clasificación semántica del intent a partir de datos estructurados.
// PR-5A: Foundation — stub.
// PR-5D: Implementación real — clasificación del tipo de extracción/respuesta.

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

// ─── Tipos de clasificación ────────────────────────────────────────────────

export type ExtractionType =
  | "initial"           // Primera extracción, sin slots previos
  | "incremental"       // Agregar slots a extracción existente
  | "correction"        // Corregir un slot previamente extraído
  | "clarification"     // El usuario está respondiendo a una pregunta aclaratoria
  | "re_extraction";    // Re-extraer porque el contexto cambió significativamente

export type Complexity =
  | "simple"            // Un solo slot, sin historia relevante
  | "moderate"          // Múltiples slots, historia simple
  | "complex";          // Múltiples slots, historia larga, multi-ride, ambigüedad

export type Priority =
  | "high"              // Urgente (ahora, booking inmediato)
  | "normal"            // Consulta estándar
  | "low";              // Consulta informativa

export interface ClasificacionDetails {
  extractionType: ExtractionType;
  complexity: Complexity;
  priority: Priority;
  /** Justificación de la clasificación */
  rationale: string;
  /** Número de slots presentes antes de esta iteración */
  preFillSlotCount: number;
  /** El mensaje parece ser una respuesta a una pregunta previa */
  isClarificationResponse: boolean;
  /** Hay indicios de corrección en el mensaje */
  isCorrectionIntent: boolean;
}

function detectCorrectionIntent(slots: Record<string, unknown>): boolean {
  // Si hay prevSlots (en el input extendido), podríamos detectar cambios
  // Por ahora, usamos heuristic: si hay prevSlots almacenados en slots con prefijo
  const correctionKeys = Object.keys(slots).filter(k => k.startsWith("_correction"));
  return correctionKeys.length > 0;
}

function detectClarificationResponse(conversationState?: string): boolean {
  if (!conversationState) return false;
  const clarifyStates = ["collecting_slots", "slot_confirmation", "clarify_active"];
  return clarifyStates.some(s => conversationState.includes(s));
}

function estimateComplexity(slots: Record<string, unknown>, conversationState?: string): Complexity {
  const presentSlots = Object.entries(slots).filter(([, v]) => v !== undefined && v !== null && v !== "").length;

  if (presentSlots <= 2 && !conversationState) return "simple";
  if (presentSlots <= 4 || conversationState) return "moderate";
  return "complex";
}

function estimatePriority(slots: Record<string, unknown>): Priority {
  const urgency = String(slots.urgency ?? "").toLowerCase();
  const purchaseIntent = String(slots.purchaseIntent ?? "").toLowerCase();
  const clientObjective = String(slots.clientObjective ?? "").toLowerCase();

  // Alta prioridad: booking urgente, alta intención de compra, urgencia explícita
  if (urgency === "ahora" || urgency === "urgente" || purchaseIntent === "high") return "high";
  if (clientObjective === "booking_urgent" || clientObjective === "booking_future") return "high";

  // Prioridad normal: booking genérico, comparación de opciones
  if (purchaseIntent === "medium" || clientObjective === "booking_generic" || clientObjective === "comparing_options") return "normal";

  // Baja prioridad: consultas informativas, precio, confianza, cancelación
  if (clientObjective === "info_request" || clientObjective === "inquiry_price" || clientObjective === "trust_check" || clientObjective === "cancelling") return "low";

  return "low";
}

export const clasificacionRule: DRLRule<DRLInput, DRLRuleResult> = (input) => {
  const { slots, conversationState } = input;

  // Detectar tipo de extracción
  const preFillSlotCount = Object.values(slots).filter(v => v !== undefined && v !== null && v !== "").length;
  const isClarificationResponse = detectClarificationResponse(conversationState);
  const isCorrectionIntent = detectCorrectionIntent(slots);

  let extractionType: ExtractionType;
  if (preFillSlotCount === 0) {
    extractionType = "initial";
  } else if (isCorrectionIntent) {
    extractionType = "correction";
  } else if (isClarificationResponse) {
    extractionType = "clarification";
  } else if (preFillSlotCount <= 3) {
    extractionType = "incremental";
  } else {
    extractionType = "re_extraction";
  }

  const complexity = estimateComplexity(slots, conversationState);
  const priority = estimatePriority(slots);

  const rationale = `Tipo=${extractionType}, complejidad=${complexity}, prioridad=${priority}, slots-previos=${preFillSlotCount}`;

  const details: ClasificacionDetails = {
    extractionType,
    complexity,
    priority,
    rationale,
    preFillSlotCount,
    isClarificationResponse,
    isCorrectionIntent,
  };

  return {
    ruleFamily: "clasificacion",
    ruleName: "clasificacion-intento",
    passed: true,
    decision: "PROCEED",
    reason: `Clasificación: ${extractionType} (${complexity}, prioridad ${priority})`,
    confidence: complexity === "simple" ? 0.95 : complexity === "moderate" ? 0.8 : 0.6,
    details: details as unknown as Record<string, unknown>,
  };
};
