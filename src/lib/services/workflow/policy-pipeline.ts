import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/sender";
import { shouldRequestConfirmation, buildSlotConfirmationMessage } from "@/lib/ai/slot-confirmation";
import { insertMessage, getChatSession, resetChatSession } from "@/lib/db/database";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import type { ExecutionContext, ExecutionDeps } from "@/lib/pipeline";
import { processLead } from "@/lib/pipeline";
import { resolveGeoRoute } from "@/lib/services/geo/geo-engine";
import { evaluateOpportunities, isOpportunityQuery } from "@/lib/services/learning/opportunity-engine";
import { buildOpportunityNoPricingMessage, formatOpportunityResponse, buildCancellationMessage, buildNowDispatchResponse } from "@/lib/ai/response-builder";
import { handleMessage } from "@/lib/ai/handler";
import { saveContext } from "@/lib/services/memory/context-memory";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";
import { getPlaceDisplayName } from "@/lib/ai/display-name";
import { canDispatch as isDispatchReady, canQuote as isQuoteReady, canPrepareQuote as isPrepareQuoteReady } from "@/lib/ai/operational-readiness";
import { executeTrip } from "@/lib/services/trip-execution/trip-execution.service";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { resolvePricingForSlots, type PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import type { ExtractionContext, ConversationDomain, Mode, TemporalMode, OperationalMode, Lang } from "@/lib/ai/types";
import { temporalFromFacts, operationalModeFromIntent, operationalModeToMode } from "@/lib/ai/types";
import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import { detectLeadLang, resolveLang } from "@/lib/detect-lang";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import { buildConfirmationMessage, buildNoTariffConfirmation } from "@/lib/ai/policy-reserva";
import { parseSessionSlots } from "@/lib/services/shared/session-helpers";
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

  const lang: Lang = detectLeadLang(text);
  const extendedLang = resolveLang(text, parsedData);
  if (extendedLang !== lang) {
    log.info("[LANG_EXTENDED]", { fastPath: lang, extended: extendedLang });
  }

  // FASE 20.3 — Resolver display names para mensajes UX
  if (extractionCtx?.tariff) {
    if (extractionCtx.tariff.canonicalOrigin) {
      const { displayName } = await getPlaceDisplayName(extractionCtx.tariff.canonicalOrigin);
      extractionCtx.tariff.displayOrigin = displayName;
    }
    if (extractionCtx.tariff.canonicalDestination) {
      const { displayName } = await getPlaceDisplayName(extractionCtx.tariff.canonicalDestination);
      extractionCtx.tariff.displayDestination = displayName;
    }
    log.info("[DISPLAY_NAME]", {
      canonicalOrigin: extractionCtx.tariff.canonicalOrigin,
      displayOrigin: extractionCtx.tariff.displayOrigin,
      canonicalDest: extractionCtx.tariff.canonicalDestination,
      displayDest: extractionCtx.tariff.displayDestination,
    });
  }

  // FASE 16 — Temporalidad desde facts
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
    sendButtons: sendInteractiveButtons,
    persist: insertMessage,
    handler: handleMessage,
    geo: { resolveGeoRoute },
    memory: { saveContext },
    adminNotify: notifyAdmin,
  };

  if (isOpportunityQuery(text)) {
    if (pricing && pricing.final_price > 0 && isQuoteReady(extractionCtx).allowed) {
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
      rawSlots = parseSessionSlots(session.slots || null);
      if (Object.keys(rawSlots).length === 0) return;
      const origin = rawSlots.origin || "";
      const destination = rawSlots.destination || "";
      const shortcutDispatchReady = isDispatchReady(extractionCtx, temporal);
      if (origin && destination && shortcutDispatchReady.allowed) {
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

  // FASE 20.4 — Slot Confirmation UX: si hay CONFIRMATION_PENDING, mostrar confirmación antes de seguir
  if (shouldRequestConfirmation(extractionCtx)) {
    // Resolve display names from DB para mejor UX
    let confirmCtx = extractionCtx;
    const originVal = extractionCtx?.slots?.origin?.value;
    const destVal = extractionCtx?.slots?.destination?.value;
    if (originVal && !confirmCtx?.tariff?.displayOrigin) {
      try {
        const dn = await getPlaceDisplayName(String(originVal));
        confirmCtx = { ...confirmCtx!, tariff: { matched: false, ...confirmCtx?.tariff, displayOrigin: dn.displayName } };
      } catch { /* fallback: canonical name */ }
    }
    if (destVal && !confirmCtx?.tariff?.displayDestination) {
      try {
        const dn = await getPlaceDisplayName(String(destVal));
        confirmCtx = { ...confirmCtx!, tariff: { matched: false, ...confirmCtx?.tariff, displayDestination: dn.displayName } };
      } catch { /* fallback: canonical name */ }
    }
    const confirm = buildSlotConfirmationMessage(confirmCtx!, lang);
    log.info("[SLOT_CONFIRMATION_UI]", {
      pendingSlots: confirm.pendingSlots,
      message: confirm.message?.substring(0, 80),
      buttons: confirm.buttons?.map(b => b.id),
      displayOrigin: confirmCtx?.tariff?.displayOrigin,
      displayDestination: confirmCtx?.tariff?.displayDestination,
    });
    await sendInteractiveButtons(phone, confirm.message!, confirm.buttons!);
    await insertMessage(conversation.id, "assistant", confirm.message!);
    await setConversationalState(phone, "slot_confirmation");
    return;
  }

  const originValue = extractionCtx?.slots?.origin?.value;
  const destValue = extractionCtx?.slots?.destination?.value;

  // FASE 21/24 — Operational readiness log
  const prepareQuoteReady = isPrepareQuoteReady(extractionCtx);
  const quoteReady = isQuoteReady(extractionCtx);
  const dispatchReady = isDispatchReady(extractionCtx, temporal);

  const canDispatch = operationalMode === "DISPATCH" && dispatchReady.allowed;
  log.info("[DISPATCH_DECISION]", {
    decision: canDispatch ? "DISPATCH" : "NO_DISPATCH",
    motivo: canDispatch ? "ready_for_dispatch"
      : operationalMode !== "DISPATCH" ? `mode=${operationalMode}`
      : dispatchReady.blockedBy.length > 0 ? dispatchReady.blockedBy.join(",")
      : "unknown",
    operationalMode,
    temporal,
    nowExplicito: leadCore.intent === "NOW",
    dispatchReadyBlockedBy: dispatchReady.blockedBy,
    pricingMatched: pricing?.final_price != null && pricing.final_price > 0,
  });

  // FASE 22.2 — Conversation phase log
  const phase =
    dispatchReady.allowed
      ? "READY_TO_DISPATCH"
      : dispatchReady.blockedBy.some(x => x.includes("pending"))
        ? "SLOT_CONFIRMATION"
        : quoteReady.allowed
          ? "QUOTE"
          : prepareQuoteReady.allowed
            ? "NEEDS_PASSENGERS"
            : "DATA_COLLECTION";
  log.info("[CONVERSATION_PHASE]", {
    phase,
    prepareQuoteAllowed: prepareQuoteReady.allowed,
    quoteAllowed: quoteReady.allowed,
    dispatchAllowed: dispatchReady.allowed,
    blockedBy: dispatchReady.blockedBy.length > 0 ? dispatchReady.blockedBy : quoteReady.blockedBy,
    slots: Object.fromEntries(
      Object.entries(extractionCtx?.slots ?? {}).map(([k, v]) => [
        k,
        { status: v?.status ?? null, source: v?.source ?? null },
      ])
    ),
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

  const safeExtractionCtx = !quoteReady.allowed && extractionCtx?.tariff
    ? { ...extractionCtx, tariff: { ...extractionCtx.tariff, matched: false, price: undefined } }
    : extractionCtx;

  await processLead({ ...execCtx, extractionCtx: safeExtractionCtx }, execDeps);
}
