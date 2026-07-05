// Dispatch Service — unified domain for driver assignment, escalation, and broadcast.
// Replaces fragmented logic in lead.service.ts (escalateTrip), admin.service.ts
// (offerToSpecificDriver, broadcastTripToDrivers), and timeouts.ts (escalation).
// Frozen: do NOT change escalation rules, timeouts, levels, or broadcast logic.

import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/sender";
import {
  getAvailableDrivers,
  getClientPreferredDriver,
  getActiveTripsByClient,
  getPackagePrices,
  incrementOfferReceived,
  getPrincipalDriver,
  getPrincipal2Driver,
  getDriverByPhone,
  getDriverExpiry,
  getActiveTripByPhone,
  getConnectionValueFlag,
  setConnectionFlag,
  setConnectionValue,
  deleteConnectionKey,
  updateTripState,
  getTariffById,
  debugGetActiveDriversWithConversationStatus,
  queryOne,
} from "@/lib/db/database";
import { getConnectionCache } from "@/lib/db/database";
import { resolveTariff } from "@/lib/services/pricing/tariff-resolver";
import type { DriverRow, PackagePriceRow, TripRow } from "@/lib/db/types";
import { LOW_PISO_FACTOR, MIN_MARGIN } from "@/config/constants";
import { getEnv } from "@/config/env";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { advanceToNivel1, advanceToNivel2, advanceToNivel3, advanceToWaitingDriver, closeWorkflow } from "@/lib/services/dispatch/dispatch-workflow";
import { log } from "@/lib/utils/logger";

export type DispatchLevel = "nivel_1" | "nivel_2" | "nivel_3" | "waiting_driver";

export interface DispatchInput {
  conversationId: number;
  phone: string;
  trip: TripRow;
  urgency: string;
  passengers: number;
}

export interface DispatchResult {
  status: "NO_DRIVERS" | "OFFERED" | "BROADCASTED";
  offersSent: number;
}

export interface EscalationInput {
  conversationId: number;
  phone: string;
  currentState: DispatchLevel;
}

// ── Main entry point (replaces lead.service.ts escalateTrip) ──

export async function executeDispatch(input: DispatchInput): Promise<DispatchResult> {
  const isScheduled = input.trip.scheduled_at != null;

  if (isScheduled) {
    // Nivel 1: Principal
    const principal = await getPrincipalDriver();
    if (principal && principal.status === "active") {
      const expiry = await getDriverExpiry(principal.phone);
      if (expiry.active) {
        await advanceToNivel1(input.conversationId, input.phone);
        await offerToSpecificDriver(
          principal.phone, input.trip, input.conversationId,
          "⭐ *NIVEL 1 — RESERVA*",
          "Sos el Principal. Tenés 1h para aceptar antes de pasar al siguiente nivel.",
        );
        return { status: "OFFERED", offersSent: 1 };
      }
    }
    // Nivel 2: Principal2
    const principal2 = await getPrincipal2();
    if (principal2 && principal2.status === "active") {
      const expiry = await getDriverExpiry(principal2.phone);
      if (expiry.active) {
        await advanceToNivel2(input.conversationId, input.phone);
        await offerToSpecificDriver(
          principal2.phone, input.trip, input.conversationId,
          "⭐ *NIVEL 2 — RESERVA*",
          "Sos el Segundo Principal. Tenés 30min para aceptar.",
        );
        return { status: "OFFERED", offersSent: 1 };
      }
    }
    // Nivel 3: Broadcast
    await advanceToNivel3(input.conversationId, input.phone);
    await broadcastTripToDrivers(input.trip, input.conversationId, input.phone, input.urgency, input.passengers);
    return { status: "BROADCASTED", offersSent: 0 };
  }

  // Non-scheduled trip → waiting_driver + broadcast
  await advanceToWaitingDriver(input.conversationId, input.phone);
  await broadcastTripToDrivers(input.trip, input.conversationId, input.phone, input.urgency, input.passengers);
  return { status: "BROADCASTED", offersSent: 0 };
}

