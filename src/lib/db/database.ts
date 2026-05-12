import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db !== null) return db as Database.Database;

  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if ((global as any).singletonDb) {
    db = (global as any).singletonDb;
  } else {
    db = new Database(DB_PATH, {
      verbose: (msg?: unknown) => console.log(`[DB] ${msg}`),
    });
    db.pragma("journal_mode = WAL");
    db.pragma("foreign_keys = ON");
    (global as any).singletonDb = db;
    initializeSchema(db);
  }

  return db as Database.Database;
}

function initializeSchema(database: Database.Database) {
  database.exec(`
    CREATE TABLE IF NOT EXISTS connection_state (
      key TEXT PRIMARY KEY,
      value TEXT,
      updated_at INTEGER DEFAULT (unixepoch())
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS conversations (
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
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL REFERENCES conversations(id),
      role TEXT CHECK(role IN ('user','assistant','human')) NOT NULL,
      content TEXT NOT NULL,
      created_at INTEGER NOT NULL DEFAULT (unixepoch())
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_messages_conv
    ON messages(conversation_id, created_at)
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS trips (
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
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS drivers (
      driver_id TEXT PRIMARY KEY,
      name TEXT,
      phone TEXT UNIQUE NOT NULL,
      is_titular INTEGER DEFAULT 0,
      group_id TEXT,
      active INTEGER DEFAULT 1,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS inactivity_events (
      event_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      client_phone TEXT,
      last_message_at INTEGER,
      inactivity_minutes INTEGER,
      discount_offered INTEGER,
      created_at INTEGER DEFAULT (unixepoch()),
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS escalation_log (
      escalation_id TEXT PRIMARY KEY,
      trip_id TEXT NOT NULL,
      contacted_driver_phone TEXT,
      contact_time INTEGER DEFAULT (unixepoch()),
      response_time_seconds INTEGER,
      status TEXT,
      FOREIGN KEY (trip_id) REFERENCES trips(trip_id)
    )
  `);

  database.exec(`
    CREATE TABLE IF NOT EXISTS outbox (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id INTEGER NOT NULL,
      phone TEXT NOT NULL,
      content TEXT NOT NULL,
      sent INTEGER NOT NULL DEFAULT 0,
      created_at INTEGER DEFAULT (unixepoch())
    )
  `);

  database.exec(`
    CREATE INDEX IF NOT EXISTS idx_outbox_pending
    ON outbox(sent, created_at)
  `);

  database.exec(`
    INSERT OR IGNORE INTO connection_state (key, value) VALUES ('status', 'disconnected')
  `);
}

// ========== CONNECTION STATE ==========

export function getConnectionState(): { status?: string; qr_string?: string; phone?: string; updated_at?: number } | null {
  const result = getDb()
    .prepare("SELECT key, value, updated_at FROM connection_state")
    .all() as { key: string; value: string; updated_at: number }[];
  
  if (result.length === 0) return null;
  
  const state: any = {};
  for (const row of result) {
    state[row.key] = row.value;
    state.updated_at = row.updated_at;
  }
  return state;
}

export function setConnectionState(key: string, value: string): void {
  const existing = getDb()
    .prepare("SELECT value FROM connection_state WHERE key = ?")
    .get(key) as { value: string } | undefined;
  
  if (existing) {
    getDb()
      .prepare("UPDATE connection_state SET value = ?, updated_at = unixepoch() WHERE key = ?")
      .run(value, key);
  } else {
    getDb()
      .prepare("INSERT INTO connection_state (key, value) VALUES (?, ?)")
      .run(key, value);
  }
}

