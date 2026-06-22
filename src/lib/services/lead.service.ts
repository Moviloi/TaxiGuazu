import { getConversationByPhone, insertMessage, getChatSession } from "@/lib/db/database";
import { buildGlobalErrorMessage } from "@/lib/ai/response-builder";
import { resetRequestState } from "@/lib/ai/guard";
import { core } from "@/lib/ai/core";
import type { Intent } from "@/lib/ai/types";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";

import { handleCommandShortcuts } from "@/lib/services/workflow/command-shortcuts";
import { handleResponseReset } from "@/lib/services/workflow/response-reset";
import { handleAdminCommands } from "@/lib/services/workflow/admin-commands";
import { handleConversationSetup } from "@/lib/services/workflow/conversation-setup";
import { handleOpportunityResponse } from "@/lib/services/workflow/opportunity-response";
import { handlePolicyPipeline } from "@/lib/services/workflow/policy-pipeline";
import { buildMemory } from "@/lib/services/memory/memory";
import { buildPredictedContext } from "@/lib/services/memory/predictive-routing";
import { logIntentDetected, logEntityDetected } from "@/lib/services/learning/event-tracking";
import { runComprehensionCheck } from "@/lib/services/extraction/comprehension-runner";
import { runExtractionPipeline } from "@/lib/services/extraction/extraction-runner";
import { getConversationalState } from "@/lib/db/state-accessors";

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
      await handleResponseReset(phone, trimmed);
      const [postSession, postState] = await Promise.all([
        getChatSession(phone).catch(() => null),
        getConversationalState(phone).catch(() => null),
      ]);
      log.info("[AUDIT_LIMPIAR]", {
        phone: phone.slice(-4),
        command: ".limpiar",
        postClearSlots: postSession?.slots ? JSON.parse(postSession.slots) : null,
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
