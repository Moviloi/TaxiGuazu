/**
 * build-evidence.ts — Evidence builder para el pipeline cognitivo
 *
 * PR-2E: Construye Evidence a partir de Observation + Facts estructurales.
 * No enriquece Facts, no genera nuevos Facts, no modifica Confidence.
 * Evidence únicamente agrega y encapsula Facts bajo una misma Observation.
 *
 * No depende de core(), analysis, intent, extracción, LLM ni StrategyDecision.
 * Observation es la única fuente epistémica.
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-2E
 */

import { Evidence } from './evidence';
import { Observation } from './observation';
import { Fact } from './fact';
import { buildSafe } from './build-safe';

/**
 * Construye Evidence a partir de una Observation y sus Facts asociados.
 *
 * Evidence encapsula un conjunto consistente de Facts derivados de una
 * misma Observation. El tipo es 'user_input' porque proviene directamente
 * de la entrada del usuario (a través de Signal → Observation → Facts).
 *
 * @param observation — Observation que originó los Facts (epistemic source)
 * @param facts — Facts estructurales extraídos de la Observation
 * @returns Evidence válido, o null si la construcción falla (nunca lanza)
 */
export function buildEvidence(observation: Observation, facts: Fact[]): Evidence | null {
  // Guard: observation null/undefined o facts vacío no se procesa
  if (!observation) {
    return null;
  }
  if (!Array.isArray(facts) || facts.length === 0) {
    return null;
  }

  return buildSafe(
    () => Evidence.fromObservation(observation.id, facts, 'user_input'),
    'EVIDENCE',
    {
      errorMessage: '[EVIDENCE] Failed to build Evidence',
      errorContext: {
        observationId: observation.id,
        factCount: facts.length,
      },
    },
  );
}
