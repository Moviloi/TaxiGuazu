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
  updateTripScheduledAt,
  updateTripTariff,
  findTariff,
  getDiscountsForTariff,
  getDriverByPhone,
  getDriverCodeByCode,
  registerDriverByCode,
  getDriverExpiry,
  getClientPreferredDriver,
  getActiveSlots,
  clearConversationHistory,
  createLead,
} from "@/lib/db/database";
import { generateGroqReply } from "@/lib/ai/groq";
import { sendWhatsAppMessage, sendInteractiveList } from "@/lib/whatsapp/sender";
import { broadcastTripToDrivers, broadcastLeadToDrivers, offerToSpecificDriver, notifyAdmin } from "./admin.service";
import { handleAdminCommand } from "./admin-commands";
import {
  advanceToPreferred,
  advanceToGroup,
  resetToIdle,
  getWorkflow,
  advanceToSlotSelection,
} from "@/lib/utils/state-machine";

const TRIP_MARKER_REGEX = /\[DATOS_VIAJE:\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\]]+?)(?:\s*\|\s*([^\]]+?))?\]/i;

const LEAD_MARKER_REGEX = /\[LEAD:\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\|]+)\s*\|\s*([^\]]+?)\s*(?:\|\s*([^\]]+?))?\]/i;

function extractLeadMarker(text: string): { origin: string; destination: string; price: number; passengers: number; urgency?: string } | null {
  const match = text.match(LEAD_MARKER_REGEX);
  if (!match) return null;
  return {
    origin: match[1].trim(),
    destination: match[2].trim(),
    price: parseInt(match[3].replace(/[^0-9]/g, "")) || 0,
    passengers: parseInt(match[4].replace(/[^0-9]/g, "")) || 0,
    urgency: match[5]?.trim(),
  };
}

function extractTripMarker(text: string): { code: string; origin: string; destination: string; price: number; passengers: number; urgency: string; scheduledAt?: number } | null {
  const match = text.match(TRIP_MARKER_REGEX);
  if (!match) return null;
  const result: any = {
    code: match[1].trim(),
    origin: match[2].trim(),
    destination: match[3].trim(),
    price: parseInt(match[4].replace(/[^0-9]/g, "")) || 0,
    passengers: parseInt(match[5].replace(/[^0-9]/g, "")) || 0,
    urgency: match[6].trim(),
  };
  if (match[7]) {
    const dateStr = match[7].trim();
    const ts = Date.parse(dateStr);
    if (!isNaN(ts)) {
      result.scheduledAt = Math.floor(ts / 1000);
    }
  }
  return result;
}

function stripTripMarker(text: string): string {
  return text.replace(TRIP_MARKER_REGEX, "").replace(LEAD_MARKER_REGEX, "").trim();
}

const HABLAR_HUMANO = [
  "hablar con un humano", "hablar con una persona", "quiero hablar con una persona",
  "operator", "humano", "atención humana", "quiero un humano",
  "hablar con el dueño", "hablar con el admin", "persona real",
];