// ── Escalation trigger (replaces timeouts.ts dispatch escalation logic) ──

export async function executeEscalation(input: EscalationInput): Promise<void> {
  const trip = await getActiveTripByPhone(input.phone);
  if (!trip) return;

  if (input.currentState === "nivel_1") {
    const principal2 = await getPrincipal2();
    if (principal2 && principal2.status === "active") {
      const expiry = await getDriverExpiry(principal2.phone);
      if (expiry.active) {
        await advanceToNivel2(input.conversationId, input.phone);
        await offerToSpecificDriver(
          principal2.phone, trip, input.conversationId,
          "⭐ *NIVEL 2 — RESERVA*",
          "El Principal no respondió. Tenés 30min para aceptar.",
        );
        return;
      }
    }
    await advanceToNivel3(input.conversationId, input.phone);
    await broadcastTripToDrivers(trip, input.conversationId, input.phone);
    return;
  }

  if (input.currentState === "nivel_2") {
    await advanceToNivel3(input.conversationId, input.phone);
    await broadcastTripToDrivers(trip, input.conversationId, input.phone);
    return;
  }

  if (input.currentState === "nivel_3") {
    const destino = trip.destination || "sin destino";
    await notifyAdmin(`⚠️ *Viaje sin asignar*

Cliente: ${input.phone}
Destino: ${destino}

Los 3 niveles de despacho agotados. Reasigná manualmente.`);
    await closeWorkflow(input.conversationId, "DispatchAbandoned");
    return;
  }

  if (input.currentState === "waiting_driver") {
    const destino = trip.destination || "sin destino";

    if (await getConnectionValueFlag(`contingency_offered_${input.conversationId}`)) return;

    if (trip.passengers && trip.passengers > 4) {
      const tripData = JSON.stringify({
        origin: trip.origin,
        destination: trip.destination,
        price_base: trip.price_base,
        passengers: trip.passengers,
        flight_number: trip.flight_number || null,
      });
      await setConnectionValue(`contingency_data_${input.conversationId}`, tripData);
      await setConnectionFlag(`contingency_offered_${input.conversationId}`);

      const match4p = await resolveTariff(trip.origin || "", trip.destination || "", 4);
      const price4p = match4p.matched ? match4p.price : (trip.price_base || 0);

      await closeWorkflow(input.conversationId, "DispatchContingency");

      await sendInteractiveButtons(input.phone,
        `Mirá, en este microsegundo no encuentro una minivan de hasta 6 plazas disponible. Pero para no hacerte esperar, te puedo buscar dos autos de hasta 4 pasajeros ya mismo. Te saldría [$${price4p.toLocaleString("es-AR")}] × 2 en total (es decir, $${price4p.toLocaleString("es-AR")} cada uno). ¿Te sirve que intente buscártelos?`, [
        { id: `contingencia_si_${input.conversationId}`, title: "✅ Sí, buscá" },
        { id: `contingencia_no_${input.conversationId}`, title: "❌ No, gracias" },
      ]);
      return;
    }

    const dualValue = await getConnectionCache(`contingency_dual_${input.conversationId}`);
    const dualRow = dualValue ? { value: dualValue } : null;
    if (dualRow) {
      let dual: Record<string, any>;
      try { dual = JSON.parse(dualRow.value); } catch { return; }
      if (trip) await updateTripState(trip.trip_id, "cancelado");
      await updateTripState(dual.tripA_id, "cancelado");
      await sendWhatsAppMessage(dual.driverA_phone, "❌ El segundo auto no se confirmó a tiempo. El viaje compartido se cancela. Disculpá las molestias.");
      await sendWhatsAppMessage(input.phone, "Disculpá, no pudimos conseguir dos autos disponibles. Un operador se va a comunicar para ayudarte.");
      await notifyAdmin(`⚠️ *Contingencia fallida — 2 autos no disponible*

Cliente: ${input.phone}
Auto A: ${dual.driverA_name} (${dual.driverA_phone}) — cancelado
Ambos viajes cancelados. Contactar manualmente.`);
      await deleteConnectionKey(`contingency_dual_${input.conversationId}`);
      await closeWorkflow(input.conversationId, "DispatchAbandoned");
      return;
    }

    await sendWhatsAppMessage(input.phone, "Disculpá, no encontramos un chofer disponible ahora mismo. Un operador se va a comunicar para ayudarte.");
    await notifyAdmin(`⚠️ *AHORA sin chofer*

Cliente: ${input.phone}
Destino: ${destino}

Ningún chofer tomó el servicio AHORA. Reasigná manualmente.`);
    await closeWorkflow(input.conversationId, "DispatchAbandoned");
  }
}

