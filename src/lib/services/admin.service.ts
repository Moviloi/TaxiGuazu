import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
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

export async function broadcastTripToDrivers(trip: any, _convId: number, clientPhone: string): Promise<void> {
  const drivers = await getAvailableDrivers();

  if (drivers.length === 0) {
    await notifyTitular(`🚕 *VIAJE SIN CHOFER DISPONIBLE*

Cliente: ${clientPhone}
Destino: ${trip.destination}
Precio: $${trip.price_base}

No hay choferes con ventana abierta. Reenviá manualmente al grupo.`);
    return;
  }

  const msg = `🚕 *VIAJE DISPONIBLE*

Destino: ${trip.destination}
Precio: $${trip.price_base}

Respondé "acepto" para tomar el servicio.`;

  for (const driver of drivers) {
    await sendWhatsAppMessage(driver.phone, msg);
  }

  console.log(`[BROADCAST] Viaje notificado a ${drivers.length} choferes`);
}

export async function notifyOtherDriversTaken(excludePhone: string, destination: string): Promise<void> {
  const drivers = await getAvailableDrivers();
  for (const d of drivers) {
    if (d.phone !== excludePhone) {
      await sendWhatsAppMessage(d.phone, `⏰ El viaje a ${destination} ya fue tomado por otro chofer.`);
    }
  }
}