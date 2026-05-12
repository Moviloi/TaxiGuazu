import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  getActiveTripByPhone,
  getConversationByPhone,
} from "@/lib/db/database";
import { generateGeminiReply, analyzeClientIntent } from "@/lib/ai/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { notifyTitular } from "./admin.service";
import {
  advanceToAdmin,
  advanceToGroup,
  closeWorkflow,
  resetToIdle,
  getWorkflow,
  isWorkflowActive,
} from "@/lib/utils/state-machine";

const TIMEOUT_TITULAR_RESPONSE = 2 * 60 * 1000;
const BOT_PHONE = process.env.BOT_PHONE || "+543757646645";

export async function handleLeadMessage(phone: string, text: string): Promise<void> {
  if (text.trim().toLowerCase() === ".id") {
    await sendWhatsAppMessage(phone, `Tu número: ${phone}`);
    return;
  }

  if (text.trim().toLowerCase() === "sigo yo") {
    await sendWhatsAppMessage(phone, "Perfecto, continuás vos. Avisame cuando termines para volver al bot.");
    return;
  }

  if (text.trim().toLowerCase() === "seguí vos" || text.trim().toLowerCase() === "seguimos vos") {
    await sendWhatsAppMessage(phone, "¡Genial! Retomo la atención. ¿En qué estábamos?");
    resetToIdle(getConversationByPhone(phone)?.id || 0);
    return;
  }

  const conversation = getOrCreateConversation(phone, undefined);
  const freshConv = getConversationById(conversation.id);

  if (freshConv.taken_by_human) {
    return;
  }

  const workflow = getWorkflow(conversation.id);

  if (workflow && workflow.state !== "idle" && workflow.state !== "closed") {
    return;
  }

  insertMessage(conversation.id, "user", text);

  const trip = getActiveTripByPhone(phone);
  const intent = await analyzeClientIntent(text, trip, phone);

  if (!intent.shouldRespond) {
    return;
  }

  const history = getRecentHistory(conversation.id, 20);
  const response = await generateGeminiReply(text, history, trip, phone);

  insertMessage(conversation.id, "assistant", response);
  await sendWhatsAppMessage(phone, response);

  if (intent.needsNotification) {
    await notifyTitular(intent.notificationMessage);
  }

  if (intent.tripCompleted && trip) {
    await escalateToAdmin(conversation.id, phone, trip);
  }
}

async function escalateToAdmin(convId: number, phone: string, trip: any): Promise<void> {
  const tripId = trip.trip_id || `trip_${Date.now()}`;
  
  await notifyTitular(`*NUEVO VIAJE*

Cliente: ${phone}
Destino: ${trip.destination}
Precio: $${trip.price_base}

¿Tomás este servicio?`);

  advanceToAdmin(convId, tripId);

  setTimeout(async () => {
    const current = getWorkflow(convId);
    if (current?.state === "waiting_admin") {
      await escalateToGroup(convId, trip);
    }
  }, TIMEOUT_TITULAR_RESPONSE);
}

async function escalateToGroup(convId: number, trip: any): Promise<void> {
  const { notifyGroup } = await import("./admin.service");
  
  await notifyGroup(`🚕 *VIAJE DISPONIBLE*

Destino: ${trip.destination}
Precio: $${trip.price_base}

¿Alguien disponible? Respondé "acepto" para tomar el servicio.`);

  advanceToGroup(convId);
}