// ── Driver offering ──

export async function offerToSpecificDriver(
  driverPhone: string, trip: TripRow, convId: number,
  label: string, note?: string,
): Promise<void> {
  const body = `${label}${scheduledLabel(trip)}

Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Precio: $${trip.price_base}${note ? `\n\n${note}` : ""}`;

  await sendInteractiveButtons(driverPhone, body, [
    { id: `aceptar_${convId}`, title: "✅ Aceptar" },
  ]);

  await incrementOfferReceived(driverPhone);
}

export async function broadcastTripToDrivers(
  trip: TripRow, convId: number, clientPhone: string,
  _urgency?: string, passengers?: number | null,
): Promise<void> {
  const country = await detectCountry(trip.origin || "");
  const filters: { country?: string; minCapacity?: number; strictMinCapacity?: boolean } = {};
  if (country) filters.country = country;
  if (passengers && passengers > 0) {
    filters.minCapacity = passengers;
    filters.strictMinCapacity = true;
  }

  let drivers = await getAvailableDrivers(filters);

  const effectivePayout = trip.garantizado_base ?? Math.round((trip.price_base || 0) * 0.85);
  const tripPiso = trip.piso_base || effectivePayout;
  const margin = (trip.price_base || 0) - effectivePayout;

  if (drivers.length === 0) {
    try {
      const cutoff = Math.floor(Date.now() / 1000) - 86400;
      await debugGetActiveDriversWithConversationStatus(cutoff);
      log.info("[BROADCAST_DEBUG] No active drivers found via getAvailableDrivers");
    } catch (e) { log.error("[BROADCAST_DEBUG] error:", e); }

    await notifyAdmin(`🚕 *VIAJE SIN CHOFER DISPONIBLE*

Cliente: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Pasajeros: ${passengers ?? trip.passengers ?? "?"}
Tarifa pública: $${trip.price_base}
Valor garantizado: $${effectivePayout.toLocaleString("es-AR")}
TG: $${margin.toLocaleString("es-AR")}
País: ${country}

No hay choferes activos con car_capacity >= ${passengers ?? "?"} en ${country}. Reenviá manualmente.`);
    return;
  }

  const activeTrips = await getActiveTripsByClient(clientPhone);
  const tripCount = activeTrips.length;
  const packageType = tripCount >= 3 ? "three_leg" : tripCount >= 2 ? "in_out" : "";
  const packageLabel = packageType === "three_leg" ? "📦 Paquete 3+ tramos" : packageType === "in_out" ? "📦 Paquete 2 tramos" : "";

  let pisoLow: number | null = null;
  if (trip.tariff_id) {
    try {
      const row = await getTariffById(trip.tariff_id);
      if (row) {
        const passengersNum = trip.passengers || 0;
        const bp = passengersNum > 4 ? (row.driver_price_6p ?? null) : (row.driver_price_4p ?? null);
        pisoLow = bp ? Math.round(bp * 0.8) : null;
      }
    } catch (e) { log.error("[broadcastTripToDrivers] load base_price error:", e); }
  }

  // Batch-fetch package prices for drivers that need them
  let packagePriceMap = new Map<string, PackagePriceRow>();
  if (packageType) {
    const pkgPhones = drivers.filter((d) => d.min_payout).map((d) => d.phone);
    packagePriceMap = await getPackagePrices(pkgPhones, packageType);
  }

  let eligible: Array<DriverRow & { adjustment_pct: number; actual_payout: number }> = [];
  for (const d of drivers) {
    const adjPct = 0;
    let floor = driverFloor(d, tripPiso, pisoLow, adjPct);
    const actualPayout = effectivePayout;

    if (packageType && d.min_payout) {
      const pkg = packagePriceMap.get(d.phone);
      if (pkg && pkg.min_payout < floor) floor = pkg.min_payout;
    }

    if (actualPayout >= floor) {
      eligible.push({ ...d, adjustment_pct: adjPct, actual_payout: actualPayout });
    }
  }

  if (margin < MIN_MARGIN) {
    const before = eligible.length;
    eligible = eligible.filter((d) => d.tier === "low");
    if (eligible.length !== before) {
      log.info(`[MARGIN] Margen $${margin} < $${MIN_MARGIN}. Filtrados no-low, quedan ${eligible.length}/${before}`);
    }
  }

  if (eligible.length === 0) {
    await notifyAdmin(`🚕 *VIAJE SIN CHOFER QUE ACEPTE EL PISO*

Cliente: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Tarifa pública: $${trip.price_base} → Valor garantizado: $${effectivePayout}
Piso base: $${tripPiso}
TG: $${margin}
País: ${country}
${packageLabel ? `\n${packageLabel}` : ""}

Ningún chofer tiene un piso menor o igual a $${effectivePayout}. Reasigná manualmente o contactá low-cost.`);
    return;
  }

  const shiftClass = tripShiftClass(trip.scheduled_at);
  const pref = shiftClass ? await getClientPreferredDriver(clientPhone) : null;

  if (shiftClass) {
    const before = eligible.length;
    eligible = eligible.filter((d) => {
      if (!d.shift || d.shift === "any") return true;
      if (d.shift === shiftClass) return true;
      if (pref && d.phone === pref.preferred_driver_phone) return true;
      return false;
    });
    if (eligible.length !== before) {
      log.info(`[SHIFT] Filtrados ${before - eligible.length} choferes fuera de turno (${shiftClass})`);
    }
  }

  if (eligible.length === 0) {
    await notifyAdmin(`🚕 *VIAJE SIN CHOFER EN TURNO*

Cliente: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Tarifa pública: $${trip.price_base}
Valor garantizado: $${effectivePayout.toLocaleString("es-AR")}
País: ${country}
Turno: ${shiftLabel(shiftClass)}

Ningún chofer activo en este turno. Reenviá manualmente.`);
    return;
  }

  const principal = !pref ? await getPrincipalDriver() : null;
  eligible.sort((a, b) => {
    const aPref = pref && a.phone === pref.preferred_driver_phone ? 1 : 0;
    const bPref = pref && b.phone === pref.preferred_driver_phone ? 1 : 0;
    if (aPref !== bPref) return bPref - aPref;
    if (principal) {
      const aPri = a.phone === principal.phone ? 1 : 0;
      const bPri = b.phone === principal.phone ? 1 : 0;
      if (aPri !== bPri) return bPri - aPri;
    }
    const aRating = a.rating || 0;
    const bRating = b.rating || 0;
    if (aRating !== bRating) return bRating - aRating;
    return (b.acceptance_score || 0) - (a.acceptance_score || 0);
  });

  const isScheduled = trip.scheduled_at != null;
  const icon = isScheduled ? "📅" : "🚕";
  const label = isScheduled ? "RESERVA" : "VIAJE DISPONIBLE";
  const shiftInfo = shiftClass ? `\n${shiftLabel(shiftClass)}` : "";
  const pkgInfo = packageLabel ? `\n${packageLabel}` : "";
  const schInfo = scheduledLabel(trip);

  await Promise.all(eligible.map((driver) => {
    const body = `${icon} *${label}*${schInfo}${shiftInfo}${pkgInfo}

Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Valor garantizado: $${driver.actual_payout.toLocaleString("es-AR")}${passengers ? `\nPasajeros: ${passengers}` : ""}`;
    return sendInteractiveButtons(driver.phone, body, [
      { id: `aceptar_${convId}`, title: "✅ Aceptar" },
    ]).then(() => incrementOfferReceived(driver.phone))
      .catch((e) => log.error(`[BROADCAST] Failed to send to driver:`, e));
  }));

  const tierCounts = { low: 0, normal: 0, premium: 0 };
  for (const d of eligible) tierCounts[d.tier as keyof typeof tierCounts] = (tierCounts[d.tier as keyof typeof tierCounts] || 0) + 1;
  log.info(`[BROADCAST] ${label} notificado a ${eligible.length}/${drivers.length} (${country}) ${packageType || "simple"} turno=${shiftClass} payout=$${effectivePayout} piso=$${tripPiso} tiers=${JSON.stringify(tierCounts)}`);
}

