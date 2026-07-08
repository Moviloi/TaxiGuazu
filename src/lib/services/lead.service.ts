import { getConversationByPhone, insertMessage, getChatSession, upsertChatSession } from "@/lib/db/database";
import { getActiveTripByPhone } from "@/lib/db/domains/trips";
import { buildGlobalErrorMessage, buildGreetingIntro } from "@/lib/ai/response-builder";
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
import { handleSlotConfirmationButton } from "@/lib/services/workflow/slot-confirmation-handler";
import { buildSlotConfirmationMessage } from "@/lib/ai/slot-confirmation";
import { startAmbiguityResolution, handleAmbiguityResponse } from "@/lib/services/workflow/ambiguity-handler";
import { detectLangWithFallback } from "@/lib/detect-lang";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { pricingResultToToolOutput } from "@/lib/services/pricing/tool-pricing";
import { handleAwaitingPassenger } from "@/lib/services/workflow/awaiting-passenger-handler";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import { log } from "@/lib/utils/logger";

// ── COORDINATOR ──
// Routes the webhook message through sub-handlers. Each handler returns true
// if it fully handled the message (caller should return immediately).
export async function handleLeadMessage(phone: string, text: string): Promise<void> {
  try {
    log.info("[TRACE WEBHOOK MESSAGE]", { event: "message_received", phoneLen: phone.length, textLen: text.length });
    log.info(`[DEBUG_LEAD] phone=******${phone.slice(-4)} textLen=${text.length}`);
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
        sessionLang: session?.lang,
        sessionUpdatedAt: session?.updated_at,
      });
      return;
    }

    // ── ZONE: COMBINED GREETING + REQUEST — send persona intro before business response ──
    // Detecta mensajes con saludo + pedido sustantivo en el mismo texto
    // (ej: "hola quiero ir del aeropuerto al centro").
    // Envía presentación corta de Cris y continúa al flujo normal para el mensaje de negocio.
    if (leadCore.facts.some(f => f.startsWith("greeting:"))) {
      const lang = detectLangWithFallback(text, session?.lang);
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
      await handleSlotConfirmationButton(phone, trimmed, conversation, session);
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
        await handleSlotConfirmationButton(phone, "slot_confirm", conversation, session);
        return;
      }

      // 2) Negative or correction → treat as slot_change (show field selector)
      if (isNegativeMessage(trimmed) || isCorrectionMessage(trimmed)) {
        log.info("[SLOT_TEXT] negative/correction in slot_confirmation → slot_change");
        await handleSlotConfirmationButton(phone, "slot_change", conversation, session);
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
        const confirm = buildSlotConfirmationMessage(updatedExtractionCtx, detectLangWithFallback(text, session?.lang));
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
    if (slotState === "awaiting_passenger") {
      await handleAwaitingPassenger(phone, text, trimmed, conversation, session, history, customerName);
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
        const sessionLang = s?.lang;
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
            lang: detectLangWithFallback(trimmed, sessionLang),
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
      const freshSessionForAmbiguity = await getChatSession(phone);
      const ambStarted = await startAmbiguityResolution(phone, conversation.id, trimmed, leadCore, freshSessionForAmbiguity);
      if (ambStarted) return;
    }

    // ── ZONE: POST-BOOKING — user has an active trip, treat as follow-up inquiry ──
    // B2 fix: after executeNowTrip resets state to idle, subsequent messages
    // should be treated as post-booking follow-ups, not new bookings.
    if (slotState === "idle") {
      const activeTrip = await getActiveTripByPhone(phone);
      if (activeTrip) {
        log.info("[POST_BOOKING] active trip detected, routing as follow-up", {
          tripId: activeTrip.trip_id,
          intent: leadCore.intent,
        });
        const domain = mapIntentToDomain(leadCore.intent);
        await handlePolicyPipeline({
          phone, text, conversation, history, customerName,
          leadCore,
          extractionCtx: undefined,
          pricing: undefined,
          workflowResult: undefined,
          confidenceResult: undefined,
          prevSlotsEarly: {},
          parsedData: undefined,
          domain,
          multiRideBreakdown: undefined,
          sessionLang: detectLangWithFallback(text, session?.lang),
          sessionUpdatedAt: session?.updated_at,
        });
        return;
      }
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
    const { workflowResult, parsed, confidenceResult, pricing, prevSlotsEarly, multiRideBreakdown } = extractionResult;

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
    const pipelineLang = detectLangWithFallback(text, session?.lang);
    if (session?.lang !== pipelineLang) {
      const { updateChatSessionLang } = await import("@/lib/db/database");
      await updateChatSessionLang(phone, pipelineLang);
    }

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
      leadCore, extractionCtx, pricing: pricing ? pricingResultToToolOutput(pricing) : undefined, workflowResult,
      confidenceResult, prevSlotsEarly, parsedData, domain,
      multiRideBreakdown,
      sessionLang: session?.lang,
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

