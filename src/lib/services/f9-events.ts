import { getDbInstance } from "@/lib/db/database";
import type { F9Event, F9EventSource } from "./f9-types";

export async function logF9Event(event: Omit<F9Event, "id">): Promise<void> {
  await getDbInstance().execute({
    sql: "INSERT INTO f9_events (session_id, type, entity, intent, predicted_value, actual_value, revenue, timestamp, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      event.sessionId, event.type, event.entity ?? null, event.intent ?? null,
      event.predictedValue ?? null, event.actualValue ?? null,
      event.revenue ?? null, event.timestamp, event.source,
    ],
  });
}

export async function logConversion(
  sessionId: string, entity: string, revenue: number, source: F9EventSource,
): Promise<void> {
  await logF9Event({
    sessionId, type: "conversion", entity, revenue, timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logCancelledTrip(
  sessionId: string, entity: string, source: F9EventSource,
): Promise<void> {
  await logF9Event({
    sessionId, type: "cancelled_trip", entity, timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logPredictionError(
  sessionId: string, entity: string, predicted: number, actual: number, source: F9EventSource,
): Promise<void> {
  await logF9Event({
    sessionId, type: "prediction_error", entity,
    predictedValue: predicted, actualValue: actual,
    timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logManualOverride(
  sessionId: string, entity: string, intent: string, source: F9EventSource,
): Promise<void> {
  await logF9Event({
    sessionId, type: "manual_override", entity, intent,
    timestamp: Math.floor(Date.now() / 1000), source,
  });
}