// ── Driver helpers ──

async function getPrincipal2(): Promise<DriverRow | null> {
  const p2 = await getPrincipal2Driver();
  if (p2) return p2;
  try {
    const envPhone = getEnv().PRINCIPAL_2_PHONE;
    if (envPhone) return getDriverByPhone(envPhone);
  } catch { /* not configured */ }
  return null;
}

// ── Internal helpers ──

async function detectCountry(origin: string): Promise<string> {
  // Try to resolve via DB: resolveLocation → place → zone → country
  try {
    const { resolveLocationToPlaceId } = await import("@/lib/services/geo/location-resolver");
    const placeId = await resolveLocationToPlaceId(origin);
    if (placeId) {
      const placeResult = await queryOne<{ country: string }>(
        "SELECT p.country FROM places p WHERE p.place_id = ? AND p.active_status = 'active'",
        [placeId]
      );
      if (placeResult?.country) return placeResult.country;
      // Fallback to zone country
      const zoneResult = await queryOne<{ country: string }>(
        "SELECT z.country FROM places p JOIN zones z ON z.zone_id = p.zone_id WHERE p.place_id = ?",
        [placeId]
      );
      if (zoneResult?.country) return zoneResult.country;
    }
  } catch { /* fallback to default */ }
  return "AR";
}

function tripShiftClass(scheduledAt?: number | null): "day" | "night" | null {
  if (scheduledAt != null) return null;
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

function shiftLabel(shiftClass: "day" | "night" | null): string {
  if (!shiftClass) return "";
  return shiftClass === "day" ? "☀️ Turno diurno (6-18)" : "🌙 Turno nocturno (18-6)";
}

function scheduledLabel(trip: any): string {
  if (!trip.scheduled_at) return "";
  const d = new Date(trip.scheduled_at * 1000);
  const dateStr = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `\n📅 ${dateStr} ${timeStr}`;
}

function driverFloor(driver: DriverRow, tripPiso: number, pisoLow?: number | null, adjPct?: number): number {
  const useLow = driver.tier === "low" && pisoLow != null;
  const base = useLow ? pisoLow! : tripPiso;
  const factor = driver.tier === "low" ? LOW_PISO_FACTOR : 1.0;
  let floor = Math.round(base * factor);
  if (adjPct && adjPct > 0) {
    floor = Math.round(floor * (1 - adjPct / 100));
  }
  if (driver.min_payout && driver.min_payout > floor) {
    floor = driver.min_payout;
  }
  return floor;
}
