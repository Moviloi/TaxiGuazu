import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, getChatSession, resetChatSession } from "@/lib/db/database";
import type { ExecutionContext, ExecutionDeps } from "@/lib/core/pipeline";
import { processLead } from "@/lib/core/pipeline";
import { resolveGeoRoute } from "@/lib/services/geo/geo-engine";
import { evaluateOpportunities, isOpportunityQuery } from "@/lib/services/learning/opportunity-engine";
import { buildOpportunityNoPricingMessage, formatOpportunityResponse } from "@/lib/ai/response-builder";
import { handleMessage } from "@/lib/ai/handler";
import { saveContext } from "@/lib/services/memory/context-memory";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { isAffirmativeMessage } from "@/lib/ai/patterns";
import { executeTrip } from "@/lib/services/trip-execution/trip-execution.service";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolvePricingForSlots";
import type { ExtractionContext } from "@/lib/ai/types";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotWorkflowContext } from "@/lib/services/workflow/slot-workflow";
import { detectLeadLang } from "@/lib/services/i18n/detect-lang";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import { core } from "@/lib/ai/core";
import { log } from "@/lib/utils/logger";
type CoreResult = ReturnType<typeof core>;

export interface PolicyPipelineInput {
  phone: string;
  text: string;
  conversation: { id: number };
  history: any[];
  customerName: string | null;
  leadCore: CoreResult;
  extractionCtx: ExtractionContext | undefined;
  pricing: PricingResult | undefined;
  workflowResult: SlotWorkflowContext | undefined;
  confidenceResult: ExtractionResult | undefined;
  prevSlotsEarly: Record<string, string>;
  parsedData: TripExtraction | undefined;
}

export async function handlePolicyPipeline(
  input: PolicyPipelineInput,
): Promise<void> {
  const {
    phone, text, conversation, history, customerName, leadCore,
    pricing, confidenceResult, workflowResult, prevSlotsEarly, parsedData,
  } = input;

  const extractionCtx = input.extractionCtx ?? buildExtractionContext(
    parsedData,
    confidenceResult,
    workflowResult,
    pricing,
    leadCore?.roleLock,
    leadCore?.slotStability,
    prevSlotsEarly,
  );

  const lang = detectLeadLang(text);

  const execCtx: ExecutionContext = {
    phone,
    conversationId: conversation.id,
    text,
    history,
    customerName: customerName || undefined,
    extractionCtx,
    pricing,
    lang,
    intent: leadCore.intent,
  };
  const execDeps: ExecutionDeps = {
    send: sendWhatsAppMessage,
    persist: insertMessage,
    handler: handleMessage,
    geo: { resolveGeoRoute },
    memory: { saveContext },
    adminNotify: notifyAdmin,
  };

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
      log.info("[OPPORTUNITY] response sent:", oppMsg.substring(0, 120));
    } else {
      const msg = buildOpportunityNoPricingMessage(lang);
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
    }
    return;
  }

  {
    const session = await getChatSession(phone);
    if (session?.workflow_state === "awaiting_confirmation" && isAffirmativeMessage(text)) {
      let rawSlots: any;
      try { rawSlots = JSON.parse(session.slots || "{}"); } catch { return; }
      const origin = rawSlots.origin || "";
      const destination = rawSlots.destination || "";
      if (origin && destination) {
        const shortcutPricing = pricing && pricing.final_price > 0
          ? pricing
          : (await resolvePricingForSlots({ origin, destination, passengers: rawSlots.passengers || 1 })).pricingResult;
        await executeTrip({
          conversationId: conversation.id,
          phone,
          origin,
          destination,
          passengers: rawSlots.passengers || 1,
          pricingResult: shortcutPricing,
          rawSlots,
          session,
          lang,
          text,
          history,
          customerName: customerName ?? null,
        }, execDeps);
      } else {
        await resetChatSession(phone);
      }
      return;
    }
  }

  await processLead(execCtx, execDeps);
}
