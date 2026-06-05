import { adjustPricing, adjustEntityClassification, adjustPolicyPerformance, recordDrift } from "./f9-learning";
import type { DriftSeverity } from "./f9-types";
import { clamp01 } from "@/lib/utils/clamp";

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
