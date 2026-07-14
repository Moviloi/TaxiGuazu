/**
 * build-decision.ts — Decision builder para el pipeline cognitivo
 *
 * PR-3C: Construye Decision a partir de Belief.
 * Decision representa el compromiso cognitivo del sistema basado
 * en la creencia consolidada. No decide intención, política ni ruta.
 *
 * No depende de core(), analysis, intent, extraction, LLM,
 * Router, Strategy ni Policy.
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3C
 */

import { Belief } from './belief';
import { Decision } from './decision';
import { buildSafe } from './build-safe';

/**
 * Construye Decision a partir de un Belief.
 *
 * Decision toma los campos epistémicos de Belief y los transforma
 * en una determinación cognitiva:
 *   - observationValid → validInput
 *   - isWellFormed → readiness
 *   - Campos null → missingInfo (auto-diagnóstico)
 *
 * @param belief — Belief fuente
 * @returns Decision, o null si la construcción falla (nunca lanza)
 */
export function buildDecision(belief: Belief): Decision | null {
  // Guard: belief null/undefined no se procesa
  if (!belief) {
    return null;
  }

  return buildSafe(
    () => Decision.fromBelief(belief),
    'DECISION',
    {
      errorMessage: '[EVIDENCE] Failed to build Decision',
      errorContext: { beliefId: belief.id },
    },
  );
}
