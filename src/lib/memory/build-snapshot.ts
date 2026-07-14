/**
 * build-snapshot.ts — Snapshot Builder (Belief + Decision → MemorySnapshot)
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Construye un MemorySnapshot a partir de los objetos Belief y Decision
 * del Evidence Engine. Genera metadata (memoryId, turnNumber, storedAt).
 *
 * Reglas:
 *  - C1: Recibe ONLY Belief + Decision (no el ShadowResult completo)
 *  - C9: conversationId es solo partition key
 *  - M-9: No enrichment — no agrega, deriva ni transforma campos
 *  - M-12: No defaults — todos los campos vienen de Belief/Decision
 */

import { createMemorySnapshot } from './memory-snapshot';
import type { MemorySnapshot } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface BuildSnapshotInput {
  /** Belief del Evidence Engine (debe tener isComplete) */
  belief: {
    id: string;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    isWellFormed: boolean;
    factCount: number;
  };
  /** Decision del Evidence Engine */
  decision: {
    id: string;
    validInput: boolean;
    hasContent: boolean;
    readiness: 'ready' | 'partial' | 'invalid';
    missingInfo: readonly string[];
    isDecided: boolean;
    factCount: number;
  };
  /** Operational conversation ID (partition key) */
  conversationId: string;
  /** Siguiente turnNumber para esta conversación */
  turnNumber: number;
}

/**
 * Construye un MemorySnapshot a partir de Belief + Decision.
 * Genera memoryId (UUID v4) y storedAt (Date ahora).
 * Nunca lanza — retorna null si los datos son inválidos.
 *
 * @param input — Belief + Decision + conversationId + turnNumber
 * @returns MemorySnapshot o null si la construcción falla
 */
export function buildSnapshot(input: BuildSnapshotInput): MemorySnapshot | null {
  try {
    const memoryId = crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const storedAt = new Date();

    return createMemorySnapshot({
      conversationId: input.conversationId,
      memoryId,
      turnNumber: input.turnNumber,
      storedAt,
      belief: {
        id: input.belief.id,
        observationValid: input.belief.observationValid,
        channel: input.belief.channel,
        hasContent: input.belief.hasContent,
        receivedAt: input.belief.receivedAt,
        conversationId: input.belief.conversationId,
        isWellFormed: input.belief.isWellFormed,
        factCount: input.belief.factCount,
      },
      decision: {
        id: input.decision.id,
        validInput: input.decision.validInput,
        hasContent: input.decision.hasContent,
        readiness: input.decision.readiness,
        missingInfo: input.decision.missingInfo,
        isDecided: input.decision.isDecided,
        factCount: input.decision.factCount,
      },
    });
  } catch {
    return null;
  }
}
