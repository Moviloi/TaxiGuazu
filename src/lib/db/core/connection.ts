import { createClient } from "@libsql/client";
import type { InValue } from "@libsql/client";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";

type LibSqlClient = ReturnType<typeof createClient>;

export type DbExecutor = {
  execute(stmt: { sql: string; args?: InValue[] }): Promise<{ lastInsertRowid?: number | bigint; rowsAffected?: number }>;
};

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

export function getDb(): LibSqlClient {
  if (dbClient) return dbClient;
  dbClient = createClient({
    url: getUrl(),
    authToken: process.env.TURSO_DATABASE_TOKEN,
  });
  schemaReady = initSchema();
  return dbClient;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    getDb();
    schemaReady = initSchema();
  }
  await schemaReady;
}

async function initSchema(): Promise<void> {
  const db = getDb();
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
      discount_explicit INTEGER DEFAULT 0,
      assigned_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      confirmed_at INTEGER,
      contact_shared_at INTEGER,
      cancelled_at INTEGER,
      cancelled_by TEXT
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
      base_price_4p REAL,
      base_price_6p REAL,
      origin_place_id TEXT,
      destination_place_id TEXT,
      origin_zone_id TEXT,
      destination_zone_id TEXT,
      active INTEGER DEFAULT 1
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
    `CREATE TABLE IF NOT EXISTS alias_lookup (
      alias TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      place_id TEXT,
      normalized_alias TEXT NOT NULL DEFAULT """",
      location_code TEXT,
      active INTEGER NOT NULL DEFAULT 1,
      source TEXT NOT NULL DEFAULT 'manual' CHECK(source IN ('manual','fuzzy','migration')),
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_alias_lookup_canonical ON alias_lookup(canonical_name)`,
    `CREATE INDEX IF NOT EXISTS idx_alias_lookup_normalized ON alias_lookup(normalized_alias)`,
    `CREATE VIEW IF NOT EXISTS location_aliases AS SELECT alias, canonical_name, location_code, created_at FROM alias_lookup WHERE active = 1`,
    `CREATE TABLE IF NOT EXISTS places (
      place_id TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      official_name TEXT NOT NULL,
      google_maps_name TEXT NOT NULL,
      place_type TEXT NOT NULL CHECK(place_type IN ('airport','bus_terminal','border_crossing','attraction','shopping','hotel','resort','hostel','restaurant','casino','event_center','tourist_area','port','other')),
      city TEXT NOT NULL CHECK(city IN ('Puerto Iguazú','Foz do Iguaçu','Ciudad del Este')),
      country TEXT NOT NULL CHECK(country IN ('Argentina','Brasil','Paraguay')),
      latitude REAL,
      longitude REAL,
      tourist_relevance_score INTEGER NOT NULL DEFAULT 5,
      operational_zone TEXT,
      active_status TEXT NOT NULL DEFAULT 'active' CHECK(active_status IN ('active','inactive'))
    )`,
    `CREATE TABLE IF NOT EXISTS aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      alias TEXT NOT NULL,
      language TEXT NOT NULL CHECK(language IN ('es','en','pt'))
    )`,
    `CREATE TABLE IF NOT EXISTS promotions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      adjustment_pct REAL NOT NULL,
      origin_place_id TEXT,
      destination_place_id TEXT,
      origin_zone_id TEXT,
      destination_zone_id TEXT,
      min_passengers INTEGER,
      max_passengers INTEGER,
      valid_from INTEGER,
      valid_until INTEGER,
      active INTEGER DEFAULT 1,
      max_uses INTEGER,
      current_uses INTEGER DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS provider_adjustments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      tariff_id INTEGER NOT NULL,
      adjustment_type TEXT NOT NULL CHECK(adjustment_type IN ('percent','fixed')),
      adjustment_value REAL NOT NULL,
      valid_from INTEGER,
      valid_until INTEGER,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      package_type TEXT NOT NULL CHECK(package_type IN ('round_trip','three_leg','multi_stop')),
      price REAL NOT NULL,
      included_services TEXT,
      origin_place_id TEXT,
      destination_place_id TEXT,
      origin_zone_id TEXT,
      destination_zone_id TEXT,
      valid_from INTEGER,
      valid_until INTEGER,
      active INTEGER DEFAULT 1,
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
      phase TEXT NOT NULL DEFAULT 'post_confirmation',
      responded_at INTEGER
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
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_tariffs_route ON tariffs(LOWER(origin), LOWER(destination))`,
    `CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(LOWER(alias))`,
    `CREATE INDEX IF NOT EXISTS idx_aliases_place ON aliases(place_id)`,
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
    `CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(recorded_at)`,
    `INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')`,
  ]);
}


