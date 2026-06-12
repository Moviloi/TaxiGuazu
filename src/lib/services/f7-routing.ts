// F7: SYSTEM LOAD & ROUTING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Evaluar carga del sistema y ruteo de decisiones.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: Deshabilitar F9 perdería limpieza de tablas. F7→F8→F9 solo se
//   desbloquea cuando Conversation Core + Pricing + Geo estén congelados.

import type { Opportunity } from "@/lib/db/types";
import type { F7ScoredOpportunity, F7Decision, ObjectiveWeights, SystemLoad } from "./f7-types";
import { computeEconomicScore } from "./f7-economics";
import { computeUtilityScore } from "./f7-objectives";
import { getAdjustedLoad } from "./f7-load";

export function adjustOpportunityRanking(
  opportunities: Opportunity[],
  weights: ObjectiveWeights,
  load: SystemLoad,
  f6Boost: number[],
  escalationRisk: number,
  satisfactionScore: number,
): F7Decision {
  const loadAdjusted = getAdjustedLoad(load);

  const scored: F7ScoredOpportunity[] = opportunities.map((opp, i) => {
    const economicScore = computeEconomicScore(opp.label, opp.originalPrice);
    const eScore = opportunities.length > 0
      ? (i < f6Boost.length ? f6Boost[i] : 0) + (opp.priority / 100)
      : opp.priority / 100;

    const utility = computeUtilityScore(
      eScore,
      economicScore,
      weights,
      escalationRisk,
      satisfactionScore,
    );

    const adjustedEconomicScore = loadAdjusted.active
      ? economicScore * (loadAdjusted.highLoad ? 0.7 : 1.2)
      : economicScore;

    const utilityScore = utility.total;

    return {
      ...opp,
      economicScore: adjustedEconomicScore,
      utilityScore,
    };
  });

  scored.sort((a, b) => b.utilityScore - a.utilityScore);

  const selected = scored.length > 0 ? scored[0] : null;

  const first = scored[0];
  const utilityBreakdown = first
    ? computeUtilityScore(
        opportunities.length > 0 ? 0.5 : 0,
        first.economicScore,
        weights,
        escalationRisk,
        satisfactionScore,
      )
    : { conversion: 0, revenue: 0, satisfaction: 0, efficiency: 0, escalationCost: 0, total: 0 };

  return {
    ranked: scored,
    selected,
    utilityBreakdown: {
      conversion: utilityBreakdown.conversion,
      revenue: utilityBreakdown.revenue,
      satisfaction: utilityBreakdown.satisfaction,
      efficiency: utilityBreakdown.efficiency,
      escalationCost: utilityBreakdown.escalationCost,
    },
    totalUtility: utilityBreakdown.total,
    loadAdjusted: loadAdjusted.active,
  };
}
