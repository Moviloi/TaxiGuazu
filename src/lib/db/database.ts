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
  const tariff = await queryOne<TariffRow>("SELECT * FROM tariffs WHERE id = ?", [tariffId]);
  const price = tariff ? (pax > 4 ? tariff.price_6p : tariff.price_4p) : (trip?.price_base ?? 0);
  const garantizado = Math.round(price * 0.85);
  await getDbv().execute({
    sql: "UPDATE trips SET tariff_id = ?, piso_base = ?, garantizado_base = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tariffId, pisoBase, garantizado, tripId],
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
}

export async function findTariff(origin: string, destination: string, passengers: number): Promise<TariffWithPrice | null> {
  const o = origin.toLowerCase().trim();
  const d = destination.toLowerCase().trim();
  const t = await queryOne<TariffRow>("SELECT * FROM tariffs WHERE LOWER(origin) = ? AND LOWER(destination) = ? LIMIT 1", [o, d]);
  if (!t) return null;
  return {
    ...t,
    price: passengers > 4 ? t.price_6p : t.price_4p,
  };
}

export async function searchTariffs(text: string): Promise<TariffRow[]> {
  const q = `%${text.toLowerCase()}%`;
  return query<TariffRow>("SELECT * FROM tariffs WHERE LOWER(origin) LIKE ? OR LOWER(destination) LIKE ?", [q, q]);
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