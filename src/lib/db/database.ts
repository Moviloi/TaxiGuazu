import { createClient, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";
import type {
  ConnectionStateRow,
  ConversationRow,
  MessageRow,
  TripRow,
  TripPhase,
  TripClosureReason,
  DriverRow,
  DriverStatus,
  DriverInvitationRow,
  DriverCodeRow,
  ClientPreferredDriverRow,
  PackagePriceRow,
  ReservationSlotRow,
  TariffRow,
  DriverDiscountRow,
  DriverDiscountWithDriverRow,
  LeadRow,
  LocationAliasRow,
  ChatSessionRow,
  ProcessedMessageRow,
  OpportunityRuleRow,
} from "./types";

type LibSqlClient = ReturnType<typeof createClient>;

export type DbExecutor = {
  execute(stmt: { sql: string; args?: InValue[] }): Promise<{ lastInsertRowid?: number | bigint; rowsAffected?: number }>;
};

async function query<T>(sql: string, args?: InValue[]): Promise<T[]> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql, args: args ?? [] });
  return rs.rows as unknown as T[];
}

async function queryOne<T>(sql: string, args?: InValue[]): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

let dbClient: LibSqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function getUrl(): string {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) return tursoUrl;
  const fallback = process.env.VERCEL ? "/tmp/bot.db" : DB_PATH;
  const dir = path.dirname(fallback);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${fallback}`;
}

function getDbv(): LibSqlClient {
  if (dbClient) return dbClient;

  dbClient = createClient({
    url: getUrl(),
    authToken: process.env.TURSO_DATABASE_TOKEN,
  });

  schemaReady = initSchema();
  
  return dbClient;
}

async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    getDbv();
    schemaReady = initSchema();
  }
  await schemaReady;
}

async function initSchema(): Promise<void> {
  const db = getDbv();
  await db.batch([
    `CREATE TABLE IF NOT EXISTS connection_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS conversations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      phone TEXT UNIQUE NOT NULL,
      name TEXT,
      mode TEXT CHECK(mode IN ('AI','HUMAN')) NOT NULL DEFAULT 'AI',
      taken_by_human INTEGER DEFAULT 0,
      human_operator_phone TEXT,
      trip_id TEXT,
      trip_status TEXT DEFAULT 'consulta',
      last_message_at INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at)`,
    `CREATE TABLE IF NOT EXISTS trips (
      trip_id TEXT PRIMARY KEY,
      client_phone TEXT NOT NULL,
      origin TEXT,
      destination TEXT,
      status TEXT DEFAULT 'consulta',
      price_base REAL,
      passengers INTEGER,
      discount_tier INTEGER DEFAULT 0,
      discount_explicit INTEGER DEFAULT 0,
      assigned_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      confirmed_at INTEGER,
      contact_shared_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS drivers (
      driver_id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT UNIQUE NOT NULL,
      is_principal INTEGER DEFAULT 0,
      group_id TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS workflows (
      conversation_id INTEGER PRIMARY KEY,
      phone TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'idle',
      trip_id TEXT,
      assigned_driver_phone TEXT,
      group_asked_at INTEGER,
      last_message_at INTEGER NOT NULL DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS driver_codes (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      created_by TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      registered_at INTEGER
    )`,
    `CREATE TABLE IF NOT EXISTS client_preferred_drivers (
      client_phone TEXT PRIMARY KEY,
      preferred_driver_phone TEXT NOT NULL,
      backup_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS package_prices (
      driver_phone TEXT NOT NULL,
      package_type TEXT NOT NULL CHECK(package_type IN ('in_out','three_leg')),
      min_payout REAL NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (driver_phone, package_type)
    )`,
    `CREATE TABLE IF NOT EXISTS reservation_slots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      day_of_week INTEGER NOT NULL CHECK(day_of_week BETWEEN 0 AND 6),
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      label TEXT,
      max_bookings INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      modality TEXT,
      crosses_border INTEGER DEFAULT 0,
      wait_included INTEGER DEFAULT 0,
      price_4p REAL NOT NULL,
      price_6p REAL NOT NULL,
      piso_4p REAL NOT NULL,
      piso_6p REAL NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS driver_discounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      driver_phone TEXT NOT NULL,
      tariff_id INTEGER NOT NULL,
      discount_pct INTEGER NOT NULL CHECK(discount_pct > 0 AND discount_pct <= 100),
      valid_until INTEGER,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS leads (
      conv_id INTEGER PRIMARY KEY,
      client_phone TEXT NOT NULL,
      origin TEXT,
      destination TEXT NOT NULL,
      price REAL,
      passengers INTEGER,
      taken_by TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS driver_invitations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      phone TEXT,
      created_by TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch()),
      expires_at INTEGER,
      used_at INTEGER,
      driver_id TEXT,
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','accepted','expired','revoked'))
    )`,
    `CREATE INDEX IF NOT EXISTS idx_driver_invitations_status ON driver_invitations(status, created_at)`,
    `CREATE TABLE IF NOT EXISTS location_aliases (
      alias TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      location_code TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      phone TEXT PRIMARY KEY,
      slots TEXT,
      confidence TEXT,
      confirmed_fields TEXT,
      source_message_ids TEXT,
      extraction_count INTEGER DEFAULT 0,
      last_extracted_at INTEGER,
      workflow_state TEXT DEFAULT 'idle',
      clarify_field TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS processed_messages (
      message_id TEXT PRIMARY KEY,
      phone TEXT,
      message_type TEXT,
      processed_at INTEGER NOT NULL DEFAULT (unixepoch()),
      payload_hash TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS opportunity_rules (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      opportunity_type TEXT NOT NULL,
      label TEXT NOT NULL,
      description TEXT,
      active INTEGER DEFAULT 1,
      priority INTEGER DEFAULT 0,
      trigger_type TEXT NOT NULL DEFAULT 'post_confirmation',
      tariff_id INTEGER,
      config_json TEXT,
      valid_from INTEGER,
      valid_until INTEGER,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS opportunity_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      client_phone TEXT NOT NULL,
      trip_id TEXT NOT NULL,
      rule_id INTEGER,
      opportunity_type TEXT NOT NULL,
      label TEXT NOT NULL,
      original_price REAL NOT NULL,
      offered_price REAL NOT NULL,
      presented_at INTEGER NOT NULL DEFAULT (unixepoch()),
      client_response TEXT,
      phase TEXT NOT NULL DEFAULT 'post_confirmation'
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_f4_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      score REAL,
      state TEXT,
      timestamp INTEGER DEFAULT (unixepoch()),
      reason TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS conversation_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      event_type TEXT NOT NULL,
      metadata TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS learning_weights (
      key TEXT PRIMARY KEY,
      value REAL NOT NULL DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS conversion_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      entity TEXT,
      intent TEXT,
      success_score REAL,
      opportunity_type TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS opportunity_economics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      estimated_revenue REAL NOT NULL DEFAULT 0,
      conversion_probability REAL NOT NULL DEFAULT 0.5,
      margin REAL NOT NULL DEFAULT 0.2,
      operational_cost REAL NOT NULL DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS human_feedback (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      feedback_type TEXT NOT NULL,
      entity TEXT,
      operator_id TEXT NOT NULL,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revenue_total REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      load_factor REAL DEFAULT 0,
      escalation_rate REAL DEFAULT 0,
      recorded_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS policies (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      priority INTEGER DEFAULT 0,
      condition TEXT NOT NULL DEFAULT '[]',
      action TEXT NOT NULL DEFAULT 'allow',
      params TEXT DEFAULT '{}',
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS policy_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      policy_id TEXT NOT NULL,
      variant TEXT,
      revenue REAL DEFAULT 0,
      conversion INTEGER DEFAULT 0,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS simulations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      opportunity_id TEXT,
      predicted_conversion REAL DEFAULT 0,
      predicted_revenue REAL DEFAULT 0,
      risk TEXT DEFAULT 'low',
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS f9_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      type TEXT NOT NULL,
      entity TEXT,
      intent TEXT,
      predicted_value REAL,
      actual_value REAL,
      revenue REAL,
      timestamp INTEGER DEFAULT (unixepoch()),
      source TEXT NOT NULL DEFAULT 'HUMAN'
    )`,
    `CREATE TABLE IF NOT EXISTS f9_admin_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_text TEXT NOT NULL,
      parsed_action TEXT,
      author TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS f9_drift_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metric TEXT NOT NULL,
      entity TEXT NOT NULL,
      drift_value REAL NOT NULL DEFAULT 0,
      severity TEXT NOT NULL DEFAULT 'low',
      session_id TEXT,
      policy_id TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS f9_error_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      component TEXT NOT NULL,
      error TEXT NOT NULL,
      stack TEXT,
      created_at INTEGER NOT NULL
    )`,
    `CREATE TABLE IF NOT EXISTS housekeeping_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job TEXT NOT NULL,
      rows_deleted INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      ran_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS decision_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT NOT NULL,
      selected_opportunity TEXT,
      candidate_opportunities TEXT NOT NULL DEFAULT '[]',
      utility_score REAL DEFAULT 0,
      load_adjusted INTEGER DEFAULT 0,
      policy_override INTEGER DEFAULT 0,
      guardrails TEXT DEFAULT '[]',
      policies TEXT DEFAULT '[]',
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_decision_log_session ON decision_log(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_f9_events_session ON f9_events(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_f9_events_timestamp ON f9_events(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_f9_drift_log_session ON f9_drift_log(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_f9_drift_log_timestamp ON f9_drift_log(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_f9_error_log_created ON f9_error_log(created_at)`,
    `CREATE INDEX IF NOT EXISTS idx_simulations_session ON simulations(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_simulations_timestamp ON simulations(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_policy_results_policy ON policy_results(policy_id)`,
    `CREATE INDEX IF NOT EXISTS idx_policy_results_timestamp ON policy_results(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_human_feedback_session ON human_feedback(session_id)`,
    `CREATE INDEX IF NOT EXISTS idx_human_feedback_timestamp ON human_feedback(timestamp)`,
    `CREATE INDEX IF NOT EXISTS idx_opportunity_economics_type ON opportunity_economics(type)`,
    `CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(recorded_at)`,
    `INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')`,
  ]);

  const migrations = [
    "ALTER TABLE drivers ADD COLUMN car_type TEXT",
    "ALTER TABLE drivers ADD COLUMN car_capacity INTEGER",
    "ALTER TABLE drivers ADD COLUMN color TEXT",
    "ALTER TABLE drivers ADD COLUMN plate TEXT",
    "ALTER TABLE drivers ADD COLUMN country TEXT DEFAULT 'AR'",
    "ALTER TABLE drivers ADD COLUMN idiom TEXT",
    "ALTER TABLE drivers ADD COLUMN min_payout REAL",
    "ALTER TABLE drivers ADD COLUMN is_low_cost INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN shift TEXT DEFAULT 'any'",
    "ALTER TABLE drivers ADD COLUMN rating REAL DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN rating_count INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN offers_received INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN offers_accepted INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN acceptance_score REAL DEFAULT 0",
    "ALTER TABLE trips ADD COLUMN passengers INTEGER",
    "ALTER TABLE trips ADD COLUMN commission_amount REAL",
    "ALTER TABLE trips ADD COLUMN commission_paid INTEGER DEFAULT 0",
    "ALTER TABLE trips ADD COLUMN driver_payout REAL",
    "ALTER TABLE trips ADD COLUMN survey_sent INTEGER DEFAULT 0",
    "ALTER TABLE trips ADD COLUMN post_trip_response TEXT",
    "ALTER TABLE trips ADD COLUMN scheduled_at INTEGER",
    "ALTER TABLE drivers ADD COLUMN tier TEXT DEFAULT 'normal'",
    "ALTER TABLE drivers ADD COLUMN languages TEXT",
    "ALTER TABLE drivers ADD COLUMN is_guide INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN car_model TEXT",
    "ALTER TABLE drivers ADD COLUMN car_year INTEGER",
    "ALTER TABLE trips ADD COLUMN tariff_id INTEGER",
    "ALTER TABLE trips ADD COLUMN piso_base REAL",
    "ALTER TABLE tariffs ADD COLUMN piso_4p_low REAL",
    "ALTER TABLE tariffs ADD COLUMN piso_6p_low REAL",
    "ALTER TABLE tariffs ADD COLUMN garantizado_4p REAL",
    "ALTER TABLE tariffs ADD COLUMN garantizado_6p REAL",
    "ALTER TABLE trips ADD COLUMN garantizado_base REAL",
    "ALTER TABLE trips ADD COLUMN flight_number TEXT",
    "ALTER TABLE trips ADD COLUMN hotel_destination TEXT DEFAULT 'A confirmar por el chofer'",
    "ALTER TABLE trips ADD COLUMN comision_declarada INTEGER DEFAULT 0",
    "ALTER TABLE drivers ADD COLUMN status TEXT DEFAULT 'pending'",
    "ALTER TABLE drivers ADD COLUMN approved_at INTEGER",
    "ALTER TABLE drivers ADD COLUMN approved_by TEXT",
  ];
  const v4Backfills = [
    "UPDATE drivers SET status='active', approved_at=COALESCE(created_at, unixepoch()), approved_by='system_migration_v4' WHERE active=1 AND (status IS NULL OR status='pending')",
  ];
  // Limpiar duplicados y crear índice único sobre (origin, destination) en tariffs
  try {
    await getDbv().execute("DELETE FROM tariffs WHERE id NOT IN (SELECT MIN(id) FROM tariffs GROUP BY LOWER(origin), LOWER(destination))");
    await getDbv().execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_tariffs_route ON tariffs(LOWER(origin), LOWER(destination))");
  } catch (e) { console.error("[migration] unique index error:", e); }
  // Seed tariffs if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM tariffs");
    if ((count.rows as any[])[0].c === 0) {
      await seedTariffs();
    }
  } catch (e) { console.error("[migration] seed tariffs error:", e); }

  // Seed location_aliases (always runs: INSERT OR IGNORE so idempotent)
  try {
    await seedLocationAliases();
  } catch (e) { console.error("[migration] seed location_aliases error:", e); }
  // Seed opportunity_rules if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM opportunity_rules");
    if ((count.rows as any[])[0].c === 0) {
      await seedOpportunityRules();
    }
  } catch (e) { console.error("[migration] seed opportunity_rules error:", e); }
  await migrateCentroAlias();
  await migrateTariffNames();
  try {
    await getDbv().execute("ALTER TABLE drivers ADD COLUMN is_principal2 INTEGER DEFAULT 0");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] La columna is_principal2 ya existe. Continuando de forma segura.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN pending_opportunity TEXT");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] pending_opportunity ya existe.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE opportunity_log ADD COLUMN responded_at INTEGER");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] responded_at ya existe.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN f4_state TEXT");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] f4_state ya existe.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN comprehension_score REAL");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] comprehension_score ya existe.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN escalation_reason TEXT");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      console.log("[MIGRATION] escalation_reason ya existe.");
    } else {
      console.error("[MIGRATION_ERROR]", e);
    }
  }
  try {
    await getDbv().execute("ALTER TABLE f9_drift_log ADD COLUMN session_id TEXT");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      // ya existe
    } else { console.error("[MIGRATION_ERROR] f9_drift_log.session_id", e); }
  }
  try {
    await getDbv().execute("ALTER TABLE f9_drift_log ADD COLUMN policy_id TEXT");
  } catch (e) {
    if (e instanceof Error && e.message.includes("duplicate column name")) {
      // ya existe
    } else { console.error("[MIGRATION_ERROR] f9_drift_log.policy_id", e); }
  }
  for (const sql of migrations) {
    try { await getDbv().execute(sql); } catch (e) { console.error("[migration] error:", sql, e); }
  }
  for (const sql of v4Backfills) {
    try { await getDbv().execute(sql); } catch (e) { console.error("[migration v4 backfill] error:", sql, e); }
  }

  // Migration: recreate workflows table without CHECK constraint to allow new states.
  // Uses INSERT OR IGNORE into _migrations as an atomic lock so only one
  // serverless instance performs the migration.
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('workflows_recreate')"
    );
    if ((result as any).rowsAffected === 0) {
      // already migrated (another instance beat us)
    } else {
      await getDbv().execute("SELECT state FROM workflows LIMIT 1");
      await getDbv().execute("DROP TABLE IF EXISTS workflows_old");
      await getDbv().execute("ALTER TABLE workflows RENAME TO workflows_old");
      await getDbv().execute(`CREATE TABLE IF NOT EXISTS workflows (
        conversation_id INTEGER PRIMARY KEY,
        phone TEXT NOT NULL,
        state TEXT NOT NULL DEFAULT 'idle',
        trip_id TEXT,
        assigned_driver_phone TEXT,
        group_asked_at INTEGER,
        last_message_at INTEGER NOT NULL DEFAULT (unixepoch()),
        created_at INTEGER NOT NULL DEFAULT (unixepoch())
      )`);
      await getDbv().execute("INSERT INTO workflows SELECT * FROM workflows_old");
      await getDbv().execute("DROP TABLE workflows_old");
    }
  } catch (e) { console.error("[migration] workflows table migration error:", e); }

  // Migration: set default piso_4p_low / piso_6p_low for existing tariffs
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('tariffs_piso_low_defaults')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("UPDATE tariffs SET piso_4p_low = ROUND(piso_4p * 0.8) WHERE piso_4p_low IS NULL");
      await getDbv().execute("UPDATE tariffs SET piso_6p_low = ROUND(piso_6p * 0.8) WHERE piso_6p_low IS NULL");
    }
  } catch (e) { console.error("[migration] tariffs piso_low defaults error:", e); }

  // Migration: set default garantizado for existing tariffs (85% of price)
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('tariffs_garantizado_defaults')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("UPDATE tariffs SET garantizado_4p = ROUND(price_4p * 0.85) WHERE garantizado_4p IS NULL");
      await getDbv().execute("UPDATE tariffs SET garantizado_6p = ROUND(price_6p * 0.85) WHERE garantizado_6p IS NULL");
    }
  } catch (e) { console.error("[migration] tariffs garantizado defaults error:", e); }

  // Migration: rename is_titular to is_principal in drivers table
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('rename_is_titular_to_is_principal')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE drivers RENAME COLUMN is_titular TO is_principal");
    }
    } catch (e) { console.error("[migration] rename is_titular error:", e); }

  // Migration: add workflow_state and clarify_field to chat_sessions
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('chat_sessions_workflow_state')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN workflow_state TEXT DEFAULT 'idle'");
      await getDbv().execute("ALTER TABLE chat_sessions ADD COLUMN clarify_field TEXT");
    }
  } catch (e) { console.error("[migration] chat_sessions workflow_state error:", e); }

  // Migration: migrate shift='any' to NULL (shift must be explicitly 'day' or 'night')
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('drivers_shift_any_to_null')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("UPDATE drivers SET shift = NULL WHERE shift = 'any'");
    }
  } catch (e) { console.error("[migration] drivers shift any->null error:", e); }

  // Migration: add payment_method column to drivers
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('drivers_payment_method')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE drivers ADD COLUMN payment_method TEXT");
    }
  } catch (e) { console.error("[migration] drivers payment_method error:", e); }

  // Migration Fase 4A v5.0 — Trip Model V3 foundation
  // Aditiva: trip_phase + closure_reason en trips, ambos NULLABLE.
  // No reemplaza trips.status (backward compat 100% con callers Fase 1-3).
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('trips_trip_phase_v3')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE trips ADD COLUMN trip_phase TEXT");
      await getDbv().execute("ALTER TABLE trips ADD COLUMN closure_reason TEXT");
    }
  } catch (e) { console.error("[migration] trips trip_phase v3 error:", e); }

  // Migration Fase 4A v5.0 — Backfill trip_phase desde status legacy
  // Idempotente. Solo aplica si trip_phase es NULL (no sobrescribe escrituras futuras de Fase 4B+).
  // Mapping:
  //   consulta            -> trip_phase='QUOTED'   closure_reason=NULL
  //   asignado_chofer     -> trip_phase='ASSIGNED' closure_reason=NULL
  //   reconfirmado_24hs   -> trip_phase='ASSIGNED' closure_reason=NULL
  //   completado          -> trip_phase='CLOSED'   closure_reason='completed'
  //   cancelado           -> trip_phase='CLOSED'   closure_reason='cancelled'
  //   NULL u otros        -> trip_phase=NULL       closure_reason=NULL (no inventar)
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('trips_phase_backfill_v3')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute(
        "UPDATE trips SET trip_phase='QUOTED',   closure_reason=NULL WHERE status='consulta'          AND trip_phase IS NULL"
      );
      await getDbv().execute(
        "UPDATE trips SET trip_phase='ASSIGNED', closure_reason=NULL WHERE status='asignado_chofer'   AND trip_phase IS NULL"
      );
      await getDbv().execute(
        "UPDATE trips SET trip_phase='ASSIGNED', closure_reason=NULL WHERE status='reconfirmado_24hs' AND trip_phase IS NULL"
      );
      await getDbv().execute(
        "UPDATE trips SET trip_phase='CLOSED',   closure_reason='completed' WHERE status='completado' AND trip_phase IS NULL"
      );
      await getDbv().execute(
        "UPDATE trips SET trip_phase='CLOSED',   closure_reason='cancelled' WHERE status='cancelado' AND trip_phase IS NULL"
      );
    }
  } catch (e) { console.error("[migration] trips phase backfill v3 error:", e); }
}

