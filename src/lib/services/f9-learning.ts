// F9: DRIFT DETECTION & LEARNING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Detectar drift en predicciones y aprendizaje.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. f9-index.ts
//   orquesta housekeeping (limpieza de tablas). No modificar.
// MIGRATION NOTE: Deshabilitar perdería limpieza de tablas. Bloqueado hasta
//   Conversation Core + Pricing + Geo congelados.

import { getDbInstance } from "@/lib/db/database";
import { adjustWeight, setWeight } from "./f6-learning";
import type { DriftSeverity } from "./f9-types";

export async function adjustPricing(entity: string, conversionRate: number, expectedRate: number): Promise<void> {
  const drift = conversionRate - expectedRate;

  if (drift < -0.1) {
    console.log(`[F9] Baja conversión para "${entity}" (${conversionRate.toFixed(2)} vs ${expectedRate.toFixed(2)}), bajando precio`);
    await adjustWeight(`price_factor:${entity}`, -0.05, 0.01);
  } else if (drift > 0.1 && conversionRate > 0.7) {
    console.log(`[F9] Alta demanda+conversión para "${entity}", subiendo precio`);
    await adjustWeight(`price_factor:${entity}`, 0.05, 0.01);
  }
}

export async function adjustEntityClassification(entity: string, confusionScore: number): Promise<void> {
  if (confusionScore > 0.6) {
    console.log(`[F9] Alta confusión para entidad "${entity}" (${confusionScore.toFixed(2)}), marcando como ambigua`);
    await setWeight(`entity_ambiguous:${entity}`, 1);
  } else if (confusionScore < 0.2) {
    console.log(`[F9] Baja confusión para entidad "${entity}", reforzando clasificación`);
    await adjustWeight(`entity_ambiguous:${entity}`, -1, 0.1);
  }
}

export async function adjustPolicyPerformance(
  policyId: string, performanceScore: number, threshold: number,
): Promise<void> {
  if (performanceScore < threshold) {
    console.log(`[F9] Policy "${policyId}" bajo rendimiento (${performanceScore.toFixed(2)} < ${threshold}), reduciendo peso`);
    await adjustWeight(`policy_weight:${policyId}`, -0.1, 0.05);
  } else if (performanceScore > threshold + 0.2) {
    console.log(`[F9] Policy "${policyId}" alto rendimiento, promoviendo prioridad`);
    await adjustWeight(`policy_weight:${policyId}`, 0.1, 0.05);
  }
}

export async function recordDrift(
  metric: string, entity: string, driftValue: number, severity: DriftSeverity,
  sessionId?: string, policyId?: string,
): Promise<void> {
  await getDbInstance().execute({
    sql: "INSERT INTO f9_drift_log (metric, entity, drift_value, severity, session_id, policy_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, unixepoch())",
    args: [metric, entity, driftValue, severity, sessionId ?? null, policyId ?? null],
  });
  if (severity === "high" || severity === "critical") {
    console.log(`[F9 DRIFT] ${severity.toUpperCase()}: ${metric} para "${entity}" drift=${driftValue.toFixed(4)}`);
  }
}
