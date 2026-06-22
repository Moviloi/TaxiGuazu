import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, getChatSession, resetChatSession } from "@/lib/db/database";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import type { ExecutionContext, ExecutionDeps } from "@/lib/core/pipeline";
import { processLead } from "@/lib/core/pipeline";
import { resolveGeoRoute } from "@/lib/services/geo/geo-engine";
import { evaluateOpportunities, isOpportunityQuery } from "@/lib/services/learning/opportunity-engine";
import { buildOpportunityNoPricingMessage, formatOpportunityResponse, buildCancellationMessage, buildNowDispatchResponse } from "@/lib/ai/response-builder";
import { handleMessage } from "@/lib/ai/handler";
import { saveContext } from "@/lib/services/memory/context-memory";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { isAffirmativeMessage, isNegativeMessage, AMBIGUOUS_LOCATION_RE } from "@/lib/ai/patterns";
import { executeTrip } from "@/lib/services/trip-execution/trip-execution.service";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import type { ExtractionContext, ConversationDomain, Mode, TemporalMode, OperationalMode } from "@/lib/ai/types";
import { temporalFromFacts, operationalModeFromIntent, operationalModeToMode } from "@/lib/ai/types";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import { detectLeadLang } from "@/lib/services/i18n/detect-lang";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import { buildConfirmationMessage, buildNoTariffConfirmation } from "@/lib/ai/policy-reserva";
import { core } from "@/lib/ai/core";
import { CONFIRMATION_TIMEOUT_S } from "@/config/constants";
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
  workflowResult: SlotConversationalContext | undefined;
  confidenceResult: ExtractionResult | undefined;
  prevSlotsEarly: Record<string, string>;
  parsedData: TripExtraction | undefined;
  domain: ConversationDomain;
  sessionUpdatedAt?: number;
}

