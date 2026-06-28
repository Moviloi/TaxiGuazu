import {
  createTrip,
  setConversationTrip,
  getActiveTripByPhone,
  updateTripTariff,
  insertMessage,
  setPendingOpportunity,
} from "@/lib/db/database";
import { setTripState, setConversationalState } from "@/lib/db/state-accessors";
import { createTransaction } from "@/lib/db/database";
import type { ChatSessionRow } from "@/lib/db/types";
import type { OpportunityContext } from "@/lib/services/learning/opportunity-types";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";
import { buildRouteKey, observe as observeLearning } from "@/lib/services/learning/fare-learning-engine";
import { classifyTripLeg } from "@/lib/services/geo/geo-engine";
import { opportunityEngine } from "@/lib/services/learning/opportunity-engine";
import { logOpportunityShown } from "@/lib/services/learning/event-tracking";
import { buildOpportunityOfferMessage } from "@/lib/ai/response-builder";
import { executeDispatch } from "@/lib/services/dispatch/dispatch.service";
import type { DispatchResult } from "@/lib/services/dispatch/dispatch.service";
import { sendWhatsAppMessage } from "@/lib/sender";
import type { PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";
import type { Lang } from "@/lib/ai/types";
import { processLead } from "@/lib/pipeline";
import type { ExecutionContext, ExecutionDeps } from "@/lib/pipeline";
import type { ConfirmedSlot, ConversationalState } from "@/lib/ai/types";
import { log } from "@/lib/utils/logger";

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
    await setConversationalState(phone, "idle");
    return { tripId: null, executed: false };
  }

  const confirmedSlots: Record<string, ConfirmedSlot> = {};
  for (const [k, v] of Object.entries(rawSlots)) {
    confirmedSlots[k] = { value: String(v ?? ""), score: 1, reason: "session", status: "CONFIRMED", source: "SYSTEM_INFERRED" };
  }

  const extractionCtx = {
    slots: confirmedSlots,
    overallConfidence: 1.0,
    conversationalState: "awaiting_confirmation" as ConversationalState,
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
    domain: "reservation",
    mode: "RESERVA",
  };

  const pipelineResult = await processLead(execCtx, deps);

  if (pipelineResult !== "completed") {
    await setConversationalState(phone, "idle");
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
    await setConversationalState(phone, "idle");
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
  const finalOpps = await opportunityEngine.evaluate(oppContext);
  const tx = await createTransaction();
  try {
    for (const opp of finalOpps) {
      const oppMsg = buildOpportunityOfferMessage(opp.description);
      const now = Math.floor(Date.now() / 1000);
      const pendingData = JSON.stringify({
        id: String(opp.ruleId), tipo: opp.type, presented_at: now, expires_at: now + 86400,
        logId: opp.logId, label: opp.label,
      });
      await insertMessage(conversationId, "assistant", oppMsg, tx);
      await setTripState(phone, "opportunity", tx);
      await setPendingOpportunity(phone, pendingData, tx);
      await logOpportunityShown(String(conversationId), opp.label, opp.priority, tx);
    }
    await tx.commit();
  } catch (e) {
    await tx.rollback();
    log.error(`[OPPORTUNITY_ENGINE] Error en transacción, rolling back:`, e);
    return { tripId, executed: false, dispatchResult };
  }
  for (const opp of finalOpps) {
    await sendWhatsAppMessage(phone, buildOpportunityOfferMessage(opp.description));
  }
  if (finalOpps.length === 0) await setConversationalState(phone, "idle");

  return { tripId, executed: true, dispatchResult };
}
