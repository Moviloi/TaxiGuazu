import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import { getAvailableDrivers, getClientPreferredDriver, getActiveTripsByClient, getPackagePrice, incrementOfferReceived, getDiscountsForTariff } from "@/lib/db/database";
import type { DriverRow } from "@/lib/db/types";
import { LOW_PISO_FACTOR, MIN_MARGIN } from "@/config/constants";
import { getEnv } from "@/config/env";

let ADMIN_PHONE: string;
try { ADMIN_PHONE = getEnv().TITULAR_DRIVER_PHONE; } catch { ADMIN_PHONE = "+543757613215"; }

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

function detectCountry(origin: string, destination: string): string {
  const text = `${origin} ${destination}`.toLowerCase();
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

function driverFloor(driver: any, tripPiso: number): number {
  let floor = Math.round(tripPiso * tierFactor(driver.tier || 'normal'));
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
  const country = detectCountry(trip.origin || "", trip.destination || "");
  const filters: { country?: string; minCapacity?: number } = {};
  if (country) filters.country = country;
  if (passengers && passengers >= 4) filters.minCapacity = passengers;

  let drivers = await getAvailableDrivers(filters);

  if (drivers.length === 0) {
    await notifyAdmin(`🚕 *VIAJE SIN CHOFER DISPONIBLE*

Cliente: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination}
Precio: $${trip.price_base}
País: ${country}

No hay choferes disponibles en ${country}. Reenviá manualmente.`);
    return;
  }

  const effectivePayout = Math.round((trip.price_base || 0) * 0.85);
  const tripPiso = trip.piso_base || effectivePayout;
  const margin = (trip.price_base || 0) - effectivePayout;

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

  let eligible: Array<DriverRow & { discount_pct: number }> = [];
  for (const d of drivers) {
    const discountPct = discountMap[d.phone] || 0;
    let floor = driverFloor(d, tripPiso);

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
Precio: $${trip.price_base} → Pago al chofer: $${effectivePayout}
Piso base: $${tripPiso}
Margen: $${margin}
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
Precio: $${trip.price_base}
País: ${country}
Turno: ${shiftLabel(shiftClass)}

Ningún chofer activo en este turno. Reenviá manualmente.`);
    return;
  }

  // Sort: preferred first, then by rating desc, then acceptance score desc
  eligible.sort((a: any, b: any) => {
    const aPref = pref && a.phone === pref.preferred_driver_phone ? 1 : 0;
    const bPref = pref && b.phone === pref.preferred_driver_phone ? 1 : 0;
    if (aPref !== bPref) return bPref - aPref;
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
Precio: $${trip.price_base}${passengers ? `\nPasajeros: ${passengers}` : ""}`;

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