export async function handleLeadMessage(phone: string, text: string): Promise<void> {
  try {
    console.log(`[DEBUG_LEAD] phone=${phone} text="${text.substring(0, 60)}"`);
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    if (lower === ".id") {
      const resp = `Tu número: ${phone}`;
      await sendWhatsAppMessage(phone, resp);
      const conv = await getOrCreateConversation(phone);
      await insertMessage(conv.id, "assistant", resp);
      return;
    }

    if (lower === ".limpiar") {
      const conv = await getConversationByPhone(phone);
      if (conv) {
        await clearConversationHistory(conv.id);
        await resetToIdle(conv.id);
      }
      const isStructured = trimmed.length > 20 || /(reserva|quiero|necesito|traslado|viaje|aeropuerto|hotel)/i.test(trimmed);
      const welcome = isStructured
        ? "Bienvenido a TaxiGuazú! Soy tu Asistente Virtual. ¿A dónde necesitas ir?"
        : "Hola! Soy el Asistente Virtual de TaxiGuazú. ¿En qué te ayudo?";
      await sendWhatsAppMessage(phone, welcome);
      const c = await getOrCreateConversation(phone);
      await insertMessage(c.id, "assistant", welcome);
      return;
    }

    if (lower === "sigo yo") {
      const resp = "Perfecto, continuás vos. Avisame cuando termines para volver al Asistente Virtual.";
      await sendWhatsAppMessage(phone, resp);
      const conv = await getOrCreateConversation(phone);
      await insertMessage(conv.id, "assistant", resp);
      return;
    }

    if (lower === "seguí vos" || lower === "seguimos vos") {
      const resp = "¡Genial! Retomo la atención. ¿En qué estábamos?";
      await sendWhatsAppMessage(phone, resp);
      const conv = await getConversationByPhone(phone);
      if (conv) {
        await insertMessage(conv.id, "assistant", resp);
        await resetToIdle(conv.id);
      }
      return;
    }

    if (HABLAR_HUMANO.some((h) => lower.includes(h))) {
      const resp = "Te va a atender el primer chofer disponible. En breve te contactarán.";
      await sendWhatsAppMessage(phone, resp);
      const conv = await getOrCreateConversation(phone);
      await insertMessage(conv.id, "assistant", resp);
      await notifyAdmin(`🗣️ *Cliente pide atención humana*\n\nTeléfono: ${phone}\nMensaje: "${trimmed.substring(0, 100)}"`);
      return;
    }

    const registrarMatch = lower.match(/^\.registrar[-\s]?(.*)$/);
    if (registrarMatch) {
      const code = registrarMatch[1].trim();
      console.log(`[DEBUG_REGISTRAR] phone=${phone} code="${code}"`);

      if (!code) {
        const existing = await getDriverByPhone(phone);
        console.log(`[DEBUG_REGISTRAR] getDriverByPhone found=${!!existing} name=${existing?.name}`);
        const conv = await getOrCreateConversation(phone);
        if (existing) {
          const expiry = await getDriverExpiry(phone);
          const h = expiry.expiresAt ? expiry.expiresAt.getHours().toString().padStart(2, "0") : "23";
          const m = expiry.expiresAt ? expiry.expiresAt.getMinutes().toString().padStart(2, "0") : "59";
          const resp = `✅ Registrado hasta las ${h}:${m}hs de hoy. Buena jornada ${existing.name}!`;
          await sendWhatsAppMessage(phone, resp);
          await insertMessage(conv.id, "assistant", resp);
        } else {
          const resp = "❌ No tenés un código de registro. Pedile al administrador que te dé uno.";
          await sendWhatsAppMessage(phone, resp);
          await insertMessage(conv.id, "assistant", resp);
        }
        return;
      }

      const codeEntry = await getDriverCodeByCode(code);
      console.log(`[DEBUG_REGISTRAR] getDriverCodeByCode found=${!!codeEntry}`);
      if (!codeEntry) {
        const conv = await getOrCreateConversation(phone);
        const resp = "❌ Código inválido. Verificá con el administrador.";
        console.log(`[DEBUG_REGISTRAR] sending: ${resp.substring(0, 50)}`);
        await sendWhatsAppMessage(phone, resp);
        await insertMessage(conv.id, "assistant", resp);
        return;
      }

      if (codeEntry.phone && codeEntry.phone !== phone) {
        const conv = await getOrCreateConversation(phone);
        const resp = "❌ Este código ya está asignado a otro número.";
        console.log(`[DEBUG_REGISTRAR] sending: ${resp.substring(0, 50)}`);
        await sendWhatsAppMessage(phone, resp);
        await insertMessage(conv.id, "assistant", resp);
        return;
      }

      await getOrCreateConversation(phone);
      const result = await registerDriverByCode(code, phone);
      console.log(`[DEBUG_REGISTRAR] registerDriverByCode result=${!!result}`);
      if (!result) {
        const resp = "❌ Error al registrarte. Probá de nuevo.";
        console.log(`[DEBUG_REGISTRAR] sending: ${resp.substring(0, 50)}`);
        await sendWhatsAppMessage(phone, resp);
        const conv = await getConversationByPhone(phone);
        if (conv) await insertMessage(conv.id, "assistant", resp);
        return;
      }

      const expiry = await getDriverExpiry(phone);
      const h = expiry.expiresAt ? expiry.expiresAt.getHours().toString().padStart(2, "0") : "23";
      const m = expiry.expiresAt ? expiry.expiresAt.getMinutes().toString().padStart(2, "0") : "59";
      const resp = `✅ Registrado hasta las ${h}:${m}hs de hoy. Buena jornada ${codeEntry.name}!`;
      await sendWhatsAppMessage(phone, resp);
      const conv2 = await getConversationByPhone(phone);
      if (conv2) await insertMessage(conv2.id, "assistant", resp);
      return;
    }

    if (await handleAdminCommand(phone, trimmed)) return;

    const conversation = await getOrCreateConversation(phone, undefined);
    const freshConv = await getConversationById(conversation.id);
    if (!freshConv || freshConv.taken_by_human) return;

    const workflow = await getWorkflow(conversation.id);
    if (workflow && workflow.state !== "idle" && workflow.state !== "closed") return;

    await insertMessage(conversation.id, "user", text);

    let trip = await getActiveTripByPhone(phone);

    const history = await getRecentHistory(conversation.id, 20);

    let promoNote: string | undefined;
    if (trip?.tariff_id) {
      const discounts = await getDiscountsForTariff(trip.tariff_id);
      if (discounts.length > 0) {
        const maxPct = Math.max(...discounts.map((d: any) => d.discount_pct));
        promoNote = `🔥 PROMO DEL DÍA: descuento de hasta ${maxPct}% en esta ruta por tiempo limitado. Solo ofrecela si el cliente duda, pregunta por promos, o pide más descuento del estándar. No menciones esta promo si el cliente ya aceptó el precio.`;
      }
    }

    let response = await generateGroqReply(text, history, trip, phone, promoNote);

    const marker = extractTripMarker(response);
    if (marker) {
      response = stripTripMarker(response);
      if (trip && marker.destination !== trip.destination) {
        await updateTripState(trip.trip_id, "completado");
        trip = null;
      }
      if (!trip) {
        const tripId = `trip_${Date.now()}`;
        await createTrip(tripId, phone, marker.origin, marker.destination, marker.price, marker.passengers, marker.scheduledAt);
        await setConversationTrip(conversation.id, tripId);
        trip = await getActiveTripByPhone(phone);
        if (!trip) return;
        const tariff = await findTariff(marker.origin, marker.destination, marker.passengers);
        if (tariff) {
          await updateTripTariff(trip.trip_id, tariff.id, tariff.piso);
        }
      } else {
        if (marker.scheduledAt) await updateTripScheduledAt(trip.trip_id, marker.scheduledAt);
        if (!trip.piso_base) {
          const tariff = await findTariff(trip.origin || marker.origin, trip.destination || marker.destination, trip.passengers || marker.passengers);
          if (tariff) await updateTripTariff(trip.trip_id, tariff.id, tariff.piso);
        }
      }
    }

    const leadMarker = !marker ? extractLeadMarker(response) : null;
    if (leadMarker) {
      response = stripTripMarker(response);
    }

    await insertMessage(conversation.id, "assistant", response);
    await sendWhatsAppMessage(phone, response);

    if (leadMarker) {
      await createLead(conversation.id, phone, leadMarker.origin, leadMarker.destination, leadMarker.price, leadMarker.passengers);
      await broadcastLeadToDrivers(leadMarker, conversation.id, phone, leadMarker.urgency, leadMarker.passengers);
    }

    if (marker && trip && trip.destination && trip.price_base) {
      const u = (marker.urgency || "").toLowerCase();
      if (u.includes("reserva")) {
        await handleReservationSlotSelection(conversation.id, phone, trip);
      } else {
        await escalateTrip(conversation.id, phone, trip, marker.urgency, marker.passengers);
      }
    }
  } catch (e) {
    console.error("[LEAD_ERROR]", e);
    try {
      await sendWhatsAppMessage(phone, "Disculpe, ocurrió un error. Un operador lo asistirá.");
      const conv = await getConversationByPhone(phone);
      if (conv) await insertMessage(conv.id, "assistant", "Error interno. Cliente derivado a operador.");
    } catch (e2) {
      console.error("[LEAD_ERROR] fallback también falló:", e2);
    }
  }
}