export function setConnectionStateBatch(states: { status?: string; qr_string?: string | null; phone?: string | null }): void {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO connection_state (key, value, updated_at)
    VALUES (?, ?, unixepoch())
  `);
  
  const update = db.transaction(() => {
    if (states.status !== undefined) stmt.run('status', states.status);
    if (states.qr_string !== undefined) {
      if (states.qr_string === null) {
        db.prepare("DELETE FROM connection_state WHERE key = 'qr_string'").run();
      } else {
        stmt.run('qr_string', states.qr_string);
      }
    }
    if (states.phone !== undefined) {
      if (states.phone === null) {
        db.prepare("DELETE FROM connection_state WHERE key = 'phone'").run();
      } else {
        stmt.run('phone', states.phone);
      }
    }
  });
  
  update();
}

// ========== CONVERSATIONS ==========

export function getOrCreateConversation(phone: string, name?: string): any {
  const existing = getDb()
    .prepare("SELECT * FROM conversations WHERE phone = ?")
    .get(phone) as any;
  
  if (existing) return existing;

  const info = getDb()
    .prepare("INSERT INTO conversations (phone, name, last_message_at) VALUES (?, ?, unixepoch())")
    .run(phone, name || null);

  return getDb()
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(info.lastInsertRowid);
}

export function getConversationById(id: number): any {
  return getDb()
    .prepare("SELECT * FROM conversations WHERE id = ?")
    .get(id);
}

export function getConversationByPhone(phone: string): any {
  return getDb()
    .prepare("SELECT * FROM conversations WHERE phone = ?")
    .get(phone);
}

export function listConversations(): any[] {
  return getDb()
    .prepare(`
      SELECT c.*, 
        (SELECT content FROM messages WHERE conversation_id = c.id ORDER BY created_at DESC LIMIT 1) as last_message_preview
      FROM conversations c
      WHERE c.trip_status != 'completado' AND c.trip_status != 'cancelado'
      ORDER BY c.last_message_at DESC
    `)
    .all();
}

export function updateConversationActivity(phone: string): void {
  getDb()
    .prepare("UPDATE conversations SET last_message_at = unixepoch() WHERE phone = ?")
    .run(phone);
}

export function setConversationMode(conversationId: number, mode: 'AI' | 'HUMAN'): void {
  getDb()
    .prepare("UPDATE conversations SET mode = ? WHERE id = ?")
    .run(mode, conversationId);
}

export function takeConversation(conversationId: number): void {
  getDb()
    .prepare("UPDATE conversations SET taken_by_human = 1, human_operator_phone = ? WHERE id = ?")
    .run('+543757613215', conversationId);
}

export function releaseConversation(conversationId: number): void {
  getDb()
    .prepare("UPDATE conversations SET taken_by_human = 0, human_operator_phone = NULL WHERE id = ?")
    .run(conversationId);
}

export function deleteConversation(conversationId: number): void {
  const db = getDb();
  db.transaction(() => {
    db.prepare("DELETE FROM messages WHERE conversation_id = ?").run(conversationId);
    db.prepare("DELETE FROM outbox WHERE conversation_id = ? AND sent = 0").run(conversationId);
    db.prepare("DELETE FROM conversations WHERE id = ?").run(conversationId);
  })();
}

export function setConversationTrip(conversationId: number, tripId: string): void {
  getDb()
    .prepare("UPDATE conversations SET trip_id = ? WHERE id = ?")
    .run(tripId, conversationId);
}

export function setConversationTripStatus(conversationId: number, status: string): void {
  getDb()
    .prepare("UPDATE conversations SET trip_status = ? WHERE id = ?")
    .run(status, conversationId);
}

// ========== MESSAGES ==========

export function insertMessage(conversationId: number, role: string, content: string): number {
  const db = getDb();
  const result = db.prepare(
    "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)"
  ).run(conversationId, role, content);
  
  db.prepare("UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?")
    .run(conversationId);
  
  return result.lastInsertRowid as number;
}

export function getMessages(conversationId: number, limit = 50): any[] {
  return getDb()
    .prepare(`
      SELECT * FROM messages 
      WHERE conversation_id = ? 
      ORDER BY created_at DESC 
      LIMIT ?
    `)
    .all(conversationId, limit)
    .reverse();
}

export function getRecentHistory(conversationId: number, limit = 20): any[] {
  return getDb()
    .prepare(`
      SELECT * FROM (
        SELECT * FROM messages 
        WHERE conversation_id = ? 
        ORDER BY created_at DESC 
        LIMIT ?
      ) ORDER BY created_at ASC
    `)
    .all(conversationId, limit);
}

// ========== OUTBOX ==========

export function enqueueOutbox(conversationId: number, phone: string, content: string): void {
  getDb()
    .prepare("INSERT INTO outbox (conversation_id, phone, content) VALUES (?, ?, ?)")
    .run(conversationId, phone, content);
}

export function getPendingOutbox(limit = 20): any[] {
  return getDb()
    .prepare("SELECT * FROM outbox WHERE sent = 0 ORDER BY created_at ASC LIMIT ?")
    .all(limit);
}

export function markOutboxSent(id: number): void {
  getDb()
    .prepare("UPDATE outbox SET sent = 1 WHERE id = ?")
    .run(id);
}

// ========== TRIPS ==========

export function createTrip(
  tripId: string,
  clientPhone: string,
  origin: string,
  destination: string,
  priceBase?: number
): void {
  getDb()
    .prepare(`
      INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, status)
      VALUES (?, ?, ?, ?, ?, 'consulta')
    `)
    .run(tripId, clientPhone, origin, destination, priceBase || null);
}

export function getTripById(tripId: string): any {
  return getDb()
    .prepare("SELECT * FROM trips WHERE trip_id = ?")
    .get(tripId);
}

export function getActiveTripByPhone(clientPhone: string): any {
  return getDb()
    .prepare(`
      SELECT * FROM trips 
      WHERE client_phone = ? AND status NOT IN ('completado', 'cancelado', 'asignado_chofer')
      ORDER BY created_at DESC LIMIT 1
    `)
    .get(clientPhone);
}

export function updateTripState(tripId: string, newState: string): void {
  getDb()
    .prepare("UPDATE trips SET status = ?, updated_at = unixepoch() WHERE trip_id = ?")
    .run(newState, tripId);
}

export function updateTripDiscountExplicit(tripId: string, discountPercent: number): void {
  getDb()
    .prepare("UPDATE trips SET discount_explicit = ?, updated_at = unixepoch() WHERE trip_id = ?")
    .run(discountPercent, tripId);
}

export function assignDriverToTrip(tripId: string, driverPhone: string): void {
  getDb()
    .prepare("UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', updated_at = unixepoch() WHERE trip_id = ?")
    .run(driverPhone, tripId);
}

export function addInactivityEvent(
  eventId: string,
  tripId: string,
  clientPhone: string,
  inactivityMinutes: number,
  discountOffered: number
): void {
  getDb()
    .prepare(`
      INSERT INTO inactivity_events (event_id, trip_id, client_phone, last_message_at, inactivity_minutes, discount_offered)
      VALUES (?, ?, ?, unixepoch(), ?, ?)
    `)
    .run(eventId, tripId, clientPhone, inactivityMinutes, discountOffered);
}

export function addEscalationLog(
  escalationId: string,
  tripId: string,
  contactedDriverPhone: string,
  status: string,
  responseTimeSec?: number
): void {
  getDb()
    .prepare(`
      INSERT INTO escalation_log (escalation_id, trip_id, contacted_driver_phone, status, response_time_seconds)
      VALUES (?, ?, ?, ?, ?)
    `)
    .run(escalationId, tripId, contactedDriverPhone, status, responseTimeSec || null);
}

export function shareContactWithDriver(tripId: string): void {
  getDb()
    .prepare("UPDATE trips SET contact_shared_at = unixepoch(), status = 'directo_cliente' WHERE trip_id = ?")
    .run(tripId);
}

// ========== DRIVERS ==========

export function getTitularDriver(): any {
  return getDb()
    .prepare("SELECT * FROM drivers WHERE is_titular = 1 LIMIT 1")
    .get();
}

export function getDriverByPhone(phone: string): any {
  return getDb()
    .prepare("SELECT * FROM drivers WHERE phone = ?")
    .get(phone);
}

export function getDriversGroupId(): string | null {
  const titular = getTitularDriver();
  return titular?.group_id || null;
}

// ========== DB INSTANCE ==========

export function getDbInstance(): Database.Database {
  return getDb();
}