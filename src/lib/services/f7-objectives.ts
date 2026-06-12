// F7: SYSTEM LOAD & ROUTING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Evaluar carga del sistema y ruteo de decisiones.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: Deshabilitar F9 perdería limpieza de tablas. F7→F8→F9 solo se
//   desbloquea cuando Conversation Core + Pricing + Geo estén congelados.

import { DEFAULT_OBJECTIVE_WEIGHTS, type ObjectiveWeights } from "./f7-types";
import { getWeight } from "./f6-learning";
import { clamp01 } from "@/lib/utils/clamp";

const WEIGHT_KEYS: (keyof ObjectiveWeights)[] = [
  "conversion", "revenue", "satisfaction", "efficiency", "escalationCost",
];

export function normalizeWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return { ...DEFAULT_OBJECTIVE_WEIGHTS };
  const normalized: ObjectiveWeights = {} as ObjectiveWeights;
  for (const key of WEIGHT_KEYS) {
    normalized[key] = weights[key] / total;
  }
  return normalized;
}

export async function loadObjectiveWeights(): Promise<ObjectiveWeights> {
  const weights: ObjectiveWeights = { ...DEFAULT_OBJECTIVE_WEIGHTS };
  for (const key of WEIGHT_KEYS) {
    const stored = await getWeight(`f7_weight:${key}`);
    if (stored !== 0) weights[key] = Math.max(0.01, Math.min(1, stored));
  }
  return normalizeWeights(weights);
}

export function computeUtilityScore(
  conversionProb: number,
  economicScore: number,
  weights: ObjectiveWeights,
  escalationRisk: number,
  satisfactionScore: number,
): {
  conversion: number;
  revenue: number;
  satisfaction: number;
  efficiency: number;
  escalationCost: number;
  total: number;
} {
  const conversion = weights.conversion * clamp01(conversionProb);
  const revenue = weights.revenue * (clamp01(economicScore / 100));
  const satisfaction = weights.satisfaction * clamp01(satisfactionScore);
  const efficiency = weights.efficiency * clamp01(0.5);
  const escalationCost = -(weights.escalationCost * clamp01(escalationRisk));

  const total = Math.max(0, conversion + revenue + satisfaction + efficiency + escalationCost);
  return { conversion, revenue, satisfaction, efficiency, escalationCost, total };
}
