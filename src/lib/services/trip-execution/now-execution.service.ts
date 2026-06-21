import { createTrip, getActiveTripByPhone } from "@/lib/db/domains/trips";
import { setConversationalState } from "@/lib/db/state-accessors";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";
import { executeDispatch } from "@/lib/services/dispatch/dispatch.service";
import type { PricingResult } from "@/lib/services/pricing/pricing-engine";
import { log } from "@/lib/utils/logger";

export interface NowTripInput {
  phone: string;
  conversationId: number;
  origin: string;
  destination: string;
  passengers: number;
  pricing: PricingResult | undefined;
  customerName: string | null;
  lang: string;
  text: string;
}

export interface NowTripResult {
  tripId: string | null;
  dispatched: boolean;
  reason?: string;
}

export async function executeNowTrip(input: NowTripInput): Promise<NowTripResult> {
  const { phone, conversationId, origin, destination, passengers, pricing } = input;

  if (!origin || !destination || String(origin).trim() === "" || String(destination).trim() === "") {
    return { tripId: null, dispatched: false, reason: "incomplete_route" };
  }

  const existing = await getActiveTripByPhone(phone);
  if (existing) {
    log.info("[NOW_TRIP] active trip exists, skipping duplicate", { tripId: existing.trip_id });
    return { tripId: null, dispatched: false, reason: "active_trip_exists" };
  }

  const fleetCheck = await ensureFleetCanHandle(passengers || 1, {
    phone,
    convId: conversationId,
    origin,
    destination,
    source: "lead.now_execution",
  });
  if (!fleetCheck.ok) {
    await setConversationalState(phone, "idle");
    return { tripId: null, dispatched: false, reason: "fleet_unavailable" };
  }

  const tripId = `trip_now_${Date.now()}`;
  const finalPrice = pricing?.final_price != null && pricing.final_price > 0 ? pricing.final_price : undefined;
  await createTrip(
    tripId,
    phone,
    origin,
    destination,
    finalPrice,
    passengers || 1,
    undefined,
    undefined,
    "PENDING_DRIVER",
  );

  const trip = await getActiveTripByPhone(phone);
  if (!trip) {
    await setConversationalState(phone, "idle");
    return { tripId: null, dispatched: false, reason: "trip_not_found_after_create" };
  }

  if (finalPrice && pricing?.tariff_id) {
    const { updateTripTariff } = await import("@/lib/db/domains/trips");
    await updateTripTariff(trip.trip_id, pricing.tariff_id, pricing.base_price, passengers);
  }

  const urgency = "ahora";
  const dispatchResult = await executeDispatch({ conversationId, phone, trip, urgency, passengers: passengers || 1 });

  await setConversationalState(phone, "idle");

  log.info("[NOW_TRIP] dispatched", {
    tripId,
    status: dispatchResult.status,
    offersSent: dispatchResult.offersSent,
  });

  return { tripId, dispatched: dispatchResult.status !== "NO_DRIVERS" };
}