async function handleReservationSlotSelection(convId: number, phone: string, trip: any): Promise<void> {
  const slots = await getActiveSlots();
  if (slots.length === 0) {
    await sendWhatsAppMessage(phone, "📅 Gracias por tu reserva. Te contactaremos para coordinar el horario.");
    await escalateTrip(convId, phone, trip, "reserva", trip.passengers);
    return;
  }

  await advanceToSlotSelection(convId, phone);

  const today = new Date();
  const sections: { title: string; rows: { id: string; title: string; description: string }[] }[] = [];
  const nowTs = Math.floor(Date.now() / 1000);

  for (let dayOffset = 0; dayOffset < 7 && sections.length < 3; dayOffset++) {
    const date = new Date(today);
    date.setDate(date.getDate() + dayOffset);
    const dow = date.getDay();
    const daySlots = slots.filter((s: any) => s.day_of_week === dow);
    if (daySlots.length === 0) continue;

    const dateStr = date.toISOString().split("T")[0];
    const title = dayOffset === 0 ? "Hoy" : dayOffset === 1 ? "Mañana" : date.toLocaleDateString("es-AR", { weekday: "long", day: "numeric", month: "short" });
    const rows: { id: string; title: string; description: string }[] = [];

    for (const s of daySlots) {
      const [sh, sm] = s.start_time.split(":").map(Number);
      const slotDate = new Date(date);
      slotDate.setHours(sh, sm, 0, 0);
      const slotTs = Math.floor(slotDate.getTime() / 1000);
      if (slotTs <= nowTs) continue;

      const label = s.label || `${s.start_time}-${s.end_time}`;
      rows.push({
        id: `slot_${convId}_${slotTs}`,
        title: label.substring(0, 24),
        description: `${dateStr} ${s.start_time} a ${s.end_time}`.substring(0, 72),
      });
    }

    if (rows.length > 0) {
      sections.push({ title, rows: rows.slice(0, 10) });
    }
  }

  if (sections.length === 0) {
    await sendWhatsAppMessage(phone, "📅 No hay horarios disponibles en los próximos días. Te contactaremos para coordinar.");
    await advanceToGroup(convId, phone);
    await escalateTrip(convId, phone, trip, "reserva", trip.passengers);
    return;
  }

  await sendInteractiveList(
    phone,
    "📅 Elegí el día y horario para tu reserva:",
    "Ver horarios",
    sections
  );
}

