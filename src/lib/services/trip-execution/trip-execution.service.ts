import {
  createTrip,
  setConversationTrip,
  getActiveTripByPhone,
  updateTripTariff,
  insertMessage,
  setChatSessionWorkflowState,
  resetChatSession,
} from "@/lib/db/database";
import { getDbv } from "@/lib/db/core/connection";
import { setPendingOpportunity } from "@/lib/db/domains/learning";
import type { ChatSessionRow, OpportunityContext } from "@/lib/db/types";
import { ensureFleetCanHandle } from "@/lib/services/fleet-validation";
import { buildRouteKey, observe as observeLearning } from "@/lib/services/learning/fare-learning-engine";
import { classifyTripLeg } from "@/lib/services/geoEngine";
import { opportunityEngine } from "@/lib/services/opportunity-engine";
import { evaluateLearningPipeline } from "@/lib/services/learning/learning-pipeline.service";
import { logOpportunityShown } from "@/lib/services/learning/event-tracking";
import { buildOpportunityOfferMessage } from "@/lib/ai/response-builder";
import { executeDispatch } from "@/lib/services/dispatch/dispatch.service";
import type { DispatchResult } from "@/lib/services/dispatch/dispatch.service";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import type { PricingResult } from "@/lib/services/pricing/resolvePricingForSlots";
import type { Lang } from "@/lib/ai/types";
import { processLead } from "@/lib/core/pipeline";
import type { ExecutionContext, ExecutionDeps } from "@/lib/core/pipeline";
import type { ConfirmedSlot } from "@/lib/ai/types";

export interface TripExecutionInput {
  conversationId: number;
  phone: string;
  origin: string;
  destination: string;
  passengers: number;
  pricingResult: PricingResult;
  rawSlots: Record<string, any>;
  session: ChatSessionRow | null;
  lang: Lang;
  text: string;
  history: Array<{ role: string; content: string }>;
  customerName?: string | null;
}

export interface TripExecutionResult {
  tripId: string | null;
  executed: boolean;
  dispatchResult?: DispatchResult;
}

export async function executeTrip(input: TripExecutionInput, deps: ExecutionDeps): Promise<TripExecutionResult> {
  const { conversationId, phone, origin, destination, passengers, pricingResult, rawSlots, session, lang, text, history, customerName } = input;

  const fleetCheck = await ensureFleetCanHandle(passengers || 1, {
    phone,
    convId: conversationId,
    origin,
    destination,
    source: "lead.confirmation.new_flow",
  });
  if (!fleetCheck.ok) {
    await resetChatSession(phone);
    return { tripId: null, executed: false };
  }

  const confirmedSlots: Record<string, ConfirmedSlot> = {};
  for (const [k, v] of Object.entries(rawSlots)) {
    confirmedSlots[k] = { value: String(v ?? ""), score: 1, reason: "session" };
  }

  const extractionCtx = {
    slots: confirmedSlots,
    overallConfidence: 1.0,
    workflowState: "awaiting_confirmation",
    clarifyField: null,
    askForConfirmation: true,
    tariff: pricingResult.final_price > 0
      ? {
          matched: true,
          price: pricingResult.final_price,
          canonicalOrigin: pricingResult.origin.canonical_name ?? origin,
          canonicalDestination: pricingResult.destination.canonical_name ?? destination,
        }
      : { matched: false },
  };

  const execCtx: ExecutionContext = {
    phone,
    conversationId,
    text,
    history,
    customerName: customerName || undefined,
    extractionCtx,
    pricing: { final_price: pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0) },
    lang,
    intent: "MOVE",
  };

  const pipelineResult = await processLead(execCtx, deps);

  if (pipelineResult !== "completed") {
    await resetChatSession(phone);
    return { tripId: null, executed: false };
  }

  const pax = rawSlots.passengers || 1;
  const tripId = `trip_${Date.now()}`;
  const rawScheduledAt = rawSlots.scheduled_at;
  const scheduledAtValue = rawScheduledAt?.value ?? rawScheduledAt;
  const scheduledAtTs = scheduledAtValue ? Math.floor(new Date(String(scheduledAtValue)).getTime() / 1000) : undefined;
  const estimatedFare = rawSlots.fareEstimate ?? rawSlots.price ?? pricingResult.final_price;
  const finalFare = pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0);
  const routeKey = buildRouteKey(rawSlots.originZone ?? origin, rawSlots.destinationZone ?? destination);
  await Promise.all([
    createTrip(tripId, phone, origin, destination, pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || undefined), pax, scheduledAtTs, rawSlots.flight || undefined, "PENDING_DRIVER"),
    observeLearning(Number(estimatedFare), Number(finalFare), routeKey, false),
    setConversationTrip(conversationId, tripId),
  ]);
  const trip = await getActiveTripByPhone(phone);
  if (!trip) {
    await resetChatSession(phone);
    return { tripId: null, executed: false };
  }

  if (pricingResult.final_price > 0) {
    await updateTripTariff(trip.trip_id, pricingResult.tariff_id!, pricingResult.base_price);
  }
  const urgency = rawSlots.urgency || "ahora";
  const dispatchResult = await executeDispatch({ conversationId, phone, trip, urgency, passengers: pax });

  const { type: tripLegType, hotelZone } = classifyTripLeg(origin, destination);
  const oppContext: OpportunityContext = {
    tripId: trip.trip_id,
    clientPhone: phone,
    origin, destination, passengers: pax,
    tariffId: pricingResult.tariff_id,
    price: pricingResult.final_price > 0 ? pricingResult.final_price : (rawSlots.price || 0),
    piso: pricingResult.base_price, urgency,
    conversationId,
    tripLegType, hotelZone,
    intentKeywords: [] as string[],
    entityMatches: [] as string[],
    hasPendingOpportunity: !!session?.pending_opportunity,
    memoryBoost: 0,
  };
  const rawOpportunities = await opportunityEngine.evaluate(oppContext);
  const learningResult = await evaluateLearningPipeline({
    opportunities: rawOpportunities,
    conversationId: String(conversationId),
    phone,
    intent: "MOVE",
  });
  if (learningResult.blocked) {
    await resetChatSession(phone);
    return { tripId, executed: false, dispatchResult };
  }
  const finalOpps = learningResult.rankedOpportunities;
  const tx = await getDbv().transaction();
  try {
    for (const opp of finalOpps) {
      const oppMsg = buildOpportunityOfferMessage(opp.description);
      const now = Math.floor(Date.now() / 1000);
      const pendingData = JSON.stringify({
        id: String(opp.ruleId), tipo: opp.type, presented_at: now, expires_at: now + 86400,
        logId: opp.logId, label: opp.label, f7EconomicScore: opp.economicScore, f7Utility: opp.utilityScore,
      });
      await insertMessage(conversationId, "assistant", oppMsg, tx);
      await setChatSessionWorkflowState(phone, "post_trip_opportunity", tx);
      await setPendingOpportunity(phone, pendingData, tx);
      await logOpportunityShown(String(conversationId), opp.label, opp.utilityScore, tx);
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    console.error(`[OPPORTUNITY_ENGINE] Error en transacción, rolling back:`, e);
    return { tripId, executed: false, dispatchResult };
  }
  for (const opp of finalOpps) {
    await sendWhatsAppMessage(phone, buildOpportunityOfferMessage(opp.description));
  }
  if (finalOpps.length === 0) await resetChatSession(phone);

  return { tripId, executed: true, dispatchResult };
}