// ========== CONNECTION STATE ==========

export async function getConnectionState(): Promise<{ status?: string; qr_string?: string; phone?: string; updated_at?: number } | null> {
  const rows = await query<ConnectionStateRow>("SELECT key, value, updated_at FROM connection_state");
  if (rows.length === 0) return null;
  const state: Record<string, string | number | null> = {};
  for (const row of rows) {
    state[row.key] = row.value;
    state.updated_at = row.updated_at;
  }
  return state;
}

export async function setConnectionState(key: string, value: string): Promise<void> {
  const existing = await queryOne<ConnectionStateRow>("SELECT value FROM connection_state WHERE key = ?", [key]);
  if (existing) {
    await getDbv().execute({ sql: "UPDATE connection_state SET value = ?, updated_at = unixepoch() WHERE key = ?", args: [value, key] });
  } else {
    await getDbv().execute({ sql: "INSERT INTO connection_state (key, value) VALUES (?, ?)", args: [key, value] });
  }
}

export async function setConnectionStateBatch(states: { status?: string; qr_string?: string | null; phone?: string | null }): Promise<void> {
  await ensureSchema();
  const stmts: { sql: string; args: any[] }[] = [];
  if (states.status !== undefined) {
    stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['status', states.status] });
  }
  if (states.qr_string !== undefined) {
    if (states.qr_string === null) {
      stmts.push({ sql: "DELETE FROM connection_state WHERE key = 'qr_string'", args: [] });
    } else {
      stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['qr_string', states.qr_string] });
    }
  }
  if (states.phone !== undefined) {
    if (states.phone === null) {
      stmts.push({ sql: "DELETE FROM connection_state WHERE key = 'phone'", args: [] });
    } else {
      stmts.push({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: ['phone', states.phone] });
    }
  }
  if (stmts.length > 0) {
    await getDbv().batch(stmts);
  }
}

// ========== CONVERSATIONS ==========

export async function getOrCreateConversation(phone: string, name?: string): Promise<ConversationRow> {
  const existing = await queryOne<ConversationRow>("SELECT * FROM conversations WHERE phone = ?", [phone]);
  if (existing) {
    await updateConversationActivity(phone);
    return existing;
  }

  const info = await getDbv().execute({ sql: "INSERT INTO conversations (phone, name, last_message_at) VALUES (?, ?, unixepoch())", args: [phone, name || null] });
  const id = Number(info.lastInsertRowid);
  const created = await queryOne<ConversationRow>("SELECT * FROM conversations WHERE id = ?", [id]);
  return created!;
}

export async function getConversationById(id: number): Promise<ConversationRow | null> {
  return queryOne<ConversationRow>("SELECT * FROM conversations WHERE id = ?", [id]);
}

export async function getConversationByPhone(phone: string): Promise<ConversationRow | null> {
  return queryOne<ConversationRow>("SELECT * FROM conversations WHERE phone = ?", [phone]);
}

interface ConversationWithPreview extends ConversationRow {
  last_message_preview: string;
}

export async function listConversations(): Promise<ConversationWithPreview[]> {
  return query<ConversationWithPreview>(`
    SELECT c.*,
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM conversations c
    ORDER BY c.last_message_at DESC
  `);
}

export async function updateConversationActivity(phone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET last_message_at = unixepoch() WHERE phone = ?", args: [phone] });
}

export async function setConversationMode(conversationId: number, mode: 'AI' | 'HUMAN'): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET mode = ? WHERE id = ?", args: [mode, conversationId] });
}

export async function takeConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET taken_by_human = 1, human_operator_phone = ? WHERE id = ?", args: ['+543757613215', conversationId] });
}

export async function releaseConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET taken_by_human = 0, human_operator_phone = NULL WHERE id = ?", args: [conversationId] });
}

export async function deleteConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDbv().batch([
    { sql: "DELETE FROM messages WHERE conversation_id = ?", args: [conversationId] },
    { sql: "DELETE FROM conversations WHERE id = ?", args: [conversationId] },
  ]);
}

export async function setConversationTrip(conversationId: number, tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET trip_id = ? WHERE id = ?", args: [tripId, conversationId] });
}

// Nota Fase 3 v5.0: setConversationTripStatus eliminado — 0 callers (verificado).
// conversations.trip_status sigue existiendo en la tabla (DEFAULT 'consulta') y
// es candidata a DROP COLUMN en Fase 6.



export async function insertMessage(conversationId: number, role: string, content: string, executor?: DbExecutor): Promise<number> {
  const db = executor ?? getDbv();
  const result = await db.execute({ sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", args: [conversationId, role, content] });
  await db.execute({ sql: "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?", args: [conversationId] });
  return Number(result.lastInsertRowid);
}

export async function getMessages(conversationId: number, limit = 50): Promise<MessageRow[]> {
  const rows = await query<MessageRow>("SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?", [conversationId, limit]);
  return rows.reverse();
}

export async function getRecentHistory(conversationId: number, limit = 20): Promise<MessageRow[]> {
  return query<MessageRow>("SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC", [conversationId, limit]);
}

export async function clearConversationHistory(convId: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "DELETE FROM messages WHERE conversation_id = ?", args: [convId] });
}

// ========== TRIPS ==========

