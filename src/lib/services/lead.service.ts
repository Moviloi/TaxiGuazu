import {
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  getActiveTripByPhone,
  getConversationByPhone,
  createTrip,
  setConversationTrip,
  getDriverByPhone,
  getDriverCodeByCode,
  registerDriverByCode,
  getDriverExpiry,
  createDriverCode,
  deactivateDriverByCode,
} from "@/lib/db/database";
import { generateGroqReply } from "@/lib/ai/groq";
import { analyzeClientIntent } from "@/lib/ai/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { broadcastTripToDrivers } from "./admin.service";
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

  if (lower.startsWith(".add_chofer") || lower.startsWith(".add-chofer")) {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 3) {
      await sendWhatsAppMessage(phone, "Usá: .add_chofer CODIGO NOMBRE [TELÉFONO]");
      return;
    }
    const titular = process.env.TITULAR_DRIVER_PHONE || "+543757613215";
    if (phone !== titular) {
      await sendWhatsAppMessage(phone, "❌ Solo el administrador puede agregar choferes.");
      return;
    }
    const code = parts[1].toLowerCase();
    let name: string;
    let phoneArg: string | undefined;
    if (parts.length >= 4) {
      const last = parts[parts.length - 1];
      if (/^\+?\d{10,}$/.test(last.replace(/\D/g, ""))) {
        phoneArg = last;
        name = parts.slice(2, -1).join(" ");
      } else {
        name = parts.slice(2).join(" ");
      }
    } else {
      name = parts.slice(2).join(" ");
    }
    const result = await createDriverCode(code, name, phone, phoneArg);
    if (result.ok) {
      let msg = `✅ Código "${code}" creado para ${name}.`;
      if (phoneArg) msg += ` Teléfono registrado.`;
      msg += ` Decile que envíe .registrar-${code} al bot para activar su ventana de 24hs.`;
      await sendWhatsAppMessage(phone, msg);
    } else {
      await sendWhatsAppMessage(phone, `❌ ${result.error || "Error al crear código."}`);
    }
    return;
  }

  if (lower.startsWith(".baja_chofer") || lower.startsWith(".baja-chofer")) {
    const parts = trimmed.split(/\s+/);
    if (parts.length < 2) {
      await sendWhatsAppMessage(phone, "Usá: .baja_chofer CODIGO");
      return;
    }
    const titular = process.env.TITULAR_DRIVER_PHONE || "+543757613215";
    if (phone !== titular) {
      await sendWhatsAppMessage(phone, "❌ Solo el administrador puede dar de baja choferes.");
      return;
    }
    const code = parts[1].toLowerCase();
    const ok = await deactivateDriverByCode(code);
    if (ok) {
      await sendWhatsAppMessage(phone, `✅ Chofer "${code}" dado de baja.`);
    } else {
      await sendWhatsAppMessage(phone, `❌ Código "${code}" no encontrado.`);
    }
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
  await broadcastTripToDrivers(trip, convId, phone);
  await advanceToGroup(convId, phone);
}