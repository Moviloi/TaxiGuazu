import { query, queryOne } from "../core/helpers";
import { getDb, ensureSchema, type DbExecutor } from "../core/connection";
import type { TripRow, TripPhase, TripClosureReason, TariffRow, TripGroupRow, TripLegRow, TripEventType, DispatchEventLevel } from "../types";
import { log } from "@/lib/utils/logger";
import { insertDispatchEvent } from "./dispatch-events";

async function getDriverDiscountForTariff(driverPhone: string, tariffId: number): Promise<number | null> {
  const row = await queryOne<{ discount_pct: number }>(
    "SELECT discount_pct FROM driver_discounts WHERE driver_phone = ? AND tariff_id = ? AND active = 1 AND (valid_until IS NULL OR valid_until > unixepoch())",
    [driverPhone, tariffId],
  );
  return row?.discount_pct ?? null;
}

// ========== TRIP EVENTS (audit log) ==========
// Contrato de insertTripEvent:
// - payload: string JSON pre-serializado por el caller (no se valida aquí).
//   Si no es JSON válido, se almacena igual — es responsabilidad del caller
//   garantizar el formato. No hay parsing interno porque el audit log
//   no debe rechazar escrituras por formato de datos.
// - actor: defaults a "system" si no se especifica.
// - executor: opcional. Si se pasa una transacción (DbExecutor), escribe
//   dentro de esa transacción. Si no, usa getDb() (auto-commit).

/**
 * insertTripEvent — escribe un evento de auditoría en trip_events.
 *
 * Contrato:
 * - payload: string JSON pre-serializado por el caller. NO se valida con
 *   JSON.parse() antes de insertar. Si el caller pasa basura, se almacena
 *   igual — el audit log no debe rechazar escrituras por formato inválido.
 *   Es responsabilidad del caller garantizar JSON.stringify() antes de llamar.
 * - actor: defaults a "system" si no se especifica.
 * - executor: opcional. Si se pasa un DbExecutor (ej: transacción), escribe
 *   dentro de ese contexto. Si no, usa getDb() en auto-commit.
 */
export async function insertTripEvent(
  tripId: string,
  eventType: TripEventType,
  payload?: string | null,
  actor?: string,
  executor?: DbExecutor,
): Promise<void> {
  await ensureSchema();
  const db = executor ?? getDb();
  await db.execute({
    sql: "INSERT INTO trip_events (trip_id, event_type, payload, occurred_at, actor) VALUES (?, ?, ?, unixepoch(), ?)",
    args: [tripId, eventType, payload ?? null, actor ?? "system"],
  });
}

// ========== TRIPS ==========

/**
 * createTrip — crea un trip y registra TripCreated en trip_events.
 *
 * GAP-05 (atomicidad parcial): ver cobertura global en la definición de
 * STATUS_TO_TRIP_EVENT. Aquí específicamente: el INSERT de trips y el
 * INSERT de trip_events se hacen secuencialmente sobre el mismo db handle.
 * Con getDb() (default), cada execute() es auto-commit independiente.
 * El executor opcional permite atomicidad REAL — hoy ningún caller lo usa.
 *
 * syncTripPhaseFromLegacyStatus queda fuera — siempre usa getDb()
 * separado (legacy, no se toca).
 */
export async function createTrip(
  tripId: string,
  clientPhone: string,
  origin: string,
  destination: string,
  priceBase?: number,
  passengers?: number,
  scheduledAt?: number,
  flightNumber?: string,
  status?: string,
  executor?: DbExecutor,
): Promise<void> {
  const tripStatus = status || "consulta";
  const db = executor ?? getDb();
  await ensureSchema();
  await db.execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, passengers, status, scheduled_at, flight_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [tripId, clientPhone, origin, destination, priceBase || null, passengers || null, tripStatus, scheduledAt || null, flightNumber || null] });
  await insertTripEvent(
    tripId,
    "TripCreated",
    JSON.stringify({ origin, destination, price: priceBase ?? null, passengers: passengers ?? null, scheduled: scheduledAt ?? null }),
    "system",
    db,
  );
  await syncTripPhaseFromLegacyStatus(tripId, tripStatus);
}

// ── MULTI-RIDE: trip groups + legs ──

export async function createTripGroup(groupId: string, clientPhone: string, totalPrice: number | null, passengers: number | null): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "INSERT INTO trip_groups (id, client_phone, total_price, passengers) VALUES (?, ?, ?, ?)",
    args: [groupId, clientPhone, totalPrice, passengers],
  });
}