export async function createTrip(tripId: string, clientPhone: string, origin: string, destination: string, priceBase?: number, passengers?: number, scheduledAt?: number, flightNumber?: string, status?: string): Promise<void> {
  const tripStatus = status || "consulta";
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, passengers, status, scheduled_at, flight_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [tripId, clientPhone, origin, destination, priceBase || null, passengers || null, tripStatus, scheduledAt || null, flightNumber || null] });
  await syncTripPhaseFromLegacyStatus(tripId, tripStatus);
}

export async function getTripById(tripId: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE trip_id = ?", [tripId]);
}

export async function getActiveTripByPhone(clientPhone: string): Promise<TripRow | null> {
  // Fase 5B.1: phase-based primary filter; status-based legacy + phase COUNT for cross-validation.
  const trip = await queryOne<TripRow>(
    "SELECT * FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL) ORDER BY created_at DESC LIMIT 1",
    [clientPhone]
  );
  const legacyRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado')",
    args: [clientPhone],
  });
  const phaseRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL)",
    args: [clientPhone],
  });
  await validateReaderConsistency(
    "getActiveTripByPhone",
    Number((legacyRs.rows[0] as any)?.cnt ?? 0),
    Number((phaseRs.rows[0] as any)?.cnt ?? 0),
    ["DRAFT", "QUOTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
  );
  await reportTripPhaseNullCount("getActiveTripByPhone");
  if (trip) checkTripPhaseDivergence(trip, "getActiveTripByPhone");
  return trip;
}

export async function getTripByAssignedDriver(driverPhone: string): Promise<TripRow | null> {
  const trip = await queryOne<TripRow>("SELECT * FROM trips WHERE assigned_driver_phone = ? AND status = 'asignado_chofer' ORDER BY created_at DESC LIMIT 1", [driverPhone]);
  if (trip) checkTripPhaseDivergence(trip, "getTripByAssignedDriver");
  return trip;
}

export async function updateTripState(tripId: string, newState: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET status = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [newState, tripId] });
  await syncTripPhaseFromLegacyStatus(tripId, newState);
}

export async function updateTripDiscountExplicit(tripId: string, discountPercent: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET discount_explicit = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [discountPercent, tripId] });
}

export async function assignDriverToTrip(tripId: string, driverPhone: string): Promise<{ commission: number; payout: number } | null> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  if (!trip) return null;

  const price = trip.price_base || 0;
  let payout = trip.garantizado_base ?? Math.round(price * 0.85);

  // Apply driver's voluntary promotional discount (driver opted to earn less)
  if (trip.tariff_id) {
    const discountPct = await getDriverDiscountForTariff(driverPhone, trip.tariff_id);
    if (discountPct && discountPct > 0) {
      payout = Math.round(payout * (1 - discountPct / 100));
    }
  }

  const commission = price - payout;

  await getDbv().execute({
    sql: "UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', commission_amount = ?, driver_payout = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [driverPhone, commission, payout, tripId],
  });
  await syncTripPhaseFromLegacyStatus(tripId, "asignado_chofer");
  return { commission, payout };
}

export async function completeTrip(tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET status = 'completado', confirmed_at = unixepoch(), updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });
  await syncTripPhaseFromLegacyStatus(tripId, "completado");
}

// ========== TRIP MODEL V3 (Fase 4A + 4B) ==========
// Fase 4A: setTripPhase, closeTrip, getTripByIdWithDiagnostics, getTripPhase.
// Fase 4B: syncTripPhaseFromLegacyStatus es la UNICA autoridad de sincronización
//          status → trip_phase. Todo writer DEBE pasar por él.
// setTripPhase/closeTrip NO usan el mapping (escriben phase directamente) — no duplican.

const LEGACY_STATUS_TO_PHASE: Record<string, { phase: TripPhase; reason?: TripClosureReason }> = {
  consulta: { phase: "QUOTED" },
  PENDING_DRIVER: { phase: "QUOTED" },
  asignado_chofer: { phase: "ASSIGNED" },
  reconfirmado_24hs: { phase: "ASSIGNED" },
  completado: { phase: "CLOSED", reason: "completed" },
  cancelado: { phase: "CLOSED", reason: "cancelled" },
};

const divergenceLogged = new Set<string>();
const phaseSyncLogged = new Set<string>();
const phaseUnknownStatusLogged = new Set<string>();

function checkTripPhaseDivergence(trip: TripRow, source: string): void {
  if (!trip.trip_phase) return;
  const expected = LEGACY_STATUS_TO_PHASE[trip.status || ""];
  if (expected && expected.phase !== trip.trip_phase && !divergenceLogged.has(trip.trip_id)) {
    divergenceLogged.add(trip.trip_id);
    console.warn("[diagnostic] trip_phase_divergence", JSON.stringify({
      trip_id: trip.trip_id,
      legacy_status: trip.status,
      trip_phase: trip.trip_phase,
      source,
    }));
  }
}

function checkDivergenceForTrips(trips: TripRow[], source: string): void {
  for (const trip of trips) {
    checkTripPhaseDivergence(trip, source);
  }
}

export async function syncTripPhaseFromLegacyStatus(tripId: string, status: string | null): Promise<void> {
  if (!status) return;

  const mapping = LEGACY_STATUS_TO_PHASE[status];
  if (!mapping) {
    const key = `${tripId}:${status}`;
    if (!phaseUnknownStatusLogged.has(key)) {
      phaseUnknownStatusLogged.add(key);
      console.warn("[metric] trip_phase_unknown_status", JSON.stringify({
        trip_id: tripId,
        status,
      }));
    }
    return;
  }

  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT trip_phase, closure_reason FROM trips WHERE trip_id = ?",
    args: [tripId],
  });
  const row = rs.rows[0] as any;
  if (!row) return;

  const currentPhase = row.trip_phase as TripPhase | null;
  const expectedReason = mapping.reason || null;

  // Divergence: trip_phase ya seteado y distinto del esperado por status
  if (currentPhase && currentPhase !== mapping.phase && !divergenceLogged.has(tripId)) {
    divergenceLogged.add(tripId);
    console.warn("[metric] trip_phase_divergence", JSON.stringify({
      trip_id: tripId,
      status,
      trip_phase: currentPhase,
    }));
  }

  // Sync write (idempotente)
  await getDbv().execute({
    sql: "UPDATE trips SET trip_phase = ?, closure_reason = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [mapping.phase, expectedReason, tripId],
  });

  // Sync metric (rate-limited per (tripId, status))
  const syncKey = `${tripId}:${status}`;
  if (!phaseSyncLogged.has(syncKey)) {
    phaseSyncLogged.add(syncKey);
    console.log("[metric] trip_phase_sync", JSON.stringify({
      trip_id: tripId,
      status,
      trip_phase: mapping.phase,
    }));
  }
}

export async function getTripPhase(tripId: string): Promise<TripPhase | null> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT trip_phase FROM trips WHERE trip_id = ?",
    args: [tripId],
  });
  const val = (rs.rows[0] as any)?.trip_phase;
  return val ? (val as TripPhase) : null;
}

export async function setTripPhase(tripId: string, phase: TripPhase): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET trip_phase = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [phase, tripId],
  });
}

export async function closeTrip(tripId: string, reason: TripClosureReason): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET trip_phase = 'CLOSED', closure_reason = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [reason, tripId],
  });
}

export async function getTripByIdWithDiagnostics(tripId: string, source: string): Promise<TripRow | null> {
  const trip = await getTripById(tripId);
  if (trip) checkTripPhaseDivergence(trip, source);
  return trip;
}

// ========== FASE 4C — READER VALIDATION (READ-ONLY) ==========
// NO modifica comportamiento. NO cambia queries. NO cambia cardinalidad.
// Solo emite métricas de validación comparando conteo legacy vs conteo phase.
// Se ejecuta en PRODUCCIÓN (sin gate de NODE_ENV).

const validationMismatchLogged = new Set<string>();
const phaseNullLogged = new Set<string>();

export async function validateReaderConsistency(
  source: string,
  legacyCount: number,
  phaseCount: number,
  expectedPhase: TripPhase | TripPhase[]
): Promise<void> {
  const expectedKey = Array.isArray(expectedPhase) ? [...expectedPhase].sort().join("|") : expectedPhase;
  const key = `${source}:${expectedKey}`;
  if (legacyCount !== phaseCount && !validationMismatchLogged.has(key)) {
    validationMismatchLogged.add(key);
    console.warn("[metric] trip_phase_reader_validation_mismatch", JSON.stringify({
      source,
      legacy_count: legacyCount,
      phase_count: phaseCount,
      expected_phase: expectedPhase,
    }));
  }
}

export async function reportTripPhaseNullCount(source: string): Promise<number> {
  await ensureSchema();
  const rs = await getDbv().execute("SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IS NULL");
  const cnt = Number((rs.rows[0] as any)?.cnt ?? 0);
  if (!phaseNullLogged.has(source)) {
    phaseNullLogged.add(source);
    console.log("[metric] trip_phase_null_count", JSON.stringify({
      source,
      count: cnt,
    }));
  }
  return cnt;
}

// ========== LEADS ==========

export async function createLead(convId: number, clientPhone: string, origin: string, destination: string, price?: number, passengers?: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "INSERT OR REPLACE INTO leads (conv_id, client_phone, origin, destination, price, passengers) VALUES (?, ?, ?, ?, ?, ?)",
    args: [convId, clientPhone, origin, destination, price || null, passengers || null],
  });
}

export async function getLeadByConv(convId: number): Promise<LeadRow | null> {
  return queryOne<LeadRow>("SELECT * FROM leads WHERE conv_id = ?", [convId]);
}

export async function takeLead(convId: number, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE leads SET taken_by = ? WHERE conv_id = ? AND taken_by IS NULL",
    args: [driverPhone, convId],
  });
}

// ========== DRIVERS ==========

export async function getMaxFleetCapacity(): Promise<number | null> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT MAX(car_capacity) as max_cap FROM drivers WHERE status = 'active' AND car_capacity IS NOT NULL",
  });
  const row = rs.rows[0] as unknown as { max_cap: number | null } | undefined;
  const max = row?.max_cap;
  return typeof max === "number" && max > 0 ? max : null;
}

export async function validateFleetCanHandle(pax: number): Promise<{ ok: boolean; max: number | null }> {
  if (pax <= 0) return { ok: true, max: null };
  const max = await getMaxFleetCapacity();
  if (max === null) return { ok: false, max: null };
  return { ok: pax <= max, max };
}

export async function listPendingDrivers(): Promise<DriverRow[]> {
  return query<DriverRow>("SELECT * FROM drivers WHERE status = 'pending' ORDER BY created_at ASC");
}

export async function approveDriver(driverId: string, approvedBy: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET status='active', approved_at=unixepoch(), approved_by=? WHERE driver_id=?",
    args: [approvedBy, driverId],
  });
}

export async function setDriverStatus(driverId: string, status: DriverStatus): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET status=? WHERE driver_id=?",
    args: [status, driverId],
  });
}

export async function getPrincipalDriver(): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE is_principal = 1 LIMIT 1");
}

export async function getDriverByPhone(phone: string): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE phone = ?", [phone]);
}

export async function getPrincipal2Driver(): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE is_principal2 = 1 LIMIT 1");
}

export async function registerDriver(phone: string, name?: string): Promise<DriverRow | null> {
  const existing = await getDriverByPhone(phone);
  if (existing) return existing;
  const driverId = `driver_${Date.now()}`;
  await getDbv().execute({
    sql: "INSERT INTO drivers (driver_id, phone, name, active, status) VALUES (?, ?, ?, 0, 'pending')",
    args: [driverId, phone, name || null],
  });
  return await getDriverByPhone(phone);
}

