/**
 * memory-storage.test.ts — Pruebas del SqliteMemoryStorage
 *
 * IM-1: Verifica:
 *  - insert() exitoso
 *  - getMaxTurnNumber() retorna 0 para conversación nueva
 *  - getMaxTurnNumber() retorna el máximo correcto
 *  - M-1: Append-only (solo insert)
 */

import { describe, it, expect, beforeEach } from "vitest";
import { SqliteMemoryStorage } from "@/lib/memory";
import type { MemorySnapshot, MemoryStoreResult } from "@/lib/memory";

// ---------------------------------------------------------------------------
// Mock DB Executor
// ---------------------------------------------------------------------------

function createMockDb() {
  const tables: Record<string, any[]> = {};

  const db = {
    execute: async (stmt: { sql: string; args?: any[] }) => {
      const sql = stmt.sql.trim();

      // INSERT
      if (sql.startsWith("INSERT INTO")) {
        const match = sql.match(/INSERT INTO (\w+)/);
        if (!match) throw new Error("Cannot parse INSERT");
        const tableName = match[1];
        if (!tables[tableName]) tables[tableName] = [];

        // Extract values from the args
        const row: Record<string, any> = {};
        const columns = (sql.match(/\(([^)]+)\)/)![1]).split(",").map(c => c.trim());
        columns.forEach((col, i) => {
          row[col] = stmt.args?.[i];
        });
        tables[tableName].push(row);

        return { lastInsertRowid: tables[tableName].length, rowsAffected: 1 };
      }

      // SELECT MAX
      if (sql.includes("SELECT MAX")) {
        const match = sql.match(/FROM (\w+)/);
        if (!match) throw new Error("Cannot parse SELECT");
        const tableName = match[1];
        const convMatch = sql.match(/conversation_id\s*=\s*\?/);
        if (convMatch && stmt.args && stmt.args.length > 0) {
          const convId = stmt.args[0] as string;
          const convRows = (tables[tableName] || []).filter(r => r.conversation_id === convId);
          const maxTurn = convRows.length > 0 ? Math.max(...convRows.map(r => r.turn_number)) : null;
          return { rows: [{ max_turn: maxTurn }] };
        }
        return { rows: [{ max_turn: null }] };
      }

      throw new Error(`Unsupported SQL: ${sql}`);
    },
  };

  return { db, tables };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSnapshot(overrides?: Partial<MemorySnapshot>): MemorySnapshot {
  return {
    conversationId: "conv-123",
    memoryId: "mem-456",
    turnNumber: 1,
    storedAt: new Date("2026-07-14T12:00:00Z"),
    belief: {
      id: "bel-001",
      observationValid: true,
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-14T12:00:00Z",
      conversationId: "conv-123",
      isWellFormed: true,
      factCount: 3,
    },
    decision: {
      id: "dec-001",
      validInput: true,
      hasContent: true,
      readiness: "ready",
      missingInfo: Object.freeze([]),
      isDecided: true,
      factCount: 3,
    },
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("SqliteMemoryStorage", () => {
  let mockDb: ReturnType<typeof createMockDb>;
  let storage: SqliteMemoryStorage;

  beforeEach(() => {
    mockDb = createMockDb();
    storage = new SqliteMemoryStorage(mockDb.db as any);
  });

  it("debe insertar un snapshot exitosamente", async () => {
    const result = await storage.insert(makeSnapshot());
    expect(result.success).toBe(true);
  });

  it("debe retornar success:false si el insert falla", async () => {
    // Forzar error: pasar un snapshot inválido que cause error en SQL
    const badDb = {
      execute: async () => { throw new Error("DB connection failed"); },
    };
    const badStorage = new SqliteMemoryStorage(badDb as any);
    const result = await badStorage.insert(makeSnapshot());
    expect(result.success).toBe(false);
    expect("error" in result).toBe(true);
  });

  it("getMaxTurnNumber debe retornar 0 para conversación sin snapshots", async () => {
    const max = await storage.getMaxTurnNumber("conv-nonexistent");
    expect(max).toBe(0);
  });

  it("getMaxTurnNumber debe retornar el máximo turnNumber insertado", async () => {
    // Insertar varios snapshots para la misma conversación
    for (let i = 1; i <= 3; i++) {
      await storage.insert(makeSnapshot({
        conversationId: "conv-max-test",
        memoryId: `mem-${i}`,
        turnNumber: i,
      }));
    }

    const max = await storage.getMaxTurnNumber("conv-max-test");
    expect(max).toBe(3);
  });

  it("getMaxTurnNumber debe ignorar snapshots de otras conversaciones", async () => {
    await storage.insert(makeSnapshot({ conversationId: "conv-a", turnNumber: 1 }));
    await storage.insert(makeSnapshot({ conversationId: "conv-b", turnNumber: 1 }));
    await storage.insert(makeSnapshot({ conversationId: "conv-b", turnNumber: 2 }));

    expect(await storage.getMaxTurnNumber("conv-a")).toBe(1);
    expect(await storage.getMaxTurnNumber("conv-b")).toBe(2);
  });

  it("getMaxTurnNumber debe retornar 0 si la DB falla", async () => {
    const badDb = {
      execute: async () => { throw new Error("DB error"); },
    };
    const badStorage = new SqliteMemoryStorage(badDb as any);
    expect(await badStorage.getMaxTurnNumber("any")).toBe(0);
  });
});
