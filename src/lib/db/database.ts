import type {
  ConversationRow,
  MessageRow,
  TripRow,
  DriverRow,
  DriverCodeRow,
  ClientPreferredDriverRow,
  ReservationSlotRow,
  TariffRow,
  LeadRow,
  ChatSessionRow,
  OpportunityRuleRow,
  PackagePriceRow,
} from "./types";

import { getDb, ensureSchema, type DbExecutor } from "./core/connection";
import { query, queryOne, levenshtein } from "./core/helpers";
import { validateReaderConsistency, reportTripPhaseNullCount } from "./domains/trips";
import { getConnectionValue } from "./domains/connection-state";
import { log } from "@/lib/utils/logger";

// ========== CONVERSATIONS ==========

export async function getOrCreateConversation(phone: string, name?: string): Promise<ConversationRow> {
  const existing = await queryOne<ConversationRow>("SELECT * FROM conversations WHERE phone = ?", [phone]);
  if (existing) {
    await updateConversationActivity(phone);
    return existing;
  }

  const info = await getDb().execute({ sql: "INSERT INTO conversations (phone, name, last_message_at) VALUES (?, ?, unixepoch())", args: [phone, name || null] });
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

async function updateConversationActivity(phone: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE conversations SET last_message_at = unixepoch() WHERE phone = ?", args: [phone] });
}

export async function setConversationMode(conversationId: number, mode: 'AI' | 'HUMAN'): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE conversations SET mode = ? WHERE id = ?", args: [mode, conversationId] });
}

export async function takeConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE conversations SET taken_by_human = 1, human_operator_phone = ? WHERE id = ?", args: ['+543757613215', conversationId] });
}

export async function releaseConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE conversations SET taken_by_human = 0, human_operator_phone = NULL WHERE id = ?", args: [conversationId] });
}

export async function deleteConversation(conversationId: number): Promise<void> {
  await ensureSchema();
  await getDb().batch([
    { sql: "DELETE FROM messages WHERE conversation_id = ?", args: [conversationId] },
    { sql: "DELETE FROM conversations WHERE id = ?", args: [conversationId] },
  ]);
}

export async function setConversationTrip(conversationId: number, tripId: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE conversations SET trip_id = ? WHERE id = ?", args: [tripId, conversationId] });
}

// setConversationTripStatus eliminado — 0 callers (verificado Phase G).
// conversations.trip_status sigue existiendo en la tabla (DEFAULT 'consulta') y
// es candidata a DROP COLUMN.



export async function insertMessage(conversationId: number, role: string, content: string, executor?: DbExecutor): Promise<number> {
  const db = executor ?? getDb();
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
  await getDb().execute({ sql: "DELETE FROM messages WHERE conversation_id = ?", args: [convId] });
}

// ========== LEADS ==========

export async function getLeadByConv(convId: number): Promise<LeadRow | null> {
  return queryOne<LeadRow>("SELECT * FROM leads WHERE conv_id = ?", [convId]);
}

export async function takeLead(convId: number, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE leads SET taken_by = ? WHERE conv_id = ? AND taken_by IS NULL",
    args: [driverPhone, convId],
  });
}

// ========== DRIVERS ==========

