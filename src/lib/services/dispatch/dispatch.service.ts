// Dispatch Service — unified domain for driver assignment, escalation, and broadcast.
// Replaces fragmented logic in lead.service.ts (escalateTrip), admin.service.ts
// (offerToSpecificDriver, broadcastTripToDrivers), and timeouts.ts (escalation).
// Frozen: do NOT change escalation rules, timeouts, levels, or broadcast logic.

import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import {
  getAvailableDrivers,
  getClientPreferredDriver,
  getActiveTripsByClient,
  getPackagePrice,
  incrementOfferReceived,
  getDbInstance,
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
  findTariff,
} from "@/lib/db/database";
import type { DriverRow, TripRow } from "@/lib/db/types";
import { LOW_PISO_FACTOR, MIN_MARGIN } from "@/config/constants";
import { getEnv } from "@/config/env";
import { notifyAdmin } from "@/lib/services/admin.service";
import { advanceToNivel1, advanceToNivel2, advanceToNivel3, advanceToWaitingDriver, closeWorkflow } from "@/lib/utils/conversation-workflow";

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
  const u = (input.urgency || "").toLowerCase();

  if (u.includes("reserva")) {
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

  if (u.includes("ahora")) {
    await advanceToWaitingDriver(input.conversationId, input.phone);
    await broadcastTripToDrivers(input.trip, input.conversationId, input.phone, input.urgency, input.passengers);
    return { status: "BROADCASTED", offersSent: 0 };
  }

  // Fallback: broadcast for unknown urgency
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
    await closeWorkflow(input.conversationId);
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

      const tariff4p = await findTariff(trip.origin || "", trip.destination || "ninguno", 4);
      const price4p = tariff4p?.price || trip.price_base || 0;

      await closeWorkflow(input.conversationId);

      await sendInteractiveButtons(input.phone,
        `Mirá, en este microsegundo no encuentro una minivan de hasta 6 plazas disponible. Pero para no hacerte esperar, te puedo buscar dos autos de hasta 4 pasajeros ya mismo. Te saldría [$${price4p.toLocaleString("es-AR")}] × 2 en total (es decir, $${price4p.toLocaleString("es-AR")} cada uno). ¿Te sirve que intente buscártelos?`, [
        { id: `contingencia_si_${input.conversationId}`, title: "✅ Sí, buscá" },
        { id: `contingencia_no_${input.conversationId}`, title: "❌ No, gracias" },
      ]);
      return;
    }

    const dualValue = await getDbInstance().execute({
      sql: "SELECT value FROM connection_cache WHERE key = ?",
      args: [`contingency_dual_${input.conversationId}`],
    });
    const dualRow = dualValue.rows[0] as any;
    if (dualRow) {
      const dual = JSON.parse(dualRow.value);
      if (trip) await updateTripState(trip.trip_id, "cancelado");
      await updateTripState(dual.tripA_id, "cancelado");
      await sendWhatsAppMessage(dual.driverA_phone, "❌ El segundo auto no se confirmó a tiempo. El viaje compartido se cancela. Disculpá las molestias.");
      await sendWhatsAppMessage(input.phone, "Disculpá, no pudimos conseguir dos autos disponibles. Un operador se va a comunicar para ayudarte.");
      await notifyAdmin(`⚠️ *Contingencia fallida — 2 autos no disponible*

Cliente: ${input.phone}
Auto A: ${dual.driverA_name} (${dual.driverA_phone}) — cancelado
Ambos viajes cancelados. Contactar manualmente.`);
      await deleteConnectionKey(`contingency_dual_${input.conversationId}`);
      await closeWorkflow(input.conversationId);
      return;
    }

    await sendWhatsAppMessage(input.phone, "Disculpá, no encontramos un chofer disponible ahora mismo. Un operador se va a comunicar para ayudarte.");
    await notifyAdmin(`⚠️ *AHORA sin chofer*

Cliente: ${input.phone}
Destino: ${destino}

Ningún chofer tomó el servicio AHORA. Reasigná manualmente.`);
    await closeWorkflow(input.conversationId);
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
  urgency?: string, passengers?: number | null,
): Promise<void> {
  const country = detectCountry(trip.origin || "");
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
      const all = await getDbInstance().execute(`SELECT d.phone, d.name, d.status, d.tier, d.country,
        c.phone as conv_phone, c.last_message_at,
        CASE WHEN c.phone IS NULL THEN 'no_join'
             WHEN c.last_message_at IS NULL THEN 'no_msg'
             WHEN c.last_message_at <= ${Math.floor(Date.now() / 1000) - 86400} THEN 'expired'
             ELSE 'ok' END as conv_status
        FROM drivers d
        LEFT JOIN conversations c ON c.phone = d.phone
        WHERE d.status = 'active'`);
      console.log("[BROADCAST_DEBUG] No drivers found via getAvailableDrivers. All active drivers:", JSON.stringify(all.rows));
    } catch (e) { console.error("[BROADCAST_DEBUG] error:", e); }

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
      const t = await getDbInstance().execute({ sql: "SELECT base_price_4p, base_price_6p FROM tariffs WHERE id = ?", args: [trip.tariff_id] });
      const row = t.rows[0] as any;
      if (row) {
        const passengersNum = trip.passengers || 0;
        const bp = passengersNum > 4 ? (row.base_price_6p ?? null) : (row.base_price_4p ?? null);
        pisoLow = bp ? Math.round(bp * 0.8) : null;
      }
    } catch (e) { console.error("[broadcastTripToDrivers] load base_price error:", e); }
  }

  let eligible: Array<DriverRow & { adjustment_pct: number; actual_payout: number }> = [];
  for (const d of drivers) {
    const adjPct = 0;
    let floor = driverFloor(d, tripPiso, pisoLow, adjPct);
    const actualPayout = effectivePayout;

    if (packageType && d.min_payout) {
      const pkg = await getPackagePrice(d.phone, packageType);
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
      console.log(`[MARGIN] Margen $${margin} < $${MIN_MARGIN}. Filtrados no-low, quedan ${eligible.length}/${before}`);
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

  const shiftClass = tripShiftClass(urgency || "");
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
      console.log(`[SHIFT] Filtrados ${before - eligible.length} choferes fuera de turno (${shiftClass})`);
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

  const icon = urgencyIcon(urgency || "");
  const label = urgencyLabel(urgency || "");
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
      .catch((e) => console.error(`[BROADCAST] Failed to send to ${driver.phone}:`, e));
  }));

  const tierCounts = { low: 0, normal: 0, premium: 0 };
  for (const d of eligible) tierCounts[d.tier as keyof typeof tierCounts] = (tierCounts[d.tier as keyof typeof tierCounts] || 0) + 1;
  console.log(`[BROADCAST] ${label} notificado a ${eligible.length}/${drivers.length} (${country}) ${packageType || "simple"} turno=${shiftClass} payout=$${effectivePayout} piso=$${tripPiso} tiers=${JSON.stringify(tierCounts)}`);
}

