import { createClient, type InValue } from "@libsql/client";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";
import type {
  ConnectionStateRow,
  ConversationRow,
  MessageRow,
  TripRow,
  DriverRow,
  WorkflowRow,
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
  PlaceRow,
  AliasRow,
  TransferPriorityRow,
  PlaceResolution,
} from "./types";

type LibSqlClient = ReturnType<typeof createClient>;

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
    `CREATE INDEX IF NOT EXISTS idx_aliases_alias ON aliases(LOWER(alias))`,
    `CREATE INDEX IF NOT EXISTS idx_aliases_place ON aliases(place_id)`,
    `CREATE TABLE IF NOT EXISTS transfer_priority (
      place_id TEXT PRIMARY KEY,
      priority INTEGER NOT NULL CHECK(priority BETWEEN 1 AND 4)
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

  // Seed location_aliases if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM location_aliases");
    if ((count.rows as any[])[0].c === 0) {
      await seedLocationAliases();
    }
  } catch (e) { console.error("[migration] seed location_aliases error:", e); }

  // Seed places if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM places");
    if ((count.rows as any[])[0].c === 0) {
      await seedPlaces();
    }
  } catch (e) { console.error("[migration] seed places error:", e); }

  // Seed aliases if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM aliases");
    if ((count.rows as any[])[0].c === 0) {
      await seedAliases();
    }
  } catch (e) { console.error("[migration] seed aliases error:", e); }

  // Seed transfer_priority if empty
  try {
    const count = await getDbv().execute("SELECT COUNT(*) as c FROM transfer_priority");
    if ((count.rows as any[])[0].c === 0) {
      await seedTransferPriority();
    }
  } catch (e) { console.error("[migration] seed transfer_priority error:", e); }

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
  for (const sql of migrations) {
    try { await getDbv().execute(sql); } catch (e) { console.error("[migration] error:", sql, e); }
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

  // Migration: add assignment_source to trips
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('trips_assignment_source')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE trips ADD COLUMN assignment_source TEXT");
    }
  } catch (e) { console.error("[migration] trips assignment_source error:", e); }

  // Migration: add driver_commitment_at and driver_available_at to trips
  try {
    const result = await getDbv().execute(
      "INSERT OR IGNORE INTO _migrations (name) VALUES ('trips_driver_commitment_available')"
    );
    if ((result as any).rowsAffected > 0) {
      await getDbv().execute("ALTER TABLE trips ADD COLUMN driver_commitment_at INTEGER");
      await getDbv().execute("ALTER TABLE trips ADD COLUMN driver_available_at INTEGER");
    }
  } catch (e) { console.error("[migration] trips driver_commitment/available error:", e); }
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
    WHERE c.trip_status != 'completado' AND c.trip_status != 'cancelado'
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

export async function setConversationTripStatus(conversationId: number, status: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "UPDATE conversations SET trip_status = ? WHERE id = ?", args: [status, conversationId] });
}

// ========== MESSAGES ==========

export async function insertMessage(conversationId: number, role: string, content: string): Promise<number> {
  const result = await getDbv().execute({ sql: "INSERT INTO messages (conversation_id, role, content) VALUES (?, ?, ?)", args: [conversationId, role, content] });
  await getDbv().execute({ sql: "UPDATE conversations SET last_message_at = unixepoch() WHERE id = ?", args: [conversationId] });
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

export async function createTrip(tripId: string, clientPhone: string, origin: string, destination: string, priceBase?: number, passengers?: number, scheduledAt?: number, flightNumber?: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, passengers, status, scheduled_at, flight_number) VALUES (?, ?, ?, ?, ?, ?, 'consulta', ?, ?)", args: [tripId, clientPhone, origin, destination, priceBase || null, passengers || null, scheduledAt || null, flightNumber || null] });
}

export async function getTripById(tripId: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE trip_id = ?", [tripId]);
}

export async function getActiveTripByPhone(clientPhone: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE client_phone = ? AND status NOT IN ('completado', 'cancelado') ORDER BY created_at DESC LIMIT 1", [clientPhone]);
}

export async function getTripByAssignedDriver(driverPhone: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE assigned_driver_phone = ? AND status = 'asignado_chofer' ORDER BY created_at DESC LIMIT 1", [driverPhone]);
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
  return { commission, payout };
}

export async function completeTrip(tripId: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET status = 'completado', confirmed_at = unixepoch(), updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });
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
    sql: "INSERT INTO drivers (driver_id, phone, name, active) VALUES (?, ?, ?, 1)",
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
        sql: `INSERT OR IGNORE INTO drivers (driver_id, phone, name, active, car_type, car_capacity, color, plate, country, tier, shift, payment_method, idiom)
            VALUES (?, ?, ?, 1, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      sql: "UPDATE drivers SET active = 0 WHERE phone = ?",
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
    sql: "INSERT OR IGNORE INTO drivers (driver_id, phone, name, active) VALUES (?, ?, ?, 1)",
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
  const conditions: string[] = ["d.active = 1", "c.last_message_at > ?"];
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

// ========== WORKFLOWS (DB-backed state machine) ==========

export async function getWorkflow(convId: number): Promise<WorkflowRow | null> {
  return queryOne<WorkflowRow>("SELECT * FROM workflows WHERE conversation_id = ?", [convId]);
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
          WHERE conversation_id = ? AND state IN ('waiting_group','waiting_preferred','waiting_backup','nivel_1','nivel_2','nivel_3','waiting_driver') AND assigned_driver_phone IS NULL`,
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
            assigned_driver_phone = NULL,
            group_asked_at = excluded.group_asked_at,
            last_message_at = excluded.last_message_at`,
    args: [convId, phone, newState, now, now],
  });
}

export async function getExpiredWorkflowsByState(state: string, timeoutMs: number): Promise<WorkflowRow[]> {
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  return query<WorkflowRow>("SELECT * FROM workflows WHERE state = ? AND group_asked_at IS NOT NULL AND group_asked_at < ? AND assigned_driver_phone IS NULL", [state, cutoff]);
}

