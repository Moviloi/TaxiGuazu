/**
 * build-observation.ts — Observation builder para el pipeline
 *
 * PR-2C: Construye una Observation a partir de un Signal válido.
 * No depende de core(), analysis, intent, extracción ni LLM.
 *
 * Observation representa únicamente:
 *   "el sistema observó correctamente una señal"
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 */

import { Observation } from './observation';
import { Signal } from './signal';
import { buildSafe } from './build-safe';

/**
 * Construye una Observation a partir de un Signal.
 *
 * La Observation se crea con status 'valid' porque en este punto
 * del pipeline el Signal ya ha superado todas las validaciones
 * de canal (webhook autenticado, formato válido, etc.).
 *
 * @param signal — Signal previamente construido
 * @returns Observation válida, o null si la construcción falla (nunca lanza)
 */
export function buildObservation(signal: Signal): Observation | null {
  // Guard: signal null/undefined no se procesa (equivale a "no se observó nada")
  if (!signal) {
    return null;
  }

  return buildSafe(
    () => Observation.fromSignal(signal, 'valid'),
    'OBSERVATION',
    {
      errorMessage: '[EVIDENCE] Failed to build Observation',
      errorContext: {
        signalId: signal.id,
        rawPreview: signal.rawContent.slice(0, 80),
      },
    },
  );
}
