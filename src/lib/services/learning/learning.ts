import { insertF9DriftLog } from "@/lib/db/domains/learning";
import { adjustWeight, setWeight } from "./learning-utils";
import type { DriftSeverity } from "./types";

export async function adjustPricing(entity: string, conversionRate: number, expectedRate: number): Promise<void> {
  const drift = conversionRate - expectedRate;

  if (drift < -0.1) {
    console.log(`[LEARNING] Baja conversión para "${entity}" (${conversionRate.toFixed(2)} vs ${expectedRate.toFixed(2)}), bajando precio`);
    await adjustWeight(`price_factor:${entity}`, -0.05, 0.01);
  } else if (drift > 0.1 && conversionRate > 0.7) {
    console.log(`[LEARNING] Alta demanda+conversión para "${entity}", subiendo precio`);
    await adjustWeight(`price_factor:${entity}`, 0.05, 0.01);
  }
}

export async function adjustEntityClassification(entity: string, confusionScore: number): Promise<void> {
  if (confusionScore > 0.6) {
    console.log(`[LEARNING] Alta confusión para entidad "${entity}" (${confusionScore.toFixed(2)}), marcando como ambigua`);
    await setWeight(`entity_ambiguous:${entity}`, 1);
  } else if (confusionScore < 0.2) {
    console.log(`[LEARNING] Baja confusión para entidad "${entity}", reforzando clasificación`);
    await adjustWeight(`entity_ambiguous:${entity}`, -1, 0.1);
  }
}

export async function adjustPolicyPerformance(
  policyId: string, performanceScore: number, threshold: number,
): Promise<void> {
  if (performanceScore < threshold) {
    console.log(`[LEARNING] Policy "${policyId}" bajo rendimiento (${performanceScore.toFixed(2)} < ${threshold}), reduciendo peso`);
    await adjustWeight(`policy_weight:${policyId}`, -0.1, 0.05);
  } else if (performanceScore > threshold + 0.2) {
    console.log(`[LEARNING] Policy "${policyId}" alto rendimiento, promoviendo prioridad`);
    await adjustWeight(`policy_weight:${policyId}`, 0.1, 0.05);
  }
}

export async function recordDrift(
  metric: string, entity: string, driftValue: number, severity: DriftSeverity,
  sessionId?: string, policyId?: string,
): Promise<void> {
  await insertF9DriftLog(metric, entity, driftValue, severity, sessionId, policyId);
  if (severity === "high" || severity === "critical") {
    console.log(`[LEARNING DRIFT] ${severity.toUpperCase()}: ${metric} para "${entity}" drift=${driftValue.toFixed(4)}`);
  }
}
