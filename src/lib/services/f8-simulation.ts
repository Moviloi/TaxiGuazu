// F8: POLICY SIMULATION & GUARDRAILS — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Simular políticas y aplicar guardrails de decisión.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: F8 usa f9-error para logging. Todo el pipeline se desbloquea junto.

import { getDbInstance } from "@/lib/db/database";
import type { SimulationResult } from "./f8-types";
import type { F7Decision } from "./f7-types";
import { getEconomicProfile } from "./f7-economics";
import { clamp01 } from "@/lib/utils/clamp";

export function simulateOpportunity(f7Decision: F7Decision): SimulationResult | null {
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
  await getDbInstance().execute({
    sql: "INSERT INTO simulations (session_id, opportunity_id, predicted_conversion, predicted_revenue, risk) VALUES (?, ?, ?, ?, ?)",
    args: [sessionId, opportunityLabel, result.expectedConversion, result.expectedRevenue, result.riskLevel],
  });
}
