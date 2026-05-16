import {
  getWorkflow,
} from "@/lib/utils/state-machine";
import {
  getActiveTripByPhone,
  getDriverByPhone,
  getFirstWaitingWorkflow,
  getTripByAssignedDriver,
  assignWorkflowAtomic,
  assignDriverToTrip,
  getClientPreferredDriver,
  setClientPreferredDriver,
  incrementOfferAccepted,
} from "@/lib/db/database";
import { notifyAdmin, sendToDriver, notifyOtherDriversTaken } from "./admin.service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";

export function isGroupMessage(from: string): boolean {
  return from.endsWith("@g.us");
}

const ACEPTAR_KEYWORDS = ["acepto", "yo estoy", "yo voy", "lo tomo"];

function isAccepting(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ACEPTAR_KEYWORDS.some((k) => t.includes(k));
}

export async function handleDriverResponse(
  groupMsg: string,
  driverPhone: string,
  convId: number
): Promise<void> {
  if (!isAccepting(groupMsg)) return;

  const workflow = await getWorkflow(convId);
  if (!workflow || workflow.state !== "waiting_group") return;

  await assignDriver(workflow, driverPhone);
}

export async function handleDriverAccept(driverPhone: string, text: string): Promise<void> {
  if (!isAccepting(text)) return;

  const workflow = await getFirstWaitingWorkflow();
  if (!workflow) return;

  await assignDriver(workflow, driverPhone);
}

export async function handleDriverArrived(driverPhone: string): Promise<void> {
  const trip = await getTripByAssignedDriver(driverPhone);
  if (!trip) return;

  await sendWhatsAppMessage(trip.client_phone, `🟢 *Chofer en camino*

Tu chofer está llegando al destino. Que tengas un buen viaje!`);
  console.log(`[LLEGUÉ] Chofer ${driverPhone} llegó, cliente ${trip.client_phone} notificado`);
}

export async function handleDriverButtonAccept(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow || workflow.state !== "waiting_group") return;

  await assignDriver(workflow, driverPhone);
}

async function assignDriver(workflow: any, driverPhone: string): Promise<void> {
  const convId = workflow.conversation_id || workflow.conversationId;

  const assigned = await assignWorkflowAtomic(convId, driverPhone);
  if (!assigned) {
    const updated = await getWorkflow(convId);
    if (updated?.assignedDriverPhone === driverPhone) {
      console.log(`[ASSIGN] Recuperado: ${driverPhone} ya estaba asignado a conv ${convId}`);
    } else {
      await sendWhatsAppMessage(driverPhone, "⚠️ El viaje ya fue asignado a otro chofer.");
      return;
    }
  }

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const fin = await assignDriverToTrip(trip.trip_id, driverPhone);
  await incrementOfferAccepted(driverPhone);
  const commission = fin?.commission || 0;
  const payout = fin?.payout || trip.price_base || 0;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  const existingPref = await getClientPreferredDriver(trip.client_phone);
  const isPreferred = existingPref && existingPref.preferred_driver_phone === driverPhone;
  let paxNote = "";

  if (existingPref && !isPreferred) {
    const prefDriver = await getDriverByPhone(existingPref.preferred_driver_phone);
    const prefName = prefDriver?.name || "otro chofer";
    paxNote = `\n\n🧑‍🤝‍🧑 Pax de ${prefName}. Solo traslado, sin ofertas adicionales.`;
  }

  let tripDetails = `Origen: ${trip.origin || "No especificado"}\nDestino: ${trip.destination}\nPrecio: $${trip.price_base}\nHora: ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}${paxNote}`;

  if (driver) {
    await sendToDriver(driverPhone, tripDetails, commission, payout);
  } else {
    await sendWhatsAppMessage(driverPhone, `📋 *Resumen del viaje*\n\n${tripDetails}\n\n💰 *Comisión 15%*: $${commission.toLocaleString("es-AR")}\nRecibís: $${payout.toLocaleString("es-AR")}`);
  }

  // Link as preferred driver on first trip
  if (!existingPref) {
    await setClientPreferredDriver(trip.client_phone, driverPhone);
    console.log(`[PREFERRED] Cliente ${trip.client_phone} → chofer ${driverPhone}`);
  }

  const clientMsg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve.`;
  await sendWhatsAppMessage(workflow.phone, clientMsg);

  await notifyAdmin(`Viaje asignado a ${driverName} (${driverPhone}). Destino: ${trip.destination}`);

  await notifyOtherDriversTaken(driverPhone, trip.destination);
}
