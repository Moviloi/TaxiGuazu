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
import { notifyGroup } from "./admin.service";
import {
  advanceToGroup,
  resetToIdle,
  getWorkflow,
} from "@/lib/utils/state-machine";

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
    resetToIdle((await getConversationByPhone(phone))?.id || 0);
    return;
  }

  const conversation = await getOrCreateConversation(phone, undefined);
  const freshConv = await getConversationById(conversation.id);

  if (freshConv.taken_by_human) {
    return;
  }

  const workflow = getWorkflow(conversation.id);

  if (workflow && workflow.state !== "idle" && workflow.state !== "closed") {
    return;
  }

  await insertMessage(conversation.id, "user", text);

  const trip = await getActiveTripByPhone(phone);
  const intent = await analyzeClientIntent(text, trip, phone);

  if (!intent.shouldRespond) {
    return;
  }

  const history = await getRecentHistory(conversation.id, 20);
  const response = await generateGeminiReply(text, history, trip, phone);

  await insertMessage(conversation.id, "assistant", response);
  await sendWhatsAppMessage(phone, response);

  if (intent.tripCompleted && trip) {
    await escalateToGroup(conversation.id, phone, trip);
  }
}

async function escalateToGroup(convId: number, phone: string, trip: any): Promise<void> {
  const msg = `🚕 *VIAJE DISPONIBLE*

Destino: ${trip.destination}
Precio: $${trip.price_base}
Cliente: ${phone}

¿Alguien disponible? Respondé "acepto" para tomar el servicio.`;

  await notifyGroup(msg);
  advanceToGroup(convId);
}