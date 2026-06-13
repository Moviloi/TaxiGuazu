// ADMIN SERVICE — frozen. ARCHITECTURE NOTE: Módulo congelado.
// No modificar. Gestiona notificaciones a administradores, asignación de viajes
// y comunicación con choferes. Cualquier cambio requiere aprobación de arquitectura.

import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import { getAvailableDrivers } from "@/lib/db/database";
import { getEnv } from "@/config/env";

export const ADMIN_PHONE: string = (() => {
  try { return getEnv().ADMIN_PHONE; } catch { return "+5493757613215"; }
})();

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

export async function notifyOtherDriversTaken(excludePhone: string, destination: string): Promise<void> {
  const drivers = await getAvailableDrivers();
  await Promise.all(drivers
    .filter(d => d.phone !== excludePhone)
    .map(d => sendWhatsAppMessage(d.phone, `⏰ El viaje a ${destination} ya fue tomado por otro chofer.`)
      .catch(e => console.error(`[NOTIFY] Failed to notify driver:`, e))
    )
  );
}

export async function broadcastLeadToDrivers(
  lead: { origin: string; destination: string; price: number; passengers: number },
  convId: number, clientPhone: string,
  _urgency?: string, passengers?: number | null
): Promise<void> {
  const country = detectCountry(lead.origin || "");
  const filters: { country?: string; minCapacity?: number; strictMinCapacity?: boolean } = {};
  if (country) filters.country = country;
  if (passengers && passengers > 0) {
    filters.minCapacity = passengers;
    filters.strictMinCapacity = true;
  }

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
    ]).catch(e => console.error(`[LEAD] Failed to send lead to driver:`, e))
  ));

  console.log(`[LEAD] Broadcast a ${drivers.length} choferes: ${lead.destination} (${country})`);
}
