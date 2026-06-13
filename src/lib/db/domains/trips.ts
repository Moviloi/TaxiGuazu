import { query, queryOne } from "../core/helpers";
import { getDb, ensureSchema } from "../core/connection";
import type { TripRow, TripPhase, TripClosureReason, TariffRow } from "../types";
import { log } from "@/lib/utils/logger";

async function getDriverDiscountForTariff(driverPhone: string, tariffId: number): Promise<number | null> {
  const rows = await getDb().execute({
    sql: "SELECT discount_pct FROM driver_discounts WHERE driver_phone = ? AND tariff_id = ? AND active = 1 AND (valid_until IS NULL OR valid_until > unixepoch())",
    args: [driverPhone, tariffId],
  });
  const row = (rows.rows as any[])[0];
  return row?.discount_pct ?? null;
}

// ========== TRIPS ==========

export async function createTrip(tripId: string, clientPhone: string, origin: string, destination: string, priceBase?: number, passengers?: number, scheduledAt?: number, flightNumber?: string, status?: string): Promise<void> {
  const tripStatus = status || "consulta";
  await ensureSchema();
  await getDb().execute({ sql: "INSERT INTO trips (trip_id, client_phone, origin, destination, price_base, passengers, status, scheduled_at, flight_number) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [tripId, clientPhone, origin, destination, priceBase || null, passengers || null, tripStatus, scheduledAt || null, flightNumber || null] });
  await syncTripPhaseFromLegacyStatus(tripId, tripStatus);
}

export async function getTripById(tripId: string): Promise<TripRow | null> {
  return queryOne<TripRow>("SELECT * FROM trips WHERE trip_id = ?", [tripId]);
}

export async function getActiveTripByPhone(clientPhone: string): Promise<TripRow | null> {
  const trip = await queryOne<TripRow>(
    "SELECT * FROM trips WHERE client_phone = ? AND (trip_phase != 'CLOSED' OR trip_phase IS NULL) ORDER BY created_at DESC LIMIT 1",
    [clientPhone]
  );
  const legacyRs = await getDb().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE client_phone = ? AND status NOT IN ('completado','cancelado')",
    args: [clientPhone],
  });
  const phaseRs = await getDb().execute({
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
  await getDb().execute({ sql: "UPDATE trips SET status = ?, updated_at = unixepoch() WHERE trip_id = ?", args: [newState, tripId] });
  await syncTripPhaseFromLegacyStatus(tripId, newState);
}

export async function assignDriverToTrip(tripId: string, driverPhone: string): Promise<{ commission: number; payout: number } | null> {
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

  await getDb().execute({
    sql: "UPDATE trips SET assigned_driver_phone = ?, status = 'asignado_chofer', commission_amount = ?, driver_payout = ?, updated_at = unixepoch() WHERE trip_id = ?",
    args: [driverPhone, commission, payout, tripId],
  });
  await syncTripPhaseFromLegacyStatus(tripId, "asignado_chofer");
  return { commission, payout };
}

export async function completeTrip(tripId: string): Promise<void> {
  await ensureSchema();
  await getDb().execute({
    sql: "UPDATE trips SET status = 'completado', confirmed_at = unixepoch(), updated_at = unixepoch() WHERE trip_id = ?",
    args: [tripId],
  });
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
  const rs = await getDb().execute({
    sql: "SELECT trip_phase, closure_reason FROM trips WHERE trip_id = ?",
    args: [tripId],
  });
  const row = rs.rows[0] as any;
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
  const rs = await getDb().execute({
    sql: "SELECT trip_phase FROM trips WHERE trip_id = ?",
    args: [tripId],
  });
  const val = (rs.rows[0] as any)?.trip_phase;
  return val ? (val as TripPhase) : null;
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
  const rs = await getDb().execute("SELECT COUNT(*) as cnt FROM trips WHERE trip_phase IS NULL");
  const cnt = Number((rs.rows[0] as any)?.cnt ?? 0);
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
  const legacyRs = await getDb().execute({
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

// ========== TRIP MUTATIONS ==========

export async function updateTripTariff(tripId: string, tariffId: number, pisoBase: number, passengers?: number): Promise<void> {
  await ensureSchema();
  const trip = await getTripById(tripId);
  const pax = passengers ?? trip?.passengers ?? 0;
  const tariff = await queryOne<TariffRow>("SELECT * FROM tariffs WHERE id = ?", [tariffId]);
  const price = tariff ? (pax > 4 ? tariff.price_6p : tariff.price_4p) : (trip?.price_base ?? 0);
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
  const legacyRs = await getDb().execute({
    sql: "SELECT COUNT(*) as cnt FROM trips WHERE status IN ('completado', 'asignado_chofer') AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    args: [cutoff],
  });
  const phaseRs = await getDb().execute({
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

export async function getExpiredTrips(): Promise<TripRow[]> {
  const now = Math.floor(Date.now() / 1000);
  const trips = await query<TripRow>("SELECT * FROM trips WHERE scheduled_at IS NOT NULL AND scheduled_at < ? AND status NOT IN ('completado','cancelado')", [now]);
  checkDivergenceForTrips(trips, "getExpiredTrips");
  return trips;
}
