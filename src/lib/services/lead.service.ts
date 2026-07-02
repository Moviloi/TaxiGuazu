import { getConversationByPhone, insertMessage, getChatSession, upsertChatSession } from "@/lib/db/database";
import { buildGlobalErrorMessage, buildGreetingIntro } from "@/lib/ai/response-builder";
import { resetRequestState } from "@/lib/ai/guard";
import { core } from "@/lib/ai/core";
import type { Intent } from "@/lib/ai/types";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/sender";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";

import { handleCommandShortcuts } from "@/lib/services/workflow/command-shortcuts";
import { handleResponseReset } from "@/lib/services/workflow/response-reset";
import { handleAdminCommands } from "@/lib/services/workflow/command-router";
import { handleConversationSetup } from "@/lib/services/workflow/conversation-setup";
import { handleOpportunityResponse } from "@/lib/services/workflow/opportunity-response";
import { handlePolicyPipeline } from "@/lib/services/workflow/policy-pipeline";
import { buildMemory } from "@/lib/services/memory/memory";
import { buildPredictedContext } from "@/lib/services/memory/predictive-routing";
import { logIntentDetected, logEntityDetected } from "@/lib/services/learning/event-tracking";
import { runComprehensionCheck } from "@/lib/services/extraction/comprehension-runner";
import { runExtractionPipeline } from "@/lib/services/extraction/extraction-runner";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import { buildFieldSelector, buildSlotConfirmationMessage } from "@/lib/ai/slot-confirmation";
import { startAmbiguityResolution, handleAmbiguityResponse } from "@/lib/services/workflow/ambiguity-handler";
import { detectLeadLang } from "@/lib/detect-lang";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import type { ExtractionContext } from "@/lib/ai/extraction-prompt";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Mapa de números en español a dígitos. */
const WORD_TO_NUM: Record<string, number> = {
  un: 1, uno: 1, una: 1,
  dos: 2,
  tres: 3,
  cuatro: 4,
  cinco: 5,
  seis: 6,
  siete: 7,
  ocho: 8,
  nueve: 9,
  diez: 10,
  once: 11,
  doce: 12,
  trece: 13,
  catorce: 14,
  quince: 15,
  veinte: 20,
  treinta: 30,
  cincuenta: 50,
  cien: 100,
};

/**
 * Intenta extraer un número de pasajeros del texto del usuario.
 * Capa determinista (0ms, sin LLM) del híbrido regex+LLM.
 * Retorna null si no puede determinarlo → invocar fallback LLM.
 */
