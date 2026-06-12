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
  updateTripTariff,
  getDriverByPhone,
  getDriverExpiry,
  getPrincipalDriver,
  updateDriverShiftIfNull,
  clearConversationHistory,
  setCustomerName,
  getCustomerName,
  upsertChatSession,
  resetChatSession,
  getChatSession,
  clearPendingOpportunity,
  updateOpportunityLogResponse,
  setChatSessionWorkflowState,
  getDbInstance,
} from "@/lib/db/database";
import { extractSlots } from "@/lib/services/extractSlots";
import { evaluateCompleteness } from "@/lib/services/completenessEngine";
import { buildSlotClarify, formatOpportunityResponse, buildOpportunityAcceptedMessage, buildOpportunityDeclinedMessage, buildOpportunityNoPricingMessage, buildOpportunityOfferMessage, buildGlobalErrorMessage, buildF4EscalationMessage } from "@/lib/ai/response-builder";
import { processLead } from "@/lib/core/pipeline";
import type { ExecutionContext, ExecutionDeps } from "@/lib/core/pipeline";
import { resolveGeoRoute } from "@/lib/services/geoEngine";
import { evaluateOpportunities, isOpportunityQuery } from "@/lib/services/opportunity-engine";
import { opportunityEngine } from "@/lib/services/opportunity-engine";
import { buildF4Signals, computeComprehensionScore, getF4State, getF4RecoveryMessage } from "@/lib/services/comprehension";
import { buildMemory } from "@/lib/services/memory";
import { buildPredictedContext, enrichF4Signals } from "@/lib/services/predictive-routing";
import { logIntentDetected, logEntityDetected, logOpportunityShown, logUserResponse, logEscalation } from "@/lib/services/f6-events";
import { recordF4Outcome, getF4ThresholdAdjustment } from "@/lib/services/f6-learning";
import { loadObjectiveWeights } from "@/lib/services/f7-objectives";
import { adjustOpportunityRanking } from "@/lib/services/f7-routing";
import { getSystemLoad } from "@/lib/services/f7-load";
import { runF8 } from "@/lib/services/f8-index";
import { seedPolicies } from "@/lib/services/f8-policy";
import { computeGlobalMetrics } from "@/lib/services/f8-global";
import { runF9 } from "@/lib/services/f9-index";
import { logF9Error } from "@/lib/services/f9-error";
import { isAdminCommand, parseAdminCommand, executeAdminCommand } from "@/lib/services/f9-admin";
import { logDecision } from "@/lib/services/decision-log";

import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";
import type { ExtractionContext, Lang, RoleLock, SlotStabilityMap, ConfirmedSlot } from "@/lib/ai/types";
import type { TripRow } from "@/lib/db/types";
import { TripExtractionSchema } from "@/lib/ai/extraction-schema";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/slot-workflow";
import { evaluateWorkflowTransition } from "@/lib/services/slot-workflow";
import { calculatePrice } from "@/lib/services/pricing-engine";
import { resetRequestState, assertCoreRouterPolicy } from "@/lib/ai/guard";
import { handleMessage } from "@/lib/ai/handler";
import { core } from "@/lib/ai/core";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { resetToIdle, getWorkflow, advanceToNivel1, advanceToNivel2, advanceToNivel3, advanceToWaitingDriver } from "@/lib/utils/conversation-workflow";
import { notifyAdmin, offerToSpecificDriver, getPrincipal2, broadcastTripToDrivers } from "@/lib/services/admin.service";
import { SESSION_INACTIVITY_48H_S } from "@/config/constants";
import { handleAdminCommand } from "@/lib/services/admin-commands";
import { ensureFleetCanHandle } from "@/lib/services/fleet-validation";
import { resolveTariff } from "@/lib/services/tariff-resolver";
import { buildRouteKey, observe as observeLearning } from "@/lib/services/fareLearningEngine";
import { loadContext, mergeContext, saveContext } from "@/lib/services/contextMemory";
import { calculateSlotConfidence } from "@/lib/services/confidence";