export async function createDriverCode(
  code: string, name: string, createdBy: string, phone?: string,
  opts?: { carType?: string; carCapacity?: number; color?: string; plate?: string; country?: string; tier?: string; shift?: string | null; paymentMethod?: string | null; idiom?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  try {
    if (phone) {
      const cleaned = phone.replace(/\D/g, "");
      if (cleaned.length < 10) return { ok: false, error: "Teléfono inválido" };
      const fullPhone = cleaned.startsWith("54") ? `+${cleaned}` : `+54${cleaned}`;
      await getDbv().execute({
        sql: "INSERT INTO driver_codes (code, name, created_by, phone) VALUES (?, ?, ?, ?)",
        args: [code.toLowerCase().trim(), name.trim(), createdBy, fullPhone],
      });
      await getDbv().execute({
        sql: `INSERT OR IGNORE INTO drivers (driver_id, phone, name, active, car_type, car_capacity, color, plate, country, tier, shift, payment_method, idiom, status)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [`driver_${Date.now()}`, fullPhone, name.trim(),
               opts?.carType || null, opts?.carCapacity || null, opts?.color || null, opts?.plate || null,
               opts?.country || 'AR', opts?.tier || 'normal', opts?.shift || null,
               opts?.paymentMethod || null, opts?.idiom || null],
      });
    } else {
      await getDbv().execute({
        sql: "INSERT INTO driver_codes (code, name, created_by) VALUES (?, ?, ?)",
        args: [code.toLowerCase().trim(), name.trim(), createdBy],
      });
    }
    return { ok: true };
  } catch (e) {
    console.error("[createDriverCode] error:", e);
    return { ok: false, error: "El código ya existe" };
  }
}

export async function updateDriverShiftIfNull(phone: string): Promise<string | null> {
  await ensureSchema();
  const driver = await getDriverByPhone(phone);
  if (!driver) return null;
  if (driver.shift && driver.shift !== "any") return driver.shift;

  const hour = new Date().getHours();
  const shift = hour >= 6 && hour < 18 ? "day" : "night";
  await getDbv().execute({
    sql: "UPDATE drivers SET shift = ? WHERE phone = ?",
    args: [shift, phone],
  });
  return shift;
}

export async function deactivateDriverByCode(code: string): Promise<boolean> {
  await ensureSchema();
  const entry = await getDriverCodeByCode(code);
  if (!entry) return false;

  if (entry.phone) {
    await getDbv().execute({
      sql: "UPDATE drivers SET status = 'inactive' WHERE phone = ?",
      args: [entry.phone],
    });
  }
  return true;
}

export async function getDriverCodeByCode(code: string): Promise<DriverCodeRow | null> {
  return queryOne<DriverCodeRow>("SELECT * FROM driver_codes WHERE code = ?", [code.toLowerCase().trim()]);
}

export async function registerDriverByCode(code: string, phone: string): Promise<DriverCodeRow | null> {
  const existing = await getDriverCodeByCode(code);
  if (!existing) return null;
  if (existing.phone) return existing;

  await getDbv().execute({
    sql: "UPDATE driver_codes SET phone = ?, registered_at = unixepoch() WHERE code = ?",
    args: [phone, code.toLowerCase().trim()],
  });

  const driverId = `driver_${Date.now()}`;
  await getDbv().execute({
    sql: "INSERT OR IGNORE INTO drivers (driver_id, phone, name, active, status) VALUES (?, ?, ?, 0, 'pending')",
    args: [driverId, phone, existing.name],
  });

  return await getDriverCodeByCode(code);
}

export async function getDriverExpiry(phone: string): Promise<{ active: boolean; expiresAt: Date | null }> {
  const row = await queryOne<{ last_message_at: number }>("SELECT last_message_at FROM conversations WHERE phone = ?", [phone]);
  if (!row?.last_message_at) return { active: false, expiresAt: null };

  const expiresAt = new Date((row.last_message_at + 86400) * 1000);
  const active = Date.now() < expiresAt.getTime();
  return { active, expiresAt };
}

// ========== ACCEPTANCE SCORE ==========

export async function incrementOfferReceived(driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: `UPDATE drivers SET offers_received = COALESCE(offers_received, 0) + 1 WHERE phone = ?`,
    args: [driverPhone],
  });
  await recalcAcceptanceScore(driverPhone);
}

export async function incrementOfferAccepted(driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: `UPDATE drivers SET offers_accepted = COALESCE(offers_accepted, 0) + 1 WHERE phone = ?`,
    args: [driverPhone],
  });
  await recalcAcceptanceScore(driverPhone);
}

async function recalcAcceptanceScore(driverPhone: string): Promise<void> {
  await getDbv().execute({
    sql: `UPDATE drivers SET acceptance_score = ROUND(
      CAST(COALESCE(offers_accepted, 0) AS REAL) /
      CAST(CASE WHEN COALESCE(offers_received, 0) = 0 THEN 1 ELSE offers_received END AS REAL) * 100
    ) WHERE phone = ?`,
    args: [driverPhone],
  });
}

export async function updateDriverTier(phone: string, tier: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET tier = ? WHERE phone = ?",
    args: [tier, phone],
  });
}

export async function updateDriverMinPayout(phone: string, minPayout: number | null): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET min_payout = ? WHERE phone = ?",
    args: [minPayout, phone],
  });
}

export async function updateDriverLanguages(phone: string, languages: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET languages = ? WHERE phone = ?",
    args: [languages, phone],
  });
}

export async function updateDriverGuide(phone: string, isGuide: boolean): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE drivers SET is_guide = ? WHERE phone = ?",
    args: [isGuide ? 1 : 0, phone],
  });
}

export async function updateDriverByCode(
  code: string,
  updates: { name?: string; carType?: string; carCapacity?: number | null; color?: string; plate?: string; country?: string; shift?: string | null; paymentMethod?: string | null; idiom?: string | null }
): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const entry = await getDriverCodeByCode(code);
  if (!entry) return { ok: false, error: "Código no encontrado" };
  if (!entry.phone) return { ok: false, error: "El chofer no se registró aún. No se puede actualizar." };

  const sets: string[] = [];
  const args: any[] = [];
  if (updates.name) { sets.push("name = ?"); args.push(updates.name.trim()); }
  if (updates.carType) { sets.push("car_type = ?"); args.push(updates.carType); }
  if (updates.carCapacity !== undefined) { sets.push("car_capacity = ?"); args.push(updates.carCapacity); }
  if (updates.color) { sets.push("color = ?"); args.push(updates.color); }
  if (updates.plate) { sets.push("plate = ?"); args.push(updates.plate); }
  if (updates.country) { sets.push("country = ?"); args.push(updates.country); }
  if (updates.shift !== undefined) { sets.push("shift = ?"); args.push(updates.shift); }
  if (updates.paymentMethod !== undefined) { sets.push("payment_method = ?"); args.push(updates.paymentMethod); }
  if (updates.idiom !== undefined) { sets.push("idiom = ?"); args.push(updates.idiom); }

  if (sets.length === 0) return { ok: true };

  args.push(entry.phone);
  await getDbv().execute({
    sql: `UPDATE drivers SET ${sets.join(", ")} WHERE phone = ?`,
    args,
  });
  return { ok: true };
}

export async function getAvailableDrivers(filters?: { minCapacity?: number; country?: string; strictMinCapacity?: boolean }): Promise<DriverRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const conditions: string[] = ["d.status = 'active'", "c.last_message_at > ?"];
  const args: InValue[] = [cutoff];

  if (filters?.minCapacity) {
    if (filters.strictMinCapacity) {
      conditions.push("d.car_capacity >= ?");
    } else {
      conditions.push("(d.car_capacity IS NULL OR d.car_capacity >= ?)");
    }
    args.push(filters.minCapacity);
  }
  if (filters?.country) {
    conditions.push("(d.country IS NULL OR d.country = ?)");
    args.push(filters.country);
  }

  return query<DriverRow>(`SELECT d.* FROM drivers d
    INNER JOIN conversations c ON c.phone = d.phone
    WHERE ${conditions.join(" AND ")}`, args);
}

// ========== DRIVER INVITATIONS ==========

export async function getDriverInvitationByCode(code: string): Promise<DriverInvitationRow | null> {
  return queryOne<DriverInvitationRow>("SELECT * FROM driver_invitations WHERE code = ?", [code.toLowerCase().trim()]);
}

export async function listDriverInvitations(status?: DriverInvitationRow["status"]): Promise<DriverInvitationRow[]> {
  if (status) {
    return query<DriverInvitationRow>("SELECT * FROM driver_invitations WHERE status = ? ORDER BY created_at DESC", [status]);
  }
  return query<DriverInvitationRow>("SELECT * FROM driver_invitations ORDER BY created_at DESC");
}

export async function createDriverInvitation(
  code: string,
  createdBy: string,
  opts?: { phone?: string; expiresAt?: number }
): Promise<{ ok: boolean; error?: string; invitation?: DriverInvitationRow }> {
  await ensureSchema();
  const cleaned = code.toLowerCase().trim();
  if (!cleaned) return { ok: false, error: "Código vacío" };

  const existing = await getDriverInvitationByCode(cleaned);
  if (existing) return { ok: false, error: "Código ya existe" };

  let fullPhone: string | null = null;
  if (opts?.phone) {
    const digits = opts.phone.replace(/\D/g, "");
    if (digits.length < 10) return { ok: false, error: "Teléfono inválido" };
    fullPhone = digits.startsWith("54") ? `+${digits}` : `+54${digits}`;
  }

  await getDbv().execute({
    sql: "INSERT INTO driver_invitations (code, phone, created_by, expires_at) VALUES (?, ?, ?, ?)",
    args: [cleaned, fullPhone, createdBy, opts?.expiresAt ?? null],
  });

  const invitation = await getDriverInvitationByCode(cleaned);
  return { ok: true, invitation: invitation ?? undefined };
}

export async function registerDriverFromInvitation(
  code: string,
  phone: string,
  data: { name?: string; carType?: string; carCapacity?: number; color?: string; plate?: string; country?: string; tier?: string; shift?: string | null; paymentMethod?: string | null; idiom?: string | null }
): Promise<{ ok: boolean; error?: string; driver?: DriverRow; invitation?: DriverInvitationRow }> {
  await ensureSchema();
  const cleaned = code.toLowerCase().trim();
  const invitation = await getDriverInvitationByCode(cleaned);
  if (!invitation) return { ok: false, error: "Invitación no encontrada" };
  if (invitation.status !== "pending") return { ok: false, error: `Invitación ya ${invitation.status}` };

  const now = Math.floor(Date.now() / 1000);
  if (invitation.expires_at && invitation.expires_at < now) {
    await getDbv().execute({
      sql: "UPDATE driver_invitations SET status='expired' WHERE id=?",
      args: [invitation.id],
    });
    return { ok: false, error: "Invitación expirada" };
  }

  const digits = phone.replace(/\D/g, "");
  if (digits.length < 10) return { ok: false, error: "Teléfono inválido" };
  const fullPhone = digits.startsWith("54") ? `+${digits}` : `+54${digits}`;

  if (invitation.phone && invitation.phone !== fullPhone) {
    return { ok: false, error: "El teléfono no coincide con la invitación" };
  }

  const driverId = `driver_${Date.now()}`;
  await getDbv().execute({
    sql: `INSERT INTO drivers (driver_id, phone, name, active, car_type, car_capacity, color, plate, country, tier, shift, payment_method, idiom, status)
          VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
    args: [
      driverId, fullPhone, data.name || null,
      data.carType || null, data.carCapacity ?? null,
      data.color || null, data.plate || null,
      data.country || "AR",
      data.tier || "normal",
      data.shift ?? "any",
      data.paymentMethod ?? null,
      data.idiom ?? null,
    ],
  });

  await getDbv().execute({
    sql: "UPDATE driver_invitations SET status='accepted', used_at=?, driver_id=? WHERE id=?",
    args: [now, driverId, invitation.id],
  });

  const driver = await queryOne<DriverRow>("SELECT * FROM drivers WHERE driver_id = ?", [driverId]);
  const updated = await getDriverInvitationByCode(cleaned);
  return { ok: true, driver: driver ?? undefined, invitation: updated ?? undefined };
}

export async function revokeDriverInvitation(code: string): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  const cleaned = code.toLowerCase().trim();
  const invitation = await getDriverInvitationByCode(cleaned);
  if (!invitation) return { ok: false, error: "Invitación no encontrada" };
  if (invitation.status !== "pending") return { ok: false, error: `Invitación ya ${invitation.status}` };
  await getDbv().execute({
    sql: "UPDATE driver_invitations SET status='revoked' WHERE id=?",
    args: [invitation.id],
  });
  return { ok: true };
}

// ========== PREFERRED DRIVERS ==========

export async function getClientPreferredDriver(clientPhone: string): Promise<ClientPreferredDriverRow | null> {
  return queryOne<ClientPreferredDriverRow>("SELECT * FROM client_preferred_drivers WHERE client_phone = ?", [clientPhone]);
}

export async function setClientPreferredDriver(clientPhone: string, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: `INSERT INTO client_preferred_drivers (client_phone, preferred_driver_phone)
          VALUES (?, ?)
          ON CONFLICT(client_phone) DO UPDATE SET
            preferred_driver_phone = excluded.preferred_driver_phone,
            updated_at = unixepoch()`,
    args: [clientPhone, driverPhone],
  });
}

export async function setBackupDriver(clientPhone: string, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: `INSERT INTO client_preferred_drivers (client_phone, preferred_driver_phone, backup_driver_phone)
          VALUES (?, ?, ?)
          ON CONFLICT(client_phone) DO UPDATE SET
            backup_driver_phone = excluded.backup_driver_phone,
            updated_at = unixepoch()`,
    args: [clientPhone, driverPhone, driverPhone],
  });
}

// ========== WORKFLOWS ==========
//
// La tabla `workflows` quedó sin callers activos en Fase 3 v5.0.
// La fuente única de verdad del workflow conversacional es ahora
// `chat_sessions.workflow_state` (ver @/lib/utils/conversation-workflow).
//
// Las funciones de la API legacy (`getWorkflow`, `advanceWorkflowState`,
// `closeWorkflow`, `assignWorkflowAtomic`, `deleteWorkflow`,
// `getExpiredWorkflowsByState`) ya no existen. Toda lectura/escritura
// de estado de workflow pasa por `conversation-workflow.ts`.
//
// La tabla se conserva (con su migración `workflows_recreate`) sólo para
// preservar datos históricos. Candidata a DROP en Fase 6.

// ========== PACKAGE PRICES ==========

export async function setPackagePrice(driverPhone: string, packageType: string, minPayout: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: `INSERT INTO package_prices (driver_phone, package_type, min_payout)
          VALUES (?, ?, ?)
          ON CONFLICT(driver_phone, package_type) DO UPDATE SET min_payout = excluded.min_payout`,
    args: [driverPhone, packageType, minPayout],
  });
}

export async function getPackagePrice(driverPhone: string, packageType: string): Promise<PackagePriceRow | null> {
  return queryOne<PackagePriceRow>("SELECT * FROM package_prices WHERE driver_phone = ? AND package_type = ?", [driverPhone, packageType]);
}