export async function getMaxFleetCapacity(): Promise<number | null> {
  await ensureSchema();
  const rs = await getDb().execute({
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

export async function getPrincipalDriver(): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE is_principal = 1 LIMIT 1");
}

export async function getDriverByPhone(phone: string): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE phone = ?", [phone]);
}

export async function getPrincipal2Driver(): Promise<DriverRow | null> {
  return queryOne<DriverRow>("SELECT * FROM drivers WHERE is_principal2 = 1 LIMIT 1");
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
      await getDb().execute({
        sql: "INSERT INTO driver_codes (code, name, created_by, phone) VALUES (?, ?, ?, ?)",
        args: [code.toLowerCase().trim(), name.trim(), createdBy, fullPhone],
      });
      await getDb().execute({
        sql: `INSERT OR IGNORE INTO drivers (driver_id, phone, name, active, car_type, car_capacity, color, plate, country, tier, shift, payment_method, idiom, status)
            VALUES (?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending')`,
        args: [`driver_${Date.now()}`, fullPhone, name.trim(),
               opts?.carType || null, opts?.carCapacity || null, opts?.color || null, opts?.plate || null,
               opts?.country || 'AR', opts?.tier || 'normal', opts?.shift || null,
               opts?.paymentMethod || null, opts?.idiom || null],
      });
    } else {
      await getDb().execute({
        sql: "INSERT INTO driver_codes (code, name, created_by) VALUES (?, ?, ?)",
        args: [code.toLowerCase().trim(), name.trim(), createdBy],
      });
    }
    return { ok: true };
  } catch (e) {
    log.error("[createDriverCode] error:", e);
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
  await getDb().execute({
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
    await getDb().execute({
      sql: "UPDATE drivers SET status = 'inactive' WHERE phone = ?",
      args: [entry.phone],
    });
  }
  return true;
}

export async function getDriverCodeByCode(code: string): Promise<DriverCodeRow | null> {
  return queryOne<DriverCodeRow>("SELECT * FROM driver_codes WHERE code = ?", [code.toLowerCase().trim()]);
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
  await getDb().execute({
    sql: `UPDATE drivers SET offers_received = COALESCE(offers_received, 0) + 1 WHERE phone = ?`,
    args: [driverPhone],
  });
  await recalcAcceptanceScore(driverPhone);
}

export async function incrementOfferAccepted(driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `UPDATE drivers SET offers_accepted = COALESCE(offers_accepted, 0) + 1 WHERE phone = ?`,
    args: [driverPhone],
  });
  await recalcAcceptanceScore(driverPhone);
}

async function recalcAcceptanceScore(driverPhone: string): Promise<void> {
  await getDb().execute({
    sql: `UPDATE drivers SET acceptance_score = ROUND(
      CAST(COALESCE(offers_accepted, 0) AS REAL) /
      CAST(CASE WHEN COALESCE(offers_received, 0) = 0 THEN 1 ELSE offers_received END AS REAL) * 100
    ) WHERE phone = ?`,
    args: [driverPhone],
  });
}

export async function updateDriverTier(phone: string, tier: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE drivers SET tier = ? WHERE phone = ?",
    args: [tier, phone],
  });
}

export async function updateDriverMinPayout(phone: string, minPayout: number | null): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE drivers SET min_payout = ? WHERE phone = ?",
    args: [minPayout, phone],
  });
}

export async function updateDriverLanguages(phone: string, languages: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE drivers SET languages = ? WHERE phone = ?",
    args: [languages, phone],
  });
}

