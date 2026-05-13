import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import { getAvailableDrivers } from "@/lib/db/database";

const TITULAR_DRIVER_PHONE = process.env.TITULAR_DRIVER_PHONE || "+543757613215";

export async function notifyTitular(message: string): Promise<void> {
  const phone = TITULAR_DRIVER_PHONE.replace(/\D/g, "");
  await sendWhatsAppMessage(phone, message);
}

export async function sendToDriver(driverPhone: string, tripDetails: string): Promise<void> {
  const msg = `🚕 *Nuevo servicio asignado*

${tripDetails}

Respondé "llegué" cuando estés en camino.`;
  await sendWhatsAppMessage(driverPhone, msg);
}

export async function notifyClient(clientPhone: string, driverName: string): Promise<void> {
  const msg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve para coordinar la recogida.`;
  await sendWhatsAppMessage(clientPhone, msg);
}

function detectCountry(destination: string): string {
  const d = destination.toLowerCase();
  if (d.includes("brasil") || d.includes("foz") || d.includes("catuaí") || d.includes("br-")) return "BR";
  if (d.includes("paraguay") || d.includes("ciudad del este") || d.includes("py-")) return "PY";
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

export async function broadcastTripToDrivers(trip: any, convId: number, clientPhone: string, urgency?: string, passengers?: number): Promise<void> {
  const country = detectCountry(trip.destination || "");
  const filters: { country?: string; minCapacity?: number } = {};

  if (country) filters.country = country;
  if (passengers && passengers >= 4) filters.minCapacity = passengers;

  const drivers = await getAvailableDrivers(filters);

  if (drivers.length === 0) {
    await notifyTitular(`🚕 *VIAJE SIN CHOFER DISPONIBLE*

Cliente: ${clientPhone}
Destino: ${trip.destination}
Precio: $${trip.price_base}
País: ${country}

No hay choferes disponibles en ${country}. Reenviá manualmente.`);
    return;
  }

  const icon = urgencyIcon(urgency || "");
  const label = urgencyLabel(urgency || "");
  const body = `${icon} *${label}*

Destino: ${trip.destination}
Precio: $${trip.price_base}${passengers ? `\nPasajeros: ${passengers}` : ""}`;

  for (const driver of drivers) {
    await sendInteractiveButtons(driver.phone, body, [
      { id: `aceptar_${convId}`, title: "✅ Aceptar" },
    ]);
  }

  console.log(`[BROADCAST] ${label} notificado a ${drivers.length} choferes (${country})`);
}

export async function notifyOtherDriversTaken(excludePhone: string, destination: string): Promise<void> {
  const drivers = await getAvailableDrivers();
  for (const d of drivers) {
    if (d.phone !== excludePhone) {
      await sendWhatsAppMessage(d.phone, `⏰ El viaje a ${destination} ya fue tomado por otro chofer.`);
    }
  }
}