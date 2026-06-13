// ARCHITECTURE NOTE (Phase D): Learning utility — semi-frozen.
// Consumed by objectives and learning/admin modules.
// Changes here can ripple into frozen modules. Only modify for critical fixes.

import { getLearningWeight, setLearningWeight } from "@/lib/db/database";

export async function getWeight(key: string): Promise<number> {
  return getLearningWeight(key);
}

export async function setWeight(key: string, value: number): Promise<void> {
  await setLearningWeight(key, value);
}

export async function adjustWeight(
  key: string,
  delta: number,
  learningRate = 0.01,
): Promise<number> {
  const current = await getWeight(key);
  const newValue = Math.max(-1, Math.min(1, current + delta * learningRate));
  await setWeight(key, newValue);
  return newValue;
}

export async function getEntityWeight(entity: string): Promise<number> {
  return getWeight(`entity_weight:${entity}`);
}

export async function getComprehensionThresholdAdjustment(): Promise<number> {
  const escalationRate = await getWeight("f4_escalation_rate");
  const adjustment = await getWeight("f4_threshold_adjustment");

  if (escalationRate > 0.3) {
    const newAdj = Math.max(-0.10, adjustment - 0.01);
    await setWeight("f4_threshold_adjustment", newAdj);
    return newAdj;
  }
  return adjustment;
}

export async function recordComprehensionOutcome(escalated: boolean): Promise<void> {
  const key = "f4_escalation_count";
  const totalKey = "f4_total_count";
  const escCount = await getWeight(key) + (escalated ? 1 : 0);
  const totalCount = await getWeight(totalKey) + 1;
  await setWeight(key, escCount);
  await setWeight(totalKey, totalCount);
  await setWeight("f4_escalation_rate", totalCount > 0 ? escCount / totalCount : 0);
}
