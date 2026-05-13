import {
  getWorkflow,
  closeWorkflow,
} from "@/lib/utils/state-machine";
import { getActiveTripByPhone, getDriverByPhone } from "@/lib/db/database";
import { notifyTitular, sendToDriver } from "./admin.service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";

export const DRIVERS_GROUP_ID = process.env.DRIVERS_GROUP_ID || "120363394046775162@g.us";

export function isGroupMessage(from: string): boolean {
  return from.endsWith("@g.us");
}

export async function handleDriverResponse(
  groupMsg: string,
  driverPhone: string,
  convId: number
): Promise<void> {
  const text = groupMsg.toLowerCase().trim();
  if (!["acepto", "yo estoy", "yo voy", "lo tomo"].some((k) => text.includes(k))) {
    return;
  }

  const workflow = await getWorkflow(convId);
  if (!workflow || workflow.state !== "waiting_group") {
    return;
  }

  if (workflow.assignedDriverPhone) {
    await sendWhatsAppMessage(
      DRIVERS_GROUP_ID,
      `⚠️ El viaje ya fue asignado a otro chofer.`
    );
    return;
  }

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";
  const tripDetails = `Destino: ${trip.destination}\nPrecio: $${trip.price_base}\nHora: ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

  if (!driver) {
    await sendWhatsAppMessage(
      DRIVERS_GROUP_ID,
      `✅ Viaje asignado a ${driverPhone}. Para recibir los detalles, enviá ".registrar" al bot.`
    );
    await sendWhatsAppMessage(
      DRIVERS_GROUP_ID,
      `📋 *Resumen del viaje*\n\n${tripDetails}`
    );
  } else {
    await sendWhatsAppMessage(
      DRIVERS_GROUP_ID,
      `✅ Viaje asignado a ${driverName}.`
    );
    await sendToDriver(driverPhone, tripDetails);
  }

  const clientMsg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve.`;
  await sendWhatsAppMessage(workflow.phone, clientMsg);

  await notifyTitular(`Viaje asignado a ${driverName} (${driverPhone}). Destino: ${trip.destination}`);

  await closeWorkflow(convId, driverPhone);
}