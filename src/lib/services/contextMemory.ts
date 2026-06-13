// Context Memory Engine — stateful conversation continuity.
// maintains partial trip state (slots + intent + zone + confidence + timestamps)
// across turns, enabling multi-turn natural conversation.

import { getChatSession, upsertChatSession, resetChatSession } from "@/lib/db/database";
import { type ZoneResolution, type ZoneExpansionResult, type ProximityScore } from "@/lib/services/geoEngine";

type FareCategory = "LOW" | "MEDIUM" | "MEDIUM+" | "HIGH" | "VARIABLE";

interface FareAdjustments {
  subzoneModifier: number;
  corridorBonus: number;
  borderPenalty: number;
  proximityModifier: number;
}

interface FareResult {
  category: FareCategory;
  basePrice: number;
  finalPrice: number;
  adjustments: FareAdjustments;
  confidence: number;
}

export interface ConversationContext {
  origin?: string;
  destination?: string;
  intent?: string;
  originZone?: string | null;
  destinationZone?: string | null;
  distanceClass?: string;
  confidence?: number;
  lastUpdate: number;
}

export async function loadContext(phone: string): Promise<ConversationContext> {
  const session = await getChatSession(phone);
  if (!session?.slots) return { lastUpdate: 0 };

  let slots: Record<string, any> = {};
  try {
    slots = JSON.parse(session.slots);
  } catch {
    return { lastUpdate: 0 };
  }

  return {
    origin: slots.origin ?? undefined,
    destination: slots.destination ?? undefined,
    intent: slots.intent ?? undefined,
    originZone: slots.originZone ?? undefined,
    destinationZone: slots.destinationZone ?? undefined,
    distanceClass: slots.distanceClass ?? undefined,
    confidence: slots._confidence ?? undefined,
    lastUpdate: session.updated_at ?? 0,
  };
}

export function mergeContext(
  current: Record<string, any>,
  previous: ConversationContext,
  confidence?: number,
): Record<string, any> {
  const merged = { ...current };

  // origin: never overwrite a confirmed origin with lower-confidence data
  if (previous.origin && !merged.origin) {
    merged.origin = previous.origin;
  }

  // destination: same rule
  if (previous.destination && !merged.destination) {
    merged.destination = previous.destination;
  }

  // intent: carry forward if current turn doesn't produce a clear one
  if (previous.intent && !merged.intent) {
    merged.intent = previous.intent;
  }

  // Inject confidence marker for persistence
  if (confidence != null) {
    merged._confidence = confidence;
  }

  return merged;
}

export interface ContextSaveInput {
  slots: Record<string, any>;
  intent?: string;
  zones?: ZoneResolution | null;
  expansion?: ZoneExpansionResult | null;
  proximityScore?: ProximityScore | null;
  fare?: FareResult | null;
  fareDelta?: number | null;
  finalFare?: number | null;
  humanOverrideFlag?: boolean | null;
  tripOutcomeRef?: string | null;
  confidence?: number;
}

export async function saveContext(phone: string, input: ContextSaveInput): Promise<void> {
  const mergedSlots = { ...(input.slots ?? {}) };

  // Attach intent
  if (input.intent) {
    mergedSlots.intent = input.intent;
  }

  // Attach zone data
  if (input.zones) {
    mergedSlots.originZone = input.zones.originZone;
    mergedSlots.destinationZone = input.zones.destinationZone;
    mergedSlots.distanceClass = input.zones.distanceClass;
  }

  // Attach expansion data
  if (input.expansion) {
    mergedSlots.originCore = input.expansion.origin?.probs.core;
    mergedSlots.originBoundary = input.expansion.origin?.probs.boundary;
    mergedSlots.originTransition = input.expansion.origin?.probs.transition;
    mergedSlots.destinationCore = input.expansion.destination?.probs.core;
    mergedSlots.destinationBoundary = input.expansion.destination?.probs.boundary;
    mergedSlots.destinationTransition = input.expansion.destination?.probs.transition;
    mergedSlots.originSubzoneName = input.expansion.origin?.subzone?.name;
    mergedSlots.destinationSubzoneName = input.expansion.destination?.subzone?.name;
  }

  // Attach proximity score
  if (input.proximityScore) {
    mergedSlots.proximityScore = input.proximityScore.score;
    mergedSlots.proximityDistance = input.proximityScore.factors.distance;
    mergedSlots.roadAccess = input.proximityScore.factors.roadAccess;
    mergedSlots.aduanaPenalty = input.proximityScore.factors.aduanaPenalty;
    mergedSlots.corridorAlignment = input.proximityScore.factors.corridorAlignment;
  }

  // Attach fare data
  if (input.fare) {
    mergedSlots.fareEstimate = input.fare.finalPrice;
    mergedSlots.fareBasePrice = input.fare.basePrice;
    mergedSlots.fareCategory = input.fare.category;
    mergedSlots.fareConfidence = input.fare.confidence;
    mergedSlots.fareMode = input.fare.finalPrice > 0 ? "engine" : "fallback";
    mergedSlots.subzoneModifier = input.fare.adjustments.subzoneModifier;
    mergedSlots.corridorBonus = input.fare.adjustments.corridorBonus;
    mergedSlots.borderPenalty = input.fare.adjustments.borderPenalty;
    mergedSlots.proximityModifier = input.fare.adjustments.proximityModifier;
  }

  // Attach learning/outcome fields
  if (input.fareDelta != null) mergedSlots.fareDelta = input.fareDelta;
  if (input.finalFare != null) mergedSlots.finalFare = input.finalFare;
  if (input.humanOverrideFlag != null) mergedSlots.humanOverrideFlag = input.humanOverrideFlag;
  if (input.tripOutcomeRef) mergedSlots.tripOutcomeRef = input.tripOutcomeRef;

  // Persist via existing upsert (keeps workflow_state, etc.)
  await upsertChatSession(phone, mergedSlots, undefined, undefined, undefined);
}

export async function resetContext(phone: string): Promise<void> {
  await resetChatSession(phone);
}
