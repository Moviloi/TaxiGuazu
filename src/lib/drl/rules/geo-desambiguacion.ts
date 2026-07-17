// DRL Rule — Geo Desambiguación: reglas determinísticas para resolución de lugares.
// PR-5B: Reemplazo de C3 (interpretAmbiguity) sin LLM.
//
// Cada regla retorna un DRLRuleResult indicando si puede resolver el caso.
// El orquestador en geo-resolver.ts usa estas reglas en cascada.

import type { DRLRule, DRLRuleResult } from "@/lib/drl/types";

// ─── Tipos específicos para geo ───────────────────────────────────────────

export interface GeoDisambiguationInput {
  userText: string;
  candidateCount: number;
  hasResolvedOtherSlot: boolean;
  slotName: "origin" | "destination";
  candidateScores?: number[]; // tourist_relevance_score de cada candidato
}

// ─── Reglas ───────────────────────────────────────────────────────────────

/**
 * G1: Candidato único → resolver directamente.
 */
export const geoSingleCandidateRule: DRLRule<GeoDisambiguationInput, DRLRuleResult> = (input) => {
  const canResolve = input.candidateCount === 1;
  return {
    ruleFamily: "geo-desambiguacion",
    ruleName: "g1-single-candidate",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Single candidate — deterministic resolution"
      : `${input.candidateCount} candidates — cannot resolve`,
    confidence: canResolve ? 1.0 : 0.2,
    details: { candidateCount: input.candidateCount },
  };
};

/**
 * G2: Inferencia contextual — el otro slot resuelto proporciona contexto de país.
 */
export const geoContextualInferenceRule: DRLRule<GeoDisambiguationInput, DRLRuleResult> = (input) => {
  const canResolve = input.hasResolvedOtherSlot && input.candidateCount >= 2;
  return {
    ruleFamily: "geo-desambiguacion",
    ruleName: "g2-contextual-inference",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Context available — attempting contextual inference"
      : "No resolved other slot — no context available",
    confidence: canResolve ? 0.85 : 0.1,
    details: { hasContext: input.hasResolvedOtherSlot, candidateCount: input.candidateCount },
  };
};

/**
 * G3: Alta confianza de entidad — un candidato domina claramente en relevance.
 */
export const geoHighEntityConfidenceRule: DRLRule<GeoDisambiguationInput, DRLRuleResult> = (input) => {
  if (!input.candidateScores || input.candidateScores.length < 2) {
    return {
      ruleFamily: "geo-desambiguacion",
      ruleName: "g3-high-entity-confidence",
      passed: false,
      decision: "ESCALATE",
      reason: "Insufficient candidate scores to evaluate",
      confidence: 0.1,
    };
  }

  const sorted = [...input.candidateScores].sort((a, b) => b - a);
  const best = sorted[0];
  const second = sorted[1];

  const canResolve = best > 50 && best > second * 2;
  return {
    ruleFamily: "geo-desambiguacion",
    ruleName: "g3-high-entity-confidence",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? `Best candidate score ${best} dominates (${second} ×2 threshold)`
      : `Best candidate score ${best} insufficient or no clear dominance`,
    confidence: canResolve ? 0.9 : 0.3,
    details: { bestScore: best, secondScore: second, threshold: second * 2 },
  };
};

/**
 * G4: Risk node detectado (aeropuerto/centro/aduana) + contexto → resolución probable.
 */
export const geoRiskNodeRule: DRLRule<GeoDisambiguationInput, DRLRuleResult> = (input) => {
  // El risk node detection necesita el texto crudo — se pasa por el slotName como hint
  // La lógica real está en el orquestador; esta regla solo evalúa si el DRL puede proceder
  const canResolve = input.hasResolvedOtherSlot && input.candidateCount >= 2;
  return {
    ruleFamily: "geo-desambiguacion",
    ruleName: "g4-risk-node",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Risk node with context — deterministic resolution possible"
      : "Risk node without context — cannot resolve",
    confidence: canResolve ? 0.8 : 0.15,
    details: { hasContext: input.hasResolvedOtherSlot, slotName: input.slotName },
  };
};

/**
 * G5: Alias exacto en DB — el texto del usuario coincide con un alias conocido.
 */
export const geoAliasExactRule: DRLRule<GeoDisambiguationInput, DRLRuleResult> = (input) => {
  // El orquestador ejecuta resolveLocation() para alias matching
  // Esta regla evalúa si vale la pena intentarlo
  const canResolve = input.candidateCount >= 2 && input.userText.length >= 3;
  return {
    ruleFamily: "geo-desambiguacion",
    ruleName: "g5-alias-exact",
    passed: canResolve,
    decision: canResolve ? "PROCEED" : "ESCALATE",
    reason: canResolve
      ? "Text length sufficient — attempting alias match"
      : "Text too short or insufficient candidates",
    confidence: canResolve ? 0.75 : 0.1,
    details: { textLength: input.userText.length, candidateCount: input.candidateCount },
  };
};
