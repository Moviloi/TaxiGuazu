import type { LearningDecision, PolicyEngineResult, DriftSeverity, LearningEvent, LearningEventSource } from "./types";
import { logLearningError } from "./policy-engine";
import { runHousekeeping } from "../housekeeping/timeouts";
import { adjustWeight, setWeight } from "./learning-utils";
import { insertF9DriftLog, insertF9Event } from "@/lib/db/domains/learning";
import { clamp01 } from "@/lib/utils/clamp";
import { log } from "@/lib/utils/logger";

// ── Learning ──

export async function adjustPricing(entity: string, conversionRate: number, expectedRate: number): Promise<void> {
  const drift = conversionRate - expectedRate;

  if (drift < -0.1) {
    log.info(`[LEARNING] Baja conversión para "${entity}" (${conversionRate.toFixed(2)} vs ${expectedRate.toFixed(2)}), bajando precio`);
    await adjustWeight(`price_factor:${entity}`, -0.05, 0.01);
  } else if (drift > 0.1 && conversionRate > 0.7) {
    log.info(`[LEARNING] Alta demanda+conversión para "${entity}", subiendo precio`);
    await adjustWeight(`price_factor:${entity}`, 0.05, 0.01);
  }
}

export async function adjustEntityClassification(entity: string, confusionScore: number): Promise<void> {
  if (confusionScore > 0.6) {
    log.info(`[LEARNING] Alta confusión para entidad "${entity}" (${confusionScore.toFixed(2)}), marcando como ambigua`);
    await setWeight(`entity_ambiguous:${entity}`, 1);
  } else if (confusionScore < 0.2) {
    log.info(`[LEARNING] Baja confusión para entidad "${entity}", reforzando clasificación`);
    await adjustWeight(`entity_ambiguous:${entity}`, -1, 0.1);
  }
}

export async function adjustPolicyPerformance(
  policyId: string, performanceScore: number, threshold: number,
): Promise<void> {
  if (performanceScore < threshold) {
    log.info(`[LEARNING] Policy "${policyId}" bajo rendimiento (${performanceScore.toFixed(2)} < ${threshold}), reduciendo peso`);
    await adjustWeight(`policy_weight:${policyId}`, -0.1, 0.05);
  } else if (performanceScore > threshold + 0.2) {
    log.info(`[LEARNING] Policy "${policyId}" alto rendimiento, promoviendo prioridad`);
    await adjustWeight(`policy_weight:${policyId}`, 0.1, 0.05);
  }
}

export async function recordDrift(
  metric: string, entity: string, driftValue: number, severity: DriftSeverity,
  sessionId?: string, policyId?: string,
): Promise<void> {
  await insertF9DriftLog(metric, entity, driftValue, severity, sessionId, policyId);
  if (severity === "high" || severity === "critical") {
    log.info(`[LEARNING DRIFT] ${severity.toUpperCase()}: ${metric} para "${entity}" drift=${driftValue.toFixed(4)}`);
  }
}

// ── Drift Detection ──

const DRIFT_THRESHOLD = 0.3;

export async function detectPredictionDrift(
  entity: string, predicted: number, actual: number | undefined,
  sessionId?: string,
): Promise<void> {
  if (actual === undefined) return;
  const drift = clamp01(Math.abs(predicted - actual));
  if (drift <= DRIFT_THRESHOLD) return;

  const severity: DriftSeverity = drift > 0.6 ? "critical" : drift > 0.45 ? "high" : "medium";
  await recordDrift("prediction", entity, drift, severity, sessionId);

  if (severity === "high" || severity === "critical") {
    await adjustPricing(entity, actual, predicted);
  }
}

export async function detectConversionDrift(
  entity: string, conversionRate: number, expectedRate: number,
  sessionId?: string,
): Promise<void> {
  const drift = clamp01(Math.abs(conversionRate - expectedRate));
  if (drift <= DRIFT_THRESHOLD) return;

  const severity: DriftSeverity = drift > 0.5 ? "critical" : drift > 0.35 ? "high" : "medium";
  await recordDrift("conversion_rate", entity, drift, severity, sessionId);
  await adjustPricing(entity, conversionRate, expectedRate);
}

export async function detectEntityConfusion(
  entity: string, confusionScore: number,
  sessionId?: string,
): Promise<void> {
  if (confusionScore <= 0.3) return;
  const severity: DriftSeverity = confusionScore > 0.7 ? "critical" : "high";
  await recordDrift("entity_confusion", entity, confusionScore, severity, sessionId);
  await adjustEntityClassification(entity, confusionScore);
}

export async function detectPolicyDrift(
  policyId: string, performanceScore: number, threshold: number,
  sessionId?: string,
): Promise<void> {
  const drift = threshold - performanceScore;
  if (drift <= 0) return;
  const severity: DriftSeverity = drift > 0.4 ? "critical" : "high";
  await recordDrift("policy_performance", policyId, drift, severity, sessionId, policyId);
  await adjustPolicyPerformance(policyId, performanceScore, threshold);
}

// ── Events ──

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

// ── Adaptation Orchestrator ──

export async function runAdaptation(
  f7Decision: LearningDecision,
  f8Result: PolicyEngineResult,
  sessionId: string,
  intent: string,
): Promise<void> {
  try {
    const ts = Math.floor(Date.now() / 1000);

    if (f8Result.simulation && f7Decision.selected) {
      await logLearningEvent({
        sessionId, type: "conversion", entity: f7Decision.selected.label, intent,
        predictedValue: f8Result.simulation.expectedConversion,
        actualValue: undefined,
        timestamp: ts, source: "F7",
      });
    }

    if (f7Decision.selected) {
      await detectConversionDrift(
        f7Decision.selected.label,
        f7Decision.utilityBreakdown.conversion,
        0.5,
        sessionId,
      );
    }

    for (const pr of f8Result.policyResults) {
      const economicScore = f7Decision.selected?.economicScore ?? 0;
      await detectPolicyDrift(pr.policyId, economicScore / 100, 0.3, sessionId);
    }

    if (f8Result.activeGuardrails.length > 0) {
      await logLearningEvent({
        sessionId, type: "manual_override", intent,
        timestamp: ts, source: "F8",
      });
    }

    log.info(`[LEARNING] Meta-governanza completada para sesión ${sessionId}`);
  } catch (e) {
    await logLearningError("adaptation-orchestrator", e);
    log.error(`[LEARNING] Error en meta-governanza:`, e);
  }

  runHousekeeping().catch((e) => logLearningError("housekeeping", e));
}