function parsePassengerCount(text: string): number | null {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return null;

  // Expresión regular: resuelve palabra N a dígito
  const resolveNum = (raw: string): number | null => {
    if (/^\d+$/.test(raw)) {
      const n = parseInt(raw, 10);
      return n >= 1 && n <= 99 ? n : null;
    }
    return WORD_TO_NUM[raw] ?? null;
  };

  // Patrones en orden de especificidad:
  const patterns = [
    // 1. "un grupo/familia/equipo de/con N":  "grupo de 4", "familia con 5", "un grupo de tres"
    /\b(?:un\s+)?(?:grupo|familia|compañ[íi]a|equipo)\s+(?:de|con)\s+(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,

    // 2. Colectivo + número: "somos 5", "somo 5", "viajamos 3", "hay 3", "son 4", "tenemos 2", "somos cinco"
    /\b(?:somos?|viajamos?|vamos?|hay|son|tenemos?|ser[éa]mos?|andamos?)\s+(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,

    // 3. Número + palabra clave: "5 personas", "3 pax", "2 pasajeros", "cinco personas"
    /\b(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s*(?:personas?|pax|pasajeros?|adultos?|nenes?|chicos?|ni[ñn]os?|amigos?|familiares?|bebés?|mayor(?:es)?)\b/i,

    // 4. Palabra clave + número: "pasajeros 3", "personas 5"
    /\b(?:pasajeros?|personas?|pax)\s+(son\s+)?(\d+|un[oa]?|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\b/i,

    // 5. "N" suelto (solo dígito): "3", "5"
    /^\s*(\d{1,2})\s*$/,
  ];

  for (const re of patterns) {
    const m = trimmed.match(re);
    if (m) {
      const group = m.length >= 3 ? (m[2] || m[1]) : m[1];
      const n = resolveNum(group);
      if (n != null && n >= 1 && n <= 99) return n;
    }
  }

  return null;
}

import { log } from "@/lib/utils/logger";

// ── COORDINATOR ──
// Routes the webhook message through sub-handlers. Each handler returns true
// if it fully handled the message (caller should return immediately).
export async function handleLeadMessage(phone: string, text: string): Promise<void> {
  try {
    log.info("[TRACE WEBHOOK MESSAGE]", { event: "message_received", phoneLen: phone.length, textLen: text.length });
    log.info(`[DEBUG_LEAD] phone=******${phone.slice(-4)} textLen=${text.length}`);
    resetRequestState();
    const trimmed = text.trim();
    const lower = trimmed.toLowerCase();

    // ── ZONE: COMMAND SHORTCUTS ──
    if (lower === ".limpiar") {
      await handleResponseReset(phone);
      const [postSession, postState] = await Promise.all([
        getChatSession(phone).catch(() => null),
        getConversationalState(phone).catch(() => null),
      ]);
      log.info("[AUDIT_LIMPIAR]", {
        phone: phone.slice(-4),
        command: ".limpiar",
        postClearSlots: postSession?.slots ? parseSessionSlots(postSession.slots) : null,
        postClearState: postState,
      });
      return;
    }
    if (await handleCommandShortcuts(phone, trimmed, lower)) return;

    // ── ZONE: DRIVER + ADMIN COMMANDS ──
    if (await handleAdminCommands(phone, lower, trimmed)) return;

    // ── ZONE: CONVERSATION SETUP ──
    const setupResult = await handleConversationSetup(phone, text);
    if (!setupResult) return;
    const { conversation, history, customerName, workflow } = setupResult;

    // ── ZONE: OPPORTUNITY RESPONSE ──
    if (await handleOpportunityResponse(phone, text, conversation.id, workflow)) return;

    // ── ZONE: MEMORY + COMPREHENSION + EXTRACTION ──
    const session = await getChatSession(phone);
    const memory = buildMemory(session, history);
    const leadCore = core(text, (memory.sessionMemory.lastIntent ?? undefined) as Intent | undefined);

    // ── ZONE: GREETING SHORTCUT — bypass extraction y comprehension ──
    if (leadCore.intent === "GREETING") {
      log.info("[GREETING_SHORTCUT]", { text, confidence: leadCore.confidence });
      await handlePolicyPipeline({
        phone, text, conversation, history, customerName,
        leadCore, extractionCtx: undefined, pricing: undefined,
        workflowResult: undefined, confidenceResult: undefined,
        prevSlotsEarly: {}, parsedData: undefined,
        domain: mapIntentToDomain(leadCore.intent),
        sessionUpdatedAt: session?.updated_at,
      });
      return;
    }

    // ── ZONE: COMBINED GREETING + REQUEST — send persona intro before business response ──
    // Detecta mensajes con saludo + pedido sustantivo en el mismo texto
    // (ej: "hola quiero ir del aeropuerto al centro").
    // Envía presentación corta de Cris y continúa al flujo normal para el mensaje de negocio.
    if (leadCore.facts.some(f => f.startsWith("greeting:"))) {
      const lang = detectLeadLang(text);
      const introMsg = buildGreetingIntro(lang, customerName ?? undefined);
      log.info("[COMBINED_GREETING]", { text, facts: leadCore.facts, introMsg });
      await sendWhatsAppMessage(phone, introMsg);
      await insertMessage(conversation.id, "assistant", introMsg);
      // Continue to normal processing — the business response follows as a second message
    }

    // ── ZONE: SLOT CONFIRMATION BUTTONS ──
    const SLOT_BUTTON_RE = /^(slot_confirm|slot_change|change_origin|change_destination|change_passengers|change_scheduled_at|change_back)$/;
    const slotButtonMatch = trimmed.match(SLOT_BUTTON_RE);
    if (slotButtonMatch) {
      await handleSlotConfirmationButton(phone, trimmed, conversation, history, customerName, leadCore, session);
      return;
    }

    // ── ZONE: STRUCTURED TEXT IN SLOT_CONFIRMATION STATE ──
    // If user is in slot_confirmation state but sends text instead of clicking buttons,
    // handle affirmatives as confirm, negatives as change, or apply slot corrections.
    const slotState = session?.conversational_state;
    if (slotState === "slot_confirmation") {
      log.info("[SLOT_TEXT_IN_CONFIRMATION]", { text, state: slotState });

      const { isAffirmativeMessage, isNegativeMessage, isCorrectionMessage } = await import("@/lib/ai/patterns");

      // 1) Affirmative → treat as slot_confirm
      if (isAffirmativeMessage(trimmed)) {
        log.info("[SLOT_TEXT] affirmative in slot_confirmation → slot_confirm");
        await handleSlotConfirmationButton(phone, "slot_confirm", conversation, history, customerName, leadCore, session);
        return;
      }

      // 2) Negative or correction → treat as slot_change (show field selector)
      if (isNegativeMessage(trimmed) || isCorrectionMessage(trimmed)) {
        log.info("[SLOT_TEXT] negative/correction in slot_confirmation → slot_change");
        await handleSlotConfirmationButton(phone, "slot_change", conversation, history, customerName, leadCore, session);
        return;
      }

      // 3) Detect slot corrections from core() roleLock or simple patterns
      let rawSlots: Record<string, any> = {};
      let rawConfidence: Record<string, number> = {};
      rawSlots = parseSessionSlots(session?.slots ?? null) as Record<string, any>;
      rawConfidence = parseConfidenceJson(session?.confidence ?? null);

      let updatedSlots = false;

      // 3a) Core roleLock extraction (catches "estoy en X quiero ir a Y", "viajar desde X hasta Y", etc.)
      if (leadCore.roleLock?.destination && leadCore.roleLock.destination !== (rawSlots.destination ?? '')) {
        rawSlots.destination = leadCore.roleLock.destination;
        rawConfidence.destination = 1.0;
        updatedSlots = true;
      }
      if (leadCore.roleLock?.origin && leadCore.roleLock.origin !== (rawSlots.origin ?? '')) {
        rawSlots.origin = leadCore.roleLock.origin;
        rawConfidence.origin = 1.0;
        updatedSlots = true;
      }

      // 3b) Simple regex patterns for corrections like "al centro", "desde el hotel"
      if (!updatedSlots) {
        const SIMPLE_DEST_RE = /^(?:a[sls]?\s+|para\s+|hasta\s+|hacia\s+)(.+)$/i;
        const destMatch = trimmed.match(SIMPLE_DEST_RE);
        if (destMatch && destMatch[1].trim() !== (rawSlots.destination ?? '')) {
          rawSlots.destination = destMatch[1].trim();
          rawConfidence.destination = 1.0;
          updatedSlots = true;
        }
      }
      if (!updatedSlots) {
        const SIMPLE_ORIGIN_RE = /^(?:desde\s+|de[l]?\s+|saliendo\s+(?:de\s+)?)(.+)$/i;
        const originMatch = trimmed.match(SIMPLE_ORIGIN_RE);
        if (originMatch && originMatch[1].trim() !== (rawSlots.origin ?? '')) {
          rawSlots.origin = originMatch[1].trim();
          rawConfidence.origin = 1.0;
          updatedSlots = true;
        }
      }

      // 4) Fallback message (defined here for use below)
      const fallbackMsg = "¿Querés confirmar o cambiar los datos? Usá los botones de abajo 👇";

      if (updatedSlots) {
        const { upsertChatSession } = await import("@/lib/db/database");
        await upsertChatSession(phone, rawSlots, rawConfidence, "slot_confirmation", undefined);

        // Re-build extraction context from updated slots for confirmation UI
        const updatedExtractionCtx = buildExtractionContext(
          { origin: rawSlots.origin, destination: rawSlots.destination } as any,
          undefined,
          { state: "slot_confirmation", overallConfidence: 1.0, clarifyField: null, action: "clarify", askForConfirmation: true } as any,
          undefined,
          { origin: rawSlots.origin ?? null, destination: rawSlots.destination ?? null },
          { origin: "locked", destination: "locked" },
          {},
        );

        if (!updatedExtractionCtx) {
          await sendWhatsAppMessage(phone, fallbackMsg);
          await insertMessage(conversation.id, "assistant", fallbackMsg);
          return;
        }
        const confirm = buildSlotConfirmationMessage(updatedExtractionCtx, detectLeadLang(text));
        await sendInteractiveButtons(phone, confirm.message!, confirm.buttons!);
        await insertMessage(conversation.id, "assistant", confirm.message!);
        return;
      }

      // Send fallback: remind user to use buttons
      await sendWhatsAppMessage(phone, fallbackMsg);
      await insertMessage(conversation.id, "assistant", fallbackMsg);
      return;
    }

    // ── ZONE: AWAITING_PASSENGER STATE ──
    // User was shown both prices, waiting for passenger count
    if (slotState === "awaiting_passenger") {
      log.info("[AWAITING_PASSENGER]", { text });

      // ── Capa 1: Regex determinista ──
      let paxCount = parsePassengerCount(trimmed);

      // ── Capa 2: Fallback LLM si regex no pudo resolver ──
      if (paxCount == null) {
        log.info("[AWAITING_PASSENGER] regex falló → probando LLM fallback");
        // Construir context mínimo con prevSlots para que el LLM tenga
        // contexto de que se le preguntó por pasajeros
        const prevSlots = session?.slots
          ? (parseSessionSlots(session.slots) as Record<string, string | number>)
          : undefined;
        const llmCtx: ExtractionContext = prevSlots ? { prevSlots } : {};
        const extracted = await extractSlots(trimmed, history, customerName || undefined, llmCtx)
          .catch(() => null);
        const llmPax = extracted?.passengers ?? null;
        if (llmPax != null && llmPax > 0 && llmPax <= 99) {
          paxCount = llmPax;
          log.info("[AWAITING_PASSENGER] LLM resolvió pax:", { paxCount });
        } else {
          log.info("[AWAITING_PASSENGER] LLM tampoco resolvió");
        }
      }

      if (paxCount != null) {
        if (paxCount > 6) {
          const msg = `Máximo 6 pasajeros por vehículo. Para ${paxCount} pasajeros necesitarían 2 vehículos. Contactanos para coordinar.`;
          await sendWhatsAppMessage(phone, msg);
          await insertMessage(conversation.id, "assistant", msg);
          return;
        }

        // P1: Resolve pricing UNA SOLA vez con el count real de pasajeros
        let rawSlots: Record<string, any> = {};
        rawSlots = parseSessionSlots(session?.slots ?? null) as Record<string, any>;

        const recalculated = await resolvePricingForSlots({
          origin: rawSlots.origin?.value ?? rawSlots.origin ?? "",
          destination: rawSlots.destination?.value ?? rawSlots.destination ?? "",
          passengers: paxCount,
        });

        if (recalculated.pricingResult.final_price > 0) {
          const vehicleType = paxCount <= 4 ? "🚗 Auto" : "🚐 Camioneta";
          const price = recalculated.pricingResult.final_price;
          rawSlots.passengers = paxCount;
          const slotsJson = JSON.stringify(rawSlots);
          // Update session with passenger count
          const { upsertChatSession } = await import("@/lib/db/database");
          await upsertChatSession(phone, JSON.parse(slotsJson), undefined, "awaiting_confirmation", undefined);

          const msg = `Perfecto, ${vehicleType} para ${paxCount}. El traslado cuesta $${price} ARS.\n\n¿Confirmamos el viaje?`;
          await sendWhatsAppMessage(phone, msg);
          await insertMessage(conversation.id, "assistant", msg);
          await setConversationalState(phone, "awaiting_confirmation");
          return;
        } else {
          // Pricing falló sin precio — caer a re-pregunta
          log.warn("[AWAITING_PASSENGER] pricing no devolvió precio para", { paxCount });
        }
      }

      // ── Si llegamos acá: ni regex ni LLM resolvieron ──
      const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");

      // Affirmative without passenger count
      if (isAffirmativeMessage(trimmed)) {
        const msg = "¿Cuántos pasajeros son así busco el vehículo correcto?";
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversation.id, "assistant", msg);
        return;
      }

      // Negative / cancel
      if (isNegativeMessage(trimmed)) {
        const msg = "¿Qué querés cambiar?";
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversation.id, "assistant", msg);
        await setConversationalState(phone, "collecting_slots");
        return;
      }

      // Unrecognized — re-ask
      const msg = "¿Cuántos pasajeros son? (ej: 'somos 3')";
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      return;
    }

    // ── ZONE: AWAITING_CONFIRMATION — user said "si" to confirm the trip ──
    if (slotState === "awaiting_confirmation") {
      log.info("[AWAITING_CONFIRMATION]", { text: trimmed, phoneLen: phone.length });

      const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");

      // Negative / cancel → go back to collecting slots
      if (isNegativeMessage(trimmed)) {
        const msg = "¿Qué querés cambiar?";
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversation.id, "assistant", msg);
        await setConversationalState(phone, "collecting_slots");
        return;
      }

      // Affirmative → confirm and execute
      if (isAffirmativeMessage(trimmed)) {
        const s = await getChatSession(phone);
        const rawSlots = parseSessionSlots(s?.slots ?? null) as Record<string, any>;
        const passengers = rawSlots?.passengers?.value ?? rawSlots?.passengers ?? 1;

// Resolve pricing with actual passenger count
        const resolved = await resolvePricingForSlots({
          origin: rawSlots?.origin?.value ?? rawSlots?.origin ?? "",
          destination: rawSlots?.destination?.value ?? rawSlots?.destination ?? "",
          passengers: passengers,
        });

        const p = resolved.pricingResult;
        const vehicleType = passengers <= 4 ? "🚗 Auto" : "🚐 Camioneta";
        const priceMsg = p.final_price > 0
          ? `Confirmado ✅ ${vehicleType} para ${passengers}. El traslado cuesta $${p.final_price} ARS.\n\nBuscando chofer...`
          : `Confirmado ✅ para ${passengers}.\n\nBuscando chofer...`;

        await sendWhatsAppMessage(phone, priceMsg);
        await insertMessage(conversation.id, "assistant", priceMsg);

        // Determine temporal mode from facts or default to NOW if we have all slots
        const temporal = leadCore.facts.some(f => f.startsWith("now:") || f.startsWith("urgency:")) ? "NOW" : "FUTURO";
        const isNow = temporal === "NOW";

        // Execute trip
        if (isNow) {
          await executeNowTrip({
            phone,
            conversationId: conversation.id,
            origin: rawSlots?.origin?.value ?? rawSlots?.origin ?? "",
            destination: rawSlots?.destination?.value ?? rawSlots?.destination ?? "",
            passengers: Number(passengers),
            pricing: p.final_price > 0 ? p : undefined,
            customerName,
            lang: detectLeadLang(trimmed),
            text: trimmed,
          });
        } else {
          // For FUTURO (reservation), just confirm and set state
          await setConversationalState(phone, "pending_human_review");
          await sendWhatsAppMessage(phone, "Tu reserva quedó registrada. Te confirmamos horario y chofer en breve.");
          await insertMessage(conversation.id, "assistant", "Tu reserva quedó registrada. Te confirmamos horario y chofer en breve.");
        }
        return;
      }

      // Not affirmative/negative → re-ask
      const msg = "¿Confirmamos el viaje?";
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      return;
    }

    // ── ZONE: AMBIGUITY HANDLER — resolve ambiguous locations interactively ──
    const currentConvState = await getConversationalState(phone);
    if (currentConvState === "ambiguity_pending") {
      const ambHandled = await handleAmbiguityResponse(phone, conversation.id, trimmed, session);
      if (ambHandled) return;
      // P0.9.5: Si ambState era null (estado perdido), resetear y dejar que
      // el pipeline normal procese el mensaje como fresco. No caer a
      // startAmbiguityResolution que tambien fallaría.
      // P0.10.1: Antes de resetear, preservar slots resueltos de la sesión
      const freshSession = await getChatSession(phone);
      if (freshSession?.slots) {
        const slots = JSON.parse(freshSession.slots);
        const preservedSlots: Record<string, any> = {};
        if (slots.origin?.status === "CONFIRMED") preservedSlots.origin = slots.origin;
        if (slots.destination?.status === "CONFIRMED") preservedSlots.destination = slots.destination;
        if (Object.keys(preservedSlots).length > 0) {
          await upsertChatSession(phone, { ...slots, ...preservedSlots }, undefined, "collecting_slots", undefined);
          log.info("[AMBIGUITY_STATE_LOST] preserved slots before reset", { preserved: Object.keys(preservedSlots) });
        }
      }
      log.warn("[AMBIGUITY_STATE_LOST] resetting to collecting_slots");
      await setConversationalState(phone, "collecting_slots", undefined);
    }
    if (leadCore.facts?.some(f => f.startsWith("location_ambiguous:")) && currentConvState !== "ambiguity_pending") {
      // P0.8.5: Re-leer session fresca para incluir slots extraídos en este turno
      // (passengers, origin, destination). La session original fue leída antes de
      // extraction-runner, por lo que no tiene los datos del mensaje actual.
      const freshSessionForAmbiguity = await getChatSession(phone);
      const ambStarted = await startAmbiguityResolution(phone, conversation.id, trimmed, leadCore, freshSessionForAmbiguity);
      if (ambStarted) return;
    }

    log.info("[CORE_RESULT]", {
      input: text,
      facts: leadCore.facts,
      intent: leadCore.intent,
      confidence: leadCore.confidence,
      slotStability: leadCore.slotStability,
      roleLock: leadCore.roleLock,
      lateral: leadCore.lateral ?? null,
    });
    const nowFacts = leadCore.facts.filter(f => f.startsWith("now:") || f.startsWith("urgency:"));
    const futureFacts = leadCore.facts.filter(f => f.startsWith("date:") || f.startsWith("time:"));
    const temporalSignal = nowFacts.length > 0 ? "NOW"
      : futureFacts.length > 0 ? "FUTURO"
      : "UNKNOWN";
    log.info("[TEMPORAL_SIGNAL]", {
      nowDetected: nowFacts.length > 0,
      urgencyDetected: leadCore.facts.some(f => f.startsWith("urgency:")),
      futureDetected: futureFacts.length > 0,
      nowFacts,
      futureFacts,
      temporalSignal,
      palabrasClave: text.match(/\b(ahora|ya|inmediato|urgente|hoy|mañana|pasado\s*mañana|las\s*\d|a\s*las\s*\d|enseguida|al\s*toque)\b/i)?.[0] ?? null,
    });
    const predictedContext = buildPredictedContext(text, leadCore.intent, memory);
    logIntentDetected(String(conversation.id), leadCore.intent, predictedContext.intentPrediction.confidence);
    const detectedEntities = predictedContext.entityPrediction.candidates;
    if (detectedEntities.length > 0) logEntityDetected(String(conversation.id), detectedEntities);

    const halted = await runComprehensionCheck({
      phone, text, conversationId: conversation.id, leadCore,
      predictedContext, session,
      isFirstTurn: history.length === 0,
    });
    if (halted) return;

    const extractionResult = await runExtractionPipeline(
      phone, text, conversation.id, leadCore, history, customerName,
    );
    if (!extractionResult) return;
    const { workflowResult, parsed, confidenceResult, pricing, prevSlotsEarly } = extractionResult;

    // ── ZONE: POLICY PIPELINE ──
    const parsedData = parsed && parsed.success ? parsed.data : undefined;
    const extractionCtx = buildExtractionContext(
      parsedData,
      confidenceResult,
      workflowResult,
      pricing,
      leadCore?.roleLock,
      leadCore?.slotStability,
      prevSlotsEarly,
    );

    const domain = mapIntentToDomain(leadCore.intent);

    log.info("[TRACE_PRE_POLICY]", {
      domain,
      extractionCtxExists: !!extractionCtx,
      pricingExists: !!pricing && pricing.final_price > 0,
      slotsCount: extractionCtx ? Object.keys(extractionCtx.slots).length : 0,
      origin: extractionCtx?.slots?.origin?.value ?? null,
      destination: extractionCtx?.slots?.destination?.value ?? null,
    });
    await handlePolicyPipeline({
      phone, text, conversation, history, customerName,
      leadCore, extractionCtx, pricing, workflowResult,
      confidenceResult, prevSlotsEarly, parsedData, domain,
      sessionUpdatedAt: session?.updated_at,
    });
    log.info("[TRACE_PIPELINE_END]", { phone: phone.slice(-4), intent: leadCore.intent });

  } catch (e) {
    log.error("[LEAD_ERROR]", e);
    const errMsg = `⚠️ *Error en bot — cliente sin respuesta*\n\nTeléfono: ${phone}\nError: ${e instanceof Error ? e.message : String(e)}`;
    try {
      const errResp = buildGlobalErrorMessage();
      log.info("[TRACE RESPONSE]", { source: "GLOBAL_ERROR", text: errResp });
      await sendWhatsAppMessage(phone, errResp);
      const conv = await getConversationByPhone(phone);
      if (conv) await insertMessage(conv.id, "assistant", "Error interno. Cliente derivado a operador.");
    } catch (e2) {
      log.error("[LEAD_ERROR] fallback msg también falló:", e2);
    }
    try {
      await notifyAdmin(errMsg);
    } catch (e3) {
      log.error("[LEAD_ERROR] fallback admin notify también falló:", e3);
    }
  }
}

// ── ZONE: SLOT CONFIRMATION BUTTON HANDLER ──
export async function handleSlotConfirmationButton(
  phone: string,
  buttonId: string,
  conversation: { id: number },
  _history: any[], // kept for interface compatibility
  _customerName: string | null, // kept for interface compatibility
  _leadCore: ReturnType<typeof core>, // kept for interface compatibility
  session: Awaited<ReturnType<typeof getChatSession>>,
): Promise<void> {
  const lang = detectLeadLang(buttonId);
  const buttonType = buttonId as string;

  log.info("[BUTTON_ROUTING]", {
    buttonId,
    currentState: session?.conversational_state ?? "unknown",
    action: buttonType === "slot_confirm" ? "confirm"
      : buttonType === "slot_change" ? "show_field_selector"
      : buttonType.startsWith("change_") ? `change_field:${buttonType.replace("change_", "")}`
      : "unknown",
  });

  if (buttonType === "slot_confirm") {
    let rawSlots: Record<string, any> = {};
    let rawConfidence: Record<string, number> = {};
    try {
      const s = await getChatSession(phone);
      rawSlots = parseSessionSlots(s?.slots ?? null) as Record<string, any>;
      rawConfidence = parseConfidenceJson(s?.confidence ?? null);
    } catch { /* ignore */ }

    // Promote all CONFIRMATION_PENDING slots to CONFIRMED
    if (rawSlots.origin) rawConfidence.origin = 1.0;
    if (rawSlots.destination) rawConfidence.destination = 1.0;

    // Save to session
    const { upsertChatSession } = await import("@/lib/db/database");
    const { evaluateWorkflowTransition } = await import("@/lib/services/workflow/slot-workflow");

    const syntheticSlots: ExtractionResult["slots"] = {};
    if (rawSlots.origin != null) syntheticSlots.origin = { value: rawSlots.origin?.value ?? rawSlots.origin, score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.destination != null) syntheticSlots.destination = { value: rawSlots.destination?.value ?? rawSlots.destination, score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.passengers != null) syntheticSlots.passengers = { value: String(rawSlots.passengers), score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.scheduled_at != null) syntheticSlots.scheduled_at = { value: String(rawSlots.scheduled_at), score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };

    const syntheticConfidence: ExtractionResult = {
      slots: syntheticSlots,
      overall_confidence: 1.0,
      action: "proceed",
    };

    const workflowResult = await evaluateWorkflowTransition(phone, syntheticConfidence);
    await upsertChatSession(phone, rawSlots, rawConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined);

    log.info("[USER_SLOT_CONFIRM]", {
      action: "confirm",
      confirmedSlots: Object.keys(rawSlots).filter(k => k === "origin" || k === "destination" || k === "passengers"),
      correctedSlots: [],
    });

    // P1: Ask passengers BEFORE resolving pricing
    // So pricing is resolved ONCE with the actual passenger count
    let priceMsg: string | null = null;
    if (rawSlots.origin && rawSlots.destination) {
      // Check if passengers already known
      const existingPax = rawSlots.passengers?.value ?? rawSlots.passengers;
      if (existingPax) {
        // Passengers known → resolve pricing directly
        try {
          const resolved = await resolvePricingForSlots({
            origin: rawSlots.origin?.value ?? rawSlots.origin,
            destination: rawSlots.destination?.value ?? rawSlots.destination,
            passengers: Number(existingPax),
          });
          if (resolved.pricingResult.final_price > 0) {
            const p = resolved.pricingResult;
            const originRaw = rawSlots.origin?.value ?? rawSlots.origin;
            const destRaw = rawSlots.destination?.value ?? rawSlots.destination;
            const originDisplay = rawSlots.origin?.display ?? originRaw;
            const destDisplay = rawSlots.destination?.display ?? destRaw;
            const originName = p.origin.canonical_name ?? originDisplay;
            const destName = p.destination.canonical_name ?? destDisplay;
            priceMsg = `El traslado de ${originName} a ${destName} cuesta $${p.final_price} ARS.\n\n¿Confirmamos el viaje?`;
            // Set awaiting_confirmation for final confirmation
            await setConversationalState(phone, "awaiting_confirmation");
          }
        } catch (e) {
          log.error("[SLOT_CONFIRM] pricing error:", e);
        }
      } else {
        // Passengers missing → just ask, no pricing yet
        priceMsg = lang === "en"
          ? "How many passengers will there be?"
          : lang === "pt"
            ? "Quantos passageiros serão?"
            : "¿Cuántos pasajeros son?";
        await setConversationalState(phone, "awaiting_passenger");
      }
    }

    if (priceMsg) {
      await sendWhatsAppMessage(phone, priceMsg);
      await insertMessage(conversation.id, "assistant", priceMsg);
    } else {
      const originDisplay = rawSlots.origin?.display ?? rawSlots.origin?.value ?? rawSlots.origin;
      const destDisplay = rawSlots.destination?.display ?? rawSlots.destination?.value ?? rawSlots.destination;
      const originDn = originDisplay != null ? String(originDisplay) : "?";
      const destDn = destDisplay != null ? String(destDisplay) : "?";
      const msg = `Gracias por confirmar los datos de tu viaje 🚖\n\n📍 De: ${originDn}\n📍 A: ${destDn}\n\nEstamos verificando la tarifa y te la confirmamos en breve por este chat.`;
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      await setConversationalState(phone, "pending_human_review");
    }
    return;
  }

  if (buttonType === "slot_change") {
    const selector = buildFieldSelector(lang);
    await sendWhatsAppMessage(phone, selector.text);
    await insertMessage(conversation.id, "assistant", selector.text);
    return;
  }

  if (buttonType === "change_origin" || buttonType === "change_destination") {
    const label = buttonType === "change_origin" ? "origen" : "destino";
    const msg = `Escribí el ${label} exacto.`;
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_passengers") {
    const msg = "¿Cuántos pasajeros son?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_scheduled_at") {
    const msg = "¿Para qué día y horario necesitás el viaje?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_back") {
    await sendWhatsAppMessage(phone, "Escribí los datos de tu viaje.");
    await insertMessage(conversation.id, "assistant", "Escribí los datos de tu viaje.");
    return;
  }
}
