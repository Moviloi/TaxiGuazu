// DRL Rule — Suficiencia: evalúa si la información es suficiente para proceder sin LLM.
// CE-3B §3.4: Suficiencia informacional (no solo presencia, sino calidad).
// PR-5A: Foundation — stub.
// PR-5C: Implementación real — reglas para determinar si contexto es suficiente
//         para evitar llamadas LLM en C4 (reinterpretation) y C6 (recovery).

import type { DRLRule, DRLRuleResult, DRLInput } from "@/lib/drl/types";

// ─── Stub original (PR-5A) — mantiene compatibilidad hacia atrás ─────────

export const suficienciaRule: DRLRule<DRLInput, DRLRuleResult> = (_input) => {
  return {
    ruleFamily: "suficiencia",
    ruleName: "suficiencia-informacional",
    passed: true,
    decision: "PROCEED",
    reason: "[STUB] Suficiencia rule — always passes in PR-5A",
    confidence: 1.0,
  };
};

// ─── Input types específicos ──────────────────────────────────────────────

export interface SuficienciaInput {
  /** Indica si la sesión tiene al menos un slot resuelto (origin o destination) */
  hasAnySlotResolved: boolean;
  /** Indica si la sesión tiene ambos slots (origin y destination) resueltos */
  hasBothSlotsResolved: boolean;
  /** Cantidad de slots resueltos */
  resolvedSlotCount: number;
  /** Indica si el texto del usuario contiene menciones de lugares conocidos */
  hasLocationMention: boolean;
  /** Indica si hay roleLock disponible con datos de ubicación */
  hasRoleLockLocation: boolean;
  /** Indica si los facts contienen location_ambiguous:true */
  hasLocationAmbiguousFact: boolean;
  /** Indica si los facts contienen referencias a origin o destination */
  hasLocationFact: boolean;
  /** Puntaje de comprensión (0.0-1.0) */
  comprehensionScore: number;
  /** Tipo de evaluación: "reinterpret" para C4, "recovery" para C6 */
  evaluationType: "reinterpret" | "recovery";
}

// ─── Regla S1: Suficiencia por slots completos ────────────────────────────
// Si ambos slots están resueltos, podemos generar una pregunta de confirmación.
export const s1SlotsComplete: DRLRule<SuficienciaInput, DRLRuleResult> = (input) => {
  const canResolve = input.hasBothSlotsResolved;
  return {
    ruleFamily: "suficiencia",
    ruleName: "s1-slots-complete",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Ambos slots (origin y destination) están resueltos — suficiente para generar confirmación"
      : "No hay ambos slots resueltos — no se puede generar confirmación sin contexto",
    confidence: canResolve ? 1.0 : 0.1,
    details: { resolvedSlotCount: input.resolvedSlotCount },
  };
};

// ─── Regla S2: Suficiencia por slot parcial ───────────────────────────────
// Si al menos un slot está resuelto, podemos preguntar por el faltante.
export const s2SlotPartial: DRLRule<SuficienciaInput, DRLRuleResult> = (input) => {
  const canResolve = input.hasAnySlotResolved && !input.hasBothSlotsResolved;
  return {
    ruleFamily: "suficiencia",
    ruleName: "s2-slot-partial",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Un slot resuelto — suficiente para preguntar por el faltante"
      : "Ningún slot resuelto — no hay contexto parcial disponible",
    confidence: canResolve ? 0.9 : 0.15,
    details: { resolvedSlotCount: input.resolvedSlotCount },
  };
};

// ─── Regla S3: Suficiencia por mención de ubicación ───────────────────────
// Si el texto menciona lugares conocidos, podemos preguntar con referencia.
export const s3LocationMention: DRLRule<SuficienciaInput, DRLRuleResult> = (input) => {
  const canResolve = input.hasLocationMention && !input.hasAnySlotResolved;
  return {
    ruleFamily: "suficiencia",
    ruleName: "s3-location-mention",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Texto menciona lugar conocido — suficiente para pregunta contextual"
      : "Sin menciones de ubicación — no hay contexto para pregunta contextual",
    confidence: canResolve ? 0.7 : 0.2,
    details: { hasLocationMention: input.hasLocationMention },
  };
};

// ─── Regla S4: Suficiencia para recovery por contexto de facts ────────────
// Para C6 (recovery), si hay facts de ubicación o roleLock, podemos responder.
export const s4RecoveryContext: DRLRule<SuficienciaInput, DRLRuleResult> = (input) => {
  if (input.evaluationType !== "recovery") {
    return {
      ruleFamily: "suficiencia",
      ruleName: "s4-recovery-context",
      passed: false,
      decision: "ESCALATE",
      reason: "No aplica para evaluación de reinterpretación",
      confidence: 0.1,
    };
  }
  const canResolve = input.hasRoleLockLocation || input.hasLocationFact || input.hasLocationMention;
  return {
    ruleFamily: "suficiencia",
    ruleName: "s4-recovery-context",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Contexto de recuperación disponible (facts/roleLock/mención) — suficiente para recovery determinístico"
      : "Sin contexto de recuperación — no se puede generar recovery sin LLM",
    confidence: canResolve ? 0.8 : 0.15,
    details: {
      hasRoleLockLocation: input.hasRoleLockLocation,
      hasLocationFact: input.hasLocationFact,
    },
  };
};
