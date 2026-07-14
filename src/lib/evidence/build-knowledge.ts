/**
 * build-knowledge.ts — Knowledge builder para el pipeline cognitivo
 *
 * PR-3A + PR-3D.1: Construye Knowledge a partir de un Evidence más
 * fuentes estructuradas (Signal, Observation). Ya no parsea
 * proposiciones de Facts — extrae datos directamente.
 *
 * No depende de core(), analysis, intent, extraction, LLM,
 * Router, Strategy ni Policy.
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3A, PR-3D.1
 */

import { Evidence } from './evidence';
import { Signal } from './signal';
import { Observation } from './observation';
import { Knowledge } from './knowledge';
import { buildSafe } from './build-safe';

/**
 * Construye Knowledge a partir de un Evidence más fuentes estructuradas.
 *
 * PR-3D.1: Los campos se extraen directamente de Signal y Observation,
 * no de proposiciones de Facts. Esto elimina el string parsing frágil.
 *
 * @param evidence — Evidence fuente (requerido)
 * @param signal — Signal original (opcional, datos estructurados)
 * @param observation — Observation derivada (opcional, datos estructurados)
 * @returns Knowledge consolidado, o null si la consolidación falla (nunca lanza)
 */
export function buildKnowledge(
  evidence: Evidence,
  signal?: Signal,
  observation?: Observation,
): Knowledge | null {
  // Guard: evidence null/undefined no se procesa
  if (!evidence) {
    return null;
  }

  return buildSafe(
    () => Knowledge.consolidate(evidence, signal, observation),
    'KNOWLEDGE',
    {
      errorMessage: '[EVIDENCE] Failed to build Knowledge',
      errorContext: {
        evidenceId: evidence.id,
        factCount: evidence.facts.length,
      },
    },
  );
}
