/**
 * memory-snapshot.ts — MemorySnapshot Value Object
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Value Object inmutable que representa el estado cognitivo preservado
 * de un turno conversacional completo.
 *
 * Invariantes:
 *  - M-5: Inmutable (Object.freeze en constructor)
 *  - M-8: Contiene EXACTAMENTE un Belief + un Decision (atómico)
 *  - M-12: Todos los campos provienen de Belief/Decision, excepto metadata
 *  - M-14: storedAt es distinto de receivedAt (separación temporal)
 */

import type { MemorySnapshot } from './types';

/**
 * Crea un MemorySnapshot validando todas las invariantes.
 * Retorna el snapshot o null si alguna invariante falla (nunca lanza).
 */
export function createMemorySnapshot(params: {
  conversationId: string;
  memoryId: string;
  turnNumber: number;
  storedAt: Date;
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
  decision: {
    id: string;
    validInput: boolean;
    hasContent: boolean;
    readiness: 'ready' | 'partial' | 'invalid';
    missingInfo: readonly string[];
    isDecided: boolean;
    factCount: number;
  };
}): MemorySnapshot | null {
  // Validar campos obligatorios
  if (!params.conversationId || typeof params.conversationId !== 'string') return null;
  if (!params.memoryId || typeof params.memoryId !== 'string') return null;
  if (typeof params.turnNumber !== 'number' || params.turnNumber < 1 || !Number.isInteger(params.turnNumber)) return null;
  if (!(params.storedAt instanceof Date) || isNaN(params.storedAt.getTime())) return null;

  // Validar Belief
  if (!params.belief.id || typeof params.belief.id !== 'string') return null;
  if (typeof params.belief.factCount !== 'number' || params.belief.factCount < 0) return null;

  // Validar Decision
  if (!params.decision.id || typeof params.decision.id !== 'string') return null;
  const validReadiness = ['ready', 'partial', 'invalid'] as const;
  if (!validReadiness.includes(params.decision.readiness as any)) return null;
  if (typeof params.decision.factCount !== 'number' || params.decision.factCount < 0) return null;

  // Construir snapshot inmutable
  const snapshot: MemorySnapshot = {
    conversationId: params.conversationId,
    memoryId: params.memoryId,
    turnNumber: params.turnNumber,
    storedAt: params.storedAt,
    belief: {
      id: params.belief.id,
      observationValid: params.belief.observationValid,
      channel: params.belief.channel,
      hasContent: params.belief.hasContent,
      receivedAt: params.belief.receivedAt,
      conversationId: params.belief.conversationId,
      isWellFormed: params.belief.isWellFormed,
      factCount: params.belief.factCount,
    },
    decision: {
      id: params.decision.id,
      validInput: params.decision.validInput,
      hasContent: params.decision.hasContent,
      readiness: params.decision.readiness,
      missingInfo: Object.freeze([...params.decision.missingInfo]),
      isDecided: params.decision.isDecided,
      factCount: params.decision.factCount,
    },
  };

  Object.freeze(snapshot.belief);
  Object.freeze(snapshot.decision);
  Object.freeze(snapshot);

  return snapshot;
}