export async function getExpiredWorkflows(timeoutMs: number): Promise<WorkflowRow[]> {
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  return query<WorkflowRow>("SELECT * FROM workflows WHERE state = 'waiting_group' AND group_asked_at IS NOT NULL AND group_asked_at < ? AND assigned_driver_phone IS NULL", [cutoff]);
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

export async function getFirstWaitingWorkflow(): Promise<WorkflowRow | null> {
  return queryOne<WorkflowRow>("SELECT * FROM workflows WHERE state = 'waiting_group' AND assigned_driver_phone IS NULL ORDER BY group_asked_at ASC LIMIT 1");
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

export async function getPackagePrice(driverPhone: string, packageType: string): Promise<PackagePriceRow | null> {
  return queryOne<PackagePriceRow>("SELECT * FROM package_prices WHERE driver_phone = ? AND package_type = ?", [driverPhone, packageType]);
}

export async function getActiveTripsByClient(clientPhone: string): Promise<TripRow[]> {
  return query<TripRow>("SELECT * FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado') ORDER BY created_at ASC", [clientPhone]);
}

// ========== SURVEY ==========

export async function getTripsPendingSurvey(): Promise<TripRow[]> {
  const cutoff = Math.floor(Date.now() / 1000);
  return query<TripRow>("SELECT * FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?) ORDER BY confirmed_at ASC LIMIT 10", [cutoff]);
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

export async function updateTripAssignmentSource(tripId: string, source: string): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET assignment_source = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [source, tripId],
  });
}

export async function updateTripDriverCommitment(tripId: string, ts: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET driver_commitment_at = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [ts, tripId],
  });
}

export async function updateTripDriverAvailable(tripId: string, ts: number): Promise<void> {
  await ensureSchema();
  await getDbv().execute({
    sql: "UPDATE trips SET driver_available_at = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [ts, tripId],
  });
}

export async function getTripsByScheduledAtWindow(startTs: number, endTs: number): Promise<TripRow[]> {
  return query<TripRow>(
    "SELECT * FROM trips WHERE scheduled_at >= ? AND scheduled_at <= ? AND status NOT IN ('completado','cancelado') ORDER BY scheduled_at",
    [startTs, endTs]
  );
}

export async function getTripsPendingCloseOut(): Promise<TripRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - 7200;
  return query<TripRow>(
    "SELECT * FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ? ORDER BY confirmed_at",
    [cutoff]
  );
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
  return query<TripRow>("SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at < ? AND status NOT IN ('completado','cancelado')", [now]);
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

// ========== PLACES CATALOG SEEDS ==========

