/**
 * build-fact.ts — Fact builder para el pipeline cognitivo
 *
 * PR-2D: Construye Facts estructurales a partir de una Observation.
 * No depende de core(), analysis, intent, extracción, LLM ni StrategyDecision.
 * Observation es la única fuente epistémica.
 *
 * Facts iniciales (solo estructurales):
 *   - "observation validated"       → el sistema validó correctamente el mensaje
 *   - "signal received via <canal>" → el canal por el que se recibió el mensaje
 *   - "message content present"     → el mensaje tiene contenido textual
 *   - "received timestamp known"    → el timestamp de recepción está disponible
 *   - "conversation identified"     → la conversación está referenciada
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-2D
 */

import { Fact } from './fact';
import { Observation } from './observation';
import { Signal } from './signal';
import { Source } from './source';
import { Confidence } from './confidence';
import { buildSafe } from './build-safe';

/**
 * Construye Facts estructurales a partir de una Observation.
 *
 * Observation es la única fuente epistémica: el sistema observó
 * un mensaje y ahora extrae hechos atómicos sobre esa observación.
 * Signal provee el contexto estructural (canal, contenido, timestamp).
 *
 * @param observation — Observation previamente validada (epistemic source)
 * @param signal — Signal original que originó la Observation (structural context)
 * @returns Array de Facts estructurales, o null si la construcción falla (nunca lanza)
 */
export function buildFact(observation: Observation, signal?: Signal): Fact[] | null {
  // Guard: observation null/undefined no se procesa
  if (!observation) {
    return null;
  }

  return buildSafe(
    () => {
      const facts: Fact[] = [];

      // ── Fact 1: Observation validated ──
      // "el sistema validó correctamente el mensaje"
      facts.push(
        Fact.create({
          type: 'note',
          proposition: `observation validated with status ${observation.status}`,
          source: Source.directExtraction('observation.status'),
          confidence: Confidence.DIRECT_EXTRACTION,
        }),
      );

      // ── Fact 2: Signal channel (si hay Signal) ──
      if (signal && signal.channel) {
        facts.push(
          Fact.create({
            type: 'note',
            proposition: `signal received via ${signal.channel} channel`,
            source: Source.directExtraction('signal.channel'),
            confidence: Confidence.DIRECT_EXTRACTION,
          }),
        );
      }

      // ── Fact 3: Message content present ──
      if (signal && signal.rawContent && signal.rawContent.length > 0) {
        facts.push(
          Fact.create({
            type: 'note',
            proposition: 'message content present',
            source: Source.directExtraction('signal.rawContent'),
            confidence: Confidence.DIRECT_EXTRACTION,
          }),
        );
      }

      // ── Fact 4: Timestamp known ──
      if (signal && signal.receivedAt instanceof Date && !isNaN(signal.receivedAt.getTime())) {
        facts.push(
          Fact.create({
            type: 'note',
            proposition: `received at ${signal.receivedAt.toISOString()}`,
            source: Source.directExtraction('signal.receivedAt'),
            confidence: Confidence.DIRECT_EXTRACTION,
          }),
        );
      }

      // ── Fact 5: Conversation identified ──
      if (
        signal &&
        signal.metadata &&
        typeof signal.metadata === 'object' &&
        'conversationId' in signal.metadata &&
        signal.metadata.conversationId !== undefined
      ) {
        facts.push(
          Fact.create({
            type: 'note',
            proposition: `conversation identified as ${String(signal.metadata.conversationId)}`,
            source: Source.directExtraction('signal.metadata.conversationId'),
            confidence: Confidence.DIRECT_EXTRACTION,
          }),
        );
      }

      return facts;
    },
    'FACT',
    {
      errorMessage: '[EVIDENCE] Failed to build Fact',
      errorContext: {
        observationId: observation.id,
        signalId: observation.signalId,
      },
    },
  );
}
