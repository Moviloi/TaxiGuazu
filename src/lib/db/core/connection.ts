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

// ═══════════════════════════════════════════════════════════════════════════
// initSchema() completo con TODAS las tablas y TODAS las columnas del schema
// real de Turso. ADR-006: la DB real es la fuente de verdad. Entornos nuevos
// nacen completos, sin drift. Generado desde DB real (2026-07-04).
// ═══════════════════════════════════════════════════════════════════════════
async function initSchema(): Promise<void> {
  const db = getDb();
  await db.batch([
    // ── CORE ──
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
    `CREATE TABLE IF NOT EXISTS processed_messages (
      message_id TEXT PRIMARY KEY,
      phone TEXT,
      message_type TEXT,
      processed_at INTEGER NOT NULL DEFAULT (unixepoch()),
      payload_hash TEXT
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

    // ── TRIP ──
    `CREATE TABLE IF NOT EXISTS trips (
      trip_id TEXT PRIMARY KEY,
      client_phone TEXT NOT NULL,
      origin TEXT,
      destination TEXT,
      status TEXT DEFAULT 'consulta',
      price_base REAL,
      discount_explicit INTEGER DEFAULT 0,
      assigned_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch()),
      confirmed_at INTEGER,
      contact_shared_at INTEGER,
      passengers INTEGER,
      commission_amount REAL,
      driver_payout REAL,
      survey_sent INTEGER DEFAULT 0,
      post_trip_response TEXT,
      scheduled_at INTEGER,
      tariff_id INTEGER,
      piso_base REAL,
      garantizado_base REAL,
      flight_number TEXT,
      hotel_destination TEXT DEFAULT 'A confirmar por el chofer',
      comision_declarada INTEGER DEFAULT 0,
      trip_phase TEXT,
      closure_reason TEXT,
      cancelled_at INTEGER,
      cancelled_by TEXT
    )`,
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
    // trip_events — event sourcing para ciclo de vida de Trip.
    // Append-only: cada evento registra una transición de estado inmutable.
    `CREATE TABLE IF NOT EXISTS trip_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id TEXT NOT NULL REFERENCES trips(trip_id),
      event_type TEXT NOT NULL CHECK(event_type IN (
        'TripCreated','TripDriverAssigned','TripReconfirmed',
        'TripCompleted','TripCancelled'
      )),
      payload TEXT,
      occurred_at INTEGER NOT NULL DEFAULT (unixepoch()),
      actor TEXT NOT NULL DEFAULT 'system'
    )`,
    // dispatch_events — audit log del proceso de asignación de chofer.
    // Append-only: cada evento registra un intento o resultado del dispatch.
    // El límite con trip_events: dispatch_events registra CÓMO se asignó;
    // trip_events registra QUÉ pasó con el viaje (TripDriverAssigned es el resultado).
    `CREATE TABLE IF NOT EXISTS dispatch_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trip_id TEXT NOT NULL REFERENCES trips(trip_id),
      event_type TEXT NOT NULL CHECK(event_type IN (
        'DispatchInitiated','DispatchOffered','DispatchBroadcasted',
        'DispatchAccepted','DispatchAbandoned','DispatchContingency'
      )),
      level TEXT CHECK(level IN ('nivel_1','nivel_2','nivel_3','waiting_driver')),
      actor_phone TEXT,
      metadata TEXT,
      occurred_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,

    // ── DRIVERS ──
    `CREATE TABLE IF NOT EXISTS drivers (
      driver_id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT UNIQUE NOT NULL,
      is_principal INTEGER DEFAULT 0,
      group_id TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch()),
      car_type TEXT,
      car_capacity INTEGER,
      color TEXT,
      plate TEXT,
      country TEXT DEFAULT 'AR',
      idiom TEXT,
      min_payout REAL,
      is_low_cost INTEGER DEFAULT 0,
      shift TEXT DEFAULT 'any',
      rating REAL DEFAULT 0,
      rating_count INTEGER DEFAULT 0,
      offers_received INTEGER DEFAULT 0,
      offers_accepted INTEGER DEFAULT 0,
      acceptance_score REAL DEFAULT 0,
      tier TEXT DEFAULT 'normal',
      languages TEXT,
      is_guide INTEGER DEFAULT 0,
      car_model TEXT,
      car_year INTEGER,
      is_principal2 INTEGER DEFAULT 0,
      payment_method TEXT,
      status TEXT DEFAULT 'pending',
      approved_at INTEGER,
      approved_by TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS driver_codes (
      code TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      phone TEXT UNIQUE,
      created_by TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      registered_at INTEGER
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
    `CREATE TABLE IF NOT EXISTS client_preferred_drivers (
      client_phone TEXT PRIMARY KEY,
      preferred_driver_phone TEXT NOT NULL,
      backup_driver_phone TEXT,
      created_at INTEGER DEFAULT (unixepoch()),
      updated_at INTEGER DEFAULT (unixepoch())
    )`,

    // ── SESSION ──
    `CREATE TABLE IF NOT EXISTS chat_sessions (
      phone TEXT PRIMARY KEY,
      slots TEXT,
      confidence TEXT,
      extraction_count INTEGER DEFAULT 0,
      last_extracted_at INTEGER,
      clarify_field TEXT,
      updated_at INTEGER NOT NULL DEFAULT (unixepoch()),
      pending_opportunity TEXT,
      comprehension_state TEXT,
      comprehension_score REAL,
      escalation_reason TEXT,
      conversational_state TEXT DEFAULT 'idle',
      dispatch_state TEXT DEFAULT 'idle',
      trip_state TEXT DEFAULT NULL,
      slot_states TEXT DEFAULT NULL,
      lang TEXT
    )`,

    // ── LEARNING / ANALYTICS ──
    `CREATE TABLE IF NOT EXISTS conversion_outcomes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      session_id TEXT,
      entity TEXT,
      intent TEXT,
      success_score REAL,
      opportunity_type TEXT,
      timestamp INTEGER DEFAULT (unixepoch())
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
    `CREATE TABLE IF NOT EXISTS housekeeping_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job TEXT NOT NULL,
      rows_deleted INTEGER DEFAULT 0,
      duration_ms INTEGER DEFAULT 0,
      ran_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS learning_weights (
      key TEXT PRIMARY KEY,
      value REAL NOT NULL DEFAULT 0,
      updated_at INTEGER DEFAULT (unixepoch())
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

    // ── POLICY / EXPERIMENTS ──
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
    `CREATE TABLE IF NOT EXISTS system_metrics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      revenue_total REAL DEFAULT 0,
      conversion_rate REAL DEFAULT 0,
      load_factor REAL DEFAULT 0,
      escalation_rate REAL DEFAULT 0,
      recorded_at INTEGER DEFAULT (unixepoch())
    )`,

    // ── COMMERCIAL ──
    `CREATE TABLE IF NOT EXISTS tariffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origin TEXT NOT NULL,
      destination TEXT NOT NULL,
      modality TEXT,
      crosses_border INTEGER DEFAULT 0,
      wait_included INTEGER DEFAULT 0,
      origin_place_id TEXT,
      destination_place_id TEXT,
      origin_zone_id TEXT,
      destination_zone_id TEXT,
      active INTEGER DEFAULT 1,
      public_price_4p REAL,
      public_price_6p REAL,
      driver_price_4p REAL,
      driver_price_6p REAL,
      resolution_priority INTEGER DEFAULT 4
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
    `CREATE TABLE IF NOT EXISTS package_prices (
      driver_phone TEXT NOT NULL,
      package_type TEXT NOT NULL CHECK(package_type IN ('in_out','three_leg')),
      min_payout REAL NOT NULL,
      created_at INTEGER DEFAULT (unixepoch()),
      PRIMARY KEY (driver_phone, package_type)
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

    // ── GEO ──
    `CREATE TABLE IF NOT EXISTS zones (
      zone_id TEXT PRIMARY KEY,
      zone_name TEXT NOT NULL,
      country TEXT NOT NULL,
      area_group TEXT,
      dispatch_priority INTEGER DEFAULT 5,
      base_eta_min INTEGER DEFAULT 10,
      active INTEGER DEFAULT 1,
      surcharge_description TEXT,
      surcharge_pct REAL DEFAULT 0
    )`,
    `CREATE TABLE IF NOT EXISTS places (
      place_id TEXT PRIMARY KEY,
      canonical_name TEXT NOT NULL,
      official_name TEXT NOT NULL DEFAULT '',
      google_maps_name TEXT NOT NULL DEFAULT '',
      place_type TEXT NOT NULL DEFAULT 'other' CHECK(place_type IN ('airport','bus_terminal','border_crossing','border','attraction','shopping','hotel','resort','hostel','restaurant','casino','event_center','tourist_area','port','other','area','landmark','airbnb','bar','lodge','house')),
      city TEXT NOT NULL DEFAULT '',
      country TEXT NOT NULL DEFAULT '',
      latitude REAL,
      longitude REAL,
      tourist_relevance_score INTEGER NOT NULL DEFAULT 5,
      operational_zone TEXT,
      active_status TEXT NOT NULL DEFAULT 'active' CHECK(active_status IN ('active','inactive')),
      display_name TEXT DEFAULT '',
      zone_id TEXT REFERENCES zones(zone_id),
      barrio TEXT DEFAULT '',
      corredor_vial TEXT DEFAULT '',
      estrellas INTEGER DEFAULT 0,
      direccion TEXT DEFAULT '',
      zona_turistica TEXT DEFAULT '',
      avenida_principal TEXT DEFAULT '',
      acceso_principal TEXT DEFAULT '',
      referencias TEXT DEFAULT ''
    )`,
    `CREATE TABLE IF NOT EXISTS aliases (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      place_id TEXT NOT NULL,
      alias TEXT NOT NULL,
      language TEXT NOT NULL CHECK(language IN ('es','en','pt'))
    )`,
    `CREATE TABLE IF NOT EXISTS transfer_priority (
      place_id TEXT PRIMARY KEY,
      priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 4)
    )`,

    // ── OPERATIONS ──
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

    // ── INSERT SEED DATA ──
    `INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')`,
  ]);

  // ── INDICES (ejecutados fuera del batch para separación clara) ──
  const allIndices = [
    // Core
    "CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id, created_at)",
    "CREATE INDEX IF NOT EXISTS idx_trip_legs_group ON trip_legs(group_id, seq)",
    "CREATE INDEX IF NOT EXISTS idx_trip_events_trip ON trip_events(trip_id, occurred_at)",
    "CREATE INDEX IF NOT EXISTS idx_dispatch_events_trip ON dispatch_events(trip_id, occurred_at)",
    // Drivers
    "CREATE INDEX IF NOT EXISTS idx_driver_invitations_status ON driver_invitations(status, created_at)",
    // Analytics
    "CREATE INDEX IF NOT EXISTS idx_decision_log_session ON decision_log(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_f9_drift_log_session ON f9_drift_log(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_f9_drift_log_timestamp ON f9_drift_log(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_f9_error_log_created ON f9_error_log(created_at)",
    "CREATE INDEX IF NOT EXISTS idx_f9_events_session ON f9_events(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_f9_events_timestamp ON f9_events(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_policy_results_policy ON policy_results(policy_id)",
    "CREATE INDEX IF NOT EXISTS idx_policy_results_timestamp ON policy_results(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_simulations_session ON simulations(session_id)",
    "CREATE INDEX IF NOT EXISTS idx_simulations_timestamp ON simulations(timestamp)",
    "CREATE INDEX IF NOT EXISTS idx_system_metrics_timestamp ON system_metrics(recorded_at)",
    // Geo
    "CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(LOWER(alias))",
    "CREATE INDEX IF NOT EXISTS idx_aliases_place ON aliases(place_id)",
    "CREATE INDEX IF NOT EXISTS idx_places_zone_id ON places(zone_id)",
    "CREATE INDEX IF NOT EXISTS idx_places_place_type ON places(place_type)",
    // Comercial
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_tariffs_route ON tariffs(LOWER(origin), LOWER(destination))",
    "CREATE INDEX IF NOT EXISTS idx_tariffs_resolution ON tariffs(origin_place_id, destination_place_id, origin_zone_id, destination_zone_id, resolution_priority)",
    "CREATE INDEX IF NOT EXISTS idx_tariffs_active_resolution ON tariffs(active, resolution_priority)",
  ];
  for (const sql of allIndices) {
    try { await db.execute({ sql }); } catch { /* index may already exist */ }
  }

  // ── TRIGGERS (CHECK constraints via triggers — SQLite no soporta ALTER TABLE ADD CHECK) ──
  const allTriggers = [
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
  for (const sql of allTriggers) {
    try { await db.execute({ sql }); } catch { /* trigger may already exist */ }
  }

  // ═════════════════════════════════════════════════════════════════════════
  // MIGRACIONES LEGACY — se conservan para DBs existentes que aún tengan
  // columnas/tablas del schema anterior. Son no-op en DBs nuevas.
  // ADR-006: todas las columnas de abajo ya están en los CREATE TABLE de
  // arriba. Estas ALTER TABLE quedan como upgrade path para DBs con schema
  // previo. Limpieza planificada cuando exista migration runner.
  // ═════════════════════════════════════════════════════════════════════════

  // FASE 5.2.5: Add new workflow state columns for domain separation
  // → CUBIERTO: chat_sessions tiene conversational_state, dispatch_state, trip_state, slot_states, lang en DDL
  const migrations = [
    "ALTER TABLE chat_sessions ADD COLUMN lang TEXT",
    "ALTER TABLE chat_sessions ADD COLUMN conversational_state TEXT DEFAULT 'idle'",
    "ALTER TABLE chat_sessions ADD COLUMN dispatch_state TEXT DEFAULT 'idle'",
    "ALTER TABLE chat_sessions ADD COLUMN trip_state TEXT DEFAULT NULL",
    "ALTER TABLE chat_sessions ADD COLUMN slot_states TEXT DEFAULT NULL",
    // GRAFO ZONAS: Columnas nuevas + DROP legacy (2026-06-29)
    // → CUBIERTO: tariffs tiene public_price_4p/6p, driver_price_4p/6p, active, origin_place_id, dest_place_id, origin_zone_id, dest_zone_id, resolution_priority en DDL
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
    // → CUBIERTO: zones tiene surcharge_description, surcharge_pct en DDL
    "ALTER TABLE zones ADD COLUMN surcharge_description TEXT",
    "ALTER TABLE zones ADD COLUMN surcharge_pct REAL DEFAULT 0",
    // → CUBIERTO: places tiene display_name, zone_id, barrio, etc. en DDL
    "ALTER TABLE places ADD COLUMN display_name TEXT DEFAULT ''",
    "ALTER TABLE places ADD COLUMN zone_id TEXT REFERENCES zones(zone_id)",
    // CATASTRO HOTELERO: nuevos campos geoespaciales (2026-07-03)
    // → CUBIERTO: places tiene barrio, corredor_vial, estrellas, direccion, etc. en DDL
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
  // → CUBIERTO: chat_sessions ya NO tiene workflow_state, confirmed_fields, source_message_ids en DDL
  // → CUBIERTO: conversations ya NO tiene trip_status en DDL
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

  // FASE 6: Migrar alias_lookup → aliases, eliminar tabla legacy
  // → alias_lookup ya NO se crea en DDL. Solo DBs existentes lo tienen.
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