export async function insertTripLeg(
  groupId: string,
  seq: number,
  origin: string,
  destination: string,
  price: number | null,
  scheduledAt: number | null,
): Promise<number | bigint> {
  await ensureSchema();
  const rs = await queryOne<{ id: number | bigint }>(
    `INSERT INTO trip_legs (group_id, seq, origin, destination, price, scheduled_at)
     VALUES (?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [groupId, seq, origin, destination, price, scheduledAt],
  );
  return rs?.id ?? 0;
}

export async function getTripGroup(groupId: string): Promise<TripGroupRow | null> {
  return queryOne<TripGroupRow>("SELECT * FROM trip_groups WHERE id = ?", [groupId]);
}

export async function getTripLegsByGroup(groupId: string): Promise<TripLegRow[]> {
  return query<TripLegRow>(
    "SELECT * FROM trip_legs WHERE group_id = ? ORDER BY seq",
    [groupId],
  );
}

export async function updateTripGroupStatus(groupId: string, status: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE trip_groups SET status = ?, updated_at = unixepoch() WHERE id = ?",
    args: [status, groupId],
  });
}

export async function updateTripLegTripId(legId: number, tripId: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE trip_legs SET trip_id = ?, status = 'assigned' WHERE id = ?",
    args: [tripId, legId],
  });
}

export async function getTripById(tripId: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE trip_id = ?", [tripId]);
}

export async function getActiveTripByPhone(clientPhone: string): Promise<TripRow | null> {
  const trip = await queryOne<TripRow>(
    "SELECT * FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL) ORDER BY created_at DESC LIMIT 1",
    [clientPhone]
  );
  const legacyRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado')",
    [clientPhone],
  );
  const phaseRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL)",
    [clientPhone],
  );
  await validateReaderConsistency(
    "getActiveTripByPhone",
    Number(legacyRow?.cnt ?? 0),
    Number(phaseRow?.cnt ?? 0),
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

/**
 * GAP-05 (atomicidad parcial) — cobertura global:
 *
 * Hoy hay 5 tipos de eventos de trip, inyectados en 5 puntos:
 *
 *   TripCreated       → createTrip()       (payload rico, executor opcional)
 *   TripDriverAssigned → assignDriverToTrip() (payload rico, executor opcional)
 *   TripReconfirmed   → updateTripState()   (payload null)  ← mapa abajo
 *   TripCompleted     → updateTripState()   (payload null)  ← mapa abajo
 *                      → completeTrip()     (payload rico, executor opcional)
 *   TripCancelled     → updateTripState()   (payload null)  ← mapa abajo
 *
 * En todos los casos, el UPDATE/INSERT del dato y el INSERT del evento
 * son auto-commit independientes (best-effort). Si el evento falla, el
 * dato ya fue escrito sin auditoría. El executor opcional en createTrip(),
 * assignDriverToTrip() y completeTrip() es la válvula estructural para
 * atomicidad REAL cuando un caller futuro pase una transacción — hoy ningún
 * caller lo usa.
 *
 * updateTripState() es la excepción: inyecta el evento DESPUÉS de la sync
 * de fase, con payload null, y SIN executor (el UPDATE del status y el
 * INSERT del evento siempre son auto-commit separados). Esto es deliberado:
 * el mapa centralizado (STATUS_TO_TRIP_EVENT) cubre 3 eventos de un solo
 * punto de código, minimizando la superficie de cambio. Si se necesita
 * atomicidad en estos, se debe refactorizar updateTripState() para aceptar
 * executor.
 *
 * Mapa legacy status → TripEventType. Los statuses que NO están en el mapa
 * (ej: "consulta", "asignado_chofer") no generan evento — cada uno tiene
 * su propio punto de inyección con payload rico.
 */
const STATUS_TO_TRIP_EVENT: Partial<Record<string, TripEventType>> = {
  reconfirmado_24hs: "TripReconfirmed",
  cancelado: "TripCancelled",
  completado: "TripCompleted",
};

export async function updateTripState(tripId: string, newState: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({ sql: "UPDATE trips SET status = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [newState, tripId] });
  await syncTripPhaseFromLegacyStatus(tripId, newState);

  // Event logger best-effort (ver GAP-05). Statuses sin entrada en el mapa
  // (ej: "asignado_chofer") se omiten silenciosamente.
  const eventType = STATUS_TO_TRIP_EVENT[newState];
  if (eventType) {
    await insertTripEvent(tripId, eventType, null, "system");
  }
}

/**
 * assignDriverToTrip — asigna un driver a un trip y registra
 * TripDriverAssigned en trip_events (best-effort, ver GAP-05).
 *
 * @param executor - Opcional. Si se pasa una transacción, tanto el UPDATE
 *   como el INSERT del evento se ejecutan dentro de ella.
 */
export async function assignDriverToTrip(
  tripId: string,
  driverPhone: string,
  executor?: DbExecutor,
): Promise<{ commission: number; payout: number } | null> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  if (!trip) return null;

  const price = trip.price_base || 0;
  let payout = trip.garantizado_base ?? Math.round(price * 0.85);

  if (trip.tariff_id) {
    const discountPct = await getDriverDiscountForTariff(driverPhone, trip.tariff_id);
    if (discountPct && discountPct > 0) {
      payout = Math.round(payout * (1 - discountPct / 100));
    }
  }

  const commission = price - payout;
  const db = executor ?? getDb();

  await db.execute({
    sql: "UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', commission_amount = ?, driver_payout = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [driverPhone, commission, payout, tripId],
  });
  await insertTripEvent(
    tripId,
    "TripDriverAssigned",
    JSON.stringify({ driver_phone: driverPhone, commission, payout, price }),
    "system",
    db,
  );
  await syncTripPhaseFromLegacyStatus(tripId, "asignado_chofer");
  return { commission, payout };
}

export async function completeTrip(
  tripId: string,
  executor?: DbExecutor,
): Promise<void> {
  await ensureSchema();
  const db = executor ?? getDb();

  await db.execute({
    sql: "UPDATE trips SET status = 'completado', confirmed_at = unixepoch(), updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });

  // Event logger best-effort con payload de cierre (ver GAP-05).
  // Lee commission_amount/driver_payout seteados por assignDriverToTrip.
  const trip = await getTripById(tripId);
  if (trip) {
    await insertTripEvent(
      tripId,
      "TripCompleted",
      JSON.stringify({
        commission: trip.commission_amount ?? 0,
        payout: trip.driver_payout ?? 0,
        price: trip.price_base ?? 0,
      }),
      "system",
      db,
    );
  }

  await syncTripPhaseFromLegacyStatus(tripId, "completado");
}

// ========== TRIP MODEL V3 ==========

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
    log.warn("[diagnostic] trip_phase_divergence", JSON.stringify({
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
      log.warn("[metric] trip_phase_unknown_status", JSON.stringify({
        trip_id: tripId,
        status,
      }));
    }
    return;
  }

  await ensureSchema();
  const row = await queryOne<{ trip_phase: string | null; closure_reason: string | null }>(
    "SELECT trip_phase, closure_reason FROM trips WHERE trip_id = ?",
    [tripId],
  );
  if (!row) return;

  const currentPhase = row.trip_phase as TripPhase | null;
  const expectedReason = mapping.reason || null;

  if (currentPhase && currentPhase !== mapping.phase && !divergenceLogged.has(tripId)) {
    divergenceLogged.add(tripId);
    log.warn("[metric] trip_phase_divergence", JSON.stringify({
      trip_id: tripId,
      status,
      trip_phase: currentPhase,
    }));
  }

  await getDb().execute({
    sql: "UPDATE trips SET trip_phase = ?, closure_reason = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [mapping.phase, expectedReason, tripId],
  });

  const syncKey = `${tripId}:${status}`;
  if (!phaseSyncLogged.has(syncKey)) {
    phaseSyncLogged.add(syncKey);
    log.info("[metric] trip_phase_sync", JSON.stringify({
      trip_id: tripId,
      status,
      trip_phase: mapping.phase,
    }));
  }
}

export async function getTripPhase(tripId: string): Promise<TripPhase | null> {
  await ensureSchema();
  const row = await queryOne<{ trip_phase: TripPhase }>(
    "SELECT trip_phase FROM trips WHERE trip_id = ?",
    [tripId],
  );
  return row?.trip_phase ?? null;
}

// ========== READER VALIDATION ==========

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
    log.warn("[metric] trip_phase_reader_validation_mismatch", JSON.stringify({
      source,
      legacy_count: legacyCount,
      phase_count: phaseCount,
      expected_phase: expectedPhase,
    }));
  }
}

export async function reportTripPhaseNullCount(source: string): Promise<number> {
  await ensureSchema();
  const row = await queryOne<{ cnt: number }>("SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IS NULL");
  const cnt = Number(row?.cnt ?? 0);
  if (!phaseNullLogged.has(source)) {
    phaseNullLogged.add(source);
    log.info("[metric] trip_phase_null_count", JSON.stringify({
      source,
      null_count: cnt,
    }));
  }
  return cnt;
}

// ========== TRIP QUERIES ==========

export async function getActiveTripsByClient(clientPhone: string): Promise<TripRow[]> {
  const trips = await query<TripRow>("SELECT * FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL) ORDER BY created_at ASC", [clientPhone]);
  const legacyRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado')",
    [clientPhone],
  );
  await validateReaderConsistency(
    "getActiveTripsByClient",
    Number(legacyRow?.cnt ?? 0),
    trips.length,
    ["DRAFT", "QUOTED", "CONFIRMED", "ASSIGNED", "IN_PROGRESS"]
  );
  await reportTripPhaseNullCount("getActiveTripsByClient");
  return trips;
}

// ========== TRIP MUTATIONS ==========

export async function updateTripTariff(tripId: string, tariffId: number, pisoBase: number, passengers?: number): Promise<void> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  const pax = passengers ?? trip?.passengers ?? 0;
  const tariff = await queryOne<TariffRow>("SELECT * FROM tariffs WHERE id = ?", [tariffId]);
  const price = tariff
    ? (pax > 4
      ? (tariff.public_price_6p ?? 0)
      : (tariff.public_price_4p ?? 0))
    : (trip?.price_base ?? 0);
  const garantizado = Math.round(price * 0.85);
  await getDb().execute({
    sql: "UPDATE trips SET tariff_id = ?, piso_base = ?, garantizado_base = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tariffId, pisoBase, garantizado, tripId],
  });
}

export async function setCommissionDeclared(tripId: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE trips SET comision_declarada = 1, updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });
}

// ========== SCHEDULING ==========

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
  const legacyRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    [cutoff],
  );
  const phaseRow = await queryOne<{ cnt: number }>(
    "SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IN ('ASSIGNED','CLOSED') AND status != 'reconfirmado_24hs' AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    [cutoff],
  );
  await validateReaderConsistency(
    "getTripsPendingCloseOut",
    Number(legacyRow?.cnt ?? 0),
    Number(phaseRow?.cnt ?? 0),
    ["ASSIGNED", "CLOSED"]
  );
  await reportTripPhaseNullCount("getTripsPendingCloseOut");
  return trips;
}

export async function getExpiredTrips(): Promise<TripRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const trips = await query<TripRow>("SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at < ? AND status NOT IN ('completado','cancelado')", [now]);
  checkDivergenceForTrips(trips, "getExpiredTrips");
  return trips;
}

// ========== WORKFLOW STATE QUERIES ==========

export async function getExpiredByState(
  state: string, timeoutMs: number,
): Promise<{ conversationId: number; phone: string; dispatchWorkflowState: string }[]> {
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  const rs = await getDb().execute({
    sql: `SELECT cs.phone, cs.dispatch_state, c.id as conversation_id
          FROM chat_sessions cs
          JOIN conversations c ON c.phone = cs.phone
          WHERE cs.updated_at < ?
            AND cs.dispatch_state = ?`,
    args: [cutoff, state],
  });
  const rows = rs.rows as unknown as { conversation_id: number; phone: string; dispatch_state: string }[];
  return rows.map((row) => ({
    conversationId: row.conversation_id,
    phone: row.phone,
    dispatchWorkflowState: row.dispatch_state,
  }));
}

export async function getStaleWorkflowsFromDb(
  timeoutMs: number,
): Promise<{ conversationId: number; phone: string; dispatchWorkflowState: string }[]> {
  const cutoff = Math.floor((Date.now() - timeoutMs) / 1000);
  const rs = await getDb().execute({
    sql: `SELECT cs.phone, cs.dispatch_state, c.id as conversation_id
          FROM chat_sessions cs
          JOIN conversations c ON c.phone = cs.phone
          WHERE cs.updated_at < ?
            AND cs.dispatch_state IN ('nivel_1', 'nivel_2', 'nivel_3', 'waiting_driver')`,
    args: [cutoff],
  });
  const rows = rs.rows as unknown as { conversation_id: number; phone: string; dispatch_state: string }[];
  return rows.map((row) => ({
    conversationId: row.conversation_id,
    phone: row.phone,
    dispatchWorkflowState: row.dispatch_state,
  }));
}

export async function assignWorkflowAtomic(phone: string, driverPhone: string): Promise<boolean> {
  // Leer estado actual antes del UPDATE (para registrar el level del evento)
  const currentState = await queryOne<{ dispatch_state: string }>(
    "SELECT dispatch_state FROM chat_sessions WHERE phone = ?",
    [phone],
  );
  const validStates: string[] = ["nivel_1", "nivel_2", "nivel_3", "waiting_driver"];
  if (!currentState || !validStates.includes(currentState.dispatch_state)) {
    return false;
  }

  const rs = await getDb().execute({
    sql: `UPDATE chat_sessions
          SET dispatch_state = 'closed', updated_at = unixepoch()
          WHERE phone = ?
            AND dispatch_state IN ('nivel_1','nivel_2','nivel_3','waiting_driver')`,
    args: [phone],
  });
  const ok = rs.rowsAffected > 0;
  if (ok) {
    const trip = await getActiveTripByPhone(phone);
    if (trip) {
      await insertDispatchEvent(
        trip.trip_id,
        "DispatchAccepted",
        currentState.dispatch_state as DispatchEventLevel,
        driverPhone,
      );
    }
  }
  return ok;
}

// ========== TARIFF QUERIES ==========
// Moved to src/lib/services/pricing/tariff-repository.ts