export async function updateDriverGuide(phone: string, isGuide: boolean): Promise<void> {
  await ensureSchema();
  await getDb().execute({
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
  await getDb().execute({
    sql: `UPDATE drivers SET ${sets.join(", ")} WHERE phone = ?`,
    args,
  });
  return { ok: true };
}

export async function getAvailableDrivers(filters?: { minCapacity?: number; country?: string; strictMinCapacity?: boolean }): Promise<DriverRow[]> {
  const cutoff = Math.floor(Date.now() / 1000) - 86400;
  const capacityFilter = filters?.minCapacity ?? null;
  const strictFilter = filters?.strictMinCapacity ? capacityFilter : null;
  const relaxedFilter = !filters?.strictMinCapacity ? capacityFilter : null;
  const countryFilter = filters?.country ?? null;

  return query<DriverRow>(`SELECT d.* FROM drivers d
    INNER JOIN conversations c ON c.phone = d.phone
    WHERE d.status = 'active'
      AND c.last_message_at > ?
      AND (? IS NULL OR (d.car_capacity IS NOT NULL AND d.car_capacity >= ?))
      AND (? IS NULL OR d.car_capacity IS NULL OR d.car_capacity >= ?)
      AND (? IS NULL OR d.country IS NULL OR d.country = ?)`,
    [cutoff, strictFilter, strictFilter, relaxedFilter, relaxedFilter, countryFilter, countryFilter]);
}

// ========== PREFERRED DRIVERS ==========

export async function getClientPreferredDriver(clientPhone: string): Promise<ClientPreferredDriverRow | null> {
  return queryOne<ClientPreferredDriverRow>("SELECT * FROM client_preferred_drivers WHERE client_phone = ?", [clientPhone]);
}

export async function setClientPreferredDriver(clientPhone: string, driverPhone: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO client_preferred_drivers (client_phone, preferred_driver_phone)
          VALUES (?, ?)
          ON CONFLICT(client_phone) DO UPDATE SET
            preferred_driver_phone = excluded.preferred_driver_phone,
            updated_at = unixepoch()`,
    args: [clientPhone, driverPhone],
  });
}

// ========== WORKFLOWS ==========
//
// La tabla `workflows` quedó sin callers activos (verificado Phase G).
// La fuente única de verdad del workflow conversacional es ahora
// `chat_sessions.conversational_state` + `dispatch_state`.
//
// Las funciones de la API legacy (`getDispatchWorkflow`, `advanceWorkflowState`,
// `closeWorkflow`, `assignWorkflowAtomic`, `deleteWorkflow`,
// `getExpiredWorkflowsByState`) ya no existen. Toda lectura/escritura
// de estado de workflow pasa por `@/lib/services/workflow/slot-workflow` y
// `@/lib/services/dispatch/dispatch-workflow`.
//
// La tabla se conserva (con su migración `workflows_recreate`) sólo para
// preservar datos históricos. Candidata a DROP.

// ========== PACKAGE PRICES ==========

export async function setPackagePrice(driverPhone: string, packageType: string, minPayout: number): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: `INSERT INTO package_prices (driver_phone, package_type, min_payout)
          VALUES (?, ?, ?)
          ON CONFLICT(driver_phone, package_type) DO UPDATE SET min_payout = excluded.min_payout`,
    args: [driverPhone, packageType, minPayout],
  });
}

export async function getPackagePrices(phones: string[], packageType: string): Promise<Map<string, PackagePriceRow>> {
  if (phones.length === 0) return new Map();
  const placeholders = phones.map(() => "?").join(",");
  const rows = await query<PackagePriceRow>(
    `SELECT * FROM package_prices WHERE driver_phone IN (${placeholders}) AND package_type = ?`,
    [...phones, packageType],
  );
  const map = new Map<string, PackagePriceRow>();
  for (const row of rows) {
    map.set(row.driver_phone, row);
  }
  return map;
}

// ========== SURVEY ==========

export async function getTripsPendingSurvey(): Promise<TripRow[]> {
  const cutoff = Math.floor(Date.now() / 1000);
  const trips = await query<TripRow>("SELECT * FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?) ORDER BY confirmed_at ASC LIMIT 10", [cutoff]);
  // Phase-based primary with reconfirmado_24hs exclusion; legacy + phase COUNT for cross-validation.
  const legacyRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?)",
    [cutoff],
  );
  const phaseRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (survey_sent IS NULL OR survey_sent = 0) AND (confirmed_at IS NOT NULL AND confirmed_at < ?)",
    [cutoff],
  );
  await validateReaderConsistency(
    "getTripsPendingSurvey",
    Number(legacyRow?.cnt ?? 0),
    Number(phaseRow?.cnt ?? 0),
    ["ASSIGNED", "CLOSED"]
  );
  await reportTripPhaseNullCount("getTripsPendingSurvey");
  return trips;
}

export async function markSurveySent(tripId: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE trips SET survey_sent = 1 WHERE trip_id = ?", args: [tripId] });
}

export async function setSurveyResponse(tripId: string, response: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE trips SET post_trip_response = ? WHERE trip_id = ?", args: [response, tripId] });
}

// ========== HOUSEKEEPING / CLEANUP ==========

export async function getTripsWithMissingCommission(cutoff: number): Promise<TripRow[]> {
  return query<TripRow>(
    "SELECT * FROM trips WHERE status = 'completado' AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    [cutoff],
  );
}

export async function getStaleWorkflows(cutoff: number): Promise<{ conversation_id: number }[]> {
  const rs = await getDb().execute({
    sql: `SELECT c.id as conversation_id
          FROM chat_sessions cs
          JOIN conversations c ON c.phone = cs.phone
          WHERE cs.updated_at < ?
            AND cs.dispatch_state IN ('nivel_1', 'nivel_2', 'nivel_3', 'waiting_driver')`,
    args: [cutoff],
  });
  return rs.rows as unknown as { conversation_id: number }[];
}

/**
 * Retorna leads estancados — conversaciones donde el cliente dejó de responder
 * en estados que requieren input del usuario (idle con slots, collecting_slots,
 * slot_confirmation, awaiting_passenger) y no tienen un trip activo.
 * Usado por checkReengagement() para re-engagement automático.
 */
export async function getStaleLeadConversations(
  cutoff: number
): Promise<{ phone: string; slots: string | null; conversational_state: string | null }[]> {
  const rs = await getDb().execute({
    sql: `SELECT cs.phone, cs.slots, cs.conversational_state
          FROM chat_sessions cs
          LEFT JOIN conversations c ON c.phone = cs.phone
          WHERE cs.updated_at < ?
            AND cs.conversational_state IN ('idle', 'collecting_slots', 'slot_confirmation', 'awaiting_passenger')
            AND (c.trip_id IS NULL OR c.id IS NULL)
            AND cs.slots IS NOT NULL
          ORDER BY cs.updated_at ASC`,
    args: [cutoff],
  });
  return rs.rows as unknown as { phone: string; slots: string | null; conversational_state: string | null }[];
}

export async function debugGetActiveDriversWithConversationStatus(cutoff: number): Promise<void> {
  await getDb().execute({
    sql: `SELECT d.phone, d.name, d.status, d.tier, d.country,
      c.phone as conv_phone, c.last_message_at,
      CASE WHEN c.phone IS NULL THEN 'no_join'
           WHEN c.last_message_at IS NULL THEN 'no_msg'
           WHEN c.last_message_at <= ? THEN 'expired'
           ELSE 'ok' END as conv_status
      FROM drivers d
      LEFT JOIN conversations c ON c.phone = d.phone
      WHERE d.status = 'active'`,
    args: [cutoff],
  });
}

// ========== RESERVATION SLOTS ==========

export async function createReservationSlot(dayOfWeek: number, startTime: string, endTime: string, label?: string, maxBookings = 1): Promise<{ ok: boolean; error?: string }> {
  await ensureSchema();
  try {
    await getDb().execute({
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

export async function deleteReservationSlot(id: number): Promise<boolean> {
  await ensureSchema();
  const rs = await getDb().execute({
    sql: "DELETE FROM reservation_slots WHERE id = ?",
    args: [id],
  });
  return rs.rowsAffected > 0;
}

// ========== TARIFFS ==========

export async function getTariffById(tariffId: number): Promise<{ driver_price_4p: number | null; driver_price_6p: number | null } | null> {
  return queryOne<{ driver_price_4p: number | null; driver_price_6p: number | null }>(
    "SELECT driver_price_4p, driver_price_6p FROM tariffs WHERE id = ?",
    [tariffId]
  );
}

export async function searchTariffs(text: string): Promise<TariffRow[]> {
  const q = `%${text.toLowerCase()}%`;
  return query<TariffRow>("SELECT * FROM tariffs WHERE LOWER(origin) LIKE ? OR LOWER(destination) LIKE ?", [q, q]);
}

export async function resolveAlias(text: string): Promise<{ resolved: boolean; names: string[] }> {
  if (!text) return { resolved: false, names: [] };
  const lower = text.toLowerCase().trim();

  // 1. Exact match: aliases JOIN places (replaces legacy alias_lookup)
  const direct = await query<{ canonical_name: string; place_id: string }>(
    `SELECT DISTINCT p.canonical_name, p.place_id
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) = ? AND p.active_status = 'active'
     LIMIT 5`,
    [lower]
  );
  if (direct.length > 0) return { resolved: true, names: [...new Set(direct.map(r => r.canonical_name))] };

  // 2. Fuzzy fallback — Levenshtein ≤ 3 against all unique aliases
  const all = await query<{ alias: string; canonical_name: string; place_id: string }>(
    `SELECT DISTINCT a.alias, p.canonical_name, p.place_id
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE p.active_status = 'active'`
  );
  let bestDist = Infinity;
  let bestAlias: string | undefined;
  let bestCanonical: string | undefined;
  let bestPlaceId: string | undefined;
  for (const row of all) {
    const d = levenshtein(lower, row.alias.toLowerCase());
    if (d < bestDist) {
      bestDist = d;
      bestAlias = row.alias;
      bestCanonical = row.canonical_name;
      bestPlaceId = row.place_id;
    }
  }
  if (bestDist <= 3 && bestCanonical && bestPlaceId && bestAlias) {
    // Auto-insert the new alias so future requests get exact match
    const exists = await query<{ id: number }>(
      "SELECT id FROM aliases WHERE place_id = ? AND alias = ? AND language = 'es'",
      [bestPlaceId, lower]
    );
    if (exists.length === 0) {
      await getDb().execute({
        sql: "INSERT INTO aliases (place_id, alias, language) VALUES (?, ?, 'es')",
        args: [bestPlaceId, lower],
      });
    }
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
  conversationalState?: string,
  clarifyField?: string,
  slotStates?: string | null,
): Promise<void> {
  await ensureSchema();

  // ── TYPE GUARD: slots must be an object, not a string ──
  // If a double-serialized string arrives (e.g. '"{}"' instead of {}),
  // recover by parsing it back. This prevents "Cannot create property"
  // crashes downstream and keeps the DB healthy.
  if (typeof slots === "string") {
    log.error("[SLOT_TYPE_GUARD] upsertChatSession received string instead of object", { phone: phone.slice(-4), value: (slots as string).substring(0, 80) });
    try {
      const recovered = JSON.parse(slots as string);
      slots = typeof recovered === "object" && recovered !== null && !Array.isArray(recovered) ? recovered : {};
    } catch {
      slots = {};
    }
  }

  const existing = await getChatSession(phone);
  const now = Math.floor(Date.now() / 1000);
  if (existing) {
    let oldSlots: Record<string, any> = {};
    try { oldSlots = JSON.parse(existing.slots || "{}"); } catch { oldSlots = {}; }
    const merged = { ...oldSlots, ...slots };
    let baseConfidence: Record<string, number> = {};
    try { baseConfidence = JSON.parse(existing.confidence || "{}"); } catch { baseConfidence = {}; }
    const mergedConfidence = confidence
      ? { ...baseConfidence, ...confidence }
      : existing.confidence;
    const mergedSlotStates = slotStates ?? existing.slot_states;
    await getDb().execute({
      sql: `UPDATE chat_sessions SET slots = ?, confidence = ?, slot_states = ?, extraction_count = extraction_count + 1, last_extracted_at = ?, conversational_state = ?, clarify_field = ?, updated_at = ? WHERE phone = ?`,
      args: [JSON.stringify(merged), JSON.stringify(mergedConfidence), mergedSlotStates, now, conversationalState || existing.conversational_state || "idle", clarifyField || existing.clarify_field || null, now, phone],
    });
  } else {
    await getDb().execute({
      sql: `INSERT INTO chat_sessions (phone, slots, confidence, slot_states, extraction_count, last_extracted_at, conversational_state, clarify_field, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?, ?, ?)`,
      args: [phone, JSON.stringify(slots), JSON.stringify(confidence || {}), slotStates ?? null, now, conversationalState || "idle", clarifyField || null, now],
    });
  }
}

export async function updateChatSessionConversation(phone: string, conversationalState: string, clarifyField?: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE chat_sessions SET conversational_state = ?, clarify_field = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [conversationalState, clarifyField || null, phone],
  });
}

/** Update ONLY the slots JSON column (does not touch confidence, state, etc.).
 *  Used by ambiguity-handler to store resolved place selections. */
export async function updateChatSessionSlots(phone: string, slots: Record<string, any>): Promise<void> {
  await ensureSchema();
  // ── TYPE GUARD: slots must be an object ──
  if (typeof slots === "string") {
    log.error("[SLOT_TYPE_GUARD] updateChatSessionSlots received string instead of object", { phone: phone.slice(-4), value: (slots as string).substring(0, 80) });
    try {
      const recovered = JSON.parse(slots as string);
      slots = typeof recovered === "object" && recovered !== null && !Array.isArray(recovered) ? recovered : {};
    } catch {
      slots = {};
    }
  }
  await getDb().execute({
    sql: "UPDATE chat_sessions SET slots = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [JSON.stringify(slots), phone],
  });
}

/** Reset destructivo de sesión completa (DELETE).
 *  Reservado para: expiración, limpieza, abandono definitivo.
 *  NO usar como transición normal de workflow.
 *  Preferir setConversationalState(phone, "idle") para reiniciar slot collection. */
export async function resetChatSession(phone: string): Promise<void> {
  await getDb().execute({ sql: "DELETE FROM chat_sessions WHERE phone = ?", args: [phone] });
}

export async function setPendingOpportunity(
  phone: string, pendingData: string,
  executor?: DbExecutor,
): Promise<void> {
  const db = executor ?? getDb();
  await db.execute({
    sql: "UPDATE chat_sessions SET pending_opportunity = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [pendingData, phone],
  });
}

export async function clearPendingOpportunity(phone: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE chat_sessions SET pending_opportunity = NULL, updated_at = unixepoch() WHERE phone = ?",
    args: [phone],
  });
}

export async function setCustomerName(phone: string, name: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "INSERT OR REPLACE INTO connection_state (key, value, updated_at) VALUES (?, ?, unixepoch())",
    args: [`customer_name_${phone}`, name.trim()],
  });
}

export async function getCustomerName(phone: string): Promise<string | null> {
  return getConnectionValue(`customer_name_${phone}`);
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
  const rs = await getDb().execute({
    sql: `INSERT OR IGNORE INTO processed_messages (message_id, phone, message_type, processed_at, payload_hash)
          VALUES (?, ?, ?, unixepoch(), ?)`,
    args: [messageId, phone, messageType, payloadHash],
  });
  return rs.rowsAffected > 0;
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
  const db = executor ?? getDb();
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
  await getDb().execute({
    sql: "UPDATE opportunity_log SET client_response = ?, responded_at = ? WHERE id = ?",
    args: [clientResponse, respondedAt, logId],
  });
}

// ── Transaction helper ──

export async function createTransaction() {
  return getDb().transaction();
}

export { getDb } from "./core/connection";
export { queryOne } from "./core/helpers";
export type { DbExecutor } from "./core/connection";

export {
  getConnectionState,
  setConnectionState,
  getConnectionValue,
  getConnectionValueFlag,
  setConnectionFlag,
  setConnectionValue,
  deleteConnectionKey,
  getConnectionCache,
} from "./domains/connection-state";
export {
  createTrip,
  getTripById,
  getActiveTripByPhone,
  getTripByAssignedDriver,
  updateTripState,
  assignDriverToTrip,
  completeTrip,
  syncTripPhaseFromLegacyStatus,
  getTripPhase,
  getActiveTripsByClient,
  updateTripTariff,
  setCommissionDeclared,
  getTripsByScheduledAtWindow,
  getTripsPendingCloseOut,
  getExpiredTrips,
  getExpiredByState,
  getStaleWorkflowsFromDb,
  assignWorkflowAtomic,
  findTariffRow,
  findTariffByPriority,
} from "./domains/trips";
export {
  getLearningWeight,
  setLearningWeight,
  insertF9AdminCommand,
  insertConversationEvent,
  insertF9Event,
  insertF9ErrorLog,
  insertF9DriftLog,
  insertDecisionLog,
  insertSimulation,
  insertPolicyResult,
  getWinningPolicyVariant,
  getSystemMetricsTotalRevenue,
  insertSystemMetrics,
  countActiveDrivers,
  getAvgConversionRate,
  getAvgEscalationRate,
  insertF4Log,
  insertHousekeepingLog,
  updateChatSessionComprehension,
  setChatSessionEscalationReason,
  countHumanOperators,
  getAllPolicies,
  insertOrIgnorePolicy,
  countActiveConversations,
  cleanupOldLearningRecords,
} from "./domains/learning";
export {
  findPlaceByAlias,
  findPlaceByName,
  getPlaceZone,
} from "./domains/geo";