import {
  getWorkflow,
} from "@/lib/utils/state-machine";
import {
  getActiveTripByPhone,
  getDriverByPhone,
  getFirstWaitingWorkflow,
  getTripByAssignedDriver,
  assignWorkflowAtomic,
} from "@/lib/db/database";
import { notifyTitular, sendToDriver, notifyOtherDriversTaken } from "./admin.service";
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

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";
  const tripDetails = `Destino: ${trip.destination}\nPrecio: $${trip.price_base}\nHora: ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}`;

  if (driver) {
    await sendToDriver(driverPhone, tripDetails);
  } else {
    await sendWhatsAppMessage(driverPhone, `📋 *Resumen del viaje*\n\n${tripDetails}`);
  }

  const clientMsg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve.`;
  await sendWhatsAppMessage(workflow.phone, clientMsg);

  await notifyTitular(`Viaje asignado a ${driverName} (${driverPhone}). Destino: ${trip.destination}`);

  await notifyOtherDriversTaken(driverPhone, trip.destination);
}
