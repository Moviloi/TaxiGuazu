import { createClient } from "@libsql/client";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";

type LibSqlClient = ReturnType<typeof createClient>;

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
      is_titular INTEGER DEFAULT 0,
      group_id TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE TABLE IF NOT EXISTS inactivity_events (
      event_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      client_phone TEXT,
      last_message_at INTEGER,
      inactivity_minutes INTEGER,
      discount_offered INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
    )`,
    `CREATE TABLE IF NOT EXISTS escalation_log (
      escalation_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      contacted_driver_phone TEXT,
      contact_time INTEGER DEFAULT (unixepoch()),
      response_time_seconds INTEGER,
      status TEXT,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
    )`,
    `CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      content TEXT NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    )`,
    `CREATE INDEX IF NOT EXISTS idx_outbox_pending ON outbox(sent, created_at)`,
    `CREATE TABLE IF NOT EXISTS workflows (
      conversation_id INTEGER PRIMARY KEY,
      phone TEXT NOT NULL,
      state TEXT NOT NULL DEFAULT 'idle' CHECK(state IN ('idle','waiting_group','closed')),
      trip_id TEXT,
      assigned_driver_phone TEXT,
      group_asked_at INTEGER,
      last_message_at INTEGER NOT NULL DEFAULT (unixepoch()),
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )`,
    `INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')`,
  ]);
}

// ========== CONNECTION STATE ==========

export async function getConnectionState(): Promise<{ status?: string; qr_string?: string; phone?: string; updated_at?: number } | null> {
  await ensureSchema();
  const rs = await getDbv().execute("SELECT key, value, updated_at FROM connection_state");
  if (rs.rows.length === 0) return null;
  const state: any = {};
  for (const row of rs.rows as any[]) {
    state[row.key] = row.value;
    state.updated_at = row.updated_at;
  }
  return state;
}

export async function setConnectionState(key: string, value: string): Promise<void> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT value FROM connection_state WHERE key = ?", args: [key] });
  if ((rs.rows as any[]).length > 0) {
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

export async function getOrCreateConversation(phone: string, name?: string): Promise<any> {
  await ensureSchema();
  const existing = await getDbv().execute({ sql: "SELECT * FROM conversations WHERE phone = ?", args: [phone] });
  if ((existing.rows as any[]).length > 0) return (existing.rows as any[])[0];

  const info = await getDbv().execute({ sql: "INSERT INTO conversations (phone, name, last_message_at) VALUES (?, ?, unixepoch())", args: [phone, name || null] });
  const id = Number(info.lastInsertRowid);
  const created = await getDbv().execute({ sql: "SELECT * FROM conversations WHERE id = ?", args: [id] });
  return (created.rows as any[])[0];
}

export async function getConversationById(id: number): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM conversations WHERE id = ?", args: [id] });
  return (rs.rows as any[])[0] || null;
}

export async function getConversationByPhone(phone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM conversations WHERE phone = ?", args: [phone] });
  return (rs.rows as any[])[0] || null;
}

export async function listConversations(): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute(`
    SELECT c.*, 
      (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
    FROM conversations c
    WHERE c.trip_status != 'completado' AND c.trip_status != 'cancelado'
    ORDER BY c.last_message_at DESC
  `);
  return rs.rows as any[];
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
    { sql: "DELETE FROM outbox WHERE conversation_id = ? AND sent = 0", args: [conversationId] },
    { sql: "DELETE FROM conversations WHERE id = ?", args: [conversationId] },
  ]);
}

export async function setConversationTrip(conversationId: number, tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET trip_id = ? WHERE id = ?", args: [tripId, conversationId] });
}

export async function setConversationTripStatus(conversationId: number, status: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET trip_status = ? WHERE id = ?", args: [status, conversationId] });
}

// ========== MESSAGES ==========

export async function insertMessage(conversationId: number, role: string, content: string): Promise<number> {
  await ensureSchema();
  const result = await getDbv().execute({ sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", args: [conversationId, role, content] });
  await getDbv().execute({ sql: "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?", args: [conversationId] });
  return Number(result.lastInsertRowid);
}

export async function getMessages(conversationId: number, limit = 50): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?", args: [conversationId, limit] });
  return (rs.rows as any[]).reverse();
}

export async function getRecentHistory(conversationId: number, limit = 20): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: `SELECT * FROM (SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at DESC LIMIT ?) ORDER BY created_at ASC`, args: [conversationId, limit] });
  return rs.rows as any[];
}

// ========== OUTBOX ==========

export async function enqueueOutbox(conversationId: number, phone: string, content: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO outbox (conversation_id, phone, content) VALUES (?, ?, ?)", args: [conversationId, phone, content] });
}

export async function getPendingOutbox(limit = 20): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC LIMIT ?", args: [limit] });
  return rs.rows as any[];
}

export async function markOutboxSent(id: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE outbox SET sent = 1 WHERE id = ?", args: [id] });
}

// ========== TRIPS ==========

export async function createTrip(tripId: string, clientPhone: string, origin: string, destination: string, priceBase?: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, status) VALUES (?, ?, ?, ?, ?, 'consulta')", args: [tripId, clientPhone, origin, destination, priceBase || null] });
}

