/**
 * projection.ts — Proyección 19→11 (PBA-1 Modelo A, PDE-1 §2.2)
 *
 * Función pura que proyecta MemorySnapshot[19] → ProjectedState[11].
 * Memory no participa en esta proyección (PBA-1).
 *
 * R-DEP-4: projection.ts importa exclusivamente de types.ts y externos.
 */

import type { MemorySnapshot } from '@/lib/memory/types';
import type { ProjectedState } from './types';

/**
 * Proyecta un MemorySnapshot a ProjectedState (19→11).
 *
 * Los 11 campos están congelados en PDE-1 §2.2:
 *
 * Metadata (3):  turnNumber, storedAt, conversationId
 * Belief (5):    observationValid, channel, hasContent, isWellFormed, factCount
 * Decision (3):  readiness, isDecided, factCountDecision
 */
export function project(snapshot: MemorySnapshot): ProjectedState {
  return {
    // Metadata
    turnNumber: snapshot.turnNumber,
    storedAt: snapshot.storedAt,
    conversationId: snapshot.conversationId,

    // Belief
    observationValid: snapshot.belief.observationValid,
    channel: snapshot.belief.channel,
    hasContent: snapshot.belief.hasContent,
    isWellFormed: snapshot.belief.isWellFormed,
    factCount: snapshot.belief.factCount,

    // Decision
    readiness: snapshot.decision.readiness,
    isDecided: snapshot.decision.isDecided,
    factCountDecision: snapshot.decision.factCount,
  };
}

/**
 * Proyecta múltiples snapshots en paralelo.
 */
export function projectMany(snapshots: MemorySnapshot[]): ProjectedState[] {
  return snapshots.map(project);
}