export async function getActiveTripsByClient(clientPhone: string): Promise<TripRow[]> {
  const trips = await query<TripRow>("SELECT * FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL) ORDER BY created_at ASC", [clientPhone]);
  // Fase 4D: phase-based primary filter; status-based COUNT for cross-validation.
  const legacyRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado')",
    args: [clientPhone],
  });
  await validateReaderConsistency(
    "getActiveTripsByClient",
    Number((legacyRs.rows[0] as any)?.cnt ?? 0),
    trips.length,
    ["DRAFT", "QUOTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
  );
  await reportTripPhaseNullCount("getActiveTripsByClient");
  return trips;
}

// ========== SURVEY ==========

export async function getTripsPendingSurvey(): Promise<TripRow[]> {
  const cutoff = Math.floor(Date.now() / 1000);
  const trips = await query<TripRow>("SELECT * FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?) ORDER BY confirmed_at ASC LIMIT 10", [cutoff]);
  // Fase 4D: phase-based primary with reconfirmado_24hs exclusion; legacy + phase COUNT for cross-validation.
  const legacyRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?)",
    args: [cutoff],
  });
  const phaseRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?)",
    args: [cutoff],
  });
  await validateReaderConsistency(
    "getTripsPendingSurvey",
    Number((legacyRs.rows[0] as any)?.cnt ?? 0),
    Number((phaseRs.rows[0] as any)?.cnt ?? 0),
    ["ASSIGNED", "CLOSED"]
  );
  await reportTripPhaseNullCount("getTripsPendingSurvey");
  return trips;
}

export async function markSurveySent(tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET survey_sent = 1 WHERE trip_id = ?", args: [tripId] });
}

export async function setSurveyResponse(tripId: string, response: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET post_trip_response = ? WHERE trip_id = ?", args: [response, tripId] });
}

// ========== RESERVATION SLOTS ==========

export async function updateTripTariff(tripId: string, tariffId: number, pisoBase: number, passengers?: number): Promise<void> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  const pax = passengers ?? trip?.passengers ?? 0;
  const garantizado = await getDbv().execute({
    sql: `SELECT ${pax > 4 ? "COALESCE(garantizado_6p, ROUND(price_6p * 0.85))" : "COALESCE(garantizado_4p, ROUND(price_4p * 0.85))"} as val FROM tariffs WHERE id = ?`,
    args: [tariffId],
  });
  const val = (garantizado.rows[0] as any)?.val ?? Math.round((trip?.price_base || 0) * 0.85);
  await getDbv().execute({
    sql: "UPDATE trips SET tariff_id = ?, piso_base = ?, garantizado_base = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tariffId, pisoBase, val, tripId],
  });
}

export async function updateTripScheduledAt(tripId: string, scheduledAt: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET scheduled_at = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [scheduledAt, tripId],
  });
}

export async function updateTripFlight(tripId: string, flightNumber: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET flight_number = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [flightNumber, tripId],
  });
}

export async function updateTripPassengers(tripId: string, passengers: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET passengers = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [passengers, tripId],
  });
}

export async function updateTripOrigin(tripId: string, origin: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET origin = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [origin, tripId],
  });
}

export async function updateTripDestination(tripId: string, destination: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET destination = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [destination, tripId],
  });
}

export async function updateTripPriceBase(tripId: string, price: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET price_base = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [price, tripId],
  });
}

export async function updateTripHotel(tripId: string, hotel: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET hotel_destination = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [hotel, tripId],
  });
}

export async function setComisionDeclarada(tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET comision_declarada = 1, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });
}

export async function getTripsByScheduledAtWindow(startTs: number, endTs: number): Promise<TripRow[]> {
  const trips = await query<TripRow>(
    "SELECT * FROM trips WHERE scheduled_at >= ? AND scheduled_at <= ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at",
    [startTs, endTs]
  );
  checkDivergenceForTrips(trips, "getTripsByScheduledAtWindow");
  return trips;
}

export async function getTripsPendingCloseOut(): Promise<TripRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - 7200;
  const trips = await query<TripRow>(
    "SELECT * FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ? ORDER BY confirmed_at",
    [cutoff]
  );
  // Fase 4D: phase-based primary with reconfirmado_24hs exclusion; legacy + phase COUNT for cross-validation.
  const legacyRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    args: [cutoff],
  });
  const phaseRs = await getDbv().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    args: [cutoff],
  });
  await validateReaderConsistency(
    "getTripsPendingCloseOut",
    Number((legacyRs.rows[0] as any)?.cnt ?? 0),
    Number((phaseRs.rows[0] as any)?.cnt ?? 0),
    ["ASSIGNED", "CLOSED"]
  );
  await reportTripPhaseNullCount("getTripsPendingCloseOut");
  return trips;
}

export async function createReservationSlot(dayOfWeek: number, startTime: string, endTime: string, label?: string, maxBookings = 1): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  try {
    await getDbv().execute({
      sql: "INSERT INTO reservation_slots (day_of_week, start_time, end_time, label, max_bookings) VALUES (?, ?, ?, ?, ?)",
      args: [dayOfWeek, startTime, endTime, label || null, maxBookings],
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function getActiveSlots(): Promise<ReservationSlotRow[]> {
  return query<ReservationSlotRow>("SELECT * FROM reservation_slots WHERE active = 1 ORDER BY day_of_week, start_time");
}

export async function getSlotsByDayOfWeek(dayOfWeek: number): Promise<ReservationSlotRow[]> {
  return query<ReservationSlotRow>("SELECT * FROM reservation_slots WHERE day_of_week = ? AND active = 1 ORDER BY start_time", [dayOfWeek]);
}

export async function deleteReservationSlot(id: number): Promise<boolean> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "DELETE FROM reservation_slots WHERE id = ?",
    args: [id],
  });
  return rs.rowsAffected > 0;
}

export async function getTripsScheduledForDate(dateStr: string): Promise<TripRow[]> {
  const startOfDay = Math.floor(new Date(dateStr + "T00:00:00").getTime() / 1000);
  const endOfDay = Math.floor(new Date(dateStr + "T23:59:59").getTime() / 1000);
  return query<TripRow>("SELECT * FROM trips WHERE scheduled_at >= ? AND scheduled_at <= ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at", [startOfDay, endOfDay]);
}

export async function getUpcomingReservations(limit = 20): Promise<TripRow[]> {
  const now = Math.floor(Date.now() / 1000);
  return query<TripRow>("SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at > ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at ASC LIMIT ?", [now, limit]);
}

export async function getExpiredTrips(): Promise<TripRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const trips = await query<TripRow>("SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at < ? AND status NOT IN ('completado','cancelado')", [now]);
  checkDivergenceForTrips(trips, "getExpiredTrips");
  return trips;
}

// ========== TARIFFS ==========

interface TariffWithPrice extends TariffRow {
  price: number;
  piso: number;
  piso_low: number | null;
  garantizado: number;
}

export async function findTariff(origin: string, destination: string, passengers: number): Promise<TariffWithPrice | null> {
  const o = origin.toLowerCase().trim();
  const d = destination.toLowerCase().trim();
  const t = await queryOne<TariffRow>("SELECT * FROM tariffs WHERE LOWER(origin) = ? AND LOWER(destination) = ? LIMIT 1", [o, d]);
  if (!t) return null;
  return {
    ...t,
    price: passengers > 4 ? t.price_6p : t.price_4p,
    piso: passengers > 4 ? t.piso_6p : t.piso_4p,
    piso_low: passengers > 4 ? t.piso_6p_low : t.piso_4p_low,
    garantizado: passengers > 4 ? (t.garantizado_6p ?? Math.round(t.price_6p * 0.85)) : (t.garantizado_4p ?? Math.round(t.price_4p * 0.85)),
  };
}

export async function searchTariffs(text: string): Promise<TariffRow[]> {
  const q = `%${text.toLowerCase()}%`;
  return query<TariffRow>("SELECT * FROM tariffs WHERE LOWER(origin) LIKE ? OR LOWER(destination) LIKE ?", [q, q]);
}

