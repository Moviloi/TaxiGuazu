// DRL Rule — Completitud: verifica que todos los slots requeridos estén presentes.
// CE-3B §3.1: Suficiencia de slots obligatorios.
// PR-5A: Foundation — stub.
// PR-5D: Implementación real — análisis de completitud con ratio, gaps y prioridad.

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

export interface CompletitudDetails {
  totalRequired: number;
  presentCount: number;
  missingCount: number;
  missingFields: string[];
  completenessRatio: number; // 0.0 – 1.0
  /** Campos presentes pero con valor vacío o placeholder */
  presentEmpty: string[];
  /** Nivel de completitud: "complete" | "partial" | "minimal" | "empty" */
  completenessLevel: "complete" | "partial" | "minimal" | "empty";
}

function isSlotEmpty(value: unknown): boolean {
  if (value === undefined || value === null) return true;
  if (typeof value === "string" && value.trim() === "") return true;
  if (typeof value === "number" && (isNaN(value) || value <= 0)) return true;
  return false;
}

export const completitudRule: DRLRule<DRLInput, DRLRuleResult> = (input) => {
  const { slots, requiredSlots } = input;

  // Identificar slots presentes y ausentes
  const missingFields: string[] = [];
  const presentEmpty: string[] = [];
  let presentCount = 0;

  for (const slot of requiredSlots) {
    const val = slots[slot];
    if (isSlotEmpty(val)) {
      if (val !== undefined && val !== null) {
        // Presente pero vacío (string vacía, NaN, 0)
        presentEmpty.push(slot);
      }
      missingFields.push(slot);
    } else {
      presentCount++;
    }
  }

  const totalRequired = requiredSlots.length;
  const completenessRatio = totalRequired > 0 ? presentCount / totalRequired : 1.0;

  // Determinar nivel de completitud
  let completenessLevel: "complete" | "partial" | "minimal" | "empty";
  if (presentCount === totalRequired) {
    completenessLevel = "complete";
  } else if (presentCount >= Math.ceil(totalRequired / 2)) {
    completenessLevel = "partial";
  } else if (presentCount > 0) {
    completenessLevel = "minimal";
  } else {
    completenessLevel = "empty";
  }

  // Decisión basada en completitud
  // - complete → PROCEED
  // - partial → PROCEED (pero baja confianza)
  // - minimal → CLARIFY (necesitamos más datos)
  // - empty → ESCALATE (no hay suficientes datos para operar)
  let decision: "PROCEED" | "CLARIFY" | "ESCALATE";
  let reason: string;
  let passed: boolean;
  let confidence: number;

  switch (completenessLevel) {
    case "complete":
      passed = true;
      decision = "PROCEED";
      confidence = 1.0;
      reason = `Completitud completa: ${presentCount}/${totalRequired} slots presentes`;
      break;
    case "partial":
      passed = true;
      decision = "PROCEED";
      confidence = 0.7;
      reason = `Completitud parcial: ${presentCount}/${totalRequired} slots — faltan: ${missingFields.join(", ")}`;
      break;
    case "minimal":
      passed = false;
      decision = "CLARIFY";
      confidence = 0.4;
      reason = `Completitud mínima: solo ${presentCount}/${totalRequired} slots — requiere clarificación: ${missingFields.join(", ")}`;
      break;
    case "empty":
      passed = false;
      decision = "ESCALATE";
      confidence = 0.1;
      reason = `Completitud vacía: 0/${totalRequired} slots — no hay datos suficientes`;
      break;
  }

  const details: CompletitudDetails = {
    totalRequired,
    presentCount,
    missingCount: missingFields.length,
    missingFields,
    completenessRatio: Math.round(completenessRatio * 100) / 100,
    presentEmpty,
    completenessLevel,
  };

  return {
    ruleFamily: "completitud",
    ruleName: "completitud-requeridos",
    passed,
    decision,
    reason,
    confidence,
    details: details as unknown as Record<string, unknown>,
  };
};
