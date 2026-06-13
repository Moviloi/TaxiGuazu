import type { Opportunity } from "@/lib/db/types";
import type { ScoredOpportunity, LearningDecision, ObjectiveWeights, SystemLoad } from "./types";
import { computeEconomicScore } from "./economics";
import { computeUtilityScore } from "./objectives";
import { getAdjustedLoad } from "./system-load";

export function adjustOpportunityRanking(
  opportunities: Opportunity[],
  weights: ObjectiveWeights,
  load: SystemLoad,
  priorityBoost: number[],
  escalationRisk: number,
  satisfactionScore: number,
): LearningDecision {
  const loadAdjusted = getAdjustedLoad(load);

  const scored: ScoredOpportunity[] = opportunities.map((opp, i) => {
    const economicScore = computeEconomicScore(opp.label, opp.originalPrice);
    const eScore = opportunities.length > 0
      ? (i < priorityBoost.length ? priorityBoost[i] : 0) + (opp.priority / 100)
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
