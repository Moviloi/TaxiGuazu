/**
 * memory-read.ts — Adaptador MemoryRead (MRC-1, PDE-1 §2.1)
 *
 * Implementa MemoryReadAdapter. Puente directo a la tabla
 * cognitive_memory_snapshots (consultas SQL).
 *
 * R-DEP-3: memory-read.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type { MemorySnapshot } from '@/lib/memory/types';
import type { MemoryReadAdapter, Watermark } from './types';

// ── Tipo del executor de DB ──
interface DbExecutor {
  execute(stmt: { sql: string; args?: any[] }): Promise<{
    rows?: any[];
    lastInsertRowid?: number | bigint;
    rowsAffected?: number;
  }>;
}

// ── Tipo de fila de cognitive_memory_snapshots ──
interface SnapshotRow {
  conversation_id: string;
  memory_id: string;
  turn_number: number;
  stored_at: number;
  belief_id: string;
  belief_observation_valid: number;
  belief_channel: string | null;
  belief_has_content: number;
  belief_received_at: string | null;
  belief_conversation_id: string | null;
  belief_is_well_formed: number;
  belief_fact_count: number;
  decision_id: string;
  decision_valid_input: number;
  decision_has_content: number;
  decision_readiness: string;
  decision_missing_info: string;
  decision_is_decided: number;
  decision_fact_count: number;
}

/**
 * Convierte una fila de la DB a un MemorySnapshot.
 */
function rowToSnapshot(row: SnapshotRow): MemorySnapshot {
  return {
    conversationId: row.conversation_id,
    memoryId: row.memory_id,
    turnNumber: row.turn_number,
    storedAt: new Date(row.stored_at * 1000),
    belief: {
      id: row.belief_id,
      observationValid: row.belief_observation_valid === 1,
      channel: row.belief_channel,
      hasContent: row.belief_has_content === 1,
      receivedAt: row.belief_received_at,
      conversationId: row.belief_conversation_id,
      isWellFormed: row.belief_is_well_formed === 1,
      factCount: row.belief_fact_count,
    },
    decision: {
      id: row.decision_id,
      validInput: row.decision_valid_input === 1,
      hasContent: row.decision_has_content === 1,
      readiness: row.decision_readiness as 'ready' | 'partial' | 'invalid',
      missingInfo: JSON.parse(row.decision_missing_info || '[]') as readonly string[],
      isDecided: row.decision_is_decided === 1,
      factCount: row.decision_fact_count,
    },
  };
}

// ── DefaultMemoryReadAdapter ──

export class DefaultMemoryReadAdapter implements MemoryReadAdapter {
  private db: DbExecutor;

  constructor(db: DbExecutor) {
    this.db = db;
  }

  /**
   * Obtiene snapshots desde un watermark (storedAt) hasta el momento actual.
   */
  async getNewSnapshots(watermark: Watermark): Promise<MemorySnapshot[]> {
    try {
      let sql: string;
      let args: any[];

      if (watermark.lastStoredAt === null) {
        // Primera ejecución: traer todos los snapshots
        sql = `SELECT * FROM cognitive_memory_snapshots ORDER BY stored_at ASC, turn_number ASC`;
        args = [];
      } else {
        // Ejecuciones subsiguientes: desde el watermark
        const fromTimestamp = Math.floor(new Date(watermark.lastStoredAt).getTime() / 1000);
        sql = `SELECT * FROM cognitive_memory_snapshots WHERE stored_at >= ? ORDER BY stored_at ASC, turn_number ASC`;
        args = [fromTimestamp];
      }

      const result = await this.db.execute({ sql, args });

      if (!result.rows || result.rows.length === 0) {
        return [];
      }

      return (result.rows as SnapshotRow[]).map(rowToSnapshot);
    } catch {
      // Best-effort: retornar vacío en error
      return [];
    }
  }

  /**
   * Cuenta snapshots nuevos desde el watermark.
   */
  async countNewSnapshots(watermark: Watermark): Promise<number> {
    try {
      let sql: string;
      let args: any[];

      if (watermark.lastStoredAt === null) {
        sql = `SELECT COUNT(*) as cnt FROM cognitive_memory_snapshots`;
        args = [];
      } else {
        const fromTimestamp = Math.floor(new Date(watermark.lastStoredAt).getTime() / 1000);
        sql = `SELECT COUNT(*) as cnt FROM cognitive_memory_snapshots WHERE stored_at >= ?`;
        args = [fromTimestamp];
      }

      const result = await this.db.execute({ sql, args });

      if (result.rows && result.rows.length > 0) {
        const row = result.rows[0] as { cnt: number };
        return row.cnt;
      }
      return 0;
    } catch {
      return 0;
    }
  }

  /**
   * Obtiene el snapshot más reciente.
   */
  async getLatestSnapshot(): Promise<MemorySnapshot | null> {
    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM cognitive_memory_snapshots ORDER BY stored_at DESC, turn_number DESC LIMIT 1`,
        args: [],
      });

      if (!result.rows || result.rows.length === 0) {
        return null;
      }

      return rowToSnapshot(result.rows[0] as SnapshotRow);
    } catch {
      return null;
    }
  }
}
