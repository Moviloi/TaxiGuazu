import type { LearningDecision, PolicyEngineResult, DriftSeverity, LearningEvent } from "./types";
import { logLearningError } from "./policy-engine";
import { adjustWeight } from "./learning-utils";
import { insertF9DriftLog, insertF9Event } from "@/lib/db/database";
import { clamp01 } from "@/lib/utils/clamp";
import { log } from "@/lib/utils/logger";

// ── Learning ──

async function adjustPricing(entity: string, conversionRate: number, expectedRate: number): Promise<void> {
  const drift = conversionRate - expectedRate;

  if (drift < -0.1) {
    log.info(`[LEARNING] Baja conversión para "${entity}" (${conversionRate.toFixed(2)} vs ${expectedRate.toFixed(2)}), bajando precio`);
    await adjustWeight(`price_factor:${entity}`, -0.05, 0.01);
  } else if (drift > 0.1 && conversionRate > 0.7) {
    log.info(`[LEARNING] Alta demanda+conversión para "${entity}", subiendo precio`);
    await adjustWeight(`price_factor:${entity}`, 0.05, 0.01);
  }
}

async function adjustPolicyPerformance(
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

async function recordDrift(
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

async function detectConversionDrift(
  entity: string, conversionRate: number, expectedRate: number,
  sessionId?: string,
): Promise<void> {
  const drift = clamp01(Math.abs(conversionRate - expectedRate));
  if (drift <= DRIFT_THRESHOLD) return;

  const severity: DriftSeverity = drift > 0.5 ? "critical" : drift > 0.35 ? "high" : "medium";
  await recordDrift("conversion_rate", entity, drift, severity, sessionId);
  await adjustPricing(entity, conversionRate, expectedRate);
}

async function detectPolicyDrift(
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

async function logLearningEvent(event: Omit<LearningEvent, "id">): Promise<void> {
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
}
