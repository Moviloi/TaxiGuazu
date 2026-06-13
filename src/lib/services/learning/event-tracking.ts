import { insertConversationEvent, type DbExecutor } from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

export type LearningEventType =
  | "intent_detected"
  | "entity_detected"
  | "opportunity_shown"
  | "user_accepted"
  | "user_declined"
  | "user_ignored"
  | "escalated_to_human"
  | "trip_completed";

export async function logEvent(
  sessionId: string,
  eventType: LearningEventType,
  metadata?: Record<string, unknown>,
  executor?: DbExecutor,
): Promise<void> {
  try {
    await insertConversationEvent(sessionId, eventType, metadata ?? null, executor);
  } catch (e) {
    log.error("[LEARNING_EVENT] error logging event:", e);
  }
}

export async function logIntentDetected(
  sessionId: string,
  intent: string,
  confidence: number,
): Promise<void> {
  await logEvent(sessionId, "intent_detected", { intent, confidence });
}

export async function logEntityDetected(
  sessionId: string,
  entities: string[],
): Promise<void> {
  await logEvent(sessionId, "entity_detected", { entities });
}

export async function logOpportunityShown(
  sessionId: string,
  label: string,
  priority: number,
  executor?: DbExecutor,
): Promise<void> {
  await logEvent(sessionId, "opportunity_shown", { label, priority }, executor);
}

export async function logUserResponse(
  sessionId: string,
  response: "accepted" | "declined" | "ignored",
  label: string,
): Promise<void> {
  const type: LearningEventType =
    response === "accepted" ? "user_accepted"
    : response === "declined" ? "user_declined"
    : "user_ignored";
  await logEvent(sessionId, type, { label });
}

export async function logEscalation(
  sessionId: string,
  reason: string,
  score: number,
): Promise<void> {
  await logEvent(sessionId, "escalated_to_human", { reason, score });
}


