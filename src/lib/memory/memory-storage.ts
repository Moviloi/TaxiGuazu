/**
 * memory-storage.ts — Persistence abstraction for Memory snapshots
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Define la interfaz abstracta de persistencia y su implementación
 * concreta sobre Turso/libSQL.
 *
 * Invariantes:
 *  - M-1: Append-only (solo insert, nunca update/delete)
 *  - M-6: Particionado por conversationId
 *  - M-7: Monotonic — turnNumber verificable vía getMaxTurnNumber
 */

import type { MemorySnapshot, MemoryStoreResult } from './types';

// ---------------------------------------------------------------------------
// MemoryStorage — Interfaz abstracta
// ---------------------------------------------------------------------------

export interface MemoryStorage {
  /**
   * Inserta un snapshot cognitivo.
   * Append-only: nunca actualiza ni elimina registros existentes (M-1).
   * Nunca lanza — retorna MemoryStoreResult.
   */
  insert(snapshot: MemorySnapshot): Promise<MemoryStoreResult>;

  /**
   * Obtiene el máximo turnNumber para una conversación.
   * Usado para computar el siguiente turnNumber (M-7).
   * Retorna 0 si no hay snapshots previos.
   */
  getMaxTurnNumber(conversationId: string): Promise<number>;
}

// ---------------------------------------------------------------------------
// SqliteMemoryStorage — Implementación sobre Turso/libSQL
// ---------------------------------------------------------------------------

/**
 * Implementación de MemoryStorage sobre la base de datos Turso/libSQL.
 * Utiliza la tabla cognitive_memory_snapshots creada en initSchema().
 */
export class SqliteMemoryStorage implements MemoryStorage {
  private db: { execute(stmt: { sql: string; args?: any[] }): Promise<{ rows?: any[]; lastInsertRowid?: number | bigint; rowsAffected?: number }> };

  constructor(db: { execute(stmt: { sql: string; args?: any[] }): Promise<{ rows?: any[]; lastInsertRowid?: number | bigint; rowsAffected?: number }> }) {
    this.db = db;
  }

  async insert(snapshot: MemorySnapshot): Promise<MemoryStoreResult> {
    try {
      const missingInfoJson = JSON.stringify([...snapshot.decision.missingInfo]);
      const storedAtUnix = Math.floor(snapshot.storedAt.getTime() / 1000);

      await this.db.execute({
        sql: `INSERT INTO cognitive_memory_snapshots (
          conversation_id, memory_id, turn_number, stored_at,
          belief_id, belief_observation_valid, belief_channel, belief_has_content,
          belief_received_at, belief_conversation_id, belief_is_well_formed, belief_fact_count,
          decision_id, decision_valid_input, decision_has_content, decision_readiness,
          decision_missing_info, decision_is_decided, decision_fact_count
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          snapshot.conversationId,
          snapshot.memoryId,
          snapshot.turnNumber,
          storedAtUnix,
          snapshot.belief.id,
          snapshot.belief.observationValid ? 1 : 0,
          snapshot.belief.channel,
          snapshot.belief.hasContent ? 1 : 0,
          snapshot.belief.receivedAt,
          snapshot.belief.conversationId,
          snapshot.belief.isWellFormed ? 1 : 0,
          snapshot.belief.factCount,
          snapshot.decision.id,
          snapshot.decision.validInput ? 1 : 0,
          snapshot.decision.hasContent ? 1 : 0,
          snapshot.decision.readiness,
          missingInfoJson,
          snapshot.decision.isDecided ? 1 : 0,
          snapshot.decision.factCount,
        ],
      });

      return { success: true };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      return { success: false, error: errorMsg };
    }
  }

  async getMaxTurnNumber(conversationId: string): Promise<number> {
    try {
      const result = await this.db.execute({
        sql: 'SELECT MAX(turn_number) as max_turn FROM cognitive_memory_snapshots WHERE conversation_id = ?',
        args: [conversationId],
      });
      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as { max_turn: number | null };
        return row.max_turn ?? 0;
      }
      return 0;
    } catch {
      return 0;
    }
  }
}
