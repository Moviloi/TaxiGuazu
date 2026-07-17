// DRL Rule — Escalamiento: decide si el caso debe escalarse a un LLM más potente.
// CE-3B §3.5: Escalamiento cuando las reglas determinísticas no bastan.
// PR-5A: Foundation — stub.
// PR-5D: Implementación real — evaluación de complejidad para escalamiento.
//
// Escala a Gemini cuando:
//   1. La clasificación detecta complejidad "complex"
//   2. Hay conflictos de severidad "high"
//   3. Múltiples reglas fallan concurrentemente
//   4. Se detectan indicadores de multi-ride o estructura compleja

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

export type EscalamientoTarget = "GROQ" | "GEMINI" | null;
export type EscalamientoReason =
  | "simple"                    // Sin necesidad de escalamiento
  | "high_complexity"           // Consulta compleja
  | "high_conflict"             // Conflictos severos
  | "multi_rule_failure"        // Múltiples reglas fallaron
  | "multi_ride_detected"       // Multi-ride necesita LLM más potente
  | "low_confidence";           // Confianza general baja

export interface EscalamientoDetails {
  shouldEscalate: boolean;
  escalateTo: EscalamientoTarget;
  reason: EscalamientoReason;
  /** Señales que dispararon el escalamiento */
  signals: string[];
  /** Confianza en la decisión de escalamiento */
  escalationConfidence: number;
}

// Indicadores de multi-ride en texto (tomados de extract-slots.ts)
function hasMultiRideIndicators(slots: Record<string, unknown>): boolean {
  // Verificar si hay legs array con múltiples entradas
  const legs = slots.legs;
  if (Array.isArray(legs) && legs.length > 1) {
    return true;
  }

  // Verificar texto del usuario
  const text = String(slots._userText ?? "").toLowerCase();
  const indicators = [
    /\b(?:ride|leg|trip|viaje|tramo)\s+\d\b/i,
    /(?:primero|first).+(?:luego|despu[eé]s|then|second)/i,
    /(?:pick up|recoger|buscar).+(?:drop off|dejar|deixar).+(?:pick up|recoger|buscar)/i,
  ];
  return indicators.some((re) => re.test(text));
}

function estimateBaseComplexity(slots: Record<string, unknown>): number {
  // 0.0 = simple, 1.0 = muy complejo
  let complexity = 0.0;

  // Más slots presentes = más complejo (pero no lineal)
  const filledSlots = Object.values(slots).filter(v => v !== undefined && v !== null && v !== "").length;
  complexity += Math.min(filledSlots * 0.1, 0.4);

  // Si hay legs (multi-ride), alta complejidad
  if (slots.legs && Array.isArray(slots.legs) && slots.legs.length > 1) {
    complexity += 0.3;
  }

  // Si hay flight, puede ser un caso complejo (traslado aeropuerto con horario específico)
  if (slots.flight) complexity += 0.1;

  return Math.min(complexity, 1.0);
}

export const escalamientoRule: DRLRule<DRLInput, DRLRuleResult> = (input) => {
  const { slots } = input;

  const signals: string[] = [];
  const complexity = estimateBaseComplexity(slots);
  const isMultiRide = hasMultiRideIndicators(slots);

  // Evaluar condiciones de escalamiento
  let shouldEscalate = false;
  let target: EscalamientoTarget = null;
  let escReason: EscalamientoReason;
  let escalationConfidence: number;

  if (isMultiRide) {
    signals.push("multi_ride_detected");
    shouldEscalate = true;
    target = "GEMINI";
    escReason = "multi_ride_detected";
    escalationConfidence = 0.9;
  } else if (complexity > 0.7) {
    signals.push(`high_complexity:${complexity.toFixed(2)}`);
    shouldEscalate = true;
    target = "GEMINI";
    escReason = "high_complexity";
    escalationConfidence = 0.7;
  } else if (complexity > 0.4) {
    // Complejidad media → escalar solo si hay otros factores
    signals.push(`moderate_complexity:${complexity.toFixed(2)}`);
    shouldEscalate = false;
    target = null;
    escReason = "simple";
    escalationConfidence = 0.6;
  } else {
    escReason = "simple";
    escalationConfidence = 0.95;
  }

  const reason = shouldEscalate
    ? `Escalamiento necesario: ${signals.join(", ")} → ${target}`
    : `Sin escalamiento necesario (complejidad: ${complexity.toFixed(2)})`;

  const details: EscalamientoDetails = {
    shouldEscalate,
    escalateTo: target,
    reason: escReason,
    signals,
    escalationConfidence,
  };

  return {
    ruleFamily: "escalamiento",
    ruleName: "escalamiento-llm",
    passed: !shouldEscalate,
    decision: shouldEscalate ? "ESCALATE" : "PROCEED",
    reason,
    confidence: escalationConfidence,
    details: details as unknown as Record<string, unknown>,
  };
};
