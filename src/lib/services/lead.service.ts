import { getConversationByPhone, insertMessage } from "@/lib/db/database";
import { buildGlobalErrorMessage } from "@/lib/ai/response-builder";
import { resetRequestState } from "@/lib/ai/guard";
import { handleMessage } from "@/lib/ai/handler";
import { core } from "@/lib/ai/core";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { notifyAdmin } from "@/lib/services/admin.service";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";

import { handleCommandShortcuts } from "@/lib/services/workflow/command-shortcuts";
import { handleResponseReset } from "@/lib/services/workflow/response-reset";
import { handleAdminCommands } from "@/lib/services/workflow/admin-commands";
import { handleConversationSetup } from "@/lib/services/workflow/conversation-setup";
import { handleOpportunityResponse } from "@/lib/services/workflow/opportunity-response";
import { handleMemoryAndExtraction } from "@/lib/services/extraction/memory-and-extraction";
import { handlePolicyPipeline } from "@/lib/services/workflow/policy-pipeline";

import type { PricingResult } from "@/lib/services/pricing/resolvePricingForSlots";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/slot-workflow";
import type { ExtractionContext } from "@/lib/ai/types";

// ── Domain interfaces (F.5 type-only, no logic moved) ──

export interface LeadProcessingContext {
  phone: string;
  text: string;
  conversation: { id: number };
  history: any[];
  customerName: string | null;
  leadCore: ReturnType<typeof core>;
  pricing?: PricingResult;
  confidenceResult?: ExtractionResult;
  workflowResult?: SlotWorkflowContext;
  extractionCtx?: ExtractionContext;
}

export interface LeadExecutionResult {
  success: boolean;
  path: string;
}

// ── COORDINATOR ──
// Routes the webhook message through sub-handlers. Each handler returns true
// if it fully handled the message (caller should return immediately).
export async function handleLeadMessage(phone: string, text: string): Promise<void> {
  try {
    console.log("[TRACE WEBHOOK MESSAGE]", { event: "message_received", phoneLen: phone.length, textLen: text.length });
    console.log(`[DEBUG_LEAD] phone=******${phone.slice(-4)} textLen=${text.length}`);
    resetRequestState();
    handleMessage(text, "RESERVA");
    const leadCore = core(text);
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
    const extractionResult = await handleMemoryAndExtraction(
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

    await handlePolicyPipeline({
      phone, text, conversation, history, customerName,
      leadCore, extractionCtx, pricing, workflowResult,
      confidenceResult, prevSlotsEarly, parsedData,
    });

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
