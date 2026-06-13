import { insertSimulation } from "@/lib/db/domains/learning";
import type { SimulationResult, LearningDecision } from "./types";
import { getEconomicProfile } from "./economics";
import { clamp01 } from "@/lib/utils/clamp";

export function simulateOpportunity(f7Decision: LearningDecision): SimulationResult | null {
  if (!f7Decision.selected) return null;

  const profile = getEconomicProfile(f7Decision.selected.label);
  const utilityConversion = clamp01(f7Decision.utilityBreakdown.conversion);

  const expectedConversion = clamp01(utilityConversion * 1.5 + profile.conversionProbability * 0.5);
  const expectedRevenue = profile.estimatedRevenue * expectedConversion;
  const systemImpactScore = clamp01((expectedRevenue / 35000) * 0.6 + expectedConversion * 0.4);
  const riskLevel = expectedConversion < 0.3 ? "high" : expectedConversion < 0.6 ? "medium" : "low";

  return { expectedConversion, expectedRevenue, systemImpactScore, riskLevel };
}

export async function logSimulation(
  sessionId: string,
  opportunityLabel: string,
  result: SimulationResult,
): Promise<void> {
  await insertSimulation(sessionId, opportunityLabel, result.expectedConversion, result.expectedRevenue, result.riskLevel);
}
