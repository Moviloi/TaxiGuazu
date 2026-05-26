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
  updateTripFlight,
  updateTripHotel,
  updateTripPassengers,
  updateTripOrigin,
  updateTripDestination,
  updateTripPriceBase,
  findTariff,
  getDiscountsForTariff,
  getDriverByPhone,
  getDriverCodeByCode,
  registerDriverByCode,
  getDriverExpiry,
  getPrincipalDriver,
  updateDriverShiftIfNull,
  getActiveSlots,
  clearConversationHistory,
  createLead,
  setCustomerName,
  getCustomerName,
  upsertChatSession,
  resetChatSession,
  getChatSession,
} from "@/lib/db/database";
import { generateGroqReply, generateGroqExtraction } from "@/lib/ai/groq";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import { sendWhatsAppMessage, sendInteractiveList } from "@/lib/whatsapp/sender";
import { broadcastTripToDrivers, broadcastLeadToDrivers, offerToSpecificDriver, getPrincipal2, notifyAdmin } from "./admin.service";
import { handleAdminCommand } from "./admin-commands";
import { FEATURE_CONFIDENCE_MATCHING, SESSION_INACTIVITY_48H_S } from "@/config/constants";
import type { TripRow } from "@/lib/db/types";
import { calculateSlotConfidence } from "@/lib/services/confidence";
import { evaluateWorkflowTransition } from "@/lib/services/state-machine";
import type { SlotWorkflowContext } from "@/lib/services/state-machine";
import { matchTariff } from "@/lib/services/tariff-matcher";
import type { TariffMatchResult } from "@/lib/services/tariff-matcher";
import {
  advanceToNivel1,
  advanceToNivel2,
  advanceToNivel3,
  advanceToWaitingDriver,
  advanceToGroup,
  resetToIdle,
  getWorkflow,
  advanceToSlotSelection,
} from "@/lib/utils/state-machine";

const TRIP_MARKER_REGEX = /\[DATOS_VIAJE:\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|\s*([^|\]]+?)(?:\s*\|\s*([^|\]]+?))?(?:\s*\|\s*([^|\]]+?))?\]/i;

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

function extractTripMarker(text: string): { code: string; origin: string; destination: string; price: number; passengers: number; urgency: string; scheduledAt?: number; flightNumber?: string } | null {
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
    } else {
      result.flightNumber = dateStr;
    }
  }
  if (match[8]) {
    result.flightNumber = match[8].trim();
  }
  return result;
}

function stripTripMarker(text: string): string {
  return text.replace(TRIP_MARKER_REGEX, "").replace(LEAD_MARKER_REGEX, "").trim();
}

const AFFIRMATIVE_RE = /^(s[ií]|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|s[ií] dale|s[ií] gracias)\b/i;

function isAffirmativeMessage(text: string): boolean {
  const t = text.trim().toLowerCase();
  if (AFFIRMATIVE_RE.test(t)) return true;
  const clean = t.replace(/[^a-záéíóúñ\s]/g, "").trim();
  return /\b(s[ií]|ok|dale|confirmo|adelante)\b/.test(clean);
}

