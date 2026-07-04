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
      crosses_border INTEGER NOT NULL DEFAULT 0 CHECK(crosses_border IN (0,1)),
      wait_included INTEGER DEFAULT 0,
      public_price_4p REAL,
      public_price_6p REAL,
      driver_price_4p REAL,
      driver_price_6p REAL,
      -- COLUMNAS GEO (resolución de tarifa)
      origin_place_id TEXT,
      destination_place_id TEXT,
      origin_zone_id TEXT,
      destination_zone_id TEXT,
      resolution_priority INTEGER DEFAULT 4 CHECK(resolution_priority BETWEEN 1 AND 4),
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
    `CREATE TABLE IF NOT EXISTS zones (
      zone_id TEXT PRIMARY KEY,
      zone_name TEXT NOT NULL,
      country TEXT NOT NULL,
      area_group TEXT,
      dispatch_priority INTEGER DEFAULT 5,
      base_eta_min INTEGER DEFAULT 10,
      surcharge_description TEXT,
      surcharge_pct REAL DEFAULT 0,
      active INTEGER DEFAULT 1
    )`,
    `CREATE TABLE IF NOT EXISTS places (
      place_id TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      official_name TEXT NOT NULL DEFAULT '',
      display_name TEXT DEFAULT '',
      google_maps_name TEXT NOT NULL DEFAULT '',
      place_type TEXT NOT NULL DEFAULT 'other' CHECK(place_type IN ('airport','bus_terminal','border_crossing','border','attraction','shopping','hotel','resort','hostel','restaurant','casino','event_center','tourist_area','port','other','area','landmark','airbnb','bar','lodge','house')),
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      tourist_relevance_score INTEGER NOT NULL DEFAULT 5,
      operational_zone TEXT,
      zone_id TEXT REFERENCES zones(zone_id),
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
      lang TEXT,
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
    `CREATE TABLE IF NOT EXISTS f9_admin_commands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      command_text TEXT NOT NULL,
      parsed_action TEXT,
      author TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS housekeeping_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job TEXT NOT NULL,
      rows_deleted INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      ran_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS tours (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      trip_type TEXT NOT NULL CHECK(trip_type IN ('round_trip','tour')),
      origin_place_id TEXT,
      origin_zone_id TEXT,
      destination_place_id TEXT,
      destination_zone_id TEXT,
      waypoints TEXT,
      wait_hours INTEGER NOT NULL DEFAULT 0,
      price_4p REAL,
      price_6p REAL,
      driver_price_4p REAL,
      driver_price_6p REAL,
      crosses_border INTEGER DEFAULT 0,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS waiting_rates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      zone_id TEXT REFERENCES zones(zone_id),
      country TEXT NOT NULL CHECK(country IN ('AR','BR','PY')),
      price_per_hour_4p REAL NOT NULL,
      price_per_hour_6p REAL NOT NULL,
      active INTEGER DEFAULT 1
    )`,
    `CREATE INDEX IF NOT EXISTS idx_tariffs_route ON tariffs(LOWER(origin), LOWER(destination)) WHERE origin IS NOT NULL AND destination IS NOT NULL`,
    `CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(LOWER(alias))`,
    `CREATE INDEX IF NOT EXISTS idx_aliases_place ON aliases(place_id)`,
    `CREATE TABLE IF NOT EXISTS trip_groups (
      id TEXT PRIMARY KEY,
      client_phone TEXT NOT NULL,
      total_price REAL,
      passengers INTEGER,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','quoted','confirmed','executing','completed','cancelled')),
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS trip_legs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      group_id TEXT NOT NULL REFERENCES trip_groups(id),
      seq INTEGER NOT NULL,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      scheduled_at INTEGER,
      price REAL,
      status TEXT DEFAULT 'pending' CHECK(status IN ('pending','quoted','confirmed','assigned','completed','cancelled')),
      trip_id TEXT,
      assigned_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_trip_legs_group ON trip_legs(group_id, seq)`,
    `INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')`,
  ]);

  // FASE 5.2.5: Add new workflow state columns for domain separation
  const migrations = [
    "ALTER TABLE chat_sessions ADD COLUMN lang TEXT",
    "ALTER TABLE chat_sessions ADD COLUMN conversational_state TEXT DEFAULT 'idle'",
    "ALTER TABLE chat_sessions ADD COLUMN dispatch_state TEXT DEFAULT 'idle'",
    "ALTER TABLE chat_sessions ADD COLUMN trip_state TEXT DEFAULT NULL",
    "ALTER TABLE chat_sessions ADD COLUMN slot_states TEXT DEFAULT NULL",
    // GRAFO ZONAS: Columnas nuevas + DROP legacy (2026-06-29)
    "ALTER TABLE tariffs ADD COLUMN public_price_4p REAL",
    "ALTER TABLE tariffs ADD COLUMN public_price_6p REAL",
    "ALTER TABLE tariffs ADD COLUMN driver_price_4p REAL",
    "ALTER TABLE tariffs ADD COLUMN driver_price_6p REAL",
    "ALTER TABLE tariffs ADD COLUMN active INTEGER DEFAULT 1",
    "ALTER TABLE tariffs ADD COLUMN origin_place_id TEXT",
    "ALTER TABLE tariffs ADD COLUMN destination_place_id TEXT",
    "ALTER TABLE tariffs ADD COLUMN origin_zone_id TEXT",
    "ALTER TABLE tariffs ADD COLUMN destination_zone_id TEXT",
    "ALTER TABLE tariffs ADD COLUMN resolution_priority INTEGER DEFAULT 4",
    // GRAFO ZONAS: DROP columnas legacy (reemplazadas por public_price_4p/6p y driver_price_4p/6p)
    "ALTER TABLE tariffs DROP COLUMN price_4p",
    "ALTER TABLE tariffs DROP COLUMN price_6p",
    "ALTER TABLE tariffs DROP COLUMN base_price_4p",
    "ALTER TABLE tariffs DROP COLUMN base_price_6p",
    "ALTER TABLE zones ADD COLUMN surcharge_description TEXT",
    "ALTER TABLE zones ADD COLUMN surcharge_pct REAL DEFAULT 0",
    "ALTER TABLE places ADD COLUMN display_name TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN zone_id TEXT REFERENCES zones(zone_id)",
    // CATASTRO HOTELERO: nuevos campos geoespaciales (2026-07-03)
    "ALTER TABLE places ADD COLUMN barrio TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN corredor_vial TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN estrellas INTEGER DEFAULT 0",
    "ALTER TABLE places ADD COLUMN direccion TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN zona_turistica TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN avenida_principal TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN acceso_principal TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN referencias TEXT DEFAULT ''",
  ];
  for (const sql of migrations) {
    try { await db.execute({ sql }); } catch { /* column may already exist */ }
  }

  // Data migration: populate new columns from legacy workflow_state
  try {
    await db.execute({
      sql: `UPDATE chat_sessions SET conversational_state = workflow_state
            WHERE workflow_state IN ('idle','collecting_slots','awaiting_confirmation')
              AND conversational_state IS NULL`,
    });
    await db.execute({
      sql: `UPDATE chat_sessions SET dispatch_state = workflow_state
            WHERE workflow_state IN ('nivel_1','nivel_2','nivel_3','waiting_driver','closed')
              AND dispatch_state IS NULL`,
    });
    await db.execute({
      sql: `UPDATE chat_sessions SET trip_state = 'opportunity'
            WHERE workflow_state = 'post_trip_opportunity'
              AND trip_state IS NULL`,
    });
  } catch { /* data migration best-effort */ }

  // FASE 5.2.7: Drop legacy workflow_state, rename f4_state, drop dead columns
  const cleanupDDL: string[] = [
    // RENAME must happen before DROP (no deadlock)
    "ALTER TABLE chat_sessions RENAME COLUMN f4_state TO comprehension_state",
    "ALTER TABLE chat_sessions DROP COLUMN workflow_state",
    "ALTER TABLE chat_sessions DROP COLUMN confirmed_fields",
    "ALTER TABLE chat_sessions DROP COLUMN source_message_ids",
    "ALTER TABLE conversations DROP COLUMN trip_status",
  ];
  for (const ddl of cleanupDDL) {
    try { await db.execute({ sql: ddl }); } catch { /* column may not exist or already renamed/dropped */ }
  }

  // GRAFO ZONAS: Index for resolution priority query (needs column to exist first)
  try {
    await db.execute({
      sql: "CREATE INDEX IF NOT EXISTS idx_tariffs_resolution ON tariffs(origin_place_id, destination_place_id, origin_zone_id, destination_zone_id, resolution_priority)",
    });
  } catch { /* column may not exist yet in some DB versions */ }

  // HARDENING: CHECK constraints via triggers (SQLite doesn't support ALTER TABLE ADD CHECK)
  // resolution_priority must be 1-4
  const hardeningTriggers = [
    `CREATE TRIGGER IF NOT EXISTS trg_tariffs_resolution_priority_insert
BEFORE INSERT ON tariffs
WHEN NEW.resolution_priority IS NOT NULL AND (NEW.resolution_priority < 1 OR NEW.resolution_priority > 4)
BEGIN
  SELECT RAISE(ABORT, 'resolution_priority must be between 1 and 4');
END`,
    `CREATE TRIGGER IF NOT EXISTS trg_tariffs_resolution_priority_update
BEFORE UPDATE OF resolution_priority ON tariffs
WHEN NEW.resolution_priority IS NOT NULL AND (NEW.resolution_priority < 1 OR NEW.resolution_priority > 4)
BEGIN
  SELECT RAISE(ABORT, 'resolution_priority must be between 1 and 4');
END`,
    `CREATE TRIGGER IF NOT EXISTS trg_tariffs_crosses_border_insert
BEFORE INSERT ON tariffs
WHEN NEW.crosses_border IS NOT NULL AND (NEW.crosses_border NOT IN (0,1))
BEGIN
  SELECT RAISE(ABORT, 'crosses_border must be 0 or 1');
END`,
    `CREATE TRIGGER IF NOT EXISTS trg_tariffs_crosses_border_update
BEFORE UPDATE OF crosses_border ON tariffs
WHEN NEW.crosses_border IS NOT NULL AND (NEW.crosses_border NOT IN (0,1))
BEGIN
  SELECT RAISE(ABORT, 'crosses_border must be 0 or 1');
END`,
  ];
  for (const sql of hardeningTriggers) {
    try { await db.execute({ sql }); } catch { /* trigger may already exist */ }
  }

  // HARDENING: Missing indexes for geo queries and tariff resolution
  const hardeningIndexes = [
    "CREATE INDEX IF NOT EXISTS idx_places_zone_id ON places(zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_places_place_type ON places(place_type)",
    "CREATE INDEX IF NOT EXISTS idx_tariffs_active_resolution ON tariffs(active, resolution_priority)",
  ];
  for (const sql of hardeningIndexes) {
    try { await db.execute({ sql }); } catch { /* index may already exist */ }
  }

  // FASE 6: Migrar alias_lookup → aliases, eliminar tabla legacy
  // Copiar datos de alias_lookup a aliases (solo donde canonical_name → place_id)
  try {
    const legacyAliases = await db.execute({
      sql: `SELECT l.alias, l.canonical_name FROM alias_lookup l
            WHERE l.active = 1
              AND EXISTS (SELECT 1 FROM places p WHERE p.canonical_name = l.canonical_name)`,
    });
    if (legacyAliases.rows && legacyAliases.rows.length > 0) {
      for (const row of legacyAliases.rows as unknown as Array<{ alias: string; canonical_name: string }>) {
        const placeLookup = await db.execute({
          sql: "SELECT place_id FROM places WHERE canonical_name = ? LIMIT 1",
          args: [row.canonical_name],
        });
        if (placeLookup.rows && placeLookup.rows.length > 0) {
          const placeId = (placeLookup.rows[0] as unknown as { place_id: string }).place_id;
          const exists = await db.execute({
            sql: "SELECT id FROM aliases WHERE place_id = ? AND alias = ? AND language = 'es'",
            args: [placeId, row.alias],
          });
          if (!exists.rows || exists.rows.length === 0) {
            await db.execute({
              sql: "INSERT INTO aliases (place_id, alias, language) VALUES (?, ?, 'es')",
              args: [placeId, row.alias],
            });
          }
        }
      }
    }
  } catch { /* best-effort migration */ }

  // Dropear vista y tabla legacy
  const aliasCleanup: string[] = [
    "DROP VIEW IF EXISTS location_aliases",
    "DROP TABLE IF EXISTS alias_lookup",
  ];
  for (const sql of aliasCleanup) {
    try { await db.execute({ sql }); } catch { /* may not exist */ }
  }
}


