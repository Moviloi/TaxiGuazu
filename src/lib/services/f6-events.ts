// F6 EVENTS — frozen. ARCHITECTURE NOTE: Este módulo está congelado.
// No modificar. F6 implementa el logging de eventos de intención, entidades,
// oportunidades y escalaciones. Cualquier cambio requiere aprobación de arquitectura.

import { getDbInstance } from "@/lib/db/database";
import type { DbExecutor } from "@/lib/db/database";

export type F6EventType =
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
  eventType: F6EventType,
  metadata?: Record<string, unknown>,
  executor?: DbExecutor,
): Promise<void> {
  try {
    const db = executor ?? getDbInstance();
    await db.execute({
      sql: "INSERT INTO conversation_events (session_id, event_type, metadata, timestamp) VALUES (?, ?, ?, unixepoch())",
      args: [sessionId, eventType, metadata ? JSON.stringify(metadata) : null],
    });
  } catch (e) {
    console.error("[F6_EVENT] error logging event:", e);
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
  const type: F6EventType =
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

export async function logTripCompleted(
  sessionId: string,
  tripId: string,
): Promise<void> {
  await logEvent(sessionId, "trip_completed", { tripId });
}
