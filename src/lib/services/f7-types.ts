import type { Opportunity } from "@/lib/db/types";

export interface OpportunityEconomics {
  id: number;
  type: string;
  estimatedRevenue: number;
  conversionProbability: number;
  margin: number;
  operationalCost: number;
}

export type HumanFeedbackType = "good_offer" | "bad_offer" | "wrong_route" | "high_value_missed" | "spam_detected";

export interface HumanFeedbackRow {
  id: number;
  session_id: string;
  feedback_type: HumanFeedbackType;
  entity: string | null;
  operator_id: string;
  timestamp: number;
}

export interface SystemLoad {
  driversAvailable: number;
  operatorsAvailable: number;
  peakTime: boolean;
  queueLength: number;
}

export interface ObjectiveWeights {
  conversion: number;
  revenue: number;
  satisfaction: number;
  efficiency: number;
  escalationCost: number;
}

export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  conversion: 0.35,
  revenue: 0.30,
  satisfaction: 0.20,
  efficiency: 0.10,
  escalationCost: 0.05,
};

export interface F7ScoredOpportunity extends Opportunity {
  economicScore: number;
  utilityScore: number;
}

export interface F7Decision {
  ranked: F7ScoredOpportunity[];
  selected: F7ScoredOpportunity | null;
  utilityBreakdown: {
    conversion: number;
    revenue: number;
    satisfaction: number;
    efficiency: number;
    escalationCost: number;
  };
  totalUtility: number;
  loadAdjusted: boolean;
}
