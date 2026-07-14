/**
 * run-shadow-cognition.ts — Coordinador del ciclo cognitivo en shadow mode
 *
 * PR-2F + PR-3A + PR-3B + PR-3C: Orquesta la cadena completa
 *   Signal → Observation → Fact → Evidence → Knowledge → Belief → Decision
 * y envuelve el resultado en un ShadowResult observable.
 *
 * Toda la funcionalidad está protegida por EVIDENCE_SHADOW_MODE (evaluado
 * por el caller — lead.service.ts). El logging de desarrollo se activa
 * con EVIDENCE_SHADOW_LOGGING=true.
 *
 * Nunca lanza excepciones — retorna null si no hay Signal.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-2F, PR-3A, PR-3B, PR-3C
 */

import type { BuildSignalInput } from './build-signal';
import { buildSignal } from './build-signal';
import { buildObservation } from './build-observation';
import { buildFact } from './build-fact';
import { buildEvidence } from './build-evidence';
import { buildKnowledge } from './build-knowledge';
import { buildBelief } from './build-belief';
import { buildDecision } from './build-decision';
import { ShadowResult } from './shadow-result';
import { log } from '@/lib/utils/logger';

/**
 * Feature flag: EVIDENCE_SHADOW_LOGGING
 * true  → Se registra un resumen compacto del ciclo cognitivo en cada turno
 * false → No se registra logging adicional de shadow mode
 */
export function isShadowLoggingEnabled(): boolean {
  return process.env.EVIDENCE_SHADOW_LOGGING === 'true';
}

/**
 * Ejecuta el ciclo cognitivo completo en shadow mode.
 *
 * Construye Signal → Observation → Fact[] → Evidence → Knowledge → Belief → Decision
 * de forma segura. Cada etapa es independiente: si una falla,
 * las siguientes se omiten pero el ShadowResult conserva lo que
 * sí se construyó.
 *
 * @param input — Datos de entrada del pipeline (text, phone, conversationId)
 * @returns ShadowResult con los objetos construidos (o null si Signal falla)
 */
export function runShadowCognition(input: BuildSignalInput): ShadowResult | null {
  // ── Stage 1: Signal ──
  const signal = buildSignal(input);
  if (!signal) {
    return null;
  }

  // ── Stage 2: Observation ──
  const observation = buildObservation(signal);

  // ── Stage 3: Facts (desde Observation + Signal) ──
  let facts: ReturnType<typeof buildFact> = null;
  if (observation) {
    facts = buildFact(observation, signal);
  }

  // ── Stage 4: Evidence (desde Observation + Facts) ──
  let evidence: ReturnType<typeof buildEvidence> = null;
  if (observation && facts) {
    evidence = buildEvidence(observation, facts);
  }

  // ── Stage 5: Knowledge (desde Evidence + Signal + Observation) ──
  let knowledge: ReturnType<typeof buildKnowledge> = null;
  if (evidence) {
    knowledge = buildKnowledge(evidence, signal, observation ?? undefined);
  }

  // ── Stage 6: Belief (desde Knowledge) ──
  let belief: ReturnType<typeof buildBelief> = null;
  if (knowledge) {
    belief = buildBelief(knowledge);
  }

  // ── Stage 7: Decision (desde Belief) ──
  let decision: ReturnType<typeof buildDecision> = null;
  if (belief) {
    decision = buildDecision(belief);
  }

  // ── ShadowResult ──
  const result = new ShadowResult({
    signal,
    observation: observation ?? null,
    facts: facts ?? null,
    evidence: evidence ?? null,
    knowledge: knowledge ?? null,
    belief: belief ?? null,
    decision: decision ?? null,
  });

  // ── Logging condicional (solo si EVIDENCE_SHADOW_LOGGING=true) ──
  if (isShadowLoggingEnabled()) {
    log.info('[SHADOW]', result.toSummary());
  }

  return result;
}