function formatConfidenceNote(
  e: TripExtraction,
  confidenceResult: ExtractionResult,
  workflowResult: SlotWorkflowContext,
  tariffMatch?: TariffMatchResult,
): string {
  const parts: string[] = [];
  if (e.origin) {
    const originScore = confidenceResult.slots.origin?.score ?? 0;
    if (confidenceResult.slots.origin?.reason === "unknown_location") {
      parts.push(`Origen desconocido: "${e.origin}". No está en mi tarifario. Preguntale al cliente qué lugar quiso decir.`);
    } else {
      const originCanonical = tariffMatch?.canonicalOrigin;
      const originLabel = originCanonical && originCanonical !== e.origin
        ? `"${e.origin}" → ${originCanonical}`
        : `"${e.origin}"`;
      parts.push(`Origen: ${originLabel} (Confianza: ${originScore * 100}%)`);
    }
  }
  if (e.destination) {
    const destScore = confidenceResult.slots.destination?.score ?? 0;
    if (confidenceResult.slots.destination?.reason === "unknown_location") {
      parts.push(`Destino desconocido: "${e.destination}". No está en mi tarifario. Preguntale al cliente qué lugar quiso decir.`);
    } else {
      const destCanonical = tariffMatch?.canonicalDestination;
      const destLabel = destCanonical && destCanonical !== e.destination
        ? `"${e.destination}" → ${destCanonical}`
        : `"${e.destination}"`;
      parts.push(`Destino: ${destLabel} (Confianza: ${destScore * 100}%)`);
    }
  }
  if (e.passengers) parts.push(`Pasajeros: ${e.passengers}`);
  if (e.price) parts.push(`Precio: $${e.price}`);
  if (e.urgency) parts.push(`Urgencia: ${e.urgency}`);
  if (e.flight) parts.push(`Vuelo: ${e.flight}`);
  if (e.scheduled_at) parts.push(`Fecha: ${e.scheduled_at}`);
  if (e.customer_name) parts.push(`Nombre: ${e.customer_name}`);

  // Backend-matched tariff info replaces LLM price calculation
  if (tariffMatch?.matched) {
    const pax = e.passengers || 1;
    const priceLabel = pax > 4 ? "precio hasta 6 pasajeros" : "precio hasta 4 pasajeros";
    parts.push(`PRECIO OFICIAL (calculado por backend): $${tariffMatch.price} ARS (${priceLabel}).`);
    parts.push(`VALOR_PRECIO: ${tariffMatch.price}`);
    parts.push(`PRECIO_REFERENCIA_4P: $${tariffMatch.price4p}`);
    parts.push(`PRECIO_REFERENCIA_6P: $${tariffMatch.price6p}`);
    parts.push(`Ruta oficial: ${tariffMatch.canonicalOrigin} → ${tariffMatch.canonicalDestination}.`);
    parts.push(`NO calcules ni modifiques este precio. Usá SOLO los valores oficiales del backend.`);
    if (tariffMatch.method === "fuzzy") {
      parts.push(`(Match aproximado — el chofer confirmará el precio exacto.)`);
    }
  } else if (e.origin && e.destination) {
    parts.push(`PRECIO: No hay tarifa exacta en la base de datos para esta ruta. Derivalo como lead de consulta. No inventes un precio.`);
  }

  const header = `Confianza general: ${confidenceResult.overall_confidence * 100}%. Estado: ${workflowResult.state}.` +
    (workflowResult.clarifyField ? ` Campo a clarificar: ${workflowResult.clarifyField}.` : "") +
    (workflowResult.askForConfirmation ? " El cliente debe confirmar los datos." : "");

  if (parts.length === 0) return header;
  return `${header}\n${parts.join("\n")}`;
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
        ? "Bienvenido a TaxiGuazú! Soy Cris Virtual (Asistente 24/7). ¿A dónde necesitas ir?"
        : "Hola! Soy Cris Virtual (Asistente 24/7). ¿En qué te ayudo?";
      await sendWhatsAppMessage(phone, welcome);
      const c = await getOrCreateConversation(phone);
      await insertMessage(c.id, "assistant", welcome);
      return;
    }

    if (lower === "sigo yo") {
      const resp = "Perfecto, continuás vos. Avisame cuando termines para volver con Cris Virtual.";
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

    // ── -activar / .activo / .activar (driver daily check-in) ──
    const activarMatch = lower.match(/^[-.]activar$|^\.activo$/);
    if (activarMatch) {
      const existing = await getDriverByPhone(phone);
      if (!existing) {
        const conv = await getOrCreateConversation(phone);
        const resp = "❌ No estás registrado como chofer. Pedí al administrador que te dé de alta.";
        await sendWhatsAppMessage(phone, resp);
        await insertMessage(conv.id, "assistant", resp);
        return;
      }
      await getOrCreateConversation(phone);
      const shift = await updateDriverShiftIfNull(phone);
      const msg = buildShiftActivationMsg(shift || "day", existing.name || "Chofer");
      await sendWhatsAppMessage(phone, msg || "✅ Activado!");
      const conv = await getConversationByPhone(phone);
      if (conv) await insertMessage(conv.id, "assistant", msg || "✅ Activado!");
      // Always check shift-end prompt after activation
      if (shift) {
        const prompt = buildShiftEndPrompt(shift);
        if (prompt) {
          await sendWhatsAppMessage(phone, prompt);
          if (conv) await insertMessage(conv.id, "assistant", prompt);
        }
      }
      return;
    }

    const registrarMatch = lower.match(/^\.registrar[-\s]?(.*)$/);
    if (registrarMatch) {
      const code = registrarMatch[1].trim();
      console.log(`[DEBUG_REGISTRAR] phone=${phone} code="${code}"`);

      if (!code) {
        // .registrar without code = alias for -activar (registered drivers)
        const existing = await getDriverByPhone(phone);
        if (existing) {
          await getOrCreateConversation(phone);
          const shift = await updateDriverShiftIfNull(phone);
          const msg = buildShiftActivationMsg(shift || "day", existing.name || "Chofer");
          await sendWhatsAppMessage(phone, msg || "✅ Activado!");
          const conv = await getConversationByPhone(phone);
          if (conv) await insertMessage(conv.id, "assistant", msg || "✅ Activado!");
          if (shift) {
            const prompt = buildShiftEndPrompt(shift);
            if (prompt) {
              await sendWhatsAppMessage(phone, prompt);
              if (conv) await insertMessage(conv.id, "assistant", prompt);
            }
          }
        } else {
          const conv = await getOrCreateConversation(phone);
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

      const shift = await updateDriverShiftIfNull(phone);
      const msg = buildShiftActivationMsg(shift || "day", codeEntry.name || "Chofer");
      await sendWhatsAppMessage(phone, msg || "✅ Activado!");
      const conv2 = await getConversationByPhone(phone);
      if (conv2) await insertMessage(conv2.id, "assistant", msg || "✅ Activado!");
      if (shift) {
        const prompt = buildShiftEndPrompt(shift);
        if (prompt) {
          await sendWhatsAppMessage(phone, prompt);
          if (conv2) await insertMessage(conv2.id, "assistant", prompt);
        }
      }
      return;
    }

    if (await handleAdminCommand(phone, trimmed)) return;

    const conversation = await getOrCreateConversation(phone, undefined);
    const freshConv = await getConversationById(conversation.id);
    if (!freshConv || freshConv.taken_by_human) return;

    const workflow = await getWorkflow(conversation.id);
    if (workflow && workflow.state !== "idle" && workflow.state !== "closed") return;

    // === SESSION RESET CHECK ===
    const now = Math.floor(Date.now() / 1000);
    let sessionReset = false;
    let customerName = null;
    let trip = await getActiveTripByPhone(phone);

    // Condition A: Trip con scheduled_at en el pasado y no completado
    if (trip && trip.scheduled_at && trip.scheduled_at < now) {
      console.log(`[SESSION] Cond A: trip ${trip.trip_id} expirado, archivando`);
      await updateTripState(trip.trip_id, 'completado');
      sessionReset = true;
      trip = null;
    }

    // Condition B: Sin reserva confirmada + >48h inactividad
    if (!sessionReset) {
      const lastMsgAt = freshConv.last_message_at || 0;
      const inactive48h = (now - lastMsgAt) > SESSION_INACTIVITY_48H_S;
      if (inactive48h && !trip) {
        console.log(`[SESSION] Cond B: inactividad >48h sin reserva, reseteando`);
        sessionReset = true;
      }
    }

    // Condition C: trip activo con futuro → no reset (implícito, no hacer nada)

    // Extract or restore customer name
    if (sessionReset) {
      await clearConversationHistory(conversation.id);
      await resetToIdle(conversation.id);
      if (FEATURE_CONFIDENCE_MATCHING) {
        await resetChatSession(phone);
      }
    }
    customerName = await getCustomerName(phone);

    // If user introduces themselves in this message, store it
    const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+(\w+(?:\s+\w+)?)/i);
    if (nameMatch) {
      await setCustomerName(phone, nameMatch[1]);
      customerName = nameMatch[1];
    }

    await insertMessage(conversation.id, "user", text);

    // === CONFIRMATION CHECK (Phase 5-6) ===
    // If workflow_state is "awaiting_confirmation" and user affirms → dispatch directly
    if (FEATURE_CONFIDENCE_MATCHING) {
      const session = await getChatSession(phone);
      if (session?.workflow_state === "awaiting_confirmation" && isAffirmativeMessage(text)) {
        const slots = JSON.parse(session.slots || "{}");
        const pax = slots.passengers || 1;
        const origin = slots.origin || "";
        const destination = slots.destination || "";
        if (origin && destination) {
          const tariffMatch = await matchTariff(origin, destination, pax);
          const tripId = `trip_${Date.now()}`;
          await createTrip(tripId, phone, origin, destination, tariffMatch.matched ? tariffMatch.price : (slots.price || undefined), pax, slots.scheduled_at ? Math.floor(new Date(slots.scheduled_at).getTime() / 1000) : undefined, slots.flight || undefined);
          await setConversationTrip(conversation.id, tripId);
          const trip = await getActiveTripByPhone(phone);
          if (trip) {
            if (tariffMatch.matched) {
              await updateTripTariff(trip.trip_id, tariffMatch.tariffId, tariffMatch.piso);
            }
            const confirmMsg = "✅ ¡Viaje confirmado! Buscamos chofer para vos.";
            await sendWhatsAppMessage(phone, confirmMsg);
            await insertMessage(conversation.id, "assistant", confirmMsg);
            const urgency = slots.urgency || "ahora";
            await escalateTrip(conversation.id, phone, trip, urgency, pax);
          }
        }
        await resetChatSession(phone);
        return;
      }
    }

    const history = sessionReset ? [] : await getRecentHistory(conversation.id, 20);

    let promoNote: string | undefined;
    if (trip?.tariff_id) {
      const discounts = await getDiscountsForTariff(trip.tariff_id);
      if (discounts.length > 0) {
        const maxPct = Math.max(...discounts.map((d) => d.discount_pct));
        promoNote = `🔥 PROMO DEL DÍA: descuento de hasta ${maxPct}% en esta ruta por tiempo limitado. Solo ofrecela si el cliente duda, pregunta por promos, o pide más descuento del estándar. No menciones esta promo si el cliente ya aceptó el precio.`;
      }
    }

    // === CONFIDENCE-BASED EXTRACTION + ENGINE (Phases 1-4) ===
    let extractionNote: string | undefined;
    let workflowResult: SlotWorkflowContext | undefined;
    if (FEATURE_CONFIDENCE_MATCHING) {
      try {
        const raw = await generateGroqExtraction(text, history, customerName || undefined);
        if (raw) {
          const parsed = TripExtractionSchema.safeParse(raw);
          if (parsed.success) {
            const confidenceResult = await calculateSlotConfidence(parsed.data, phone, text);

            // Phase 4: Backend tariff matching — inject real price if origin + destination known
            let tariffMatch: TariffMatchResult | undefined;
            if (parsed.data.origin && parsed.data.destination) {
              const pax = parsed.data.passengers || 1;
              tariffMatch = await matchTariff(parsed.data.origin, parsed.data.destination, pax);
              if (tariffMatch.matched) {
                parsed.data.price = tariffMatch.price;
                confidenceResult.slots.price = { value: tariffMatch.price, score: 1.0, reason: "backend_tariff_match" };
              }
            }

            workflowResult = await evaluateWorkflowTransition(phone, confidenceResult);

            const confByField: Record<string, number> = {};
            for (const [k, v] of Object.entries(confidenceResult.slots)) {
              confByField[k] = v.score;
            }

            await upsertChatSession(phone, parsed.data as Record<string, any>, confByField, workflowResult.state, workflowResult.clarifyField ?? undefined);

            extractionNote = formatConfidenceNote(parsed.data, confidenceResult, workflowResult, tariffMatch);
          }
        }
      } catch (e) {
        console.error("[EXTRACTION] error:", e);
      }
    }

    const skipMarkers = FEATURE_CONFIDENCE_MATCHING && !!workflowResult;
    let response = await generateGroqReply(text, history, trip, phone, promoNote, customerName || undefined, extractionNote, skipMarkers);

    if (FEATURE_CONFIDENCE_MATCHING && workflowResult) {
      // === NEW FLOW (Phases 5-6): workflow-based routing, no marker parsing ===
      response = stripTripMarker(response);
      await insertMessage(conversation.id, "assistant", response);
      await sendWhatsAppMessage(phone, response);

      if (workflowResult.state === "awaiting_confirmation") {
        // The reply already asked the user to confirm. Wait for next message.
        // On next call, the confirmation check (above) will detect the affirmative.
      } else if (workflowResult.state === "collecting_slots" && workflowResult.clarifyField) {
        // The reply already asked for the missing field. Nothing to do — wait for user input.
      }
    } else {
      // === LEGACY FLOW: marker-based parsing (fallback when FEATURE_CONFIDENCE_MATCHING is off) ===
      let marker = extractTripMarker(response);
      if (marker) {
        if (!marker.passengers || marker.passengers <= 0) {
          console.log(`[GUARD] Marker con passengers=${marker.passengers}, eliminando: ${response.substring(0,80)}...`);
          response = stripTripMarker(response);
          marker = null;
        }
      }
      if (marker) {
        response = stripTripMarker(response);
        if (!trip) {
          const tripId = `trip_${Date.now()}`;
          await createTrip(tripId, phone, marker.origin, marker.destination, marker.price, marker.passengers, marker.scheduledAt, marker.flightNumber);
          await setConversationTrip(conversation.id, tripId);
          trip = await getActiveTripByPhone(phone);
          if (!trip) return;
          const tariff = await findTariff(marker.origin, marker.destination, marker.passengers);
          if (tariff) {
            await updateTripTariff(trip.trip_id, tariff.id, tariff.piso);
          }
          if (marker.destination.toLowerCase().includes("pendiente hotel")) {
            await updateTripHotel(trip.trip_id, "A confirmar por el chofer");
          }
        } else {
          if (marker.passengers && marker.passengers !== trip.passengers) await updateTripPassengers(trip.trip_id, marker.passengers);
          if (marker.origin && marker.origin !== trip.origin) await updateTripOrigin(trip.trip_id, marker.origin);
          if (marker.destination && marker.destination !== trip.destination) await updateTripDestination(trip.trip_id, marker.destination);
          if (marker.price && marker.price !== trip.price_base) await updateTripPriceBase(trip.trip_id, marker.price);
          if (marker.scheduledAt) await updateTripScheduledAt(trip.trip_id, marker.scheduledAt);
          if (marker.flightNumber) await updateTripFlight(trip.trip_id, marker.flightNumber);
          if (marker.destination.toLowerCase().includes("pendiente hotel")) {
            await updateTripHotel(trip.trip_id, "A confirmar por el chofer");
          }
          const tariff = await findTariff(trip.origin || marker.origin, trip.destination || marker.destination, trip.passengers || marker.passengers);
          if (tariff && !trip.piso_base) {
            await updateTripTariff(trip.trip_id, tariff.id, tariff.piso);
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
    }

    // ── Shift-end auto-prompt for drivers ──
    try {
      const driver = await getDriverByPhone(phone);
      if (driver && driver.shift) {
        const prompt = buildShiftEndPrompt(driver.shift);
        if (prompt) {
          await sendWhatsAppMessage(phone, prompt);
          const conv = await getConversationByPhone(phone);
          if (conv) await insertMessage(conv.id, "assistant", prompt);
        }
      }
    } catch (_) { /* silent */ }
  } catch (e) {
    console.error("[LEAD_ERROR]", e);
    const errMsg = `⚠️ *Error en bot — cliente sin respuesta*\n\nTeléfono: ${phone}\nError: ${e instanceof Error ? e.message : String(e)}`;
    try {
      await sendWhatsAppMessage(phone, "Disculpe, ocurrió un error. Un operador lo asistirá.");
      const conv = await getConversationByPhone(phone);
      if (conv) await insertMessage(conv.id, "assistant", "Error interno. Cliente derivado a operador.");
    } catch (e2) {
      console.error("[LEAD_ERROR] fallback msg también falló:", e2);
    }
    try {
      await notifyAdmin(errMsg);
    } catch (e3) {
      console.error("[LEAD_ERROR] fallback admin notify también falló:", e3);
    }
  }
}

async function handleReservationSlotSelection(convId: number, phone: string, trip: TripRow): Promise<void> {
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

  await escalateTrip(convId, phone, trip, "reserva", trip.passengers);
}

async function escalateTrip(convId: number, phone: string, trip: TripRow, urgency?: string, passengers?: number | null): Promise<void> {
  const u = (urgency || "").toLowerCase();

  if (u.includes("reserva")) {
    // Nivel 1: Principal (Cristian, 1h timeout)
    const principal = await getPrincipalDriver();
    if (principal && principal.active) {
      const expiry = await getDriverExpiry(principal.phone);
      if (expiry.active) {
        await advanceToNivel1(convId, phone);
        await offerToSpecificDriver(
          principal.phone, trip, convId,
          `⭐ *NIVEL 1 — RESERVA*`,
          `Sos el Principal. Tenés 1h para aceptar antes de pasar al siguiente nivel.`
        );
        console.log(`[DISPATCH] Reserva → Nivel 1 (${principal.name}) conv ${convId}`);
        return;
      }
    }
    // Nivel 2: Principal2 (30min timeout)
    const principal2 = await getPrincipal2();
    if (principal2 && principal2.active) {
      const expiry = await getDriverExpiry(principal2.phone);
      if (expiry.active) {
        await advanceToNivel2(convId, phone);
        await offerToSpecificDriver(
          principal2.phone, trip, convId,
          `⭐ *NIVEL 2 — RESERVA*`,
          `Sos el Segundo Principal. Tenés 30min para aceptar.`
        );
        console.log(`[DISPATCH] Reserva → Nivel 2 (${principal2.name}) conv ${convId}`);
        return;
      }
    }
    // Nivel 3: Broadcast
    await advanceToNivel3(convId, phone);
    await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
    console.log(`[DISPATCH] Reserva → Nivel 3 (broadcast) conv ${convId}`);
    return;
  }

  if (u.includes("ahora")) {
    // "Ahora" → waiting_driver + broadcast inmediato
    await advanceToWaitingDriver(convId, phone);
    await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
    console.log(`[DISPATCH] Ahora → waiting_driver + broadcast conv ${convId}`);
    return;
  }

  // Consulta/otro → broadcast directo
  await advanceToGroup(convId, phone);
  await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
  console.log(`[DISPATCH] Consulta/otro → broadcast conv ${convId}`);
}

function computeShiftEnd(shift: string): Date | null {
  if (shift !== "day" && shift !== "night") return null;
  const now = new Date();
  const endHour = shift === "day" ? 18 : 6;
  const end = new Date(now);
  end.setHours(endHour, 0, 0, 0);
  if (now >= end) end.setDate(end.getDate() + 1);
  return end;
}

function buildShiftActivationMsg(shift: string, name: string): string | null {
  if (shift !== "day" && shift !== "night") return null;
  const end = computeShiftEnd(shift);
  if (!end) return null;
  const h = end.getHours().toString().padStart(2, "0");
  const m = end.getMinutes().toString().padStart(2, "0");
  const label = shift === "day" ? "☀️ día (6-18)" : "🌙 noche (18-6)";
  return `🔥 Activado! Turno ${label} hasta las ${h}:${m}. Buena jornada ${name}!`;
}

function buildShiftEndPrompt(driverShift: string): string | null {
  if (driverShift !== "day" && driverShift !== "night") return null;
  const end = computeShiftEnd(driverShift);
  if (!end) return null;
  const now = Date.now();
  const remainingMs = end.getTime() - now;
  if (remainingMs <= 0 || remainingMs > 1800000) return null; // only within 30min of shift end
  const min = Math.ceil(remainingMs / 60000);
  return `⚠️ Tu turno termina en ${min} min. Mandá -activar mañana para renovar.`;
}
