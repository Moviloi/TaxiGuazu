/**
 * memory-service.ts — Memory Service (punto de entrada store())
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Punto de entrada único para escribir snapshots cognitivos.
 * Sigue el patrón Shadow Mode: nunca lanza, nunca bloquea.
 *
 * Reglas:
 *  - C3: Nunca lanza — usa try-catch internamente
 *  - C4: Fire-and-forget — no bloquea el pipeline operacional
 *  - C7: Único punto de entrada (solo store() escribe)
 *  - C8: No lee de la DB operacional
 *  - I1-MEM: Se ejecuta solo si COGNITIVE_MEMORY_ENABLED=true
 *  - I5-MEM: Produce exactamente un snapshot por llamada exitosa
 */

import { buildSnapshot } from './build-snapshot';
import type { MemoryStorage } from './memory-storage';
import type { MemoryStoreInput, MemoryStoreResult } from './types';

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

/**
 * Verifica si el modo Shadow Mode de Memory está habilitado.
 * Sigue el mismo patrón que isEvidenceShadowModeEnabled().
 */
export function isMemoryShadowModeEnabled(): boolean {
  return process.env.COGNITIVE_MEMORY_ENABLED === 'true';
}

// ---------------------------------------------------------------------------
// MemoryService
// ---------------------------------------------------------------------------

export class MemoryService {
  private storage: MemoryStorage;

  constructor(storage: MemoryStorage) {
    this.storage = storage;
  }

  /**
   * Almacena un snapshot cognitivo a partir de Belief + Decision.
   *
   * Flujo:
   *   1. Computa turnNumber (último turnNumber + 1, o 1 si es primero)
   *   2. Construye MemorySnapshot con metadata
   *   3. Persiste el snapshot
   *
   * @param input — Belief + Decision + conversationId
   * @returns MemoryStoreResult (nunca lanza)
   */
  async store(input: MemoryStoreInput): Promise<MemoryStoreResult> {
    try {
      // 1. Compute turnNumber (M-7)
      const maxTurn = await this.storage.getMaxTurnNumber(input.conversationId);
      const turnNumber = maxTurn + 1;

      // 2. Build snapshot
      const snapshot = buildSnapshot({
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
        conversationId: input.conversationId,
        turnNumber,
      });

      if (!snapshot) {
        return { success: false, error: 'Failed to build MemorySnapshot' };
      }

      // 3. Persist
      return await this.storage.insert(snapshot);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }
}