export async function getTripById(tripId: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM trips WHERE trip_id = ?", args: [tripId] });
  return (rs.rows as any[])[0] || null;
}

export async function getActiveTripByPhone(clientPhone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM trips WHERE client_phone = ? AND status NOT IN ('completado', 'cancelado', 'asignado_chofer') ORDER BY created_at DESC LIMIT 1", args: [clientPhone] });
  return (rs.rows as any[])[0] || null;
}

export async function updateTripState(tripId: string, newState: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET status = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [newState, tripId] });
}

export async function updateTripDiscountExplicit(tripId: string, discountPercent: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET discount_explicit = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [discountPercent, tripId] });
}

export async function assignDriverToTrip(tripId: string, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', updated_at = unixepoch() WHERE trip_id = ?", args: [driverPhone, tripId] });
}

export async function addInactivityEvent(eventId: string, tripId: string, clientPhone: string, inactivityMinutes: number, discountOffered: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO inactivity_events (event_id, trip_id, client_phone, last_message_at, inactivity_minutes, discount_offered) VALUES (?, ?, ?, unixepoch(), ?, ?)", args: [eventId, tripId, clientPhone, inactivityMinutes, discountOffered] });
}

export async function addEscalationLog(escalationId: string, tripId: string, contactedDriverPhone: string, status: string, responseTimeSec?: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO escalation_log (escalation_id, trip_id, contacted_driver_phone, status, response_time_seconds) VALUES (?, ?, ?, ?, ?)", args: [escalationId, tripId, contactedDriverPhone, status, responseTimeSec || null] });
}

export async function shareContactWithDriver(tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE trips SET contact_shared_at = unixepoch(), status = 'directo_cliente' WHERE trip_id = ?", args: [tripId] });
}

// ========== DRIVERS ==========

export async function getTitularDriver(): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute("SELECT * FROM drivers WHERE is_titular = 1 LIMIT 1");
  return (rs.rows as any[])[0] || null;
}

export async function getDriverByPhone(phone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM drivers WHERE phone = ?", args: [phone] });
  return (rs.rows as any[])[0] || null;
}

export async function registerDriver(phone: string, name?: string): Promise<any> {
  await ensureSchema();
  const existing = await getDriverByPhone(phone);
  if (existing) return existing;
  const driverId = `driver_${Date.now()}`;
  await getDbv().execute({
    sql: "INSERT INTO drivers (driver_id, phone, name, active) VALUES (?, ?, ?, 1)",
    args: [driverId, phone, name || null],
  });
  return await getDriverByPhone(phone);
}

export async function getDriversGroupId(): Promise<string | null> {
  const driver = await getTitularDriver();
  return driver?.group_id || null;
}

// ========== WORKFLOWS (DB-backed state machine) ==========

export async function getWorkflow(convId: number): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM workflows WHERE conversation_id = ?", args: [convId] });
  return (rs.rows as any[])[0] || null;
}

export async function upsertWorkflow(convId: number, ctx: {
  phone: string;
  state: string;
  tripId?: string;
  assignedDriverPhone?: string;
  groupAskedAt?: number;
}): Promise<void> {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  await getDbv().execute({
    sql: `INSERT INTO workflows (conversation_id, phone, state, trip_id, assigned_driver_phone, group_asked_at, last_message_at)
          VALUES (?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(conversation_id) DO UPDATE SET
            state = excluded.state,
            trip_id = excluded.trip_id,
            assigned_driver_phone = excluded.assigned_driver_phone,
            group_asked_at = COALESCE(excluded.group_asked_at, group_asked_at),
            last_message_at = excluded.last_message_at`,
    args: [convId, ctx.phone, ctx.state, ctx.tripId || null, ctx.assignedDriverPhone || null, ctx.groupAskedAt ? Math.floor(ctx.groupAskedAt / 1000) : null, now],
  });
}

export async function deleteWorkflow(convId: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "DELETE FROM workflows WHERE conversation_id = ?", args: [convId] });
}

export async function getExpiredWorkflows(timeoutMs: number): Promise<any[]> {
  await ensureSchema();
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  const rs = await getDbv().execute({
    sql: "SELECT * FROM workflows WHERE state = 'waiting_group' AND group_asked_at IS NOT NULL AND group_asked_at < ?",
    args: [cutoff],
  });
  return rs.rows as any[];
}

export async function closeWorkflow(convId: number, driverPhone?: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE workflows SET state = 'closed', assigned_driver_phone = ?, last_message_at = unixepoch() WHERE conversation_id = ?",
    args: [driverPhone || null, convId],
  });
}

export async function advanceWorkflowToGroup(convId: number, phone: string): Promise<void> {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  await getDbv().execute({
    sql: `INSERT INTO workflows (conversation_id, phone, state, group_asked_at, last_message_at)
          VALUES (?, ?, 'waiting_group', ?, ?)
          ON CONFLICT(conversation_id) DO UPDATE SET
            state = 'waiting_group',
            group_asked_at = ?,
            last_message_at = ?`,
    args: [convId, phone, now, now, now, now],
  });
}

// ========== DB INSTANCE ==========

export function getDbInstance(): LibSqlClient {
  return getDbv();
}