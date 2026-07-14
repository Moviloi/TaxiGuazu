/**
 * build-signal.ts — Signal builder para el pipeline
 *
 * PR-2B: Construye un Signal a partir de datos ya disponibles
 * en el pipeline. No inventa datos, no consulta fuentes externas,
 * no ejecuta IA.
 *
 * Protegido por feature flag EVIDENCE_SHADOW_MODE.
 * Nunca lanza excepciones — retorna null si falla.
 * Nunca afecta el flujo principal del pipeline.
 */

import { Signal } from './signal';
import { buildSafe } from './build-safe';

export interface BuildSignalInput {
  /** Texto crudo del mensaje del usuario */
  text: string;
  /** Número de teléfono del remitente */
  phone?: string;
  /** ID de la conversación */
  conversationId?: number;
}

/**
 * Construye un Signal a partir de datos del pipeline.
 *
 * @param input — Datos disponibles en el punto de construcción
 * @returns Signal válido, o null si la construcción falla (nunca lanza)
 */
export function buildSignal(input: BuildSignalInput): Signal | null {
  return buildSafe(
    () => {
      const meta: Record<string, unknown> = {};
      if (input.phone !== undefined) meta.phone = input.phone;
      if (input.conversationId !== undefined) meta.conversationId = input.conversationId;
      const metadata = Object.keys(meta).length > 0 ? meta : undefined;

      return Signal.create({
        id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        rawContent: input.text,
        channel: 'whatsapp',
        subtype: 'message',
        receivedAt: new Date(),
        metadata,
      });
    },
    'SIGNAL',
    {
      errorMessage: '[EVIDENCE] Failed to build Signal',
      errorContext: { textPreview: input.text?.slice(0, 80) ?? '' },
    },
  );
}

/**
 * Feature flag: EVIDENCE_SHADOW_MODE
 * true  → Signal se construye en shadow mode (solo log, sin efecto)
 * false → Comportamiento exactamente idéntico al actual (no se construye Signal)
 */
export function isEvidenceShadowModeEnabled(): boolean {
  return process.env.EVIDENCE_SHADOW_MODE === 'true';
}
