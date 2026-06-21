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

    await handlePolicyPipeline({
      phone, text, conversation, history, customerName,
      leadCore, extractionCtx, pricing, workflowResult,
      confidenceResult, prevSlotsEarly, parsedData, domain,
      sessionUpdatedAt: session?.updated_at,
    });

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
