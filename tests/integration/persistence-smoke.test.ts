/**
 * persistence-smoke.test.ts — Smoke tests de persistencia.
 *
 * Verifica que schema/schema.sql sea válido y ejecutable contra SQLite :memory:,
 * que todas las tablas, índices y triggers esperados existan, y que el ciclo
 * CRUD básico funcione en las tablas core.
 *
 * NO requiere Turso ni base externa. Corre 100% en memoria.
 *
 * ADR-007: schema.sql es la única autoridad del DDL. Estos tests validan
 * que el DDL sea correcto y completo.
 */

import { describe, it, expect, beforeAll } from "vitest";
import { createClient } from "@libsql/client";
import fs from "fs";
import path from "path";

// ── Helpers ──

function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = "";
  let beginCount = 0;
  const lines = sql.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("--") && !current) {
      current += line + "\n";
      continue;
    }
    current += line + "\n";
    const upper = trimmed.toUpperCase();
    if (/\bBEGIN\b/.test(upper) && !trimmed.startsWith("--")) beginCount++;
    if (trimmed === "END;" || trimmed === "END") {
      beginCount--;
      if (beginCount <= 0 && trimmed.endsWith(";")) {
        const stmt = current.trim();
        if (stmt && stmt !== ";") statements.push(stmt);
        current = "";
        beginCount = 0;
      }
      continue;
    }
    if (beginCount <= 0 && trimmed.endsWith(";")) {
      const stmt = current.trim();
      if (stmt && stmt !== ";") statements.push(stmt);
      current = "";
    }
  }
  const remaining = current.trim();
  if (remaining && !statements.includes(remaining)) {
    statements.push(remaining);
  }
  return statements;
}

// ── Setup ──

const schemaPath = path.resolve(__dirname, "../../schema/schema.sql");
let db: ReturnType<typeof createClient>;

beforeAll(async () => {
  db = createClient({ url: "file::memory:" });

  const schemaSQL = fs.readFileSync(schemaPath, "utf-8");
  const statements = splitSQLStatements(schemaSQL);

  for (const stmt of statements) {
    try {
      await db.execute({ sql: stmt });
    } catch (e: any) {
      // If a "already exists" error occurs for indexes/triggers it's fine
      if (e.message?.includes("already exists")) continue;
      throw new Error(`Error ejecutando schema.sql:\n${stmt.substring(0, 120)}...\n${e.message}`);
    }
  }
});

// ── Tests ──

