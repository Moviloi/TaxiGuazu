import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import { getAvailableDrivers, getClientPreferredDriver, getActiveTripsByClient, getPackagePrice, incrementOfferReceived, getDiscountsForTariff, getDbInstance, getPrincipalDriver, getPrincipal2Driver, getDriverByPhone } from "@/lib/db/database";
import type { DriverRow } from "@/lib/db/types";
import { LOW_PISO_FACTOR, MIN_MARGIN } from "@/config/constants";
import { getEnv } from "@/config/env";

let ADMIN_PHONE: string;
try { ADMIN_PHONE = getEnv().ADMIN_PHONE; } catch { ADMIN_PHONE = "+5493757613215"; }

export async function notifyAdmin(message: string): Promise<void> {
  const phone = ADMIN_PHONE.replace(/\D/g, "");
  await sendWhatsAppMessage(phone, message);
}

export async function sendToDriver(driverPhone: string, tripDetails: string, commission?: number, payout?: number): Promise<void> {
  let msg = `🚕 *Nuevo servicio asignado*\n\n${tripDetails}`;

  if (commission !== undefined && payout !== undefined) {
    msg += `\n\n💰 *Comisión 15%*: $${commission.toLocaleString("es-AR")}
Recibís: $${payout.toLocaleString("es-AR")}`;
  }

  msg += `\n\nRespondé "llegué" cuando estés en camino.`;
  await sendWhatsAppMessage(driverPhone, msg);
}

export async function notifyClient(clientPhone: string, driverName: string): Promise<void> {
  const msg = `✅ *Viaje confirmado*\n\nTu chofer es ${driverName}. Te contactará en breve para coordinar la recogida.`;
  await sendWhatsAppMessage(clientPhone, msg);
}

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

function tripShiftClass(urgency: string): 'day' | 'night' | null {
  const u = urgency.toLowerCase();
  if (u.includes('consulta') || u.includes('reserva')) return null;
  const hour = new Date().getHours();
  return hour >= 6 && hour < 18 ? 'day' : 'night';
}

function shiftLabel(shiftClass: 'day' | 'night' | null): string {
  if (!shiftClass) return '';
  return shiftClass === 'day' ? '☀️ Turno diurno (6-18)' : '🌙 Turno nocturno (18-6)';
}

function scheduledLabel(trip: any): string {
  if (!trip.scheduled_at) return "";
  const d = new Date(trip.scheduled_at * 1000);
  const dateStr = d.toLocaleDateString("es-AR", { weekday: "short", day: "numeric", month: "short" });
  const timeStr = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" });
  return `\n📅 ${dateStr} ${timeStr}`;
}

export async function getPrincipal2(): Promise<DriverRow | null> {
  const p2 = await getPrincipal2Driver();
  if (p2) return p2;
  const envPhone = process.env.PRINCIPAL_2_PHONE;
  if (envPhone) return getDriverByPhone(envPhone);
  return null;
}