async function seedPlaces(): Promise<void> {
  const data: {
    place_id: string;
    canonical_name: string;
    official_name: string;
    google_maps_name: string;
    place_type: string;
    city: string;
    country: string;
    tourist_relevance_score: number;
  }[] = [
    { place_id:"ar_igr_airport", canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", official_name:"Aeropuerto Internacional Mayor Carlos Eduardo Krause", google_maps_name:"Aeropuerto Internacional Cataratas del Iguazú (IGR)", place_type:"airport", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:10 },
    { place_id:"br_igu_airport", canonical_name:"Aeroporto Internacional de Foz do Iguaçu", official_name:"Aeroporto Internacional de Foz do Iguaçu/Cataratas", google_maps_name:"Aeroporto Internacional de Foz do Iguaçu (IGU)", place_type:"airport", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"py_agt_airport", canonical_name:"Aeropuerto Internacional Guaraní", official_name:"Aeropuerto Internacional Guaraní", google_maps_name:"Aeropuerto Internacional Guaraní (AGT)", place_type:"airport", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"ar_bus_terminal", canonical_name:"Terminal de Ómnibus de Puerto Iguazú", official_name:"Terminal de Ómnibus de Puerto Iguazú", google_maps_name:"Terminal de Ómnibus de Puerto Iguazú", place_type:"bus_terminal", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"br_bus_terminal", canonical_name:"Terminal Rodoviário de Foz do Iguaçu", official_name:"Terminal Rodoviário Internacional de Foz do Iguaçu", google_maps_name:"Rodoviária Internacional de Foz do Iguaçu", place_type:"bus_terminal", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"py_bus_terminal", canonical_name:"Terminal de Ómnibus de Ciudad del Este", official_name:"Terminal de Ómnibus de Ciudad del Este", google_maps_name:"Terminal de Ómnibus de Ciudad del Este", place_type:"bus_terminal", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"ar_br_border", canonical_name:"Aduana Argentina-Brasil (Puente Tancredo Neves)", official_name:"Paso Fronterizo Iguazú - Foz de Iguazú", google_maps_name:"Control Migratorio Argentino - Puente Tancredo Neves", place_type:"border_crossing", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:10 },
    { place_id:"br_ar_border", canonical_name:"Aduana Brasil-Argentina (Ponte Tancredo Neves)", official_name:"Inspetoria da Receita Federal em Foz do Iguaçu", google_maps_name:"Posto de Controle Migratório da Polícia Federal - Ponte Tancredo Neves", place_type:"border_crossing", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"br_py_border", canonical_name:"Aduana Brasil-Paraguay (Ponte da Amizade)", official_name:"Posto de Controle Fiscal - Receita Federal", google_maps_name:"Posto de Controle Migratório - Ponte da Amizade", place_type:"border_crossing", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"py_br_border", canonical_name:"Aduana Paraguay-Brasil (Puente de la Amistad)", official_name:"Administración de Aduana Ciudad del Este", google_maps_name:"Control Migratorio Paraguayo - Puente de la Amistad", place_type:"border_crossing", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:10 },
    { place_id:"ar_cataratas_attraction", canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", official_name:"Parque Nacional Iguazú", google_maps_name:"Parque Nacional Iguazú", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:10 },
    { place_id:"br_cataratas_attraction", canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", official_name:"Parque Nacional do Iguaçu", google_maps_name:"Parque Nacional do Iguaçu", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"br_aves_attraction", canonical_name:"Parque das Aves", official_name:"Parque das Aves Ltda.", google_maps_name:"Parque das Aves", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"br_itaipu_attraction", canonical_name:"Represa de Itaipú Binacional", official_name:"Itaipu Binacional - Usina Hidrelétrica", google_maps_name:"Itaipu Binacional", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"py_itaipu_attraction", canonical_name:"Represa de Itaipú Binacional Paraguay", official_name:"Itaipu Binacional - Margen Derecha", google_maps_name:"Itaipu Binacional Paraguay", place_type:"attraction", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"ar_hito_attraction", canonical_name:"Hito Tres Fronteras - Argentina", official_name:"Hito Tres Fronteras Puerto Iguazú", google_maps_name:"Hito de las Tres Fronteras", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"br_marco_attraction", canonical_name:"Marco das Três Fronteiras - Brasil", official_name:"Marco das Três Fronteiras Foz do Iguaçu", google_maps_name:"Marco das Três Fronteiras", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"py_hito_attraction", canonical_name:"Hito Tres Fronteras - Paraguay", official_name:"Hito Tres Fronteras Presidente Franco", google_maps_name:"Hito Tres Fronteras CDE", place_type:"attraction", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"py_monday_attraction", canonical_name:"Saltos del Monday", official_name:"Parque Municipal Monday", google_maps_name:"Saltos del Monday", place_type:"attraction", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"br_buddhist_attraction", canonical_name:"Templo Budista Chen Tien", official_name:"Templo Budista Chen Tien", google_maps_name:"Templo Budista Chen Tien", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"ar_aripuca_attraction", canonical_name:"La Aripuca", official_name:"Complejo Turístico La Aripuca", google_maps_name:"La Aripuca", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_guira_attraction", canonical_name:"Güirá Oga", official_name:"Refugio de Animales Silvestres GüiráOga", google_maps_name:"GüiráOga", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_icebar_attraction", canonical_name:"Icebar Iguazú", official_name:"Icebar Iguazú", google_maps_name:"Icebar Iguazú", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_wanda_attraction", canonical_name:"Minas de Wanda", official_name:"Compañía Minera Wanda", google_maps_name:"Minas de Wanda", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_san_ignacio_attraction", canonical_name:"Ruinas de San Ignacio Miní", official_name:"Reducción Jesuítica de San Ignacio Miní", google_maps_name:"Ruinas Jesuíticas de San Ignacio Miní", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_mocona_attraction", canonical_name:"Saltos del Moconá", official_name:"Parque Provincial Moconá", google_maps_name:"Saltos del Moconá", place_type:"attraction", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:7 },
    { place_id:"br_yupstar_attraction", canonical_name:"Yup Star Foz - Rueda Gigante", official_name:"Yup Star Foz Roda Gigante", google_maps_name:"Yup Star Foz", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_dreams_attraction", canonical_name:"Dreams Park Show", official_name:"Complexo Dreams Park Show", google_maps_name:"Dreams Park Show Foz do Iguaçu", place_type:"attraction", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"ar_duty_free_shopping", canonical_name:"Duty Free Shop Puerto Iguazú", official_name:"Duty Free Shop Puerto Iguazú S.A.", google_maps_name:"Duty Free Shop Puerto Iguazú", place_type:"shopping", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_feria_shopping", canonical_name:"La Feirinha de Puerto Iguazú", official_name:"Feria de Puerto Iguazú", google_maps_name:"La Feirinha", place_type:"shopping", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"br_jl_shopping", canonical_name:"Cataratas JL Shopping", official_name:"Cataratas JL Shopping", google_maps_name:"Cataratas JL Shopping", place_type:"shopping", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_catuai_shopping", canonical_name:"Catuaí Palladium Shopping Center", official_name:"Catuaí Palladium", google_maps_name:"Catuaí Palladium Shopping Center", place_type:"shopping", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"py_del_este_shopping", canonical_name:"Shopping del Este", official_name:"Shopping del Este", google_maps_name:"Shopping del Este", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_paris_shopping", canonical_name:"Shopping Paris", official_name:"Shopping Paris", google_maps_name:"Shopping Paris", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_china_shopping", canonical_name:"Shopping China Importados", official_name:"Shopping China CDE", google_maps_name:"Shopping China Importados", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:10 },
    { place_id:"py_sax_shopping", canonical_name:"SAX Department Store", official_name:"S.A.X. S.A.", google_maps_name:"SAX Department Store", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_monalisa_shopping", canonical_name:"Shopping Monalisa", official_name:"Monalisa Paraguay", google_maps_name:"Shopping Monalisa", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_nissei_shopping", canonical_name:"Casa Nissei", official_name:"Casa Nissei CDE", google_maps_name:"Casa Nissei", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_cellshop_shopping", canonical_name:"Cellshop Importados", official_name:"Cellshop Paraguay", google_maps_name:"Cellshop Importados", place_type:"shopping", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:10 },
    { place_id:"ar_casino_iguazu", canonical_name:"Casino Iguazú", official_name:"Casino Iguazú / Grand Casino", google_maps_name:"Casino Iguazú", place_type:"casino", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_melia_hotel", canonical_name:"Gran Meliá Iguazú", official_name:"Gran Meliá Iguazú", google_maps_name:"Gran Meliá Iguazú", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:10 },
    { place_id:"br_belmond_hotel", canonical_name:"Hotel das Cataratas, A Belmond Hotel", official_name:"Hotel das Cataratas", google_maps_name:"Hotel das Cataratas, A Belmond Hotel, Iguassu Falls", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"ar_loi_suites_hotel", canonical_name:"Loi Suites Iguazú Hotel", official_name:"Loi Suites Iguazú Hotel", google_maps_name:"Loi Suites Iguazú Hotel", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_iguazu_jungle_hotel", canonical_name:"Iguazú Jungle Lodge", official_name:"Iguazú Jungle Lodge", google_maps_name:"Iguazú Jungle Lodge", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_mercure_hotel", canonical_name:"Mercure Iguazu Hotel Iru", official_name:"Mercure Iguazu Hotel Iru", google_maps_name:"Mercure Iguazu Hotel Iru", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_o2_hotel", canonical_name:"O2 Hotel Iguazú", official_name:"O2 Hotel Iguazú", google_maps_name:"O2 Hotel Iguazú", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_grand_resort", canonical_name:"Iguazu Grand Resort Spa & Casino", official_name:"Iguazu Grand Resort", google_maps_name:"Iguazu Grand Resort Spa & Casino", place_type:"resort", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_saint_george_hotel", canonical_name:"Hotel Saint George", official_name:"Hotel Saint George", google_maps_name:"Hotel Saint George", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_amerian_portal", canonical_name:"Amérian Portal del Iguazú Hotel", official_name:"Amérian Portal del Iguazú", google_maps_name:"Amérian Portal del Iguazú Hotel", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_panoramic_grand", canonical_name:"Panoramic Grand Hotel", official_name:"Panoramic Grand", google_maps_name:"Panoramic Grand", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_aldea_selva_hotel", canonical_name:"La Aldea de la Selva Lodge", official_name:"La Aldea de la Selva Lodge", google_maps_name:"La Aldea de la Selva Lodge", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_falls_iguazu_hotel", canonical_name:"Falls Iguazú Hotel & Spa", official_name:"Falls Iguazú Hotel", google_maps_name:"Falls Iguazú Hotel & Spa", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"br_doubletree_hotel", canonical_name:"DoubleTree by Hilton Foz do Iguaçu", official_name:"DoubleTree by Hilton Resort", google_maps_name:"DoubleTree by Hilton Foz do Iguaçu", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_mabu_thermas", canonical_name:"Mabu Thermas Grand Resort", official_name:"Mabu Thermas Grand Resort", google_maps_name:"Mabu Thermas Grand Resort", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"br_recanto_cataratas", canonical_name:"Recanto Cataratas Thermas Resort & Convention", official_name:"Recanto Cataratas", google_maps_name:"Recanto Cataratas Thermas Resort & Convention", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_bourbon_thermas", canonical_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", official_name:"Bourbon Cataratas", google_maps_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:10 },
    { place_id:"br_wish_foz", canonical_name:"Wish Foz do Iguaçu", official_name:"Wish Foz do Iguaçu Resort", google_maps_name:"Wish Foz do Iguaçu", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_vivaz_cataratas", canonical_name:"Vivaz Cataratas Hotel Resort", official_name:"Vivaz Cataratas", google_maps_name:"Vivaz Cataratas Hotel Resort", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_grand_carima", canonical_name:"Grand Carimã Resort & Convention Center", official_name:"Grand Carimã", google_maps_name:"Grand Carimã Resort & Convention Center", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_jl_bourbon", canonical_name:"JL Hotel by Bourbon", official_name:"JL Hotel by Bourbon", google_maps_name:"JL Hotel by Bourbon", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_sanma_hotel", canonical_name:"Sanma Hotel", official_name:"Sanma Hotel", google_maps_name:"Sanma Hotel", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_taroba_hotel", canonical_name:"Tarobá Hotel", official_name:"Tarobá Hotel", google_maps_name:"Tarobá Hotel", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_viale_cataratas", canonical_name:"Viale Cataratas Hotel & Eventos", official_name:"Viale Cataratas", google_maps_name:"Viale Cataratas Hotel & Eventos", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_rafain_palace", canonical_name:"Rafain Palace Hotel & Convention Center", official_name:"Rafain Palace", google_maps_name:"Rafain Palace Hotel & Convention Center", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_churrascaria_rafain", canonical_name:"Churrascaria Rafain Show", official_name:"Churrascaria Rafain Show", google_maps_name:"Churrascaria Rafain Show", place_type:"restaurant", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"ar_virgin_lodge", canonical_name:"La Reserva Virgin Lodge", official_name:"La Reserva Virgin Lodge", google_maps_name:"La Reserva Virgin Lodge", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_guamini_mision", canonical_name:"Guaminí Misión Hotel", official_name:"Guaminí Misión Hotel", google_maps_name:"Guaminí Misión Hotel", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_tucan_hostel", canonical_name:"Tucan Hostel", official_name:"Tucan Hostel", google_maps_name:"Tucan Hostel", place_type:"hostel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:7 },
    { place_id:"br_concept_hostel", canonical_name:"Concept Design Hostel & Suites", official_name:"Concept Design Hostel", google_maps_name:"Concept Design Hostel & Suites", place_type:"hostel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:7 },
    { place_id:"br_tetris_hostel", canonical_name:"Tetris Container Hostel", official_name:"Tetris Container Hostel", google_maps_name:"Tetris Container Hostel", place_type:"hostel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:7 },
    { place_id:"br_wanderlust_hostel", canonical_name:"Hostel Wanderlust", official_name:"Hostel Wanderlust", google_maps_name:"Hostel Wanderlust", place_type:"hostel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:7 },
    { place_id:"ar_selvaje_lodge", canonical_name:"Selvaje Lodge Iguazu", official_name:"Selvaje Lodge Iguazu", google_maps_name:"Selvaje Lodge Iguazu", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_overo_lodge", canonical_name:"Overo Lodge & Selva", official_name:"Overo Lodge & Selva", google_maps_name:"Overo Lodge & Selva", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"br_luz_hotel", canonical_name:"Luz Hotel by Castelo Itaipava", official_name:"Luz Hotel Foz", google_maps_name:"Luz Hotel by Castelo Itaipava", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_bella_italia", canonical_name:"Hotel Bella Italia", official_name:"Hotel Bella Italia", google_maps_name:"Hotel Bella Italia", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_mirante_hotel", canonical_name:"Mirante Hotel", official_name:"Mirante Hotel", google_maps_name:"Mirante Hotel", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_wyndham_foz", canonical_name:"Wyndham Foz do Iguaçu", official_name:"Wyndham Foz do Iguaçu", google_maps_name:"Wyndham Foz do Iguaçu", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_wyndham_golden", canonical_name:"Wyndham Golden Foz Suites", official_name:"Wyndham Golden Foz Suites", google_maps_name:"Wyndham Golden Foz Suites", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_colonial_iguacu", canonical_name:"Hotel Colonial Iguaçu", official_name:"Hotel Colonial Iguaçu", google_maps_name:"Hotel Colonial Iguaçu", place_type:"hotel", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"br_eco_cataratas", canonical_name:"Complexo Eco Cataratas Resort by SJ", official_name:"Complexo Eco Cataratas", google_maps_name:"Complexo Eco Cataratas Resort by SJ", place_type:"resort", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
    { place_id:"ar_grand_crucero", canonical_name:"Grand Crucero Iguazú Hotel", official_name:"Grand Crucero", google_maps_name:"Grand Crucero Iguazú Hotel", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_cantera_lodge", canonical_name:"La Cantera Jungle Lodge", official_name:"La Cantera Lodge", google_maps_name:"La Cantera Jungle Lodge", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_raices_esturion", canonical_name:"Raíces Esturión Hotel", official_name:"Raíces Esturión", google_maps_name:"Raíces Esturión Hotel", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_yvy_hotel", canonical_name:"Yvy Hotel de Selva", official_name:"Yvy Hotel de Selva", google_maps_name:"Yvy Hotel de Selva", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_palma_real", canonical_name:"Palma Real Posada", official_name:"Palma Real Posada", google_maps_name:"Palma Real Posada", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:8 },
    { place_id:"ar_marcopolo_suites", canonical_name:"Marcopolo Suites Iguazu", official_name:"Marcopolo Suites", google_maps_name:"Marcopolo Suites Iguazu", place_type:"hotel", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:7 },
    { place_id:"ar_pirayu_resort", canonical_name:"Pirayu Lodge Resort", official_name:"Pirayu Lodge Resort", google_maps_name:"Pirayu Lodge Resort", place_type:"resort", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:7 },
    { place_id:"py_howard_johnson", canonical_name:"Howard Johnson Plaza Ciudad del Este", official_name:"Howard Johnson Plaza CDE", google_maps_name:"Howard Johnson Plaza Ciudad del Este", place_type:"hotel", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"py_casino_acaray_hotel", canonical_name:"Hotel Casino Acaray", official_name:"Hotel Casino Acaray", google_maps_name:"Hotel Casino Acaray", place_type:"hotel", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"py_rio_bourbon", canonical_name:"Rio Hotel by Bourbon Ciudad del Este", official_name:"Rio Hotel CDE", google_maps_name:"Rio Hotel by Bourbon Ciudad del Este", place_type:"hotel", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"py_convair_hotel", canonical_name:"Convair Hotel", official_name:"Convair Hotel CDE", google_maps_name:"Convair Hotel", place_type:"hotel", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:8 },
    { place_id:"ar_port_iguazu", canonical_name:"Puerto de Puerto Iguazú", official_name:"Puerto de Puerto Iguazú", google_maps_name:"Puerto de Puerto Iguazú", place_type:"port", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:7 },
    { place_id:"br_port_meira", canonical_name:"Porto Meira", official_name:"Porto Meira Foz", google_maps_name:"Porto Meira", place_type:"port", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:6 },
    { place_id:"py_port_franco", canonical_name:"Puerto de Presidente Franco", official_name:"Puerto Histórico Presidente Franco", google_maps_name:"Puerto de Presidente Franco", place_type:"port", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:6 },
    { place_id:"ar_600_hectareas_area", canonical_name:"Zona 600 Hectáreas", official_name:"Reserva Selva Iryapú - 600 Hectáreas", google_maps_name:"600 Hectáreas", place_type:"tourist_area", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"ar_centro_iguazu_area", canonical_name:"Centro de Puerto Iguazú", official_name:"Área Urbana Puerto Iguazú", google_maps_name:"Centro de Puerto Iguazú", place_type:"tourist_area", city:"Puerto Iguazú", country:"Argentina", tourist_relevance_score:9 },
    { place_id:"br_av_cataratas_area", canonical_name:"Corredor Turístico Avenida das Cataratas", official_name:"Avenida das Cataratas Corredor", google_maps_name:"Avenida das Cataratas", place_type:"tourist_area", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"br_centro_foz_area", canonical_name:"Centro de Foz do Iguaçu", official_name:"Área Urbana Central de Foz do Iguaçu", google_maps_name:"Centro de Foz do Iguaçu", place_type:"tourist_area", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:9 },
    { place_id:"py_centro_cde_area", canonical_name:"Microcentro de Ciudad del Este", official_name:"Área Comercial Ciudad del Este", google_maps_name:"Microcentro Ciudad del Este", place_type:"tourist_area", city:"Ciudad del Este", country:"Paraguay", tourist_relevance_score:9 },
    { place_id:"br_rafain_convention", canonical_name:"Centro de Convenciones Rafain Palace", official_name:"Centro de Convenções Rafain", google_maps_name:"Rafain Palace Hotel & Convention Center", place_type:"event_center", city:"Foz do Iguaçu", country:"Brasil", tourist_relevance_score:8 },
  ];
  for (const r of data) {
    try {
      await getDbv().execute({
        sql: "INSERT OR IGNORE INTO places (place_id, canonical_name, official_name, google_maps_name, place_type, city, country, tourist_relevance_score) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
        args: [r.place_id, r.canonical_name, r.official_name, r.google_maps_name, r.place_type, r.city, r.country, r.tourist_relevance_score],
      });
    } catch (e) { console.error("[seedPlaces] error inserting:", r.place_id, e); }
  }
}

async function seedAliases(): Promise<void> {
  const aliasData: { canonical_name: string; alias: string; language: string }[] = [
    { canonical_name:"Gran Meliá Iguazú", alias:"melia", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"meliá", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"gran melia", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"gran meliá", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"melia iguazu", language:"en" },
    { canonical_name:"Gran Meliá Iguazú", alias:"hotel melia", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"hotel meliá", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"gran melia iguazu", language:"en" },
    { canonical_name:"Gran Meliá Iguazú", alias:"gran meliá iguazú", language:"es" },
    { canonical_name:"Gran Meliá Iguazú", alias:"melia cataratas", language:"pt" },
    { canonical_name:"Gran Meliá Iguazú", alias:"melia argentina", language:"pt" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"igr", language:"es" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"aeropuerto igr", language:"es" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"iguazu airport argentina", language:"en" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"argentina airport", language:"en" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"puerto iguazu airport", language:"en" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"aeropuerto de puerto iguazu", language:"es" },
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", alias:"aeroporto igr", language:"pt" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"igu", language:"pt" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"aeroporto foz", language:"pt" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"foz airport", language:"en" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"aeroporto de foz", language:"pt" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"foz do iguacu airport", language:"en" },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", alias:"igu airport", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"doubletree", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"doubletree foz", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"double tree", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"doubletree hilton", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"doubletree hilton foz", language:"en" },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", alias:"hilton foz", language:"es" },
    { canonical_name:"Churrascaria Rafain Show", alias:"rafain", language:"es" },
    { canonical_name:"Churrascaria Rafain Show", alias:"rafain show", language:"es" },
    { canonical_name:"Churrascaria Rafain Show", alias:"churrascaria rafain", language:"pt" },
    { canonical_name:"Churrascaria Rafain Show", alias:"rafain foz", language:"pt" },
    { canonical_name:"Churrascaria Rafain Show", alias:"vamos al rafain", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi suites", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi suites iguazu", language:"en" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi suites iguazú", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi suites hotel", language:"en" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"hotel loi suites", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loi suites de la selva", language:"es" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"loy suites", language:"en" },
    { canonical_name:"Loi Suites Iguazú Hotel", alias:"pick up at loy suites", language:"en" },
    { canonical_name:"Hotel Saint George", alias:"saint george", language:"en" },
    { canonical_name:"Hotel Saint George", alias:"saint george hotel", language:"en" },
    { canonical_name:"Hotel Saint George", alias:"hotel saint george", language:"en" },
    { canonical_name:"Hotel Saint George", alias:"saint jorge", language:"es" },
    { canonical_name:"Hotel Saint George", alias:"san george", language:"es" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"cataratas brasil", language:"es" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"cataratas brasileñas", language:"es" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"cataratas brasileiras", language:"pt" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"cataratas br", language:"es" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"lado brasileiro", language:"pt" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"brazilian falls", language:"en" },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", alias:"falls brazil", language:"en" },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", alias:"cataratas argentina", language:"es" },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", alias:"cataratas argentinas", language:"es" },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", alias:"cataratas ar", language:"es" },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", alias:"lado argentino", language:"es" },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", alias:"argentine falls", language:"en" },
    { canonical_name:"Parque das Aves", alias:"parque de las aves", language:"es" },
    { canonical_name:"Parque das Aves", alias:"parque das aves", language:"pt" },
    { canonical_name:"Parque das Aves", alias:"bird park", language:"en" },
    { canonical_name:"Parque das Aves", alias:"parque aves", language:"es" },
    { canonical_name:"Duty Free Shop Puerto Iguazú", alias:"duty free", language:"en" },
    { canonical_name:"Duty Free Shop Puerto Iguazú", alias:"duty free iguazu", language:"en" },
    { canonical_name:"Duty Free Shop Puerto Iguazú", alias:"duty free puerto iguazu", language:"es" },
    { canonical_name:"Duty Free Shop Puerto Iguazú", alias:"shop libre de impuestos", language:"es" },
    { canonical_name:"Duty Free Shop Puerto Iguazú", alias:"duty free ar", language:"es" },
    { canonical_name:"Represa de Itaipú Binacional", alias:"itaipu", language:"es" },
    { canonical_name:"Represa de Itaipú Binacional", alias:"represa de itaipu", language:"pt" },
    { canonical_name:"Represa de Itaipú Binacional", alias:"itaipu dam", language:"en" },
    { canonical_name:"Represa de Itaipú Binacional", alias:"itaipu binacional", language:"pt" },
    { canonical_name:"Saltos del Monday", alias:"saltos del monday", language:"es" },
    { canonical_name:"Saltos del Monday", alias:"monday falls", language:"en" },
    { canonical_name:"Saltos del Monday", alias:"saltos monday", language:"es" },
    { canonical_name:"Shopping del Este", alias:"shopping del este", language:"es" },
    { canonical_name:"Shopping del Este", alias:"compras paraguay", language:"es" },
    { canonical_name:"Shopping del Este", alias:"compras cde", language:"es" },
    { canonical_name:"Shopping China Importados", alias:"shopping china", language:"es" },
    { canonical_name:"Shopping China Importados", alias:"china paraguay", language:"es" },
    { canonical_name:"Shopping China Importados", alias:"china cde", language:"es" },
    { canonical_name:"Cellshop Importados", alias:"cellshop", language:"en" },
    { canonical_name:"Cellshop Importados", alias:"cell shop", language:"en" },
    { canonical_name:"Cellshop Importados", alias:"cellshop paraguay", language:"en" },
    { canonical_name:"Cellshop Importados", alias:"cellshop cde", language:"es" },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", alias:"belmond", language:"en" },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", alias:"belmond hotel", language:"en" },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", alias:"belmond cataratas", language:"pt" },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", alias:"das cataratas", language:"pt" },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", alias:"hotel das cataratas", language:"pt" },
    { canonical_name:"Mabu Thermas Grand Resort", alias:"mabu", language:"pt" },
    { canonical_name:"Mabu Thermas Grand Resort", alias:"mabu thermas", language:"pt" },
    { canonical_name:"Mabu Thermas Grand Resort", alias:"mabu resort", language:"en" },
    { canonical_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", alias:"bourbon", language:"pt" },
    { canonical_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", alias:"bourbon cataratas", language:"pt" },
    { canonical_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", alias:"bourbon resort", language:"en" },
    { canonical_name:"Iguazu Grand Resort Spa & Casino", alias:"iguazu grand", language:"en" },
    { canonical_name:"Iguazu Grand Resort Spa & Casino", alias:"iguazú grand", language:"es" },
    { canonical_name:"Hotel Bella Italia", alias:"bella italia", language:"pt" },
    { canonical_name:"Hotel Bella Italia", alias:"hotel bella italia", language:"pt" },
    { canonical_name:"Mercure Iguazu Hotel Iru", alias:"mercure", language:"es" },
    { canonical_name:"Mercure Iguazu Hotel Iru", alias:"mercure iguazu", language:"en" },
    { canonical_name:"Mercure Iguazu Hotel Iru", alias:"mercure iru", language:"es" },
    { canonical_name:"O2 Hotel Iguazú", alias:"o2", language:"es" },
    { canonical_name:"O2 Hotel Iguazú", alias:"o2 hotel", language:"en" },
    { canonical_name:"O2 Hotel Iguazú", alias:"o2 iguazu", language:"en" },
    { canonical_name:"Amérian Portal del Iguazú Hotel", alias:"amerian", language:"es" },
    { canonical_name:"Amérian Portal del Iguazú Hotel", alias:"amérian", language:"es" },
    { canonical_name:"Amérian Portal del Iguazú Hotel", alias:"amerian portal", language:"es" },
    { canonical_name:"Falls Iguazú Hotel & Spa", alias:"falls hotel", language:"en" },
    { canonical_name:"Falls Iguazú Hotel & Spa", alias:"falls iguazu", language:"en" },
    { canonical_name:"Panoramic Grand Hotel", alias:"panoramic", language:"es" },
    { canonical_name:"Panoramic Grand Hotel", alias:"panoramic grand", language:"en" },
    { canonical_name:"Hito Tres Fronteras - Argentina", alias:"hito", language:"es" },
    { canonical_name:"Hito Tres Fronteras - Argentina", alias:"hito de las tres fronteras", language:"es" },
    { canonical_name:"Hito Tres Fronteras - Argentina", alias:"hito ar", language:"es" },
    { canonical_name:"Marco das Três Fronteiras - Brasil", alias:"marco", language:"pt" },
    { canonical_name:"Marco das Três Fronteiras - Brasil", alias:"marco das tres fronteiras", language:"pt" },
    { canonical_name:"Yup Star Foz - Rueda Gigante", alias:"rueda gigante", language:"es" },
    { canonical_name:"Yup Star Foz - Rueda Gigante", alias:"yup star", language:"en" },
    { canonical_name:"La Feirinha de Puerto Iguazú", alias:"la feirinha", language:"es" },
    { canonical_name:"La Feirinha de Puerto Iguazú", alias:"feirinha", language:"pt" },
    { canonical_name:"Minas de Wanda", alias:"wanda", language:"es" },
    { canonical_name:"Minas de Wanda", alias:"minas de wanda", language:"es" },
    { canonical_name:"Ruinas de San Ignacio Miní", alias:"san ignacio", language:"es" },
    { canonical_name:"Ruinas de San Ignacio Miní", alias:"ruinas de san ignacio", language:"es" },
    { canonical_name:"Represa de Itaipú Binacional Paraguay", alias:"itaipu paraguay", language:"es" },
    { canonical_name:"Templo Budista Chen Tien", alias:"templo budista", language:"es" },
    { canonical_name:"La Aripuca", alias:"aripuca", language:"es" },
    { canonical_name:"La Aripuca", alias:"la aripuca", language:"es" },
    { canonical_name:"Güirá Oga", alias:"guira oga", language:"es" },
    { canonical_name:"Icebar Iguazú", alias:"icebar", language:"en" },
    { canonical_name:"Icebar Iguazú", alias:"bar de hielo", language:"es" },
    { canonical_name:"Shopping Paris", alias:"shopping paris", language:"es" },
    { canonical_name:"SAX Department Store", alias:"sax", language:"en" },
    { canonical_name:"SAX Department Store", alias:"sax paraguay", language:"en" },
    { canonical_name:"Shopping Monalisa", alias:"monalisa", language:"es" },
    { canonical_name:"Casa Nissei", alias:"nissei", language:"es" },
    { canonical_name:"Hotel Casino Acaray", alias:"casino acaray", language:"es" },
    { canonical_name:"Hotel Casino Acaray", alias:"acaray hotel", language:"es" },
    { canonical_name:"Rio Hotel by Bourbon Ciudad del Este", alias:"rio bourbon", language:"pt" },
    { canonical_name:"Rio Hotel by Bourbon Ciudad del Este", alias:"rio hotel cde", language:"es" },
  ];
  const nameToId = new Map<string, string>();
  const places = await getDbv().execute("SELECT place_id, canonical_name FROM places");
  for (const row of places.rows as any[]) {
    nameToId.set(row.canonical_name, row.place_id);
  }
  for (const a of aliasData) {
    const pid = nameToId.get(a.canonical_name);
    if (!pid) { console.error("[seedAliases] place_id not found for canonical_name:", a.canonical_name); continue; }
    try {
      await getDbv().execute({
        sql: "INSERT OR IGNORE INTO aliases (place_id, alias, language) VALUES (?, ?, ?)",
        args: [pid, a.alias, a.language],
      });
    } catch (e) { console.error("[seedAliases] error inserting:", a, e); }
  }
}

async function seedTransferPriority(): Promise<void> {
  const priorityData: { canonical_name: string; priority: number }[] = [
    { canonical_name:"Aeropuerto Internacional Cataratas del Iguazú", priority:1 },
    { canonical_name:"Aeroporto Internacional de Foz do Iguaçu", priority:1 },
    { canonical_name:"Parque Nacional Iguazú - Cataratas Argentinas", priority:1 },
    { canonical_name:"Parque Nacional do Iguaçu - Cataratas Brasileñas", priority:1 },
    { canonical_name:"Gran Meliá Iguazú", priority:1 },
    { canonical_name:"Hotel das Cataratas, A Belmond Hotel", priority:1 },
    { canonical_name:"Shopping del Este", priority:1 },
    { canonical_name:"Shopping China Importados", priority:1 },
    { canonical_name:"Cellshop Importados", priority:1 },
    { canonical_name:"Duty Free Shop Puerto Iguazú", priority:1 },
    { canonical_name:"Loi Suites Iguazú Hotel", priority:2 },
    { canonical_name:"Iguazu Grand Resort Spa & Casino", priority:2 },
    { canonical_name:"Hotel Saint George", priority:2 },
    { canonical_name:"Terminal de Ómnibus de Puerto Iguazú", priority:2 },
    { canonical_name:"Terminal Rodoviário de Foz do Iguaçu", priority:2 },
    { canonical_name:"Parque das Aves", priority:2 },
    { canonical_name:"Represa de Itaipú Binacional", priority:2 },
    { canonical_name:"Amérian Portal del Iguazú Hotel", priority:2 },
    { canonical_name:"Panoramic Grand Hotel", priority:2 },
    { canonical_name:"Iguazú Jungle Lodge", priority:2 },
    { canonical_name:"Mercure Iguazu Hotel Iru", priority:2 },
    { canonical_name:"Falls Iguazú Hotel & Spa", priority:2 },
    { canonical_name:"DoubleTree by Hilton Foz do Iguaçu", priority:2 },
    { canonical_name:"Mabu Thermas Grand Resort", priority:2 },
    { canonical_name:"Recanto Cataratas Thermas Resort & Convention", priority:2 },
    { canonical_name:"Bourbon Thermas Eco Resort Cataratas do Iguaçu", priority:2 },
    { canonical_name:"JL Hotel by Bourbon", priority:2 },
    { canonical_name:"Casino Iguazú", priority:2 },
    { canonical_name:"Aduana Argentina-Brasil (Puente Tancredo Neves)", priority:2 },
    { canonical_name:"Aduana Brasil-Argentina (Ponte Tancredo Neves)", priority:2 },
    { canonical_name:"Aduana Brasil-Paraguay (Ponte da Amizade)", priority:2 },
    { canonical_name:"Aduana Paraguay-Brasil (Puente de la Amistad)", priority:2 },
    { canonical_name:"Aeropuerto Internacional Guaraní", priority:3 },
    { canonical_name:"Terminal de Ómnibus de Ciudad del Este", priority:3 },
    { canonical_name:"Hito Tres Fronteras - Argentina", priority:3 },
    { canonical_name:"Marco das Três Fronteiras - Brasil", priority:3 },
    { canonical_name:"Saltos del Monday", priority:3 },
    { canonical_name:"Templo Budista Chen Tien", priority:3 },
    { canonical_name:"La Aripuca", priority:3 },
    { canonical_name:"Güirá Oga", priority:3 },
    { canonical_name:"Icebar Iguazú", priority:3 },
    { canonical_name:"Minas de Wanda", priority:3 },
    { canonical_name:"Yup Star Foz - Rueda Gigante", priority:3 },
    { canonical_name:"Dreams Park Show", priority:3 },
    { canonical_name:"Catuaí Palladium Shopping Center", priority:3 },
    { canonical_name:"Cataratas JL Shopping", priority:3 },
    { canonical_name:"Shopping Paris", priority:3 },
    { canonical_name:"SAX Department Store", priority:3 },
    { canonical_name:"Shopping Monalisa", priority:3 },
    { canonical_name:"Casa Nissei", priority:3 },
    { canonical_name:"Sanma Hotel", priority:3 },
    { canonical_name:"Tarobá Hotel", priority:3 },
    { canonical_name:"Viale Cataratas Hotel & Eventos", priority:3 },
    { canonical_name:"Rafain Palace Hotel & Convention Center", priority:3 },
    { canonical_name:"Churrascaria Rafain Show", priority:3 },
    { canonical_name:"La Reserva Virgin Lodge", priority:3 },
    { canonical_name:"Guaminí Misión Hotel", priority:3 },
    { canonical_name:"Selvaje Lodge Iguazu", priority:3 },
    { canonical_name:"Raíces Esturión Hotel", priority:3 },
    { canonical_name:"Grand Crucero Iguazú Hotel", priority:3 },
    { canonical_name:"Hotel Casino Acaray", priority:3 },
    { canonical_name:"Ruinas de San Ignacio Miní", priority:4 },
    { canonical_name:"Saltos del Moconá", priority:4 },
    { canonical_name:"Hito Tres Fronteras - Paraguay", priority:4 },
    { canonical_name:"Tucan Hostel", priority:4 },
    { canonical_name:"Concept Design Hostel & Suites", priority:4 },
    { canonical_name:"Tetris Container Hostel", priority:4 },
    { canonical_name:"Hostel Wanderlust", priority:4 },
    { canonical_name:"Overo Lodge & Selva", priority:4 },
    { canonical_name:"Luz Hotel by Castelo Itaipava", priority:4 },
    { canonical_name:"Hotel Bella Italia", priority:4 },
    { canonical_name:"Mirante Hotel", priority:4 },
    { canonical_name:"Wyndham Foz do Iguaçu", priority:4 },
    { canonical_name:"Wyndham Golden Foz Suites", priority:4 },
    { canonical_name:"Hotel Colonial Iguaçu", priority:4 },
    { canonical_name:"Complexo Eco Cataratas Resort by SJ", priority:4 },
    { canonical_name:"La Cantera Jungle Lodge", priority:4 },
    { canonical_name:"Yvy Hotel de Selva", priority:4 },
    { canonical_name:"Palma Real Posada", priority:4 },
    { canonical_name:"Marcopolo Suites Iguazu", priority:4 },
    { canonical_name:"Pirayu Lodge Resort", priority:4 },
    { canonical_name:"Howard Johnson Plaza Ciudad del Este", priority:4 },
    { canonical_name:"Rio Hotel by Bourbon Ciudad del Este", priority:4 },
    { canonical_name:"Convair Hotel", priority:4 },
    { canonical_name:"Puerto de Puerto Iguazú", priority:4 },
    { canonical_name:"Porto Meira", priority:4 },
    { canonical_name:"Puerto de Presidente Franco", priority:4 },
    { canonical_name:"Zona 600 Hectáreas", priority:4 },
    { canonical_name:"Centro de Puerto Iguazú", priority:4 },
    { canonical_name:"Corredor Turístico Avenida das Cataratas", priority:4 },
    { canonical_name:"Centro de Foz do Iguaçu", priority:4 },
    { canonical_name:"Microcentro de Ciudad del Este", priority:4 },
    { canonical_name:"Centro de Convenciones Rafain Palace", priority:4 },
  ];
  const nameToId = new Map<string, string>();
  const places = await getDbv().execute("SELECT place_id, canonical_name FROM places");
  for (const row of places.rows as any[]) {
    nameToId.set(row.canonical_name, row.place_id);
  }
  for (const p of priorityData) {
    const pid = nameToId.get(p.canonical_name);
    if (!pid) { console.error("[seedTransferPriority] place_id not found for canonical_name:", p.canonical_name); continue; }
    try {
      await getDbv().execute({
        sql: "INSERT OR IGNORE INTO transfer_priority (place_id, priority) VALUES (?, ?)",
        args: [pid, p.priority],
      });
    } catch (e) { console.error("[seedTransferPriority] error inserting:", p, e); }
  }
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

// ========== PLACES CATALOG QUERIES ==========

export async function getPlaceById(placeId: string): Promise<PlaceRow | null> {
  return queryOne<PlaceRow>("SELECT * FROM places WHERE place_id = ?", [placeId]);
}

export async function getAliasesForPlace(placeId: string): Promise<AliasRow[]> {
  return query<AliasRow>("SELECT * FROM aliases WHERE place_id = ?", [placeId]);
}

export async function getPlacesByType(placeType: string): Promise<PlaceRow[]> {
  return query<PlaceRow>("SELECT * FROM places WHERE place_type = ? AND active_status = 'active'", [placeType]);
}

export async function resolvePlaceByAlias(text: string): Promise<PlaceResolution | null> {
  if (!text) return null;
  const lower = text.toLowerCase().trim();
  const aliasRow = await queryOne<AliasRow & { canonical_name?: string; place_type?: string }>(
    `SELECT a.*, p.canonical_name, p.place_type
     FROM aliases a
     JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) = ?
     LIMIT 1`,
    [lower]
  );
  if (!aliasRow) return null;
  const place = await getPlaceById(aliasRow.place_id);
  if (!place) return null;
  const aliases = await getAliasesForPlace(aliasRow.place_id);
  const priorityRow = await queryOne<TransferPriorityRow>(
    "SELECT * FROM transfer_priority WHERE place_id = ?",
    [aliasRow.place_id]
  );
  return {
    place,
    aliases,
    priority: priorityRow?.priority ?? null,
  };
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

export function getDbInstance(): LibSqlClient {
  return getDbv();
}