describe("persistence-smoke", () => {
  // ── TABLAS ──

  const EXPECTED_TABLES = [
    "connection_state",
    "conversations",
    "messages",
    "processed_messages",
    "leads",
    "trips",
    "trip_groups",
    "trip_legs",
    "trip_events",
    "dispatch_events",
    "drivers",
    "driver_codes",
    "driver_discounts",
    "driver_invitations",
    "client_preferred_drivers",
    "chat_sessions",
    "conversion_outcomes",
    "decision_log",
    "f9_admin_commands",
    "f9_drift_log",
    "f9_error_log",
    "f9_events",
    "housekeeping_log",
    "learning_weights",
    "opportunity_rules",
    "opportunity_log",
    "conversation_f4_log",
    "conversation_events",
    "policies",
    "policy_results",
    "simulations",
    "system_metrics",
    "tariffs",
    "packages",
    "package_prices",
    "promotions",
    "provider_adjustments",
    "zones",
    "places",
    "aliases",
    "transfer_priority",
    "tours",
    "waiting_rates",
    "reservation_slots",
    "cognitive_memory_snapshots",
  ];

  it("debe tener todas las tablas esperadas", async () => {
    const result = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    });
    const actualTables = (result.rows as Array<{ name: string }>).map((r) => r.name);

    for (const table of EXPECTED_TABLES) {
      expect(actualTables).toContain(table);
    }
  });

  // ── INDICES ──

  const EXPECTED_INDEXES = [
    "idx_messages_conv",
    "idx_trip_legs_group",
    "idx_trip_events_trip",
    "idx_dispatch_events_trip",
    "idx_driver_invitations_status",
    "idx_decision_log_session",
    "idx_f9_drift_log_session",
    "idx_f9_drift_log_timestamp",
    "idx_f9_error_log_created",
    "idx_f9_events_session",
    "idx_f9_events_timestamp",
    "idx_policy_results_policy",
    "idx_policy_results_timestamp",
    "idx_simulations_session",
    "idx_simulations_timestamp",
    "idx_system_metrics_timestamp",
    "idx_aliases_alias",
    "idx_aliases_place",
    "idx_places_zone_id",
    "idx_places_place_type",
    "idx_tariffs_route",
    "idx_tariffs_resolution",
    "idx_tariffs_active_resolution",
  ];

  it("debe tener todos los índices esperados", async () => {
    const result = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_auto%' ORDER BY name",
    });
    const actualIndexes = (result.rows as Array<{ name: string }>).map((r) => r.name);

    for (const idx of EXPECTED_INDEXES) {
      expect(actualIndexes).toContain(idx);
    }
  });

  // ── TRIGGERS ──

  const EXPECTED_TRIGGERS = [
    "trg_tariffs_resolution_priority_insert",
    "trg_tariffs_resolution_priority_update",
    "trg_tariffs_crosses_border_insert",
    "trg_tariffs_crosses_border_update",
  ];

  it("debe tener todos los triggers esperados", async () => {
    const result = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='trigger' ORDER BY name",
    });
    const actualTriggers = (result.rows as Array<{ name: string }>).map((r) => r.name);

    for (const trg of EXPECTED_TRIGGERS) {
      expect(actualTriggers).toContain(trg);
    }
  });

  // ── SEED DATA ──

  it("debe tener el seed data de connection_state", async () => {
    const result = await db.execute({
      sql: "SELECT value FROM connection_state WHERE key = 'status'",
    });
    expect((result.rows as Array<{ value: string }>)[0]?.value).toBe("disconnected");
  });

  // ── CRUD core ──

  describe("CRUD conversations", () => {
    it("INSERT + SELECT", async () => {
      await db.execute({
        sql: "INSERT INTO conversations (phone, name) VALUES (?, ?)",
        args: ["+5491100000001", "Test User"],
      });
      const result = await db.execute({
        sql: "SELECT phone, name FROM conversations WHERE phone = ?",
        args: ["+5491100000001"],
      });
      expect((result.rows[0] as { phone: string }).phone).toBe("+5491100000001");
    });

    it("UPDATE", async () => {
      await db.execute({
        sql: "UPDATE conversations SET name = ? WHERE phone = ?",
        args: ["Updated Name", "+5491100000001"],
      });
      const result = await db.execute({
        sql: "SELECT name FROM conversations WHERE phone = ?",
        args: ["+5491100000001"],
      });
      expect((result.rows[0] as { name: string }).name).toBe("Updated Name");
    });

    it("DELETE", async () => {
      await db.execute({
        sql: "DELETE FROM conversations WHERE phone = ?",
        args: ["+5491100000001"],
      });
      const result = await db.execute({
        sql: "SELECT COUNT(*) as cnt FROM conversations WHERE phone = ?",
        args: ["+5491100000001"],
      });
      expect((result.rows[0] as { cnt: number }).cnt).toBe(0);
    });
  });

  describe("CRUD trips", () => {
    it("INSERT con columnas nuevas", async () => {
      await db.execute({
        sql: "INSERT INTO trips (trip_id, client_phone, discount_explicit, cancelled_at, cancelled_by) VALUES (?, ?, ?, ?, ?)",
        args: ["TRIP-SMOKE-001", "+5491100000002", 1, 1715000000, "system"],
      });
      const result = await db.execute({
        sql: "SELECT trip_id, discount_explicit, cancelled_at, cancelled_by FROM trips WHERE trip_id = ?",
        args: ["TRIP-SMOKE-001"],
      });
      const row = result.rows[0] as { trip_id: string; discount_explicit: number; cancelled_at: number; cancelled_by: string };
      expect(row.discount_explicit).toBe(1);
      expect(row.cancelled_at).toBe(1715000000);
      expect(row.cancelled_by).toBe("system");
    });
  });

  describe("CRUD drivers", () => {
    it("INSERT con is_principal2", async () => {
      await db.execute({
        sql: "INSERT INTO drivers (driver_id, phone, is_principal2) VALUES (?, ?, ?)",
        args: ["DRV-SMOKE-001", "+5491100000003", 1],
      });
      const result = await db.execute({
        sql: "SELECT is_principal2 FROM drivers WHERE driver_id = ?",
        args: ["DRV-SMOKE-001"],
      });
      expect((result.rows[0] as { is_principal2: number }).is_principal2).toBe(1);
    });
  });

  describe("CRUD messages", () => {
    it("INSERT mensaje + FK a conversation", async () => {
      // Crear conversación primero
      await db.execute({
        sql: "INSERT INTO conversations (phone, name) VALUES (?, ?)",
        args: ["+5491100000010", "Msg Test"],
      });
      const conv = await db.execute({
        sql: "SELECT id FROM conversations WHERE phone = ?",
        args: ["+5491100000010"],
      });
      const convId = (conv.rows[0] as { id: number }).id;

      await db.execute({
        sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)",
        args: [convId, "user", "Hola mundo"],
      });
      const msgs = await db.execute({
        sql: "SELECT content FROM messages WHERE conversation_id = ?",
        args: [convId],
      });
      expect((msgs.rows[0] as { content: string }).content).toBe("Hola mundo");
    });
  });

  describe("Triggers — resolution_priority check", () => {
    it("debe rechazar resolution_priority > 4", async () => {
      await expect(
        db.execute({
          sql: "INSERT INTO tariffs (origin, destination, resolution_priority) VALUES (?, ?, ?)",
          args: ["Origen", "Destino", 5],
        }),
      ).rejects.toThrow();
    });

    it("debe aceptar resolution_priority válido (1-4)", async () => {
      await db.execute({
        sql: "INSERT INTO tariffs (origin, destination, resolution_priority) VALUES (?, ?, ?)",
        args: ["OrigenOK", "DestinoOK", 3],
      });
      const result = await db.execute({
        sql: "SELECT resolution_priority FROM tariffs WHERE origin = ?",
        args: ["OrigenOK"],
      });
      expect((result.rows[0] as { resolution_priority: number }).resolution_priority).toBe(3);
    });
  });

  describe("CRUD chat_sessions", () => {
    it("INSERT + SELECT con todos los campos de estado", async () => {
      await db.execute({
        sql: `INSERT INTO chat_sessions (phone, conversational_state, dispatch_state, trip_state, slot_states)
              VALUES (?, ?, ?, ?, ?)`,
        args: ["+5491100000020", "collecting_slots", "nivel_1", "opportunity", '{"field":"origin"}'],
      });
      const result = await db.execute({
        sql: "SELECT phone, conversational_state, dispatch_state, trip_state, slot_states FROM chat_sessions WHERE phone = ?",
        args: ["+5491100000020"],
      });
      const row = result.rows[0] as {
        phone: string;
        conversational_state: string;
        dispatch_state: string;
        trip_state: string;
        slot_states: string;
      };
      expect(row.conversational_state).toBe("collecting_slots");
      expect(row.dispatch_state).toBe("nivel_1");
      expect(row.trip_state).toBe("opportunity");
    });
  });
});
