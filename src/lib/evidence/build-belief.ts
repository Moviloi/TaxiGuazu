/**
 * build-belief.ts — Belief builder para el pipeline cognitivo
 *
 * PR-3B: Construye Belief a partir de Knowledge.
 * Belief representa el compromiso epistémico del sistema basado
 * en el conocimiento consolidado. No infiere, no decide.
 *
 * No depende de core(), analysis, intent, extraction, LLM,
 * Router, Strategy ni Policy.
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3B
 */

import { Knowledge } from './knowledge';
import { Belief } from './belief';
import { buildSafe } from './build-safe';

/**
 * Construye Belief a partir de un Knowledge.
 *
 * Belief toma los campos consolidados de Knowledge y los transforma
 * en el compromiso epistémico del sistema:
 *   - observationStatus → observationValid (boolean)
 *   - channel, hasContent, receivedAt, conversationId se transfieren
 *
 * @param knowledge — Knowledge fuente
 * @returns Belief, o null si la construcción falla (nunca lanza)
 */
export function buildBelief(knowledge: Knowledge): Belief | null {
  // Guard: knowledge null/undefined no se procesa
  if (!knowledge) {
    return null;
  }

  return buildSafe(
    () => Belief.fromKnowledge(knowledge),
    'BELIEF',
    {
      errorMessage: '[EVIDENCE] Failed to build Belief',
      errorContext: { knowledgeId: knowledge.id },
    },
  );
}