async function seedTariffs(): Promise<void> {
  const data: any[] = [
    {origin:"Puerto Iguazú",destination:"Aduana Brasil (Puente Tancredo Neves)",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:32000,garantizado4:25000,garantizado6:32000},
    {origin:"Puerto Iguazú",destination:"Aeropuerto Foz (IGU)",modality:"Solo ida",crosses:1,wait:0,price4:55000,price6:77000,piso4:44000,piso6:61000,garantizado4:44000,garantizado6:61000},
    {origin:"Puerto Iguazú",destination:"Blue Park (Parque Acuático)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000,garantizado4:56000,garantizado6:78000},
    {origin:"Puerto Iguazú",destination:"Cabecera Puente de la Amistad",modality:"Solo ida",crosses:1,wait:0,price4:80000,price6:112000,piso4:64000,piso6:89000,garantizado4:64000,garantizado6:89000},
    {origin:"Puerto Iguazú",destination:"Cataratas Brasil (Parque das Aves)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:80000,price6:112000,piso4:64000,piso6:89000,garantizado4:64000,garantizado6:89000},
    {origin:"Puerto Iguazú",destination:"Cataratas Brasil + Rafain Almuerzo",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:90000,price6:126000,piso4:72000,piso6:100000,garantizado4:72000,garantizado6:100000},
    {origin:"Puerto Iguazú",destination:"Cena Show Rafain",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000,garantizado4:56000,garantizado6:78000},
    {origin:"Puerto Iguazú",destination:"Centro de Foz",modality:"Solo ida",crosses:1,wait:0,price4:60000,price6:84000,piso4:48000,piso6:67000,garantizado4:48000,garantizado6:67000},
    {origin:"Puerto Iguazú",destination:"Foz Centro / Hotel Belmond",modality:"Solo ida",crosses:1,wait:0,price4:52000,price6:72000,piso4:41000,piso6:56000,garantizado4:41000,garantizado6:56000},
    {origin:"Puerto Iguazú",destination:"Hotel Recanto / Hotel Mabu / Hotel Rafain Palace",modality:"Solo ida",crosses:1,wait:0,price4:72000,price6:100000,piso4:57000,piso6:80000,garantizado4:57000,garantizado6:80000},
    {origin:"Puerto Iguazú",destination:"Hora de Espera (Brasil)",modality:"Adicional",crosses:1,wait:1,price4:20000,price6:28000},
    {origin:"Puerto Iguazú",destination:"Itaipú",modality:"Solo ida",crosses:1,wait:0,price4:97500,price6:136000,piso4:78000,piso6:108000,garantizado4:78000,garantizado6:108000},
    {origin:"Puerto Iguazú",destination:"Marco de las Tres Fronteras (Brasil)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000,garantizado4:56000,garantizado6:78000},
    {origin:"Puerto Iguazú",destination:"Represa Itaipú + Templo Budista",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:100000,price6:140000,piso4:80000,piso6:112000,garantizado4:80000,garantizado6:112000},
    {origin:"Puerto Iguazú",destination:"Shopping JL",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:80000,price6:112000,piso4:64000,piso6:89000,garantizado4:64000,garantizado6:89000},
    {origin:"Puerto Iguazú",destination:"Shopping Palladium",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000,garantizado4:56000,garantizado6:78000},
    {origin:"Puerto Iguazú",destination:"Terminal Foz / Rodoviaria Foz",modality:"Solo ida",crosses:1,wait:0,price4:60000,price6:84000,piso4:48000,piso6:67000,garantizado4:48000,garantizado6:67000},
    {origin:"Puerto Iguazú",destination:"Yup Star (Rueda de la Fortuna)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000,garantizado4:56000,garantizado6:78000},
    {origin:"Puerto Iguazú",destination:"Asunción",modality:"Solo ida",crosses:1,wait:0,price4:1000000,price6:1400000,piso4:800000,piso6:1120000,garantizado4:800000,garantizado6:1120000},
    {origin:"Puerto Iguazú",destination:"Ciudad del Este (KM4) / Terminal Ciudad del Este",modality:"Solo ida",crosses:1,wait:0,price4:104500,price6:146000,piso4:83000,piso6:116000,garantizado4:83000,garantizado6:116000},
    {origin:"Puerto Iguazú",destination:"Saltos del Monday",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:200000,price6:280000,piso4:160000,piso6:224000,garantizado4:160000,garantizado6:224000},
    {origin:"Puerto Iguazú",destination:"Tour de Compras CDE + Cataratas Brasil",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:190000,price6:266000,piso4:152000,piso6:212000,garantizado4:152000,garantizado6:212000},
    {origin:"Puerto Iguazú",destination:"Tour de Compras (Ciudad del Este)",modality:"Ida y Vuelta con Espera",crosses:1,wait:3,price4:130000,price6:182000,piso4:100000,piso6:145000,garantizado4:100000,garantizado6:145000},
    {origin:"Puerto Iguazú",destination:"Aduana de Argentina",modality:"Solo ida",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:10000,garantizado4:8000,garantizado6:10000},
    {origin:"Puerto Iguazú",destination:"Aduana de Argentina con migraciones",modality:"Solo ida",crosses:1,wait:0,price4:20000,price6:28000,piso4:16000,piso6:20000,garantizado4:16000,garantizado6:20000},
    {origin:"Aeropuerto IGR",destination:"Aduana Brasil (Puente Tancredo Neves)",modality:"Solo ida",crosses:1,wait:0,price4:65000,price6:91000,piso4:52000,piso6:72000,garantizado4:52000,garantizado6:72000},
    {origin:"Aeropuerto IGR",destination:"Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil",modality:"Solo ida",crosses:1,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000,garantizado4:68000,garantizado6:95000},
    {origin:"Puerto Iguazú",destination:"Aeropuerto IGR",modality:"Solo ida",crosses:0,wait:0,price4:32000,price6:44000,piso4:25000,piso6:32000,garantizado4:25000,garantizado6:32000},
    {origin:"Puerto Iguazú",destination:"Cataratas + Minas Wanda",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:120000,price6:168000,piso4:100000,piso6:134000,garantizado4:100000,garantizado6:134000},
    {origin:"Aeropuerto IGR",destination:"Cataratas Argentinas / Hotel Meliá",modality:"Solo ida",crosses:0,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000,garantizado4:25000,garantizado6:35000},
    {origin:"Aeropuerto IGR",destination:"Cataratas Argentinas + Foz",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:154000,price6:215000,piso4:123000,piso6:172000,garantizado4:123000,garantizado6:172000},
    {origin:"Aeropuerto IGR",destination:"Cataratas Argentinas + Puerto Iguazú",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:72000,price6:100000,piso4:57000,piso6:80000,garantizado4:57000,garantizado6:80000},
    {origin:"Aeropuerto IGR",destination:"Cataratas Argentinas + Cataratas Brasil + Puerto Iguazú",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:208000,price6:291000,piso4:166000,piso6:232000,garantizado4:166000,garantizado6:232000},
    {origin:"Puerto Iguazú",destination:"Cataratas Argentinas",modality:"Ida y Vuelta (2 tramos)",crosses:0,wait:0,price4:60000,price6:84000,piso4:50000,piso6:67000,garantizado4:50000,garantizado6:67000},
    {origin:"Puerto Iguazú",destination:"Cataratas Argentinas (Solo Ida)",modality:"Solo ida",crosses:0,wait:0,price4:35000,price6:49000,piso4:25000,piso6:39000,garantizado4:25000,garantizado6:39000},
    {origin:"Aeropuerto IGR",destination:"Cataratas Brasil + Regreso a Aeropuerto IGR",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:176000,price6:246000,piso4:140000,piso6:196000,garantizado4:140000,garantizado6:196000},
    {origin:"Aeropuerto IGR",destination:"Ciudad del Este (KM4) / Terminal Ciudad del Este",modality:"Solo ida",crosses:1,wait:0,price4:137000,price6:191000,piso4:109000,piso6:152000,garantizado4:109000,garantizado6:152000},
    {origin:"Puerto Iguazú",destination:"Centro Puerto Iguazú",modality:"Solo ida",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:9000,garantizado4:8000,garantizado6:9000},
    {origin:"Puerto Iguazú",destination:"Centro Puerto Iguazú (desde 600 Has zona Awasi/Loi)",modality:"Solo ida",crosses:0,wait:0,price4:15000,price6:21000,piso4:12000,piso6:9000,garantizado4:12000,garantizado6:9000},
    {origin:"Puerto Iguazú",destination:"Centro Puerto Iguazú (desde 600 Has resto)",modality:"Solo ida",crosses:0,wait:0,price4:12000,price6:16000,piso4:9000,piso6:9000,garantizado4:9000,garantizado6:9000},
    {origin:"Puerto Iguazú",destination:"Centro Puerto Iguazú (hacia Guira Oga / Aripuca / Bar de Hielo)",modality:"Solo ida",crosses:0,wait:0,price4:12000,price6:16000,piso4:9000,piso6:12800,garantizado4:9000,garantizado6:12800},
    {origin:"Puerto Iguazú",destination:"Duty Free Shop",modality:"Solo ida",crosses:0,wait:0,price4:15000,price6:21000,piso4:12000,piso6:16000,garantizado4:12000,garantizado6:16000},
    {origin:"Aeropuerto IGR",destination:"Duty Free Shop Iguazú",modality:"Solo ida",crosses:1,wait:0,price4:52000,price6:72000,piso4:41000,piso6:56000,garantizado4:41000,garantizado6:56000},
    {origin:"Puerto Iguazú",destination:"El Soberbio",modality:"Solo ida",crosses:0,wait:0,price4:505000,price6:707000,piso4:404000,piso6:565000,garantizado4:404000,garantizado6:565000},
    {origin:"Puerto Iguazú",destination:"Eldorado",modality:"Solo ida",crosses:0,wait:0,price4:195000,price6:273000,piso4:156000,piso6:218000,garantizado4:156000,garantizado6:218000},
    {origin:"Puerto Iguazú",destination:"Esperanza",modality:"Solo ida",crosses:0,wait:0,price4:98000,price6:137000,piso4:78400,piso6:109000,garantizado4:78400,garantizado6:109000},
    {origin:"Aeropuerto IGR",destination:"Foz Centro / Hotel Belmond",modality:"Solo ida",crosses:1,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000,garantizado4:68000,garantizado6:95000},
    {origin:"Aeropuerto IGR",destination:"Full Day",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:260000,price6:364000,piso4:208000,piso6:291000,garantizado4:208000,garantizado6:291000},
    {origin:"Aeropuerto IGR",destination:"Hotel Amerian / Hito 3 Fronteras / Puerto",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000,garantizado4:25000,garantizado6:35000},
    {origin:"Aeropuerto IGR",destination:"Hotel Recanto / Hotel Mabu / Hotel Rafain Palace",modality:"Solo ida",crosses:1,wait:0,price4:104000,price6:145000,piso4:83000,piso6:116000,garantizado4:83000,garantizado6:116000},
    {origin:"Puerto Iguazú",destination:"Hito 3 Fronteras",modality:"Solo ida",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:10000,garantizado4:8000,garantizado6:10000},
    {origin:"Puerto Iguazú",destination:"Hora de Espera (Argentina)",modality:"Adicional",crosses:0,wait:1,price4:10000,price6:14000},
    {origin:"Puerto Iguazú",destination:"Hora de Espera (Paraguay)",modality:"Adicional",crosses:1,wait:1,price4:20000,price6:28000,piso4:16000,piso6:22000,garantizado4:16000,garantizado6:22000},
    {origin:"Aeropuerto IGR",destination:"Hoteles 600 Hectáreas",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000,garantizado4:25000,garantizado6:35000},
    {origin:"Aeropuerto IGR",destination:"Itaipú",modality:"Solo ida",crosses:1,wait:0,price4:130000,price6:182000,piso4:104000,piso6:145000,garantizado4:104000,garantizado6:145000},
    {origin:"Puerto Iguazú",destination:"Minas de Wanda",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:90000,price6:126000,piso4:72000,piso6:100000,garantizado4:72000,garantizado6:100000},
    {origin:"Puerto Iguazú",destination:"Posadas",modality:"Solo ida",crosses:0,wait:0,price4:569000,price6:786000,piso4:455200,piso6:628000,garantizado4:455200,garantizado6:628000},
    {origin:"Aeropuerto IGR",destination:"Puerto Iguazú Centro",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000,garantizado4:25000,garantizado6:35000},
    {origin:"Puerto Iguazú",destination:"Puerto Libertad",modality:"Solo ida",crosses:0,wait:0,price4:72000,price6:100000,piso4:57600,piso6:80000,garantizado4:57600,garantizado6:80000},
    {origin:"Puerto Iguazú",destination:"Saltos del Moconá",modality:"Ida y Vuelta",crosses:0,wait:1,price4:450000,price6:630000,piso4:360000,piso6:504000,garantizado4:360000,garantizado6:504000},
    {origin:"Puerto Iguazú",destination:"Saltos del Moconá",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:949000,price6:1328000,piso4:759200,piso6:1000000,garantizado4:759200,garantizado6:1000000},
    {origin:"Puerto Iguazú",destination:"Saltos Mbocai",modality:"Ida y Vuelta",crosses:0,wait:0,price4:50000,price6:70000,piso4:40000,piso6:56000,garantizado4:40000,garantizado6:56000},
    {origin:"Puerto Iguazú",destination:"San Ignacio",modality:"Solo ida",crosses:0,wait:0,price4:475000,price6:665000,piso4:380000,piso6:532000,garantizado4:380000,garantizado6:532000},
    {origin:"Puerto Iguazú",destination:"San Ignacio + Wanda + Yerbatera",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:400000,price6:560000,piso4:350000,piso6:448000,garantizado4:350000,garantizado6:448000},
    {origin:"Puerto Iguazú",destination:"Wanda",modality:"Solo ida",crosses:0,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000,garantizado4:68000,garantizado6:95000},
    {origin:"",destination:"Zona Tupá lodge, Barrio Santa Rosa",modality:"Adicional",crosses:0,wait:0,price4:20000,price6:28000,piso4:16000,piso6:22000,garantizado4:16000,garantizado6:22000},

    // === BRL tariffs (origin Foz/Brazil side, commission 20%) ===
    {origin:"Aeropuerto IGU",destination:"Centro Foz",modality:"Solo ida",crosses:0,wait:0,price4:150,price6:210,piso4:120,piso6:168,garantizado4:120,garantizado6:168},
    {origin:"Aeropuerto IGU",destination:"Aeropuerto IGR",modality:"Solo ida",crosses:1,wait:0,price4:400,price6:560,piso4:320,piso6:448,garantizado4:320,garantizado6:448},
    {origin:"Aeropuerto IGU",destination:"By Night (Feirinha/Duty/Rest. AR)",modality:"Ida y Vuelta con Espera",crosses:1,wait:3,price4:450,price6:630,piso4:360,piso6:504,garantizado4:360,garantizado6:504},
    {origin:"Aeropuerto IGU",destination:"Cataratas AR",modality:"Solo ida",crosses:1,wait:0,price4:500,price6:700,piso4:400,piso6:560,garantizado4:400,garantizado6:560},
    {origin:"Aeropuerto IGU",destination:"Cataratas BR",modality:"Solo ida",crosses:0,wait:0,price4:300,price6:420,piso4:240,piso6:336,garantizado4:240,garantizado6:336},
    {origin:"Aeropuerto IGU",destination:"Paraguay región central",modality:"Solo ida",crosses:1,wait:0,price4:400,price6:560,piso4:320,piso6:448,garantizado4:320,garantizado6:448},
    {origin:"Aeropuerto IGU",destination:"Paraguay próximo a cataratas",modality:"Solo ida",crosses:1,wait:0,price4:550,price6:770,piso4:440,piso6:616,garantizado4:440,garantizado6:616},
  ];
  for (const r of data) {
    try {
      await getDbv().execute({
        sql: "INSERT OR REPLACE INTO tariffs (origin, destination, modality, crosses_border, wait_included, price_4p, price_6p, piso_4p, piso_6p, piso_4p_low, piso_6p_low, garantizado_4p, garantizado_6p) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [r.origin, r.destination, r.modality, r.crosses, r.wait, r.price4, r.price6, r.piso4, r.piso6, Math.round(r.piso4 * 0.8), Math.round(r.piso6 * 0.8), r.garantizado4 ?? Math.round(r.price4 * 0.85), r.garantizado6 ?? Math.round(r.price6 * 0.85)],
      });
    } catch (e) { console.error("[seedTariffs] error inserting row:", r, e); }
  }
}

async function seedLocationAliases(): Promise<void> {
  const aliases: { alias: string; canonical: string; code?: string }[] = [
    // Aeropuerto IGR
    { alias: "aeropuerto", canonical: "Aeropuerto IGR" },
    { alias: "aeropuerto iguazu", canonical: "Aeropuerto IGR" },
    { alias: "aeropuerto igr", canonical: "Aeropuerto IGR" },
    { alias: "aero igr", canonical: "Aeropuerto IGR" },
    { alias: "igr", canonical: "Aeropuerto IGR", code: "IGR" },
    { alias: "terminal aerea", canonical: "Aeropuerto IGR" },
    { alias: "terminal aérea", canonical: "Aeropuerto IGR" },
    // Aeropuerto Foz / IGU
    { alias: "aeropuerto foz", canonical: "Aeropuerto IGU" },
    { alias: "aeropuerto igu", canonical: "Aeropuerto IGU" },
    { alias: "aero foz", canonical: "Aeropuerto IGU" },
    { alias: "aero igu", canonical: "Aeropuerto IGU" },
    { alias: "igu", canonical: "Aeropuerto IGU", code: "IGU" },
    // Puerto Iguazú
    { alias: "puerto iguazu", canonical: "Puerto Iguazú" },
    { alias: "pto iguazu", canonical: "Puerto Iguazú" },
    { alias: "ptoiguazu", canonical: "Puerto Iguazú" },
    { alias: "puerto", canonical: "Puerto Iguazú" },
    // Centro Urbano (Puerto Iguazú)
    { alias: "centro", canonical: "Centro (Urbano)" },
    { alias: "centro iguazu", canonical: "Centro (Urbano)" },
    { alias: "centro puerto", canonical: "Centro (Urbano)" },
    { alias: "urbano", canonical: "Centro (Urbano)" },
    { alias: "microcentro", canonical: "Centro (Urbano)" },

    // Centro → Puerto Iguazú (alias adicional para match con tariffs)
    { alias: "centro", canonical: "Puerto Iguazú" },
    { alias: "centro iguazu", canonical: "Puerto Iguazú" },
    { alias: "centro puerto", canonical: "Puerto Iguazú" },
    { alias: "urbano", canonical: "Puerto Iguazú" },
    { alias: "microcentro", canonical: "Puerto Iguazú" },
    // Centro de Foz
    { alias: "centro foz", canonical: "Centro de Foz" },
    { alias: "centro de foz", canonical: "Centro de Foz" },
    { alias: "foz centro", canonical: "Centro de Foz" },
    // Foz do Iguaçu
    { alias: "foz", canonical: "Foz do Iguaçu" },
    { alias: "foz do iguacu", canonical: "Foz do Iguaçu" },
    { alias: "foz do iguazú", canonical: "Foz do Iguaçu" },
    { alias: "foz de iguazu", canonical: "Foz do Iguaçu" },
    // Duty Free
    { alias: "duty free", canonical: "Duty Free Shop", code: "DFS" },
    { alias: "duty free shop", canonical: "Duty Free Shop" },
    { alias: "duty", canonical: "Duty Free Shop" },
    // Hito 3 Fronteras
    { alias: "hito", canonical: "Hito 3 Fronteras" },
    { alias: "hito 3 fronteras", canonical: "Hito 3 Fronteras" },
    { alias: "tres fronteras", canonical: "Hito 3 Fronteras" },
    { alias: "3 fronteras", canonical: "Hito 3 Fronteras" },
    { alias: "marco de las 3 fronteras", canonical: "Hito 3 Fronteras" },
    // Cataratas AR
    { alias: "cataratas argentinas", canonical: "Cataratas Argentinas" },
    { alias: "cataratas lado argentino", canonical: "Cataratas Argentinas" },
    { alias: "cataratas arg", canonical: "Cataratas Argentinas" },
    { alias: "cataratas argentina", canonical: "Cataratas Argentinas" },
    { alias: "cataratas ar", canonical: "Cataratas Argentinas" },
    { alias: "parque nacional iguazu", canonical: "Cataratas Argentinas" },
    { alias: "parque nacional", canonical: "Cataratas Argentinas" },
    // Cataratas BR
    { alias: "cataratas brasil", canonical: "Cataratas Brasil (Aves/Aqua)" },
    { alias: "cataratas brasileñas", canonical: "Cataratas Brasil (Aves/Aqua)" },
    { alias: "cataratas lado brasileño", canonical: "Cataratas Brasil (Aves/Aqua)" },
    { alias: "cataratas br", canonical: "Cataratas Brasil (Aves/Aqua)" },
    { alias: "cataratas brasil aves", canonical: "Cataratas Brasil (Aves/Aqua)" },
    // Minas de Wanda
    { alias: "wanda", canonical: "Minas de Wanda" },
    { alias: "minas wanda", canonical: "Minas de Wanda" },
    { alias: "minas de wanda", canonical: "Minas de Wanda" },
    // CDE / Paraguay
    { alias: "cde", canonical: "CDE hasta KM4 / Terminal", code: "CDE" },
    { alias: "ciudad del este", canonical: "CDE hasta KM4 / Terminal" },
    { alias: "paraguay compras", canonical: "Tour Compras CDE" },
    { alias: "tour compras cde", canonical: "Tour Compras CDE" },
    // Saltos del Monday
    { alias: "saltos del monday", canonical: "Saltos del Monday" },
    { alias: "monday", canonical: "Saltos del Monday" },
    // San Ignacio
    { alias: "san ignacio", canonical: "San Ignacio" },
    { alias: "ruinas san ignacio", canonical: "San Ignacio" },
    // Saltos del Mocona
    { alias: "saltos del mocona", canonical: "Saltos del Moconá" },
    { alias: "mocona", canonical: "Saltos del Moconá" },
    { alias: "moconá", canonical: "Saltos del Moconá" },
    // Itaipú
    { alias: "itaipu", canonical: "Itaipú y Alrededores" },
    { alias: "represa itaipu", canonical: "Itaipú y Alrededores" },
    { alias: "itaipú", canonical: "Itaipú y Alrededores" },
    // Ciudad (término genérico → Puerto Iguazú por defecto)
    { alias: "ciudad", canonical: "Puerto Iguazú" },
    { alias: "la ciudad", canonical: "Puerto Iguazú" },
    { alias: "a la ciudad", canonical: "Puerto Iguazú" },
  ];
  for (const a of aliases) {
    try {
      await getDbv().execute({
        sql: "INSERT OR IGNORE INTO location_aliases (alias, canonical_name, location_code) VALUES (?, ?, ?)",
        args: [a.alias, a.canonical, a.code || null],
      });
    } catch (e) { console.error("[seedLocationAliases] error:", a, e); }
  }

  // === Diccionario maestro de sinónimos (INSERT OR REPLACE para sobrescribir mapeos) ===
  const maestroAliases: { canonical_name: string; alias: string }[] = [
    // --- BLOQUE FOZ CIUDAD / CENTRO / BRASIL ---
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "ciudad de foz" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz ciudad" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz do iguazu" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz do iguacu" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz do iguazu ciudad" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz do iguacu centro" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "foz centro" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "centro de foz" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "rodoviaria de foz" },
    { canonical_name: "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil", alias: "terminal de foz" },
    { canonical_name: "Terminal Foz / Rodoviaria Foz", alias: "rodoviaria foz" },
    { canonical_name: "Terminal Foz / Rodoviaria Foz", alias: "terminal foz" },
    { canonical_name: "Foz Centro / Hotel Belmond", alias: "hotel belmond" },
    { canonical_name: "Foz Centro / Hotel Belmond", alias: "belmond das cataratas" },
    // --- BLOQUE ADUANA ESTRICTO ---
    { canonical_name: "Aduana Brasil (Puente Tancredo Neves)", alias: "aduana" },
    { canonical_name: "Aduana Brasil (Puente Tancredo Neves)", alias: "aduana argentina" },
    { canonical_name: "Aduana Brasil (Puente Tancredo Neves)", alias: "aduana brasil" },
    { canonical_name: "Aduana Brasil (Puente Tancredo Neves)", alias: "aduana de foz" },
    { canonical_name: "Aduana Brasil (Puente Tancredo Neves)", alias: "puente tancredo neves" },
    // --- BLOQUE CATARATAS BRASIL ---
    { canonical_name: "Cataratas Brasil (Parque das Aves)", alias: "cataratas brasil" },
    { canonical_name: "Cataratas Brasil (Parque das Aves)", alias: "cataratas brasileñas" },
    { canonical_name: "Cataratas Brasil (Parque das Aves)", alias: "parque das aves" },
    { canonical_name: "Cataratas Brasil (Parque das Aves)", alias: "parque nacional del iguacu" },
    { canonical_name: "Cataratas Brasil (Parque das Aves)", alias: "cataratas do iguacu" },
    // --- BLOQUE COMPRAS / CIUDAD DEL ESTE ---
    { canonical_name: "Duty Free Shop", alias: "duty free" },
    { canonical_name: "Duty Free Shop", alias: "duty free shop" },
    { canonical_name: "Duty Free Shop", alias: "dury free" },
    { canonical_name: "Duty Free Shop", alias: "supermercado macro" },
    { canonical_name: "Cabecera Puente de la Amistad", alias: "ciudad del este" },
    { canonical_name: "Cabecera Puente de la Amistad", alias: "cde" },
    { canonical_name: "Cabecera Puente de la Amistad", alias: "puente de la amistad" },
    { canonical_name: "Cabecera Puente de la Amistad", alias: "paraguay" },
    { canonical_name: "Tour de Compras (Ciudad del Este)", alias: "tour compras" },
    { canonical_name: "Tour de Compras (Ciudad del Este)", alias: "compras cde" },
    { canonical_name: "Tour de Compras (Ciudad del Este)", alias: "tour de compras" },
    // --- BLOQUE HOTELES EN 600 HECTÁREAS ---
    { canonical_name: "Hoteles 600 Hectáreas", alias: "600 hectareas" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "loi suites" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "loi suites iguazu" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "hotel selvaje" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "oi pozos" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "yvy hotel" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "mercurio 600" },
    { canonical_name: "Hoteles 600 Hectáreas", alias: "falls iguazu" },
    { canonical_name: "Centro Puerto Iguazú (desde 600 Has zona Awasi/Loi)", alias: "awasi" },
    { canonical_name: "Centro Puerto Iguazú (desde 600 Has zona Awasi/Loi)", alias: "loi" },
    { canonical_name: "Centro Puerto Iguazú (desde 600 Has zona Awasi/Loi)", alias: "village" },
    // --- BLOQUE HOTELES FOHAMA ---
    { canonical_name: "Hotel Recanto / Hotel Mabu / Hotel Rafain Palace", alias: "recanto" },
    { canonical_name: "Hotel Recanto / Hotel Mabu / Hotel Rafain Palace", alias: "mabu" },
    { canonical_name: "Hotel Recanto / Hotel Mabu / Hotel Rafain Palace", alias: "rafain palace" },
    { canonical_name: "Hotel Recanto / Hotel Mabu / Hotel Rafain Palace", alias: "rafain" },
    { canonical_name: "Hotel Amerian / Hito 3 Fronteras / Puerto", alias: "amerian" },
    { canonical_name: "Hotel Amerian / Hito 3 Fronteras / Puerto", alias: "hotel amerian" },
    // --- BLOQUE AEROPUERTOS ---
    { canonical_name: "Aeropuerto IGR", alias: "aeropuerto iguazu" },
    { canonical_name: "Aeropuerto IGR", alias: "aeropuerto misiones" },
    { canonical_name: "Aeropuerto IGR", alias: "aeropuerto argentina" },
    { canonical_name: "Aeropuerto IGR", alias: "igr" },
    { canonical_name: "Aeropuerto Foz (IGU)", alias: "aeropuerto de foz" },
    { canonical_name: "Aeropuerto Foz (IGU)", alias: "aeropuerto brasileño" },
    { canonical_name: "Aeropuerto Foz (IGU)", alias: "igu" },
    // --- BLOQUE CATARATAS ARGENTINAS ---
    { canonical_name: "Cataratas Argentinas", alias: "cataratas ar" },
    { canonical_name: "Cataratas Argentinas", alias: "cataratas" },
    { canonical_name: "Cataratas Argentinas", alias: "parque nacional iguazu" },
    { canonical_name: "Cataratas Argentinas / Hotel Meliá", alias: "melia" },
    { canonical_name: "Cataratas Argentinas / Hotel Meliá", alias: "hotel melia" },
    { canonical_name: "Cataratas Argentinas / Hotel Meliá", alias: "meliá" },
    // --- BLOQUE CENTRO PUERTO IGUAZÚ ---
    { canonical_name: "Centro Puerto Iguazú", alias: "centro" },
    { canonical_name: "Centro Puerto Iguazú", alias: "centro iguazu" },
    { canonical_name: "Centro Puerto Iguazú", alias: "centro puerto" },
    { canonical_name: "Centro Puerto Iguazú", alias: "microcentro" },
    { canonical_name: "Centro Puerto Iguazú", alias: "puerto iguazu centro" },
    // --- BLOQUE PUERTO IGUAZÚ (referencias) ---
    { canonical_name: "Puerto Iguazú", alias: "puerto iguazu" },
    { canonical_name: "Puerto Iguazú", alias: "pto iguazu" },
    { canonical_name: "Puerto Iguazú", alias: "puerto" },
  ];
  for (const item of maestroAliases) {
    try {
      await getDbv().execute({
        sql: "INSERT OR REPLACE INTO location_aliases (alias, canonical_name) VALUES (?, ?)",
        args: [item.alias, item.canonical_name],
      });
    } catch (e) { console.error("[maestroAliases] error:", item, e); }
  }
}

// ========== MIGRATION: update centro canonical to match tariffs table ==========
async function migrateCentroAlias(): Promise<void> {
  try {
    // Update aliases that currently point to "Centro Puerto Iguazú" (from maestro) → "Puerto Iguazú"
    const affected = ["centro", "centro iguazu", "centro puerto", "microcentro"];
    for (const a of affected) {
      await getDbv().execute({
        sql: "UPDATE location_aliases SET canonical_name = ? WHERE LOWER(alias) = ? AND LOWER(canonical_name) IN (?, ?)",
        args: ["Puerto Iguazú", a, "centro (urbano)", "centro puerto iguazú"],
      });
    }
  } catch (e) { console.error("[migrateCentroAlias] error:", e); }
}

async function migrateTariffNames(): Promise<void> {
  const renames: [string, string][] = [
    ["Aero Foz / Rodoviaria / Cataratas BR", "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil"],
    ["Aduana de Foz", "Aduana Brasil (Puente Tancredo Neves)"],
    ["Itaipú y Alrededores", "Itaipú"],
    ["Cataratas Brasil (Aves/Aqua)", "Cataratas Brasil (Parque das Aves)"],
    ["Centro (Urbano)", "Centro Puerto Iguazú"],
    ["Hora de espera (BR)", "Hora de Espera (Brasil)"],
    ["Hora de espera (Arg)", "Hora de Espera (Argentina)"],
    ["Hora de espera (PY)", "Hora de Espera (Paraguay)"],
    ["Tour Compras CDE", "Tour de Compras (Ciudad del Este)"],
    ["Tour Compras + Cataratas Brasil", "Tour de Compras CDE + Cataratas Brasil"],
    ["Cabecera Puente Amistad", "Cabecera Puente de la Amistad"],
    ["Marco de las 3 Fronteras (BR)", "Marco de las Tres Fronteras (Brasil)"],
    ["Represa Itaipu + Templo Buda", "Represa Itaipú + Templo Budista"],
    ["Cataratas AR y a Foz", "Cataratas Argentinas + Foz"],
    ["Cataratas AR y Puerto Iguazú", "Cataratas Argentinas + Puerto Iguazú"],
    ["Cataratas AR, BR y Pto Iguazú", "Cataratas Argentinas + Cataratas Brasil + Puerto Iguazú"],
    ["Cataratas BR y Regreso Aero", "Cataratas Brasil + Regreso a Aeropuerto IGR"],
    ["Cataratas AR / Hotel Melia", "Cataratas Argentinas / Hotel Meliá"],
    ["Yup Star (Rueda)", "Yup Star (Rueda de la Fortuna)"],
    ["Blue Park", "Blue Park (Parque Acuático)"],
    ["Cataratas Argentinas solo ida", "Cataratas Argentinas (Solo Ida)"],
    ["Terminal Foz/ Rodoviaria Foz", "Terminal Foz / Rodoviaria Foz"],
    ["CDE hasta KM4 / Terminal", "Ciudad del Este (KM4) / Terminal Ciudad del Este"],
  ];
  for (const [oldDest, newDest] of renames) {
    try {
      await getDbv().execute({ sql: "UPDATE tariffs SET destination = ? WHERE destination = ?", args: [newDest, oldDest] });
    } catch (e) { console.error("[migrateTariffNames] error renaming:", oldDest, "→", newDest, e); }
  }
  try {
    await getDbv().execute({ sql: "DELETE FROM tariffs WHERE destination = ?", args: ["Cataratas AR / Hotel Meliá"] });
  } catch (e) { console.error("[migrateTariffNames] error deleting duplicate:", e); }
}

function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function resolveAlias(text: string): Promise<{ resolved: boolean; names: string[] }> {
  if (!text) return { resolved: false, names: [] };
  const lower = text.toLowerCase().trim();
  const direct = await query<LocationAliasRow>(
    "SELECT canonical_name FROM location_aliases WHERE LOWER(alias) = ? LIMIT 5",
    [lower]
  );
  if (direct.length > 0) return { resolved: true, names: [...new Set(direct.map(r => r.canonical_name))] };

  // Fuzzy fallback — Levenshtein ≤ 3 against all unique aliases
  const all = await query<LocationAliasRow>(
    "SELECT DISTINCT alias, canonical_name FROM location_aliases"
  );
  let bestDist = Infinity;
  let bestAlias: string | undefined;
  let bestCanonical: string | undefined;
  for (const row of all) {
    const d = levenshtein(lower, row.alias.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      bestAlias = row.alias;
      bestCanonical = row.canonical_name;
    }
  }
  if (bestDist <= 3 && bestCanonical && bestAlias) {
    // Auto-insert the new alias so future requests get exact match
    await getDbv().execute({
      sql: "INSERT OR IGNORE INTO location_aliases (alias, canonical_name) VALUES (?, ?)",
      args: [lower, bestCanonical],
    });
    return { resolved: true, names: [bestCanonical] };
  }
  return { resolved: false, names: [text] };
}

// ========== CHAT SESSIONS (Slot-Filling) ==========

export async function getChatSession(phone: string): Promise<ChatSessionRow | null> {
  return queryOne<ChatSessionRow>("SELECT * FROM chat_sessions WHERE phone = ?", [phone]);
}

export async function upsertChatSession(
  phone: string,
  slots: Record<string, any>,
  confidence?: Record<string, number>,
  workflowState?: string,
  clarifyField?: string,
): Promise<void> {
  await ensureSchema();
  const existing = await getChatSession(phone);
  const now = Math.floor(Date.now() / 1000);
  if (existing) {
    const oldSlots = JSON.parse(existing.slots || "{}");
    const merged = { ...oldSlots, ...slots };
    const mergedConfidence = confidence
      ? { ...JSON.parse(existing.confidence || "{}"), ...confidence }
      : existing.confidence;
    await getDbv().execute({
      sql: `UPDATE chat_sessions SET slots = ?, confidence = ?, extraction_count = extraction_count + 1, last_extracted_at = ?, workflow_state = ?, clarify_field = ?, updated_at = ? WHERE phone = ?`,
      args: [JSON.stringify(merged), JSON.stringify(mergedConfidence), now, workflowState || existing.workflow_state || "idle", clarifyField || existing.clarify_field || null, now, phone],
    });
  } else {
    await getDbv().execute({
      sql: `INSERT INTO chat_sessions (phone, slots, confidence, extraction_count, last_extracted_at, workflow_state, clarify_field, updated_at) VALUES (?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [phone, JSON.stringify(slots), JSON.stringify(confidence || {}), now, workflowState || "idle", clarifyField || null, now],
    });
  }
}

export async function updateChatSessionWorkflow(phone: string, workflowState: string, clarifyField?: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE chat_sessions SET workflow_state = ?, clarify_field = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [workflowState, clarifyField || null, phone],
  });
}

// Fase 3 v5.0: setter dedicado para transiciones de despacho.
// NO toca clarify_field/slots/confidence — sólo workflow_state y updated_at.
export async function setChatSessionWorkflowState(phone: string, state: string, executor?: DbExecutor): Promise<void> {
  const db = executor ?? getDbv();
  await db.execute({
    sql: "UPDATE chat_sessions SET workflow_state = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [state, phone],
  });
}

export async function resetChatSession(phone: string): Promise<void> {
  await getDbv().execute({ sql: "DELETE FROM chat_sessions WHERE phone = ?", args: [phone] });
}

interface DriverDiscountWithTariff extends DriverDiscountRow {
  origin: string;
  destination: string;
}

export async function getDiscountsForTariff(tariffId: number): Promise<DriverDiscountWithDriverRow[]> {
  return query<DriverDiscountWithDriverRow>(`SELECT d.*, dr.name as driver_name FROM driver_discounts d
    LEFT JOIN drivers dr ON dr.phone = d.driver_phone
    WHERE d.tariff_id = ? AND d.active = 1 AND (d.valid_until IS NULL OR d.valid_until > unixepoch())`, [tariffId]);
}

export async function getDriverDiscountForTariff(driverPhone: string, tariffId: number): Promise<number | null> {
  const rows = await getDbv().execute({
    sql: "SELECT discount_pct FROM driver_discounts WHERE driver_phone = ? AND tariff_id = ? AND active = 1 AND (valid_until IS NULL OR valid_until > unixepoch())",
    args: [driverPhone, tariffId],
  });
  const row = (rows.rows as any[])[0];
  return row?.discount_pct ?? null;
}

export async function getDriverDiscounts(driverPhone: string): Promise<DriverDiscountWithTariff[]> {
  return query<DriverDiscountWithTariff>(`SELECT d.*, t.origin, t.destination FROM driver_discounts d
    LEFT JOIN tariffs t ON t.id = d.tariff_id
    WHERE d.driver_phone = ? AND d.active = 1 AND (d.valid_until IS NULL OR d.valid_until > unixepoch())
    ORDER BY d.created_at DESC`, [driverPhone]);
}

export async function createDriverDiscount(driverPhone: string, tariffId: number, discountPct: number, validUntilDays?: number): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  // Check max 4 active discounts per driver
  const count = await getDbv().execute({
    sql: `SELECT COUNT(*) as c FROM driver_discounts WHERE driver_phone = ? AND active = 1 AND (valid_until IS NULL OR valid_until > unixepoch())`,
    args: [driverPhone],
  });
  if ((count.rows as any[])[0].c >= 4) {
    return { ok: false, error: "Ya tenés 4 descuentos activos. Eliminá uno antes de agregar otro." };
  }
  let validUntil: number | null = null;
  if (validUntilDays && validUntilDays > 0) {
    validUntil = Math.floor(Date.now() / 1000) + validUntilDays * 86400;
  }
  try {
    await getDbv().execute({
      sql: "INSERT INTO driver_discounts (driver_phone, tariff_id, discount_pct, valid_until) VALUES (?, ?, ?, ?)",
      args: [driverPhone, tariffId, discountPct, validUntil],
    });
    return { ok: true };
  } catch (e: any) {
    return { ok: false, error: e.message };
  }
}

export async function deleteDriverDiscount(id: number, driverPhone: string): Promise<boolean> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "DELETE FROM driver_discounts WHERE id = ? AND driver_phone = ?",
    args: [id, driverPhone],
  });
  return rs.rowsAffected > 0;
}

export async function setCustomerName(phone: string, name: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())",
    args: [`customer_name_${phone}`, name.trim()],
  });
}

export async function getCustomerName(phone: string): Promise<string | null> {
  const row = await getDbv().execute({
    sql: "SELECT value FROM connection_state WHERE key = ?",
    args: [`customer_name_${phone}`],
  });
  return ((row.rows as any[])[0]?.value) || null;
}

// ========== DB INSTANCE ==========

export async function getConnectionValue(key: string): Promise<string | null> {
  const rs = await getDbv().execute({ sql: "SELECT value FROM connection_state WHERE key = ?", args: [key] });
  return (rs.rows[0] as { value?: string } | undefined)?.value ?? null;
}

export async function getConnectionValueFlag(key: string): Promise<boolean> {
  const val = await getConnectionValue(key);
  return val !== null;
}

export async function setConnectionFlag(key: string): Promise<void> {
  await getDbv().execute({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, '1', unixepoch())", args: [key] });
}

export async function setConnectionValue(key: string, value: string): Promise<void> {
  await getDbv().execute({ sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())", args: [key, value] });
}

export async function deleteConnectionKey(key: string): Promise<void> {
  await getDbv().execute({ sql: "DELETE FROM connection_state WHERE key = ?", args: [key] });
}

// ========== PROCESSED MESSAGES (WhatsApp webhook idempotency) ==========
//
// Atomic UNIQUE-based registration. SQLite PRIMARY KEY is the synchronization
// mechanism: two concurrent webhooks with the same message_id cannot both
// succeed at INSERT. The first wins; the second sees rowsAffected=0.

export async function tryRegisterMessage(
  messageId: string,
  phone: string,
  messageType: string,
  payloadHash: string,
): Promise<boolean> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: `INSERT OR IGNORE INTO processed_messages (message_id, phone, message_type, processed_at, payload_hash)
          VALUES (?, ?, ?, unixepoch(), ?)`,
    args: [messageId, phone, messageType, payloadHash],
  });
  return rs.rowsAffected > 0;
}

export async function isMessageProcessed(messageId: string): Promise<boolean> {
  const row = await queryOne<{ c: number }>(
    "SELECT COUNT(*) as c FROM processed_messages WHERE message_id = ?",
    [messageId],
  );
  return (row?.c ?? 0) > 0;
}

export async function getProcessedMessage(messageId: string): Promise<ProcessedMessageRow | null> {
  return queryOne<ProcessedMessageRow>(
    "SELECT message_id, phone, message_type, processed_at, payload_hash FROM processed_messages WHERE message_id = ?",
    [messageId],
  );
}

export async function countProcessedMessages(): Promise<number> {
  const row = await queryOne<{ c: number }>("SELECT COUNT(*) as c FROM processed_messages");
  return row?.c ?? 0;
}

export function getDbInstance(): LibSqlClient {
  return getDbv();
}

async function seedOpportunityRules(): Promise<void> {
  const rules = [
    { type: "complement", label: "Cataratas Argentinas", description: "También ofrecemos traslados a Cataratas Argentinas.", priority: 100 },
    { type: "complement", label: "Cataratas Brasileras", description: "También ofrecemos traslados a Cataratas Brasileras.", priority: 90 },
    { type: "complement", label: "City Tour", description: "También ofrecemos City Tour por Foz do Iguaçu.", priority: 80 },
    { type: "complement", label: "Cena Show", description: "También ofrecemos Cena Show con típica parrillada.", priority: 70 },
    { type: "complement", label: "Traslado Aeropuerto Retorno", description: "También ofrecemos traslado de regreso al aeropuerto.", priority: 60 },
  ];
  for (const r of rules) {
    await getDbv().execute({
      sql: `INSERT INTO opportunity_rules (opportunity_type, label, description, priority) VALUES (?, ?, ?, ?)`,
      args: [r.type, r.label, r.description, r.priority],
    });
  }
  console.log("[SEED] Inserted", rules.length, "opportunity rules");
}

export async function getActiveComplementRules(): Promise<OpportunityRuleRow[]> {
  return query<OpportunityRuleRow>(
    "SELECT * FROM opportunity_rules WHERE opportunity_type = 'complement' AND active = 1 ORDER BY priority DESC"
  );
}

export async function insertOpportunityLog(
  conversationId: number,
  clientPhone: string,
  tripId: string,
  ruleId: number | null,
  opportunityType: string,
  label: string,
  originalPrice: number,
  offeredPrice: number,
  phase: string,
  executor?: DbExecutor,
): Promise<number> {
  const db = executor ?? getDbv();
  const rs = await db.execute({
    sql: `INSERT INTO opportunity_log (conversation_id, client_phone, trip_id, rule_id, opportunity_type, label, original_price, offered_price, phase) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [conversationId, clientPhone, tripId, ruleId, opportunityType, label, originalPrice, offeredPrice, phase],
  });
  return Number(rs.lastInsertRowid ?? 0);
}

export async function updateOpportunityLogResponse(
  logId: number,
  clientResponse: string,
  respondedAt: number,
): Promise<void> {
  await getDbv().execute({
    sql: "UPDATE opportunity_log SET client_response = ?, responded_at = ? WHERE id = ?",
    args: [clientResponse, respondedAt, logId],
  });
}

export async function clearPendingOpportunity(phone: string): Promise<void> {
  await getDbv().execute({
    sql: "UPDATE chat_sessions SET pending_opportunity = NULL, updated_at = unixepoch() WHERE phone = ?",
    args: [phone],
  });
}