export async function offerToSpecificDriver(
  driverPhone: string, trip: any, convId: number,
  label: string, note?: string
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

function tierFactor(tier: string): number {
  if (tier === 'low') return LOW_PISO_FACTOR;
  return 1.0;
}

function driverFloor(driver: any, tripPiso: number, pisoLow?: number | null): number {
  const useLow = driver.tier === 'low' && pisoLow != null;
  const base = useLow ? pisoLow! : tripPiso;
  let floor = Math.round(base * tierFactor(driver.tier || 'normal'));
  if (driver.discount_pct && driver.discount_pct > 0) {
    floor = Math.round(floor * (1 - driver.discount_pct / 100));
  }
  if (driver.min_payout && driver.min_payout > floor) {
    floor = driver.min_payout;
  }
  return floor;
}

export async function broadcastTripToDrivers(
  trip: any, convId: number, clientPhone: string,
  urgency?: string, passengers?: number | null
): Promise<void> {
  const country = detectCountry(trip.origin || "");
  const filters: { country?: string; minCapacity?: number } = {};
  if (country) filters.country = country;
  if (passengers && passengers >= 4) filters.minCapacity = passengers;

  let drivers = await getAvailableDrivers(filters);

  const effectivePayout = trip.garantizado_base ?? Math.round((trip.price_base || 0) * 0.85);
  const tripPiso = trip.piso_base || effectivePayout;
  const margin = (trip.price_base || 0) - effectivePayout;

  if (drivers.length === 0) {
    // Debug: dump all drivers with conversation state
    try {
      const all = await getDbInstance().execute(`SELECT d.phone, d.name, d.active, d.tier, d.country,
        c.phone as conv_phone, c.last_message_at,
        CASE WHEN c.phone IS NULL THEN 'no_join'
             WHEN c.last_message_at IS NULL THEN 'no_msg'
             WHEN c.last_message_at <= ${Math.floor(Date.now() / 1000) - 86400} THEN 'expired'
             ELSE 'ok' END as conv_status
        FROM drivers d
        LEFT JOIN conversations c ON c.phone = d.phone
        WHERE d.active = 1`);
      console.log("[BROADCAST_DEBUG] No drivers found via getAvailableDrivers. All active drivers:", JSON.stringify(all.rows));
    } catch (e) { console.error("[BROADCAST_DEBUG] error:", e); }

    await notifyAdmin(`🚕 *VIAJE SIN CHOFER DISPONIBLE*

Cliente: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Tarifa pública: $${trip.price_base}
Valor garantizado: $${effectivePayout.toLocaleString("es-AR")}
TG: $${margin.toLocaleString("es-AR")}
País: ${country}

No hay choferes disponibles en ${country}. Reenviá manualmente.`);
    return;
  }

  // Package detection: if client has 2+ active trips, use package floor
  const activeTrips = await getActiveTripsByClient(clientPhone);
  const tripCount = activeTrips.length;
  const packageType = tripCount >= 3 ? 'three_leg' : tripCount >= 2 ? 'in_out' : '';
  const packageLabel = packageType === 'three_leg' ? '📦 Paquete 3+ tramos' : packageType === 'in_out' ? '📦 Paquete 2 tramos' : '';

  // Load driver discounts for this tariff
  let discountMap: Record<string, number> = {};
  if (trip.tariff_id) {
    const discounts = await getDiscountsForTariff(trip.tariff_id);
    for (const d of discounts) {
      discountMap[d.driver_phone] = d.discount_pct;
    }
  }

  // Load low piso for this tariff (used for low-tier drivers)
  let pisoLow: number | null = null;
  if (trip.tariff_id) {
    try {
      const t = await getDbInstance().execute({ sql: "SELECT piso_4p_low, piso_6p_low FROM tariffs WHERE id = ?", args: [trip.tariff_id] });
      const row = t.rows[0] as any;
      if (row) {
        const passengersNum = trip.passengers || 0;
        pisoLow = passengersNum > 4 ? (row.piso_6p_low ?? null) : (row.piso_4p_low ?? null);
      }
    } catch (e) { console.error("[broadcastTripToDrivers] load low piso error:", e); }
  }

  let eligible: Array<DriverRow & { discount_pct: number }> = [];
  for (const d of drivers) {
    const discountPct = discountMap[d.phone] || 0;
    let floor = driverFloor(d, tripPiso, pisoLow);

    // Package override: use package floor if lower
    if (packageType && d.min_payout) {
      const pkg = await getPackagePrice(d.phone, packageType);
      if (pkg && pkg.min_payout < floor) floor = pkg.min_payout;
    }

    if (effectivePayout >= floor) {
      eligible.push({ ...d, discount_pct: discountPct });
    }
  }

  // If margin is below minimum, only low tier drivers qualify
  if (margin < MIN_MARGIN) {
    const before = eligible.length;
    eligible = eligible.filter((d) => d.tier === 'low');
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
${packageLabel ? `\n${packageLabel}` : ''}

Ningún chofer tiene un piso menor o igual a $${effectivePayout}. Reasigná manualmente o contactá low-cost.`);
    return;
  }

  const shiftClass = tripShiftClass(urgency || '');
  const pref = shiftClass ? await getClientPreferredDriver(clientPhone) : null;

  if (shiftClass) {
    const before = eligible.length;
    eligible = eligible.filter((d: any) => {
      if (!d.shift || d.shift === 'any') return true;
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

  // Sort: preferred first, then principal (if no preferred), then by rating, then acceptance
  const principal = !pref ? await getPrincipalDriver() : null;
  eligible.sort((a: any, b: any) => {
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
  const body = `${icon} *${label}*${schInfo}${shiftInfo}${pkgInfo}

Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Valor garantizado: $${effectivePayout.toLocaleString("es-AR")}${passengers ? `\nPasajeros: ${passengers}` : ""}`;

  await Promise.all(eligible.map(driver =>
    sendInteractiveButtons(driver.phone, body, [
      { id: `aceptar_${convId}`, title: "✅ Aceptar" },
    ]).then(() => incrementOfferReceived(driver.phone))
  ));

  const tierCounts = { low: 0, normal: 0, premium: 0 };
  for (const d of eligible) tierCounts[d.tier as keyof typeof tierCounts] = (tierCounts[d.tier as keyof typeof tierCounts] || 0) + 1;
  console.log(`[BROADCAST] ${label} notificado a ${eligible.length}/${drivers.length} (${country}) ${packageType||'simple'} turno=${shiftClass} payout=$${effectivePayout} piso=$${tripPiso} tiers=${JSON.stringify(tierCounts)}`);
}

export async function notifyOtherDriversTaken(excludePhone: string, destination: string): Promise<void> {
  const drivers = await getAvailableDrivers();
  await Promise.all(drivers
    .filter(d => d.phone !== excludePhone)
    .map(d => sendWhatsAppMessage(d.phone, `⏰ El viaje a ${destination} ya fue tomado por otro chofer.`))
  );
}

export async function broadcastLeadToDrivers(
  lead: { origin: string; destination: string; price: number; passengers: number },
  convId: number, clientPhone: string,
  _urgency?: string, passengers?: number | null
): Promise<void> {
  const country = detectCountry(lead.origin || "");
  const filters: { country?: string; minCapacity?: number } = {};
  if (country) filters.country = country;
  if (passengers && passengers >= 4) filters.minCapacity = passengers;

  const drivers = await getAvailableDrivers(filters);
  if (drivers.length === 0) {
    await notifyAdmin(`👤 *LEAD SIN CHOFER DISPONIBLE*
Cliente: ${clientPhone}
Destino: ${lead.destination}
Precio ref: $${lead.price.toLocaleString("es-AR")}
País: ${country}
No hay choferes disponibles para tomar este lead.`);
    return;
  }

  const body = `👤 *NUEVO LEAD*
Origen: ${lead.origin || "No especificado"}
Destino: ${lead.destination}
Precio ref: $${lead.price.toLocaleString("es-AR")}${passengers ? `\nPasajeros: ${passengers}` : ""}\n\nCliente interesado. Tocá "Tomar lead" para contactarlo.`;

  await Promise.all(drivers.map(driver =>
    sendInteractiveButtons(driver.phone, body, [
      { id: `tomar_lead_${convId}`, title: "Tomar lead" },
    ])
  ));

  console.log(`[LEAD] Broadcast a ${drivers.length} choferes: ${lead.destination} (${country})`);
}