function formatConfidenceNote(
  e: TripExtraction,
  confidenceResult: ExtractionResult,
  workflowResult: SlotWorkflowContext,
  pricing?: Awaited<ReturnType<typeof calculatePrice>>,
): string {
  const parts: string[] = [];

  const DESCRIPTIVE_PREFIX: Record<string, string> = {
    "Puerto Iguazú": "Ciudad de Puerto Iguazú",
    "Aeropuerto IGR": "Aeropuerto IGR",
    "Aeropuerto Foz (IGU)": "Aeropuerto Foz (IGU)",
    "Foz Centro / Hotel Belmond": "Foz Centro / Hotel Belmond",
    "Centro Puerto Iguazú": "Centro de Puerto Iguazú",
    "Aduana Brasil (Puente Tancredo Neves)": "Aduana de Foz",
    "Aeropuerto Foz (IGU) / Rodoviaria Foz / Cataratas Brasil": "Foz / Rodoviaria / Cataratas Brasil",
    "Cataratas Brasil (Parque das Aves)": "Cataratas Brasil (Parque das Aves)",
    "Cataratas Argentinas / Hotel Meliá": "Cataratas Argentinas / Hotel Meliá",
  };

  function formatFieldLabel(
    raw: string,
    canonical: string | undefined,
    reason: string | undefined,
  ): { label: string; suggestion: string | undefined } {
    if (reason === "unknown_location") {
      return { label: `"${raw}" (desconocido)`, suggestion: undefined };
    }
    if (reason === "ambiguous_term" && canonical) {
      const display = DESCRIPTIVE_PREFIX[canonical] ?? canonical;
      return {
        label: `"${raw}" → *${display}*`,
        suggestion: display,
      };
    }
    // CAMBIO EMBUDO: Si existe nombre canónico en la DB, lo inyectamos explícitamente con la flecha
    if (canonical) {
      const display = DESCRIPTIVE_PREFIX[canonical] ?? canonical;
      return { label: `"${raw}" → ${display}`, suggestion: undefined };
    }
    return { label: `"${raw}"`, suggestion: undefined };
  }

if (e.origin) {
    const originScore = confidenceResult.slots.origin?.score ?? 0;
    const originReason = confidenceResult.slots.origin?.reason;
    const originCanonical = pricing?.origin.canonical_name ?? undefined;
    const { label: originLabel, suggestion: originSuggestion } = formatFieldLabel(e.origin, originCanonical, originReason);
    parts.push(`Origen: ${originLabel} (Confianza: ${originScore * 100}%)`);
    if (originSuggestion) {
      parts.push(`SUGERENCIA_ORIGEN: "${originSuggestion}"`);
    }
  }
  if (e.destination) {
    const destScore = confidenceResult.slots.destination?.score ?? 0;
    const destReason = confidenceResult.slots.destination?.reason;
    const destCanonical = pricing?.destination.canonical_name ?? undefined;
    const { label: destLabel, suggestion: destSuggestion } = formatFieldLabel(e.destination, destCanonical, destReason);
    parts.push(`Destino: ${destLabel} (Confianza: ${destScore * 100}%)`);
    if (destSuggestion) {
      parts.push(`SUGERENCIA_DESTINO: "${destSuggestion}"`);
    }
  }
  if (e.passengers) parts.push(`Pasajeros: ${e.passengers}`);
  if (e.urgency) parts.push(`Urgencia: ${e.urgency}`);
  if (e.flight) parts.push(`Vuelo: ${e.flight}`);
  if (e.scheduled_at) parts.push(`Fecha: ${e.scheduled_at}`);
  if (e.customer_name) parts.push(`Nombre: ${e.customer_name}`);

  if (pricing && pricing.final_price > 0) {
    const pax = e.passengers || 1;
    const priceLabel = pax > 4 ? "precio hasta 6 pasajeros" : "precio hasta 4 pasajeros";
    parts.push(`PRECIO OFICIAL (calculado por backend): $${pricing.final_price} ARS (${priceLabel}).`);
    parts.push(`VALOR_PRECIO: ${pricing.final_price}`);
    parts.push(`Ruta oficial: ${pricing.origin.canonical_name} → ${pricing.destination.canonical_name}.`);
    parts.push(`NO calcules ni modifiques este precio. Usá SOLO los valores oficiales del backend.`);
  } else {
    parts.push(`VALOR_PRECIO: NO_DISPONIBLE`);
    if (e.origin && e.destination) {
      const originReason = confidenceResult.slots.origin?.reason;
      const destReason = confidenceResult.slots.destination?.reason;
      if (originReason === "unknown_location" && destReason !== "unknown_location") {
        parts.push(`No hay tarifa para ESE ORIGEN: "${e.origin}".`);
      } else if (destReason === "unknown_location" && originReason !== "unknown_location") {
        parts.push(`No hay tarifa para ESE DESTINO: "${e.destination}".`);
      } else {
        parts.push(`No hay tarifa para esa combinación de origen y destino.`);
      }
    }
    parts.push(`No inventes un precio. Si el cliente no puede aclarar, derivá con un colega humano.`);
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
    console.log("[TRACE WEBHOOK MESSAGE]", { phone, text });
    console.log(`[DEBUG_LEAD] phone=${phone} text="${text.substring(0, 60)}"`);
    // Reset guard state al inicio de cada request para evitar contaminación entre requests.
    resetRequestState();
    // CORE+ROUTER+POLICY: setea guard state. Cualquier LLM call posterior debe pasar assert.
    handleMessage(text, "RESERVA");
    // B1: Single core() call reused throughout the function.
    const leadCore = core(text);
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
      await resetChatSession(phone);
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

    const registrarMatch = lower.match(/^\.registrar\s*$/);
    if (registrarMatch) {
      // .registrar = alias for -activar
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
        const resp = "❌ No estás registrado como chofer. Pedí al administrador que te dé de alta.";
        await sendWhatsAppMessage(phone, resp);
        await insertMessage(conv.id, "assistant", resp);
      }
      return;
    }

    if (await handleAdminCommand(phone, trimmed)) return;

    // F9 Admin Command Interface
    if (isAdminCommand(trimmed)) {
      const parsed = parseAdminCommand(trimmed);
      if (parsed) {
        const result = await executeAdminCommand(parsed, phone);
        await sendWhatsAppMessage(phone, result.message);
        const conv = await getOrCreateConversation(phone);
        await insertMessage(conv.id, "assistant", result.message);
      }
      return;
    }

    const conversation = await getOrCreateConversation(phone, undefined);
    const freshConv = await getConversationById(conversation.id);
    if (!freshConv || freshConv.taken_by_human) return;

    const workflow = await getWorkflow(conversation.id);
    if (workflow && workflow.state !== "idle" && workflow.state !== "closed" && workflow.state !== "post_trip_opportunity") return;

    // === OPPORTUNITY RESPONSE HANDLER ===
    if (workflow?.state === "post_trip_opportunity") {
      const session = await getChatSession(phone);
      if (session?.pending_opportunity) {
        const pending = JSON.parse(session.pending_opportunity);
        const now = Math.floor(Date.now() / 1000);

        if (now > pending.expires_at) {
          console.log(`[OPPORTUNITY] expired for ${phone} rule="${pending.label}"`);
          await updateOpportunityLogResponse(pending.logId, "expired", now);
          await clearPendingOpportunity(phone);
          await resetToIdle(conversation.id);
          logUserResponse(String(conversation.id), "ignored", pending.label);
        } else if (isAffirmativeMessage(text)) {
          console.log(`[OPPORTUNITY] accepted by ${phone} rule="${pending.label}"`);
          await updateOpportunityLogResponse(pending.logId, "accepted", now);
          const infoMsg = buildOpportunityAcceptedMessage(pending.label);
          await sendWhatsAppMessage(phone, infoMsg);
          await insertMessage(conversation.id, "assistant", infoMsg);
          await clearPendingOpportunity(phone);
          await resetToIdle(conversation.id);
          logUserResponse(String(conversation.id), "accepted", pending.label);
          return;
        } else if (isNegativeMessage(text)) {
          console.log(`[OPPORTUNITY] declined by ${phone} rule="${pending.label}"`);
          await updateOpportunityLogResponse(pending.logId, "declined", now);
          const declineMsg = buildOpportunityDeclinedMessage();
          await sendWhatsAppMessage(phone, declineMsg);
          await insertMessage(conversation.id, "assistant", declineMsg);
          await clearPendingOpportunity(phone);
          await resetToIdle(conversation.id);
          logUserResponse(String(conversation.id), "declined", pending.label);
          return;
        } else {
          console.log(`[OPPORTUNITY] ignored for ${phone} rule="${pending.label}" — unrelated message`);
          await updateOpportunityLogResponse(pending.logId, "ignored", now);
          await clearPendingOpportunity(phone);
          await resetToIdle(conversation.id);
          logUserResponse(String(conversation.id), "ignored", pending.label);
        }
      }
    }

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
      await resetChatSession(phone);
    }
    customerName = await getCustomerName(phone);

    // If user introduces themselves in this message, store it
    const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+(\w+(?:\s+\w+)?)/i);
    if (nameMatch) {
      await setCustomerName(phone, nameMatch[1]);
      customerName = nameMatch[1];
    }

    await insertMessage(conversation.id, "user", text);

    // === F5 MEMORY + PREDICTIVE ROUTING (hoisted before confirmation) ===
    const history = sessionReset ? [] : await getRecentHistory(conversation.id, 20);
    const f5Session = await getChatSession(phone);
    const f5Core = leadCore;
    const f5Memory = buildMemory(f5Session, history);
    const f5Context = buildPredictedContext(text, f5Core.intent, f5Memory);
    logIntentDetected(String(conversation.id), f5Core.intent, f5Context.intentPrediction.confidence);
    const detectedEntities = f5Context.entityPrediction.candidates;
    if (detectedEntities.length > 0) logEntityDetected(String(conversation.id), detectedEntities);



    // === COMPREHENSION CHECK (F4) ===
    {
      console.log("[TRACE INPUT]", { phone, text });
      const f4Signals = enrichF4Signals(
        buildF4Signals({
          text,
          coreIntent: f5Core.intent,
          slotStability: f5Core.slotStability,
          roleLock: f5Core.roleLock,
          session: f5Session,
        }),
        f5Context.entityPrediction,
        f5Context.intentPrediction,
      );
      const f4Score = computeComprehensionScore(f4Signals);
      const f4ThresholdAdj = await getF4ThresholdAdjustment();
      const f4State = getF4State(f4Score, f4ThresholdAdj);

      console.log("[TRACE F4]", {
        state: f4State,
        score: f4Score,
        thresholdAdj: f4ThresholdAdj,
        intent: f5Core.intent,
        roleLock: f5Core.roleLock,
        slotStability: f5Core.slotStability,
      });

      await getDbInstance().execute({
        sql: "UPDATE chat_sessions SET f4_state = ?, comprehension_score = ?, updated_at = unixepoch() WHERE phone = ?",
        args: [f4State, f4Score, phone],
      });

      await getDbInstance().execute({
        sql: "INSERT INTO conversation_f4_log (session_id, score, state, reason) VALUES (?, ?, ?, ?)",
        args: [String(conversation.id), f4Score, f4State, null],
      });

      recordF4Outcome(f4State === "ESCALATION");

      if (f4State === "ESCALATION") {
        const reason = `comprehension_score=${f4Score.toFixed(2)} state=${f4State}`;
        await getDbInstance().execute({
          sql: "UPDATE chat_sessions SET escalation_reason = ?, updated_at = unixepoch() WHERE phone = ?",
          args: [reason, phone],
        });
        logEscalation(String(conversation.id), reason, f4Score);
        await notifyAdmin(`⚠️ *ESCALACIÓN F4 — Bajo nivel de comprensión*\n\nTeléfono: ${phone}\nScore: ${f4Score.toFixed(2)}\nMensaje: "${text.substring(0, 200)}"`);
        const escMsg = buildF4EscalationMessage();
        console.log("[TRACE RESPONSE]", { source: "F4_ESCALATION", text: escMsg });
        await sendWhatsAppMessage(phone, escMsg);
        await insertMessage(conversation.id, "assistant", escMsg);
        return;
      }

      if (f4State === "RECOVERY") {
        console.log("[TRACE RECOVERY]", {
          state: f4State,
          score: f4Score,
          phone,
          text,
        });
        const recoveryMsg = getF4RecoveryMessage(f4State, f5Session);
        console.log("[TRACE RESPONSE]", { source: "F4_RECOVERY", text: recoveryMsg });
        await sendWhatsAppMessage(phone, recoveryMsg);
        await insertMessage(conversation.id, "assistant", recoveryMsg);
        return;
      }
    }

    // === CONFIDENCE-BASED EXTRACTION + ENGINE ===
    let extractionNote: string | undefined;
    let workflowResult: SlotWorkflowContext | undefined;
    let parsed: { success: true; data: TripExtraction } | { success: false; error: any } | undefined;
    let confidenceResult: ExtractionResult | undefined;
    let pricing: Awaited<ReturnType<typeof calculatePrice>> | undefined;
    const coreDecisionEarly = leadCore;
    let prevSlotsEarly: Record<string, string> = {};
    try {
      console.log("[EXTRACTION] Iniciando extraction para:", text.substring(0, 80));
      // GUARD: assert CORE → ROUTER → POLICY state before LLM extraction.
      const extractionGuard = assertCoreRouterPolicy();
      if (extractionGuard !== true) {
        console.log("[LEGACY BLOCKED] generateGroqExtraction", extractionGuard);
        return;
      }
      // v5.0 FASE 5B.4: detectar role lock + prev slots ANTES del LLM call
      // para inyectar el约束 (constraint) de CORE en el prompt. El LLM
      // debe respetar role lock y no contradecir prev slots persistidos.
      prevSlotsEarly = await loadPreviousSlots(phone);
      const ctxMemory = await loadContext(phone);
      console.log("[CONTEXT] cargado:", { origin: ctxMemory.origin, destination: ctxMemory.destination, intent: ctxMemory.intent });
      console.log("[TRACE EXTRACTION START]", {
        roleLock: coreDecisionEarly?.roleLock,
        slotStability: coreDecisionEarly?.slotStability,
        prevSlots: prevSlotsEarly,
      });
      const raw = await extractSlots(text, history, customerName || undefined, {
        roleLock: coreDecisionEarly.roleLock,
        slotStability: coreDecisionEarly.slotStability,
        prevSlots: prevSlotsEarly,
      });
      console.log("[TRACE EXTRACTION RESULT]", {
        success: raw != null,
        raw: raw ? JSON.stringify(raw).substring(0, 200) : null,
      });

      // COMPLETENESS GATE → decide if we have enough to proceed
      const completeness = evaluateCompleteness(raw);
      if (completeness.status === "ASK") {
        const msg = buildSlotClarify(completeness.field!, detectLeadLang(text));
        console.log("[COMPLETENESS] bloqueado", { field: completeness.field });
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversation.id, "assistant", msg);
        return;
      }

      if (raw) {
        console.log("[EXTRACTION] Groq response:", JSON.stringify(raw).substring(0, 120));
        parsed = TripExtractionSchema.safeParse(raw);
        if (parsed.success) {
          console.log("[EXTRACTION] Parse exitoso, calculando confidence...");
          confidenceResult = await calculateSlotConfidence(parsed.data, text);

          // Backend pricing — inject real price if origin + destination known
          if (parsed.data.origin && parsed.data.destination) {
            const pax = parsed.data.passengers || 1;
            console.log(`[EXTRACTION] Calculando precio: origin="${parsed.data.origin}" dest="${parsed.data.destination}" pax=${pax}`);
            pricing = await calculatePrice({ origin: parsed.data.origin, destination: parsed.data.destination, passengers: pax });
            const tariffV2Match = await resolveTariff(parsed.data.origin, parsed.data.destination, pax);
            if (tariffV2Match.matched) {
              console.log(`[EXTRACTION V2] Tariff v2 match: level=${tariffV2Match.level} price=${tariffV2Match.price} (vs v3: ${pricing?.final_price})`);
              if (!pricing || pricing.final_price <= 0 || Math.abs(tariffV2Match.price - pricing.final_price) > 0) {
                console.log(`[EXTRACTION V2] ⚠️ Price divergence: v3=${pricing?.final_price} v2=${tariffV2Match.price} level=${tariffV2Match.level}`);
              }
            } else {
              console.log(`[EXTRACTION V2] Tariff v2: not found (band hierarchy fallback also empty)`);
            }
            console.log(`[EXTRACTION] Pricing result: final_price=${pricing?.final_price} origin="${pricing?.origin.canonical_name}" dest="${pricing?.destination.canonical_name}"`);
            if (pricing && pricing.final_price > 0) {
              parsed.data.price = pricing.final_price;
              confidenceResult.slots.price = { value: pricing.final_price, score: 1.0, reason: "backend_tariff_match" };
            } else if (parsed.data.origin || parsed.data.destination) {
              // Fallback: re-intentar con regex sobre texto original si Groq extrajo valores no resolubles (ej. "el aeropuerto")
              // Primero intentar extracción dirección-aware: "de X a Y"
              let fbOrigin: string | undefined;
              let fbDest: string | undefined;
              const dirMatch = text.match(/(?:de|desde)\s+(.+?)\s+(?:a|hasta|para|hacia)\s+(.+?)(?:\s*[,;.!?]|\s*$)/i);
              if (dirMatch) {
                fbOrigin = dirMatch[1].trim();
                fbDest = dirMatch[2].trim();
              }
              if (!fbOrigin || !fbDest) {
                const originRx = /\b(aeropuerto|aero|igr|igu)\b/i;
                const destRx = /\b(ciudad|la ciudad|a la ciudad|centro|centro iguazu|centro puerto|puerto iguazu|puerto|foz|cataratas)\b/i;
                fbOrigin = text.match(originRx)?.[1];
                fbDest = text.match(destRx)?.[1];
              }
              if (fbOrigin && fbDest) {
                const fbPricing = await calculatePrice({ origin: fbOrigin, destination: fbDest, passengers: parsed.data.passengers || 1 });
                if (fbPricing.final_price > 0) {
                  console.log(`[EXTRACTION] Fallback regex exitoso: origin="${fbOrigin}" dest="${fbDest}" price=${fbPricing.final_price}`);
                  pricing = fbPricing;
                  parsed.data.origin = fbOrigin;
                  parsed.data.destination = fbDest;
                  parsed.data.price = fbPricing.final_price;
                  confidenceResult.slots.price = { value: fbPricing.final_price, score: 1.0, reason: "backend_tariff_match" };
                  confidenceResult.slots.origin = { value: fbOrigin, score: 1.0, reason: "regex_fallback" };
                  confidenceResult.slots.destination = { value: fbDest, score: 1.0, reason: "regex_fallback" };
                }
              }
            }
          }

          // v5.0 FASE 5B.3: aplicar merge sobre confidenceResult.slots
          // (formato value/score/reason) usando la cadena de prioridad
          // role lock > LLM > prev. coreDecisionEarly y prevSlotsEarly ya
          // fueron computados antes del LLM call (FASE 5B.4 los necesita
          // para inyectar约束 en el prompt del LLM).
          // Aplicar merge sobre confidenceResult.slots (formato value/score/reason)
          // usando la misma cadena de prioridad que buildExtractionContext.
          for (const [k, v] of Object.entries(prevSlotsEarly)) {
            if (v != null && String(v).trim() !== "") {
              if (!confidenceResult.slots[k]) {
                confidenceResult.slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
              }
            }
          }
          if (coreDecisionEarly.roleLock?.origin) {
            confidenceResult.slots.origin = {
              value: coreDecisionEarly.roleLock.origin,
              score: 1.0,
              reason: "core_role_lock",
            };
          }
          if (coreDecisionEarly.roleLock?.destination) {
            confidenceResult.slots.destination = {
              value: coreDecisionEarly.roleLock.destination,
              score: 1.0,
              reason: "core_role_lock",
            };
          }

          workflowResult = await evaluateWorkflowTransition(phone, confidenceResult);

          // Persistir slots mergeados en `chat_sessions.slots` (formato plano).
          const mergedSlotsForDb: Record<string, any> = {};
          for (const [k, v] of Object.entries(confidenceResult.slots)) {
            if (v && v.value != null && String(v.value).trim() !== "") {
              mergedSlotsForDb[k] = v.value;
            }
          }
          const confByField: Record<string, number> = {};
          for (const [k, v] of Object.entries(confidenceResult.slots)) {
            confByField[k] = v.score;
          }

          // CONTEXT MEMORY: merge extracted slots with previous context (confidence-aware)
          const mergedWithMemory = mergeContext(mergedSlotsForDb, ctxMemory, confidenceResult.overall_confidence);
          console.log("[CONTEXT] merge completado:", Object.keys(mergedWithMemory).join(", "));

          await upsertChatSession(phone, mergedWithMemory, confByField, workflowResult.state, workflowResult.clarifyField ?? undefined);

          extractionNote = formatConfidenceNote(parsed.data, confidenceResult, workflowResult, pricing);
          console.log("[EXTRACTION] extractionNote generado:", extractionNote.substring(0, 150));
        } else {
          console.log("[EXTRACTION] Parse falló:", JSON.stringify(parsed.error?.issues || []));
        }
      } else {
        console.log("[EXTRACTION] generateGroqExtraction retornó null");
      }
    } catch (e) {
      console.error("[EXTRACTION] error:", e instanceof Error ? e.message : String(e));
    }

    // FALLBACK: si la extracción falló, intentar regex simple
    if (!extractionNote) {
      const fb = await tryFallbackExtraction(text, phone, confidenceResult);
      if (fb) {
        pricing = fb.pricing;
        confidenceResult = fb.confidenceResult;
        workflowResult = fb.workflowResult;
        extractionNote = fb.extractionNote;
      }
    }

    // v5.0 FASE 5B OUTPUT LOCK:
    // El output final viene de POLICY via handleMessage(). El LLM ya no redacta
    // respuestas; solo extrae slots (CORE). La policy RESERVA arma el finalResponse
    // con la ExtractionContext (slots confirmados, confidence, workflow state, tariff).
    const lang = detectLeadLang(text);
    const parsedData: TripExtraction | undefined = parsed && parsed.success ? parsed.data : undefined;
    // v5.0 FASE 5B.2/5B.3: coreDecision + prevSlots ya fueron computados arriba
    // (antes del upsertChatSession) para que el merge se persista en chat_sessions.
    // Aquí reusamos los mismos valores para no duplicar el cálculo.
    const extractionCtx = buildExtractionContext(
      parsedData,
      confidenceResult,
      workflowResult,
      pricing,
      coreDecisionEarly?.roleLock,
      coreDecisionEarly?.slotStability,
      prevSlotsEarly,
    );

    // CORE PIPELINE — decision → execution (Fase 10)
    const execCtx: ExecutionContext = {
      phone,
      conversationId: conversation.id,
      text,
      history,
      customerName: customerName || undefined,
      extractionCtx,
      pricing,
      lang,
      intent: coreDecisionEarly.intent,
    };
    const execDeps: ExecutionDeps = {
      send: sendWhatsAppMessage,
      persist: insertMessage,
      handler: handleMessage,
      geo: { resolveGeoRoute },
      memory: { saveContext },
      adminNotify: notifyAdmin,
    };
    // OPPORTUNITY QUERY — evaluate available benefits, never negotiate
    if (isOpportunityQuery(text)) {
      if (pricing && pricing.final_price > 0) {
        const oppResult = await evaluateOpportunities({
          pricingResult: pricing,
          tripContext: {
            origin: parsedData?.origin ?? "",
            destination: parsedData?.destination ?? "",
            tariff_id: pricing.tariff_id,
            passengers: parsedData?.passengers ?? 1,
          },
          userIntent: text,
        });
        const oppMsg = formatOpportunityResponse(oppResult, lang);
        await sendWhatsAppMessage(phone, oppMsg);
        await insertMessage(conversation.id, "assistant", oppMsg);
        console.log("[OPPORTUNITY] response sent:", oppMsg.substring(0, 120));
      } else {
        const msg = buildOpportunityNoPricingMessage(lang);
        await sendWhatsAppMessage(phone, msg);
        await insertMessage(conversation.id, "assistant", msg);
      }
      return;
    }

    // === CONFIRMATION SHORTCUT ===
    // If workflow_state is "awaiting_confirmation" and user affirms,
    // build extraction context from session data and let pipeline handle the response.
    // Execution side effects (trip creation, dispatch) happen after processLead.
    {
      const session = await getChatSession(phone);
      if (session?.workflow_state === "awaiting_confirmation" && isAffirmativeMessage(text)) {
        const rawSlots = JSON.parse(session.slots || "{}");
        const origin = rawSlots.origin || "";
        const destination = rawSlots.destination || "";
        if (origin && destination) {
          const fleetCheck = await ensureFleetCanHandle(rawSlots.passengers || 1, {
            phone,
            convId: conversation.id,
            origin,
            destination,
            source: "lead.confirmation.new_flow",
          });
          if (!fleetCheck.ok) {
            await resetChatSession(phone);
            return;
          }
          const pricingResult = await calculatePrice({ origin, destination, passengers: rawSlots.passengers || 1 });
          const tariffV2Match = await resolveTariff(origin, destination, rawSlots.passengers || 1);
          if (tariffV2Match.matched && Math.abs(tariffV2Match.price - pricingResult.final_price) > 0) {
            console.log(`[CONFIRMATION V2] Price divergence: v1=${pricingResult.final_price} v2=${tariffV2Match.price}`);
          }

          // Build extraction context from session slots (no LLM extraction needed for affirmation).
          const confirmedSlots: Record<string, ConfirmedSlot> = {};
          for (const [k, v] of Object.entries(rawSlots)) {
            confirmedSlots[k] = { value: String(v ?? ""), score: 1, reason: "session" };
          }
          const extractionCtx: ExtractionContext = {
            slots: confirmedSlots,
            overallConfidence: 1.0,
            workflowState: "awaiting_confirmation",
            clarifyField: null,
            askForConfirmation: true,
            tariff: tariffV2Match.matched
              ? {
                  matched: true,
                  price: tariffV2Match.price,
                  canonicalOrigin: pricingResult.origin.canonical_name ?? origin,
                  canonicalDestination: pricingResult.destination.canonical_name ?? destination,
                }
              : { matched: false },
          };
          const execCtx: ExecutionContext = {
            phone,
            conversationId: conversation.id,
            text,
            history,
            customerName: customerName || undefined,
            extractionCtx,
            pricing: { final_price: pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0) },
            lang,
            intent: "MOVE",
          };

          const pipelineResult = await processLead(execCtx, execDeps);

          if (pipelineResult === "completed") {
            // Execution side effects — trip creation, dispatch, F7/F8/F9
            const pax = rawSlots.passengers || 1;
            const tripId = `trip_${Date.now()}`;
            const rawScheduledAt = rawSlots.scheduled_at;
            const scheduledAtValue = rawScheduledAt?.value ?? rawScheduledAt;
            const scheduledAtTs = scheduledAtValue ? Math.floor(new Date(String(scheduledAtValue)).getTime() / 1000) : undefined;
            await createTrip(tripId, phone, origin, destination, pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || undefined), pax, scheduledAtTs, rawSlots.flight || undefined, "PENDING_DRIVER");

            const estimatedFare = rawSlots.fareEstimate ?? rawSlots.price ?? pricingResult.final_price;
            const finalFare = pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0);
            const routeKey = buildRouteKey(rawSlots.originZone ?? origin, rawSlots.destinationZone ?? destination);
            observeLearning(Number(estimatedFare), Number(finalFare), routeKey, false);
            await setConversationTrip(conversation.id, tripId);
            trip = await getActiveTripByPhone(phone);
            if (trip) {
              if (pricingResult.final_price > 0) {
                await updateTripTariff(trip.trip_id, pricingResult.tariff_id!, pricingResult.base_price);
              }
              const urgency = rawSlots.urgency || "ahora";
              await escalateTrip(conversation.id, phone, trip, urgency, pax);

              const AIRPORT_RE = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
              const HOTEL_RE = /hotel|centro/i;
              const originLower = origin.toLowerCase();
              const destLower = destination.toLowerCase();
              const oAir = AIRPORT_RE.test(originLower);
              const dAir = AIRPORT_RE.test(destLower);
              const oHotel = HOTEL_RE.test(originLower);
              const dHotel = HOTEL_RE.test(destLower);
              const tripLegType: "airport_to_hotel" | "hotel_to_airport" | "airport_to_airport" | "hotel_to_hotel" | "other" = oAir && dHotel ? "airport_to_hotel" : oHotel && dAir ? "hotel_to_airport" : oAir && dAir ? "airport_to_airport" : oHotel && dHotel ? "hotel_to_hotel" : "other";
              const hotelZone = HOTEL_RE.test(originLower) || HOTEL_RE.test(destLower);
              const oppContext = {
                tripId: trip.trip_id,
                clientPhone: phone,
                origin, destination, passengers: pax,
                tariffId: pricingResult.tariff_id,
                price: pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0),
                piso: pricingResult.base_price, urgency,
                conversationId: conversation.id,
                tripLegType, hotelZone,
                intentKeywords: [] as string[],
                entityMatches: [] as string[],
                hasPendingOpportunity: !!session?.pending_opportunity,
                memoryBoost: 0,
              };
              const rawOpportunities = await opportunityEngine.evaluate(oppContext);
              const f7Weights = await loadObjectiveWeights();
              const f7Load = await getSystemLoad();
              const f7Decision = adjustOpportunityRanking(rawOpportunities, f7Weights, f7Load, [0], 0.3, 0.5);
              seedPolicies().catch((e) => logF9Error("seed-policies", e));
              const f8Result = await runF8(f7Decision, f7Load, "MOVE", 0, phone, String(conversation.id));
              if (f8Result.blocked) { await resetChatSession(phone); return; }
              computeGlobalMetrics().catch((e) => logF9Error("global-metrics", e));
              logDecision(String(conversation.id), f7Decision, f8Result).catch((e) => logF9Error("decision-log", e));
              runF9(f7Decision, f8Result, String(conversation.id), "MOVE").catch((e) => logF9Error("f9-orchestrator", e));

              const finalOpps = f8Result.finalOverride?.ranked ?? f7Decision.ranked;
              const db = getDbInstance();
              const tx = await db.transaction();
              try {
                for (const opp of finalOpps) {
                  const oppMsg = buildOpportunityOfferMessage(opp.description);
                  const now = Math.floor(Date.now() / 1000);
                  const pendingData = JSON.stringify({
                    id: String(opp.ruleId), tipo: opp.type, presented_at: now, expires_at: now + 86400,
                    logId: opp.logId, label: opp.label, f7EconomicScore: opp.economicScore, f7Utility: opp.utilityScore,
                  });
                  await insertMessage(conversation.id, "assistant", oppMsg, tx);
                  await setChatSessionWorkflowState(phone, "post_trip_opportunity", tx);
                  await tx.execute({ sql: "UPDATE chat_sessions SET pending_opportunity = ?, updated_at = unixepoch() WHERE phone = ?", args: [pendingData, phone] });
                  await logOpportunityShown(String(conversation.id), opp.label, opp.utilityScore, tx);
                }
                await tx.commit();
              } catch (e) {
                await tx.rollback();
                console.error(`[OPPORTUNITY_ENGINE] Error en transacción, rolling back:`, e);
                return;
              }
              for (const opp of finalOpps) {
                await sendWhatsAppMessage(phone, buildOpportunityOfferMessage(opp.description));
              }
              if (finalOpps.length === 0) await resetChatSession(phone);
            } else {
              await resetChatSession(phone);
            }
          } else {
            await resetChatSession(phone);
          }
        } else {
          await resetChatSession(phone);
        }
        return;
      }
    }

    await processLead(execCtx, execDeps);
  } catch (e) {
    console.error("[LEAD_ERROR]", e);
    const errMsg = `⚠️ *Error en bot — cliente sin respuesta*\n\nTeléfono: ${phone}\nError: ${e instanceof Error ? e.message : String(e)}`;
    try {
      const errResp = buildGlobalErrorMessage();
      console.log("[TRACE RESPONSE]", { source: "GLOBAL_ERROR", text: errResp });
      await sendWhatsAppMessage(phone, errResp);
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

async function escalateTrip(convId: number, phone: string, trip: TripRow, urgency?: string, passengers?: number | null): Promise<void> {
  const u = (urgency || "").toLowerCase();

  if (u.includes("reserva")) {
    // Nivel 1: Principal (Cristian, 1h timeout)
    const principal = await getPrincipalDriver();
    if (principal && principal.status === "active") {
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
    if (principal2 && principal2.status === "active") {
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

  // Cualquier otro urgency (incluyendo vacío o no reconocido) → broadcast directo
  await broadcastTripToDrivers(trip, convId, phone, urgency, passengers);
  console.log(`[DISPATCH] Urgency="${urgency}" → broadcast conv ${convId}`);
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

// v5.0 FASE 5B: detectLeadLang es un helper local para no importar detectLang
// desde groq.ts (legacy). Mantiene el comportamiento anterior.
function detectLeadLang(text: string): Lang {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please"];
  if (ptMarkers.some((m) => lower.includes(m))) return "pt";
  if (enMarkers.some((m) => lower.includes(m))) return "en";
  return "es";
}

// v5.0 FASE 5B: buildExtractionContext arma el input rico para la policy RESERVA.
// La policy usa esto para redactar el finalResponse (confirmación, clarificación
// o fallback) sin LLM y sin inferencia geográfica.
//
// v5.0 FASE 5B.2: si el CORE detectó role lock para origin/destination, esos
// slots sobrescriben los del LLM. La sintaxis del input es la fuente de verdad
// para el rol; el LLM solo completa valores cuando no hay role lock.
//
// v5.0 FASE 5B.3: además del role lock, se hace merge con prev slots de
// `chat_sessions.slots` (multi-turn persistence). Cadena de prioridad:
//   1. role lock de CORE (score 1.0, más fuerte)
//   2. LLM extraction del turno actual (score 0.9)
//   3. prev slots de turnos anteriores (score 0.8, base)
function buildExtractionContext(
  _parsedData: TripExtraction | undefined,
  confidenceResult: ExtractionResult | undefined,
  workflowResult: SlotWorkflowContext | undefined,
  pricing: Awaited<ReturnType<typeof calculatePrice>> | undefined,
  roleLock?: RoleLock,
  slotStability?: SlotStabilityMap,
  prevSlots?: Record<string, string>,
): ExtractionContext | undefined {
  if (!workflowResult) return undefined;

  // Cadena de prioridad: role lock > LLM > prev slots.
  // 1. Empezar con prev slots (base).
  const slots: Record<string, { value: string | number | null; score: number; reason: string }> = {};
  if (prevSlots) {
    for (const [k, v] of Object.entries(prevSlots)) {
      if (v != null && String(v).trim() !== "") {
        slots[k] = { value: String(v), score: 0.8, reason: "previous_turn" };
      }
    }
  }

  // 2. Sobrescribir con LLM (mayor score).
  const baseSlots = confidenceResult?.slots ?? {};
  for (const [k, v] of Object.entries(baseSlots)) {
    if (v && v.value != null && String(v.value).trim() !== "") {
      slots[k] = v;
    }
  }

  // 3. Sobrescribir con role lock (más fuerte).
  if (roleLock?.origin) {
    slots.origin = {
      value: roleLock.origin,
      score: 1.0,
      reason: "core_role_lock",
    };
  }
  if (roleLock?.destination) {
    slots.destination = {
      value: roleLock.destination,
      score: 1.0,
      reason: "core_role_lock",
    };
  }

  return {
    slots,
    overallConfidence: confidenceResult?.overall_confidence ?? 0,
    workflowState: workflowResult.state,
    clarifyField: workflowResult.clarifyField ?? null,
    askForConfirmation: workflowResult.askForConfirmation ?? false,
    tariff: pricing
      ? {
          matched: pricing.final_price > 0,
          price: pricing.final_price > 0 ? pricing.final_price : undefined,
          canonicalOrigin: pricing.origin.canonical_name ?? undefined,
          canonicalDestination: pricing.destination.canonical_name ?? undefined,
          method: "v3",
        }
      : undefined,
    roleLock: roleLock ?? { origin: null, destination: null },
    slotStability: slotStability ?? { origin: "open", destination: "open" },
  };
}

// v5.0 FASE 5B.3: carga prev slots de `chat_sessions.slots` (multi-turn).
// Retorna JSON plano parseado, o {} si no hay session. Tolerante a JSON inválido.
async function loadPreviousSlots(phone: string): Promise<Record<string, string>> {
  try {
    const session = await getChatSession(phone);
    if (!session?.slots) return {};
    const parsed = JSON.parse(session.slots);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v != null && String(v).trim() !== "") {
        result[k] = String(v);
      }
    }
    return result;
  } catch {
    return {};
  }
}

interface FallbackExtractionResult {
  pricing: Awaited<ReturnType<typeof calculatePrice>>;
  confidenceResult: ExtractionResult;
  workflowResult: SlotWorkflowContext;
  extractionNote: string;
}

/**
 * B2: Fallback extraction usando regex cuando la extracción vía LLM falla.
 * Devuelve resultado completo si es exitoso, o null si no.
 * No muta variables externas.
 */
async function tryFallbackExtraction(
  text: string,
  phone: string,
  prevConfidence: ExtractionResult | undefined,
): Promise<FallbackExtractionResult | null> {
  try {
    console.log("[EXTRACTION] Intentando fallback regex...");
    let originMatch: string | undefined;
    let destMatch: string | undefined;
    const dirMatch = text.match(/(?:de|desde)\s+(.+?)\s+(?:a|hasta|para|hacia)\s+(.+?)(?:\s*[,;.!?]|\s*$)/i);
    if (dirMatch) {
      originMatch = dirMatch[1].trim();
      destMatch = dirMatch[2].trim();
    }
    if (!originMatch || !destMatch) {
      const originRx = /\b(aeropuerto|aero|igr|igu)\b/i;
      const destRx = /\b(ciudad|la ciudad|a la ciudad|centro|centro iguazu|centro puerto|puerto iguazu|puerto|foz|cataratas)\b/i;
      originMatch = text.match(originRx)?.[1];
      destMatch = text.match(destRx)?.[1];
    }

    if (!originMatch) {
      const session = await getChatSession(phone);
      if (session?.slots) {
        const slots = JSON.parse(session.slots);
        if (slots.origin) originMatch = slots.origin;
      }
    }

    if (originMatch && destMatch) {
      console.log(`[EXTRACTION] Fallback: origin="${originMatch}" dest="${destMatch}"`);
      const ft = await calculatePrice({ origin: originMatch, destination: destMatch, passengers: 1 });
      if (ft.final_price > 0) {
        const slots: Record<string, { value: string | number; score: number; reason: string }> = {};
        if (prevConfidence) {
          Object.assign(slots, prevConfidence.slots);
        }
        slots.origin = { value: ft.origin.canonical_name ?? originMatch, score: 1.0, reason: "regex_fallback" };
        slots.destination = { value: ft.destination.canonical_name ?? destMatch, score: 1.0, reason: "regex_fallback" };
        slots.price = { value: ft.final_price, score: 1.0, reason: "backend_tariff_match" };
        const fbConfidence: ExtractionResult = {
          slots,
          overall_confidence: 1.0,
          action: "proceed",
        };
        const fbWorkflow = await evaluateWorkflowTransition(phone, {
          slots: fbConfidence.slots as Record<string, any>,
          overall_confidence: 1.0,
          action: "proceed",
        });
        const fbExtractionNote = [
          `Confianza general: 100%. Estado: collecting_slots.`,
          `Origen: "${originMatch}" → ${ft.origin.canonical_name} (Confianza: 100%)`,
          `Destino: "${destMatch}" → ${ft.destination.canonical_name} (Confianza: 100%)`,
          `PRECIO OFICIAL (calculado por backend): $${ft.final_price} ARS (precio hasta 4 pasajeros).`,
          `VALOR_PRECIO: ${ft.final_price}`,
          `Ruta oficial: ${ft.origin.canonical_name} → ${ft.destination.canonical_name}.`,
          `NO calcules ni modifiques este precio. Usá SOLO los valores oficiales del backend.`,
        ].join('\n');
        console.log("[EXTRACTION] Fallback exitoso, extractionNote generado con VALOR_PRECIO:", ft.final_price);
        return { pricing: ft, confidenceResult: fbConfidence, workflowResult: fbWorkflow, extractionNote: fbExtractionNote };
      }
      console.log("[EXTRACTION] Fallback: tariff no encontrado");
    } else {
      console.log("[EXTRACTION] Fallback: no se pudo extraer origin/dest del texto ni de session. text:", text.substring(0, 60), "originMatch:", originMatch, "destMatch:", destMatch);
    }
    return null;
  } catch (e) {
    console.error("[EXTRACTION] Fallback error:", e instanceof Error ? e.message : String(e));
    return null;
  }
}
