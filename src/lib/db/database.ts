import type {
  ConversationRow,
  MessageRow,
  TripRow,
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

import { getDbv, ensureSchema, type DbExecutor } from "./core/connection";
import { query, queryOne, levenshtein } from "./core/helpers";
import { validateReaderConsistency, reportTripPhaseNullCount } from "./domains/trips";
import { getConnectionValue } from "./domains/connection-state";

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

// ========== TARIFFS ==========

export async function getTariffById(tariffId: number): Promise<{ base_price_4p: number | null; base_price_6p: number | null } | null> {
  const rs = await getDbv().execute({
    sql: "SELECT base_price_4p, base_price_6p FROM tariffs WHERE id = ?",
    args: [tariffId],
  });
  return (rs.rows[0] as any) ?? null;
}

interface TariffWithPrice extends TariffRow {
  price: number;
}

// DEPRECATED: bypasses tariff-resolver domain boundary
// TODO: migrate all callers to tariff-resolver.resolveTariff()
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

export {
  getConnectionState,
  setConnectionState,
  setConnectionStateBatch,
  getConnectionValue,
  getConnectionValueFlag,
  setConnectionFlag,
  setConnectionValue,
  deleteConnectionKey,
} from "./domains/connection-state";
export {
  createTrip,
  getTripById,
  getActiveTripByPhone,
  getTripByAssignedDriver,
  updateTripState,
  updateTripDiscountExplicit,
  assignDriverToTrip,
  completeTrip,
  syncTripPhaseFromLegacyStatus,
  getTripPhase,
  setTripPhase,
  closeTrip,
  getTripByIdWithDiagnostics,
  validateReaderConsistency,
  reportTripPhaseNullCount,
  getActiveTripsByClient,
  updateTripTariff,
  updateTripScheduledAt,
  updateTripFlight,
  updateTripPassengers,
  updateTripOrigin,
  updateTripDestination,
  updateTripPriceBase,
  updateTripHotel,
  setComisionDeclarada,
  getTripsByScheduledAtWindow,
  getTripsPendingCloseOut,
  getTripsScheduledForDate,
  getUpcomingReservations,
  getExpiredTrips,
} from "./domains/trips";