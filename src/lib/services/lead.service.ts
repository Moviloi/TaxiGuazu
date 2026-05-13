import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  getActiveTripByPhone,
  getConversationByPhone,
  registerDriver,
  createTrip,
  setConversationTrip,
} from "@/lib/db/database";
import { generateGroqReply } from "@/lib/ai/groq";
import { analyzeClientIntent } from "@/lib/ai/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { notifyGroup } from "./admin.service";
import {
  advanceToGroup,
  resetToIdle,
  getWorkflow,
} from "@/lib/utils/state-machine";

const TRIP_MARKER_REGEX = /\[DATOS_VIAJE:\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*([^\]]+)\]/i;

function extractTripMarker(text: string): { destination: string; price: number; passengers: string } | null {
  const match = text.match(TRIP_MARKER_REGEX);
  if (!match) return null;
  return {
    destination: match[1].trim(),
    price: parseInt(match[2].replace(/[^0-9]/g, "")) || 0,
    passengers: match[3].trim(),
  };
}

function stripTripMarker(text: string): string {
  return text.replace(TRIP_MARKER_REGEX, "").trim();
}

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
    await resetToIdle((await getConversationByPhone(phone))?.id || 0);
    return;
  }

  if (text.trim().toLowerCase() === ".registrar") {
    await registerDriver(phone);
    await sendWhatsAppMessage(phone, "✅ Te registraste como chofer. Cuando haya un viaje recibirás la notificación.");
    return;
  }

  const conversation = await getOrCreateConversation(phone, undefined);
  const freshConv = await getConversationById(conversation.id);

  if (freshConv.taken_by_human) {
    return;
  }

  const workflow = await getWorkflow(conversation.id);

  if (workflow && workflow.state !== "idle" && workflow.state !== "closed") {
    return;
  }

  await insertMessage(conversation.id, "user", text);

  let trip = await getActiveTripByPhone(phone);
  const intent = await analyzeClientIntent(text, trip, phone);

  if (!intent.shouldRespond) {
    return;
  }

  const history = await getRecentHistory(conversation.id, 20);
  let response = await generateGroqReply(text, history, trip, phone);

  const marker = extractTripMarker(response);
  if (marker) {
    response = stripTripMarker(response);
    if (!trip) {
      const tripId = `trip_${Date.now()}`;
      await createTrip(tripId, phone, "", marker.destination, marker.price);
      await setConversationTrip(conversation.id, tripId);
      trip = await getActiveTripByPhone(phone);
    }
  }

  await insertMessage(conversation.id, "assistant", response);
  await sendWhatsAppMessage(phone, response);

  if (trip && trip.destination && trip.price_base) {
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
  await advanceToGroup(convId, phone);
}