export async function handleSlotResponse(phone: string, buttonId: string): Promise<void> {
  const prefix = "slot_";
  if (!buttonId.startsWith(prefix)) return;

  const parts = buttonId.split("_");
  if (parts.length < 3) return;

  const convId = parseInt(parts[1]);
  const scheduledAt = parseInt(parts[2]);
  if (isNaN(convId) || isNaN(scheduledAt)) return;

  const workflow = await getWorkflow(convId);
  if (!workflow || workflow.state !== "awaiting_slot") return;

  const conv = await getConversationById(convId);
  if (!conv) return;

  const trip = await getActiveTripByPhone(phone);
  if (!trip) return;

  await updateTripScheduledAt(trip.trip_id, scheduledAt);

  const dateStr = new Date(scheduledAt * 1000).toLocaleString("es-AR", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  await sendWhatsAppMessage(phone, `✅ Reserva confirmada para el ${dateStr}. Buscamos chofer para vos.`);

  await advanceToGroup(convId, phone);
  await escalateTrip(convId, phone, trip, "reserva", trip.passengers);
}

async function escalateTrip(convId: number, phone: string, trip: any, urgency?: string, passengers?: number | null): Promise<void> {
  const u = (urgency || "").toLowerCase();

  if (u.includes("reserva")) {
    const pref = await getClientPreferredDriver(phone);
    if (pref) {
      const prefDriver = await getDriverByPhone(pref.preferred_driver_phone);
      if (prefDriver && prefDriver.active) {
        const expiry = await getDriverExpiry(pref.preferred_driver_phone);
        if (expiry.active) {
          await advanceToPreferred(convId, phone);
          const prefName = prefDriver.name || "chofer";
          await offerToSpecificDriver(
            prefDriver.phone, trip, convId,
            `⭐ *RESERVA — TU PASAJERO*`,
            `Este pasajero es tuyo. Tenés 3min para aceptar antes de que se ofrezca a otro chofer.`
          );
          console.log(`[PRIORITY] Reserva → preferido ${prefName} (${convId})`);
          return;
        }
      }
    }
    // No preferred/available → broadcast
    await advanceToGroup(convId, phone);
    await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
    return;
  }

  // "Ahora" or unknown → broadcast immediately
  await advanceToGroup(convId, phone);
  await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
}
