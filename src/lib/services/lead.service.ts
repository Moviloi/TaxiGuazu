import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  getActiveTripByPhone,
  getConversationByPhone,
  createTrip,
  setConversationTrip,
  updateTripState,
  getDriverByPhone,
  getDriverCodeByCode,
  registerDriverByCode,
  getDriverExpiry,
} from "@/lib/db/database";
import { generateGroqReply } from "@/lib/ai/groq";
import { analyzeClientIntent } from "@/lib/ai/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { broadcastTripToDrivers } from "./admin.service";
import { handleAdminCommand } from "./admin-commands";
import {
  advanceToGroup,
  resetToIdle,
  getWorkflow,
} from "@/lib/utils/state-machine";

const TRIP_MARKER_REGEX = /\[DATOS_VIAJE:\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\]]+)\]/i;

function extractTripMarker(text: string): { code: string; destination: string; price: number; passengers: string } | null {
  const match = text.match(TRIP_MARKER_REGEX);
  if (!match) return null;
  return {
    code: match[1].trim(),
    destination: match[2].trim(),
    price: parseInt(match[3].replace(/[^0-9]/g, "")) || 0,
    passengers: match[4].trim(),
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

  const trimmed = text.trim();
  const lower = trimmed.toLowerCase();

  const registrarMatch = lower.match(/^\.registrar[-\s]?(.*)$/);
  if (registrarMatch) {
    const code = registrarMatch[1].trim();

    if (!code) {
      const existing = await getDriverByPhone(phone);
      if (existing) {
        const expiry = await getDriverExpiry(phone);
        if (expiry.active && expiry.expiresAt) {
          const h = expiry.expiresAt.getHours().toString().padStart(2, "0");
          const m = expiry.expiresAt.getMinutes().toString().padStart(2, "0");
          await sendWhatsAppMessage(phone, `✅ Ya estás registrado hasta las ${h}:${m}hs de hoy. Buena jornada!`);
        } else {
          await sendWhatsAppMessage(phone, "⚠️ Tu registro venció. Enviá .registrar-TUCODIGO para renovarlo.");
        }
      } else {
        await sendWhatsAppMessage(phone, "❌ No tenés un código de registro. Pedile al administrador que te dé uno.");
      }
      return;
    }

    const codeEntry = await getDriverCodeByCode(code);
    if (!codeEntry) {
      await sendWhatsAppMessage(phone, "❌ Código inválido. Verificá con el administrador.");
      return;
    }

    if (codeEntry.phone && codeEntry.phone !== phone) {
      await sendWhatsAppMessage(phone, "❌ Este código ya está asignado a otro número.");
      return;
    }

    await getOrCreateConversation(phone);
    const result = await registerDriverByCode(code, phone);
    if (!result) {
      await sendWhatsAppMessage(phone, "❌ Error al registrarte. Probá de nuevo.");
      return;
    }

    const expiry = await getDriverExpiry(phone);
    const h = expiry.expiresAt ? expiry.expiresAt.getHours().toString().padStart(2, "0") : "23";
    const m = expiry.expiresAt ? expiry.expiresAt.getMinutes().toString().padStart(2, "0") : "59";
    await sendWhatsAppMessage(phone, `✅ Registrado hasta las ${h}:${m}hs de hoy. Buena jornada ${codeEntry.name}!`);
    return;
  }

  if (await handleAdminCommand(phone, trimmed)) return;

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
    if (trip && marker.destination !== trip.destination) {
      await updateTripState(trip.trip_id, "completado");
      trip = null;
    }
    if (!trip) {
      const tripId = `trip_${Date.now()}`;
      await createTrip(tripId, phone, "", marker.destination, marker.price);
      await setConversationTrip(conversation.id, tripId);
      trip = await getActiveTripByPhone(phone);
    }
  }

  await insertMessage(conversation.id, "assistant", response);
  await sendWhatsAppMessage(phone, response);

  if (marker && trip && trip.destination && trip.price_base) {
    await escalateToGroup(conversation.id, phone, trip);
  }
}

async function escalateToGroup(convId: number, phone: string, trip: any): Promise<void> {
  await advanceToGroup(convId, phone);
  await broadcastTripToDrivers(trip, convId, phone);
}