import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";

const TITULAR_DRIVER_PHONE = process.env.TITULAR_DRIVER_PHONE || "+543757613215";
const DRIVERS_GROUP_ID = process.env.DRIVERS_GROUP_ID || "120363394046775162@g.us";

export async function notifyTitular(message: string): Promise<void> {
  const phone = TITULAR_DRIVER_PHONE.replace(/\D/g, "");
  await sendWhatsAppMessage(phone, message);
}

export async function notifyGroup(message: string): Promise<void> {
  await sendWhatsAppMessage(DRIVERS_GROUP_ID, message);
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