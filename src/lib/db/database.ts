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
      is_titular INTEGER DEFAULT 0,
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
    "ALTER TABLE trips ADD COLUMN tariff_id INTEGER",
    "ALTER TABLE trips ADD COLUMN piso_base REAL",
  ];
  // Seed tariffs if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM tariffs");
    if ((count.rows as any[])[0].c === 0) {
      await seedTariffs();
    }
  } catch {}
  for (const sql of migrations) {
    try { await getDbv().execute(sql); } catch {}
  }

  // Migration: recreate workflows table without CHECK constraint to allow new states
  try {
    await getDbv().execute("SELECT state FROM workflows LIMIT 1");
    await getDbv().execute("ALTER TABLE workflows RENAME TO workflows_old");
    await getDbv().execute(`CREATE TABLE workflows (
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
  } catch {}
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

// ========== TRIPS ==========

export async function createTrip(tripId: string, clientPhone: string, origin: string, destination: string, priceBase?: number, passengers?: number, scheduledAt?: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, passengers, status, scheduled_at) VALUES (?, ?, ?, ?, ?, ?, 'consulta', ?)", args: [tripId, clientPhone, origin, destination, priceBase || null, passengers || null, scheduledAt || null] });
}

export async function getTripById(tripId: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM trips WHERE trip_id = ?", args: [tripId] });
  return (rs.rows as any[])[0] || null;
}

export async function getActiveTripByPhone(clientPhone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({ sql: "SELECT * FROM trips WHERE client_phone = ? AND status NOT IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 1", args: [clientPhone] });
  return (rs.rows as any[])[0] || null;
}

export async function getTripByAssignedDriver(driverPhone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM trips WHERE assigned_driver_phone = ? AND status = 'asignado_chofer' ORDER BY created_at DESC LIMIT 1",
    args: [driverPhone],
  });
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

export async function assignDriverToTrip(tripId: string, driverPhone: string): Promise<{ commission: number; payout: number } | null> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  if (!trip) return null;

  const price = trip.price_base || 0;
  const commission = Math.round(price * 0.15);
  const payout = price - commission;

  await getDbv().execute({
    sql: "UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', commission_amount = ?, driver_payout = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [driverPhone, commission, payout, tripId],
  });
  return { commission, payout };
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

export async function createDriverCode(
  code: string, name: string, createdBy: string, phone?: string,
  opts?: { carType?: string; carCapacity?: number; color?: string; plate?: string; country?: string; tier?: string }
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
        sql: `INSERT OR IGNORE INTO drivers (driver_id, phone, name, active, car_type, car_capacity, color, plate, country, tier)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?)`,
        args: [`driver_${Date.now()}`, fullPhone, name.trim(),
               opts?.carType || null, opts?.carCapacity || null, opts?.color || null, opts?.plate || null,
               opts?.country || 'AR', opts?.tier || 'normal'],
      });
    } else {
      await getDbv().execute({
        sql: "INSERT INTO driver_codes (code, name, created_by) VALUES (?, ?, ?)",
        args: [code.toLowerCase().trim(), name.trim(), createdBy],
      });
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "El código ya existe" };
  }
}

export async function deactivateDriverByCode(code: string): Promise<boolean> {
  await ensureSchema();
  const entry = await getDriverCodeByCode(code);
  if (!entry) return false;

  if (entry.phone) {
    await getDbv().execute({
      sql: "UPDATE drivers SET active = 0 WHERE phone = ?",
      args: [entry.phone],
    });
  }
  return true;
}

export async function getDriverCodeByCode(code: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM driver_codes WHERE code = ?",
    args: [code.toLowerCase().trim()],
  });
  return (rs.rows as any[])[0] || null;
}

export async function registerDriverByCode(code: string, phone: string): Promise<any> {
  await ensureSchema();
  const existing = await getDriverCodeByCode(code);
  if (!existing) return null;
  if (existing.phone) return existing;

  await getDbv().execute({
    sql: "UPDATE driver_codes SET phone = ?, registered_at = unixepoch() WHERE code = ?",
    args: [phone, code.toLowerCase().trim()],
  });

  const driverId = `driver_${Date.now()}`;
  await getDbv().execute({
    sql: "INSERT OR IGNORE INTO drivers (driver_id, phone, name, active) VALUES (?, ?, ?, 1)",
    args: [driverId, phone, existing.name],
  });

  return await getDriverCodeByCode(code);
}

export async function getDriverExpiry(phone: string): Promise<{ active: boolean; expiresAt: Date | null }> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT last_message_at FROM conversations WHERE phone = ?",
    args: [phone],
  });
  const row = (rs.rows as any[])[0];
  if (!row || !row.last_message_at) return { active: false, expiresAt: null };

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

export async function getAvailableDrivers(filters?: { minCapacity?: number; country?: string }): Promise<any[]> {
  await ensureSchema();
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const conditions: string[] = ["d.active = 1", "c.last_message_at > ?"];
  const args: any[] = [cutoff];

  if (filters?.minCapacity) {
    conditions.push("(d.car_capacity IS NULL OR d.car_capacity >= ?)");
    args.push(filters.minCapacity);
  }
  if (filters?.country) {
    conditions.push("(d.country IS NULL OR d.country = ?)");
    args.push(filters.country);
  }

  const rs = await getDbv().execute({
    sql: `SELECT d.* FROM drivers d
          INNER JOIN conversations c ON c.phone = d.phone
          WHERE ${conditions.join(" AND ")}`,
    args,
  });
  return rs.rows as any[];
}

// ========== PREFERRED DRIVERS ==========

export async function getClientPreferredDriver(clientPhone: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM client_preferred_drivers WHERE client_phone = ?",
    args: [clientPhone],
  });
  return (rs.rows as any[])[0] || null;
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

export async function assignWorkflowAtomic(convId: number, driverPhone: string): Promise<boolean> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: `UPDATE workflows 
          SET state = 'closed', assigned_driver_phone = ?, last_message_at = unixepoch() 
          WHERE conversation_id = ? AND state IN ('waiting_group','waiting_preferred','waiting_backup') AND assigned_driver_phone IS NULL`,
    args: [driverPhone, convId],
  });
  const ok = rs.rowsAffected > 0;
  console.log(`[ASSIGN] convId=${convId} driver=${driverPhone} rowsAffected=${rs.rowsAffected} ok=${ok}`);
  return ok;
}

export async function advanceWorkflowState(convId: number, phone: string, newState: string): Promise<void> {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  await getDbv().execute({
    sql: `INSERT INTO workflows (conversation_id, phone, state, group_asked_at, last_message_at)
          VALUES (?, ?, ?, ?, ?)
          ON CONFLICT(conversation_id) DO UPDATE SET
            state = excluded.state,
            group_asked_at = excluded.group_asked_at,
            last_message_at = excluded.last_message_at`,
    args: [convId, phone, newState, now, now],
  });
}

export async function getExpiredWorkflowsByState(state: string, timeoutMs: number): Promise<any[]> {
  await ensureSchema();
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  const rs = await getDbv().execute({
    sql: "SELECT * FROM workflows WHERE state = ? AND group_asked_at IS NOT NULL AND group_asked_at < ? AND assigned_driver_phone IS NULL",
    args: [state, cutoff],
  });
  return rs.rows as any[];
}

export async function getExpiredWorkflows(timeoutMs: number): Promise<any[]> {
  await ensureSchema();
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  const rs = await getDbv().execute({
    sql: "SELECT * FROM workflows WHERE state = 'waiting_group' AND group_asked_at IS NOT NULL AND group_asked_at < ? AND assigned_driver_phone IS NULL",
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

export async function getFirstWaitingWorkflow(): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM workflows WHERE state = 'waiting_group' AND assigned_driver_phone IS NULL ORDER BY group_asked_at ASC LIMIT 1",
  });
  return (rs.rows as any[])[0] || null;
}

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

export async function getPackagePrice(driverPhone: string, packageType: string): Promise<any> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM package_prices WHERE driver_phone = ? AND package_type = ?",
    args: [driverPhone, packageType],
  });
  return (rs.rows as any[])[0] || null;
}

export async function getActiveTripsByClient(clientPhone: string): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado') ORDER BY created_at ASC",
    args: [clientPhone],
  });
  return rs.rows as any[];
}

// ========== SURVEY ==========

export async function getTripsPendingSurvey(): Promise<any[]> {
  await ensureSchema();
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const rs = await getDbv().execute({
    sql: "SELECT * FROM trips WHERE status = 'asignado_chofer' AND (survey_sent IS NULL OR survey_sent = 0) AND updated_at < ? ORDER BY updated_at ASC LIMIT 10",
    args: [cutoff],
  });
  return rs.rows as any[];
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

export async function updateTripTariff(tripId: string, tariffId: number, pisoBase: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET tariff_id = ?, piso_base = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tariffId, pisoBase, tripId],
  });
}

export async function updateTripScheduledAt(tripId: string, scheduledAt: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET scheduled_at = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [scheduledAt, tripId],
  });
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

export async function getActiveSlots(): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute("SELECT * FROM reservation_slots WHERE active = 1 ORDER BY day_of_week, start_time");
  return rs.rows as any[];
}

export async function getSlotsByDayOfWeek(dayOfWeek: number): Promise<any[]> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM reservation_slots WHERE day_of_week = ? AND active = 1 ORDER BY start_time",
    args: [dayOfWeek],
  });
  return rs.rows as any[];
}

export async function deleteReservationSlot(id: number): Promise<boolean> {
  await ensureSchema();
  const rs = await getDbv().execute({
    sql: "DELETE FROM reservation_slots WHERE id = ?",
    args: [id],
  });
  return rs.rowsAffected > 0;
}

export async function getTripsScheduledForDate(dateStr: string): Promise<any[]> {
  await ensureSchema();
  const startOfDay = Math.floor(new Date(dateStr + "T00:00:00").getTime() / 1000);
  const endOfDay = Math.floor(new Date(dateStr + "T23:59:59").getTime() / 1000);
  const rs = await getDbv().execute({
    sql: "SELECT * FROM trips WHERE scheduled_at >= ? AND scheduled_at <= ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at",
    args: [startOfDay, endOfDay],
  });
  return rs.rows as any[];
}

export async function getUpcomingReservations(limit = 20): Promise<any[]> {
  await ensureSchema();
  const now = Math.floor(Date.now() / 1000);
  const rs = await getDbv().execute({
    sql: "SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at > ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at ASC LIMIT ?",
    args: [now, limit],
  });
  return rs.rows as any[];
}

// ========== TARIFFS ==========

export async function findTariff(origin: string, destination: string, passengers: number): Promise<any | null> {
  await ensureSchema();
  const o = origin.toLowerCase().trim();
  const d = destination.toLowerCase().trim();
  const rs = await getDbv().execute({
    sql: "SELECT * FROM tariffs WHERE LOWER(origin) = ? AND LOWER(destination) = ? LIMIT 1",
    args: [o, d],
  });
  const rows = rs.rows as any[];
  if (rows.length === 0) return null;
  const t = rows[0];
  return {
    ...t,
    price: passengers > 4 ? t.price_6p : t.price_4p,
    piso: passengers > 4 ? t.piso_6p : t.piso_4p,
  };
}

export async function searchTariffs(query: string): Promise<any[]> {
  await ensureSchema();
  const q = `%${query.toLowerCase()}%`;
  const rs = await getDbv().execute({
    sql: "SELECT * FROM tariffs WHERE LOWER(origin) LIKE ? OR LOWER(destination) LIKE ? LIMIT 10",
    args: [q, q],
  });
  return rs.rows as any[];
}

async function seedTariffs(): Promise<void> {
  const data: any[] = [
    {origin:"Puerto Iguazú",destination:"Aduana de Foz",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:32000},
    {origin:"Puerto Iguazú",destination:"Aeropuerto Foz (IGU)",modality:"X tramo",crosses:1,wait:0,price4:55000,price6:77000,piso4:44000,piso6:61000},
    {origin:"Puerto Iguazú",destination:"Blue Park",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000},
    {origin:"Puerto Iguazú",destination:"Cabecera Puente Amistad",modality:"X tramo",crosses:1,wait:0,price4:80000,price6:112000,piso4:64000,piso6:89000},
    {origin:"Puerto Iguazú",destination:"Cataratas Brasil (Aves/Aqua)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:80000,price6:112000,piso4:64000,piso6:89000},
    {origin:"Puerto Iguazú",destination:"Cataratas Brasil + Rafain Almuerzo",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:90000,price6:126000,piso4:72000,piso6:100000},
    {origin:"Puerto Iguazú",destination:"Cena Show Rafain",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000},
    {origin:"Puerto Iguazú",destination:"Centro de Foz",modality:"X tramo",crosses:1,wait:0,price4:60000,price6:84000,piso4:48000,piso6:67000},
    {origin:"Puerto Iguazú",destination:"Foz Centro / Hotel Belmond",modality:"Solo ida",crosses:1,wait:0,price4:52000,price6:72000,piso4:41000,piso6:56000},
    {origin:"Puerto Iguazú",destination:"H. Recanto / Mabu / Rafain Palace",modality:"Solo ida",crosses:1,wait:0,price4:72000,price6:100000,piso4:57000,piso6:80000},
    {origin:"Puerto Iguazú",destination:"Hora de espera (BR)",modality:"Adicional",crosses:1,wait:1,price4:20000,price6:28000,piso4:20000,piso6:28000},
    {origin:"Puerto Iguazú",destination:"Itaipú y Alrededores",modality:"Solo ida",crosses:1,wait:0,price4:97500,price6:136000,piso4:78000,piso6:108000},
    {origin:"Puerto Iguazú",destination:"Marco de las 3 Fronteras (BR)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000},
    {origin:"Puerto Iguazú",destination:"Represa Itaipu + Templo Buda",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:100000,price6:140000,piso4:80000,piso6:112000},
    {origin:"Puerto Iguazú",destination:"Shopping JL",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:80000,price6:112000,piso4:64000,piso6:89000},
    {origin:"Puerto Iguazú",destination:"Shopping Palladium",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000},
    {origin:"Puerto Iguazú",destination:"Terminal Foz/ Rodoviaria Foz",modality:"X tramo",crosses:1,wait:0,price4:60000,price6:84000,piso4:48000,piso6:67000},
    {origin:"Puerto Iguazú",destination:"Yup Star (Rueda)",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:70000,price6:98000,piso4:56000,piso6:78000},
    {origin:"Puerto Iguazú",destination:"Asunción",modality:"Solo ida",crosses:1,wait:0,price4:1000000,price6:1400000,piso4:800000,piso6:1120000},
    {origin:"Puerto Iguazú",destination:"CDE hasta KM4 / Terminal",modality:"Solo ida",crosses:1,wait:0,price4:104500,price6:146000,piso4:83000,piso6:116000},
    {origin:"Puerto Iguazú",destination:"Saltos del Monday",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:200000,price6:280000,piso4:160000,piso6:224000},
    {origin:"Puerto Iguazú",destination:"Tour Compras + Cataratas Brasil",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:190000,price6:266000,piso4:152000,piso6:212000},
    {origin:"Puerto Iguazú",destination:"Tour Compras CDE",modality:"Ida y Vuelta con Espera",crosses:1,wait:3,price4:130000,price6:182000,piso4:100000,piso6:145000},
    {origin:"Puerto Iguazú",destination:"Aduana de Argentina",modality:"X tramo",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:10000},
    {origin:"Puerto Iguazú",destination:"Aduana de Argentina con migraciones",modality:"X tramo",crosses:1,wait:0,price4:20000,price6:28000,piso4:16000,piso6:20000},
    {origin:"Aeropuerto IGR",destination:"Aduana de Foz",modality:"X tramo",crosses:1,wait:0,price4:65000,price6:91000,piso4:52000,piso6:72000},
    {origin:"Aeropuerto IGR",destination:"Aero Foz / Rodoviaria / Cataratas BR",modality:"X tramo",crosses:1,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000},
    {origin:"Puerto Iguazú",destination:"Aeropuerto IGR",modality:"Solo ida",crosses:0,wait:0,price4:32000,price6:44000,piso4:25000,piso6:32000},
    {origin:"Puerto Iguazú",destination:"Cataratas + Minas Wanda",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:120000,price6:168000,piso4:100000,piso6:134000},
    {origin:"Aeropuerto IGR",destination:"Cataratas AR / Hotel Melia",modality:"X tramo",crosses:0,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000},
    {origin:"Aeropuerto IGR",destination:"Cataratas AR / Hotel Meliá",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000},
    {origin:"Aeropuerto IGR",destination:"Cataratas AR y a Foz",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:154000,price6:215000,piso4:123000,piso6:172000},
    {origin:"Aeropuerto IGR",destination:"Cataratas AR y Puerto Iguazú",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:72000,price6:100000,piso4:57000,piso6:80000},
    {origin:"Aeropuerto IGR",destination:"Cataratas AR, BR y Pto Iguazú",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:208000,price6:291000,piso4:166000,piso6:232000},
    {origin:"Puerto Iguazú",destination:"Cataratas Argentinas",modality:"Ida y Vuelta (2 tramos)",crosses:0,wait:0,price4:60000,price6:84000,piso4:50000,piso6:67000},
    {origin:"Puerto Iguazú",destination:"Cataratas Argentinas solo ida",modality:"Ida y Vuelta (2 tramos)",crosses:0,wait:0,price4:35000,price6:49000,piso4:25000,piso6:39000},
    {origin:"Aeropuerto IGR",destination:"Cataratas BR y Regreso Aero",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:176000,price6:146000,piso4:140000,piso6:116000},
    {origin:"Aeropuerto IGR",destination:"CDE hasta KM4 / Terminal",modality:"Solo ida",crosses:1,wait:0,price4:137000,price6:191000,piso4:109000,piso6:152000},
    {origin:"Puerto Iguazú",destination:"Centro (Urbano)",modality:"X tramo",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:9000},
    {origin:"Puerto Iguazú",destination:"Centro (Urbano) desde 600 Has zona Loi Suites, Awasi, Village",modality:"X tramo",crosses:0,wait:0,price4:15000,price6:21000,piso4:12000,piso6:9000},
    {origin:"Puerto Iguazú",destination:"Centro (Urbano) desde acceso ruta 12, resto de 600Has",modality:"X tramo",crosses:0,wait:0,price4:12000,price6:16000,piso4:9000,piso6:9000},
    {origin:"Puerto Iguazú",destination:"Centro hacia acceso ruta 12: Guira Oga / Aripuca / Bar Hielo / hoteles",modality:"X tramo",crosses:0,wait:0,price4:12000,price6:16000,piso4:9000,piso6:12800},
    {origin:"Puerto Iguazú",destination:"Duty Free Shop",modality:"X tramo",crosses:0,wait:0,price4:15000,price6:21000,piso4:12000,piso6:16000},
    {origin:"Aeropuerto IGR",destination:"Duty Free Shop Iguazú",modality:"Solo ida",crosses:1,wait:0,price4:52000,price6:72000,piso4:41000,piso6:56000},
    {origin:"Puerto Iguazú",destination:"El Soberbio",modality:"Solo ida",crosses:0,wait:0,price4:505000,price6:707000,piso4:404000,piso6:565000},
    {origin:"Puerto Iguazú",destination:"Eldorado",modality:"Solo ida",crosses:0,wait:0,price4:195000,price6:273000,piso4:156000,piso6:218000},
    {origin:"Puerto Iguazú",destination:"Esperanza",modality:"Solo ida",crosses:0,wait:0,price4:98000,price6:137000,piso4:78400,piso6:109000},
    {origin:"Aeropuerto IGR",destination:"Foz / Rodoviaria / Cataratas BR",modality:"Solo ida",crosses:1,wait:0,price4:52500,price6:73000,piso4:42000,piso6:58000},
    {origin:"Aeropuerto IGR",destination:"Foz Centro / Hotel Belmond",modality:"X tramo",crosses:1,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000},
    {origin:"Aeropuerto IGR",destination:"Full Day",modality:"Ida y Vuelta con Espera",crosses:1,wait:1,price4:260000,price6:364000,piso4:208000,piso6:291000},
    {origin:"Aeropuerto IGR",destination:"H. Amerian / Hito / Puerto",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000},
    {origin:"Aeropuerto IGR",destination:"H. Recanto / Mabu / Rafain Palace",modality:"Solo ida",crosses:1,wait:0,price4:104000,price6:145000,piso4:83000,piso6:116000},
    {origin:"Puerto Iguazú",destination:"Hito 3 Fronteras",modality:"X tramo",crosses:0,wait:0,price4:10000,price6:14000,piso4:8000,piso6:10000},
    {origin:"Puerto Iguazú",destination:"Hora de espera (Arg)",modality:"Adicional",crosses:0,wait:1,price4:10000,price6:14000,piso4:10000,piso6:14000},
    {origin:"Puerto Iguazú",destination:"Hora de espera (PY)",modality:"Adicional",crosses:1,wait:1,price4:20000,price6:28000,piso4:16000,piso6:22000},
    {origin:"Aeropuerto IGR",destination:"Hoteles 600 Hectáreas",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000},
    {origin:"Aeropuerto IGR",destination:"Itaipú y Alrededores",modality:"Solo ida",crosses:1,wait:0,price4:130000,price6:182000,piso4:104000,piso6:145000},
    {origin:"Puerto Iguazú",destination:"Minas de Wanda",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:90000,price6:126000,piso4:72000,piso6:100000},
    {origin:"Puerto Iguazú",destination:"Posadas",modality:"Solo ida",crosses:0,wait:0,price4:569000,price6:786000,piso4:455200,piso6:628000},
    {origin:"Aeropuerto IGR",destination:"Puerto Iguazú Centro",modality:"Solo ida",crosses:1,wait:0,price4:32000,price6:44000,piso4:25000,piso6:35000},
    {origin:"Puerto Iguazú",destination:"Puerto Libertad",modality:"Solo ida",crosses:0,wait:0,price4:72000,price6:100000,piso4:57600,piso6:80000},
    {origin:"Puerto Iguazú",destination:"Saltos del Mocona",modality:"Ida y Vuelta",crosses:0,wait:1,price4:450000,price6:630000,piso4:360000,piso6:504000},
    {origin:"Puerto Iguazú",destination:"Saltos del Moconá",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:949000,price6:1328000,piso4:759200,piso6:1000000},
    {origin:"Puerto Iguazú",destination:"Saltos Mbocai",modality:"Ida y Vuelta",crosses:0,wait:0,price4:50000,price6:70000,piso4:40000,piso6:56000},
    {origin:"Puerto Iguazú",destination:"San Ignacio",modality:"Solo ida",crosses:0,wait:0,price4:475000,price6:665000,piso4:380000,piso6:532000},
    {origin:"Puerto Iguazú",destination:"San Ignacio + Wanda + Yerbatera",modality:"Ida y Vuelta con Espera",crosses:0,wait:1,price4:400000,price6:560000,piso4:350000,piso6:448000},
    {origin:"Puerto Iguazú",destination:"Wanda",modality:"Solo ida",crosses:0,wait:0,price4:85000,price6:119000,piso4:68000,piso6:95000},
    {origin:"",destination:"Zona Tupá lodge, Barrio Santa Rosa",modality:"Adicional",crosses:0,wait:0,price4:20000,price6:28000,piso4:16000,piso6:22000},
  ];
  for (const r of data) {
    try {
      await getDbv().execute({
        sql: "INSERT OR IGNORE INTO tariffs (origin, destination, modality, crosses_border, wait_included, price_4p, price_6p, piso_4p, piso_6p) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        args: [r.origin, r.destination, r.modality, r.crosses, r.wait, r.price4, r.price6, r.piso4, r.piso6],
      });
    } catch {}
  }
}

// ========== DB INSTANCE ==========

export function getDbInstance(): LibSqlClient {
  return getDbv();
}