export async function handlePolicyPipeline(
  input: PolicyPipelineInput,
): Promise<void> {
  const {
    phone, text, conversation, history, customerName, leadCore,
    pricing, confidenceResult, workflowResult, prevSlotsEarly, parsedData, domain,
    sessionUpdatedAt,
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

  // FASE 16 — Temporalidad desde facts
  const scheduledAt = extractionCtx?.slots?.scheduled_at?.value != null;
  const temporal: TemporalMode = temporalFromFacts(leadCore.facts);
  const operationalMode: OperationalMode = operationalModeFromIntent(leadCore.intent, temporal);
  // Backward compat: derivar Mode desde OperationalMode
  const mode: Mode = operationalModeToMode(operationalMode);

  log.info("[TEMPORALITY_DECISION]", {
    intent: leadCore.intent,
    temporal,
    operationalMode,
    mode,
    facts: leadCore.facts,
  });

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
    domain,
    mode,
    temporal,
    operationalMode,
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

  if (domain === "reservation") {
    const convState = await getConversationalState(phone);

    if (convState === "awaiting_confirmation" && isNegativeMessage(text)) {
      const hasNewData = parsedData != null && (
        parsedData.origin || parsedData.destination ||
        parsedData.scheduled_at || parsedData.passengers ||
        parsedData.flight
      );
      if (!hasNewData) {
        log.info("[CONFIRMATION] negative response, cancelling confirmation");
        const cancelMsg = buildCancellationMessage(lang);
        await sendWhatsAppMessage(phone, cancelMsg);
        await insertMessage(conversation.id, "assistant", cancelMsg);
        await setConversationalState(phone, "idle");
        await resetChatSession(phone);
        return;
      }
      log.info("[CONFIRMATION] negative with new slot data — treating as correction, not cancellation");
    }

    if (convState === "awaiting_confirmation" && isAffirmativeMessage(text)) {
      const session = await getChatSession(phone);
      if (!session) return;
      const now = Math.floor(Date.now() / 1000);
      const sessionAge = sessionUpdatedAt ? now - sessionUpdatedAt : 0;
      if (sessionAge > CONFIRMATION_TIMEOUT_S) {
        log.info(`[CONFIRMATION] stale affirmation (${sessionAge}s > ${CONFIRMATION_TIMEOUT_S}s), cancelling`);
        await setConversationalState(phone, "idle");
        await resetChatSession(phone);
        return;
      }
      const hasNewSlotData = parsedData != null && (
        (parsedData.origin && parsedData.origin !== (prevSlotsEarly.origin ?? "")) ||
        (parsedData.destination && parsedData.destination !== (prevSlotsEarly.destination ?? "")) ||
        (parsedData.scheduled_at != null && parsedData.scheduled_at !== (prevSlotsEarly.scheduled_at ?? "")) ||
        (parsedData.passengers != null && prevSlotsEarly.passengers != null && String(parsedData.passengers) !== prevSlotsEarly.passengers) ||
        (parsedData.flight && parsedData.flight !== (prevSlotsEarly.flight ?? ""))
      );
      if (hasNewSlotData) {
        log.info("[CONFIRMATION] affirmation with new slot data — re-confirming");
        const confirmMsg = extractionCtx?.tariff?.matched && extractionCtx.tariff.price != null
          ? buildConfirmationMessage(extractionCtx, lang)
          : buildNoTariffConfirmation(extractionCtx!, lang);
        await sendWhatsAppMessage(phone, confirmMsg);
        await insertMessage(conversation.id, "assistant", confirmMsg);
        return;
      }
      let rawSlots: any;
      try { rawSlots = JSON.parse(session.slots || "{}"); } catch { return; }
      const origin = rawSlots.origin || "";
      const destination = rawSlots.destination || "";
      if (origin && destination) {
        const shortcutPricing = pricing && pricing.final_price > 0
          ? pricing
          : (await resolvePricingForSlots({ origin, destination, passengers: rawSlots.passengers || 1 })).pricingResult;
        log.info("[EXECUTION]", {
          executeNowTrip: false,
          executeTrip: true,
          origin,
          destination,
          price: shortcutPricing?.final_price ?? null,
          scheduled_at: rawSlots.scheduled_at ?? null,
          passengers: rawSlots.passengers || 1,
        });
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
        await setConversationalState(phone, "idle");
      } else {
        await resetChatSession(phone);
      }
      return;
    }
  }

  const isLateral = leadCore.intent === "EMERGENCY" || leadCore.intent === "RESCHEDULE";
  const originValue = extractionCtx?.slots?.origin?.value;
  const destValue = extractionCtx?.slots?.destination?.value;
  const hasOrigin = originValue != null && String(originValue).trim() !== "";
  const hasDestination = destValue != null && String(destValue).trim() !== "";
  const hasCompleteRoute = hasOrigin && hasDestination;

  // FASE 16 — Short-circuit: solo DISPATCH sin ambigüedad
  const hasAmbiguity = leadCore.facts.includes("location_ambiguous:true") ||
    extractionCtx?.slots?.origin?.reason === "ambiguous_term" ||
    extractionCtx?.slots?.destination?.reason === "ambiguous_term" ||
    (originValue != null && (extractionCtx?.slots?.origin?.score ?? 0) < 0.7 && AMBIGUOUS_LOCATION_RE.test(String(originValue))) ||
    (destValue != null && (extractionCtx?.slots?.destination?.score ?? 0) < 0.7 && AMBIGUOUS_LOCATION_RE.test(String(destValue)));

  const canDispatch = operationalMode === "DISPATCH" && hasCompleteRoute && !hasAmbiguity;
  log.info("[DISPATCH_DECISION]", {
    decision: canDispatch ? "DISPATCH" : "NO_DISPATCH",
    motivo: canDispatch ? "ready_for_dispatch"
      : operationalMode !== "DISPATCH" ? `mode=${operationalMode}`
      : !hasCompleteRoute ? "incomplete_route"
      : hasAmbiguity ? "location_ambiguous"
      : "unknown",
    operationalMode,
    temporal,
    nowExplicito: leadCore.intent === "NOW",
    routeComplete: hasCompleteRoute,
    locationCertainty: hasAmbiguity ? "ambiguous" : "certain",
    pricingMatched: pricing?.final_price > 0 ?? false,
    passengersStatus: extractionCtx?.slots?.passengers?.value != null ? "present" : "unknown",
  });

  if (canDispatch) {
    const msg = buildNowDispatchResponse(lang);
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    log.info("[AHORA] dispatch", { phone, origin: originValue, destination: destValue });
    log.info("[EXECUTION]", {
      executeNowTrip: true,
      executeTrip: false,
      origin: originValue ?? null,
      destination: destValue ?? null,
      price: pricing?.final_price ?? null,
      scheduled_at: null,
      passengers: extractionCtx?.slots?.passengers?.value ?? 1,
    });
    await executeNowTrip({
      phone,
      conversationId: conversation.id,
      origin: String(originValue),
      destination: String(destValue),
      passengers: Number(extractionCtx?.slots?.passengers?.value ?? 1),
      pricing: pricing && pricing.final_price > 0 ? pricing : undefined,
      customerName,
      lang,
      text,
    });
    return;
  }

  await processLead(execCtx, execDeps);
}