// ── Driver helpers ──

export async function getPrincipal2(): Promise<DriverRow | null> {
  const p2 = await getPrincipal2Driver();
  if (p2) return p2;
  try {
    const envPhone = getEnv().PRINCIPAL_2_PHONE;
    if (envPhone) return getDriverByPhone(envPhone);
  } catch { /* not configured */ }
  return null;
}

// ── Internal helpers ──

function detectCountry(origin: string): string {
  const text = origin.toLowerCase();
  if (text.includes("brasil") || text.includes("foz") || text.includes("catuaí") || text.includes("br-")) return "BR";
  if (text.includes("paraguay") || text.includes("ciudad del este") || text.includes("py-")) return "PY";
  return "AR";
}

function urgencyIcon(urgency: string): string {
  const u = urgency.toLowerCase();
  if (u.includes("reserva") || u.includes("semana") || u.includes("proximo") || u.includes("lunes") || u.includes("martes")) return "📅";
  return "🚕";
}

function urgencyLabel(urgency: string): string {
  const u = urgency.toLowerCase();
  if (u.includes("reserva")) return "RESERVA";
  if (u.includes("consulta")) return "CONSULTA";
  return "VIAJE DISPONIBLE";
}

function tripShiftClass(urgency: string): "day" | "night" | null {
  const u = urgency.toLowerCase();
  if (u.includes("consulta") || u.includes("reserva")) return null;
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

function tierFactor(tier: string): number {
  if (tier === "low") return LOW_PISO_FACTOR;
  return 1.0;
}

function driverFloor(driver: DriverRow, tripPiso: number, pisoLow?: number | null, adjPct?: number): number {
  const useLow = driver.tier === "low" && pisoLow != null;
  const base = useLow ? pisoLow! : tripPiso;
  let floor = Math.round(base * tierFactor(driver.tier || "normal"));
  if (adjPct && adjPct > 0) {
    floor = Math.round(floor * (1 - adjPct / 100));
  }
  if (driver.min_payout && driver.min_payout > floor) {
    floor = driver.min_payout;
  }
  return floor;
}
