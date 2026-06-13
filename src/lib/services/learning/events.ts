import { insertF9Event } from "@/lib/db/domains/learning";
import type { LearningEvent, LearningEventSource } from "./types";

export async function logLearningEvent(event: Omit<LearningEvent, "id">): Promise<void> {
  await insertF9Event({
    sessionId: event.sessionId,
    type: event.type,
    entity: event.entity,
    intent: event.intent,
    predictedValue: event.predictedValue,
    actualValue: event.actualValue,
    revenue: event.revenue,
    timestamp: event.timestamp,
    source: event.source,
  });
}

export async function logConversion(
  sessionId: string, entity: string, revenue: number, source: LearningEventSource,
): Promise<void> {
  await logLearningEvent({
    sessionId, type: "conversion", entity, revenue, timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logCancelledTrip(
  sessionId: string, entity: string, source: LearningEventSource,
): Promise<void> {
  await logLearningEvent({
    sessionId, type: "cancelled_trip", entity, timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logPredictionError(
  sessionId: string, entity: string, predicted: number, actual: number, source: LearningEventSource,
): Promise<void> {
  await logLearningEvent({
    sessionId, type: "prediction_error", entity,
    predictedValue: predicted, actualValue: actual,
    timestamp: Math.floor(Date.now() / 1000), source,
  });
}

export async function logManualOverride(
  sessionId: string, entity: string, intent: string, source: LearningEventSource,
): Promise<void> {
  await logLearningEvent({
    sessionId, type: "manual_override", entity, intent,
    timestamp: Math.floor(Date.now() / 1000), source,
  });
}
