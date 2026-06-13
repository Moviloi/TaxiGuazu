import { loadObjectiveWeights } from "@/lib/services/learning/objectives";
import { adjustOpportunityRanking } from "@/lib/services/learning/routing";
import { getSystemLoad } from "@/lib/services/learning/system-load";
import { runPolicyEngine } from "@/lib/services/learning/policy-engine";
import { seedPolicies } from "@/lib/services/learning/policies";
import { computeGlobalMetrics } from "@/lib/services/learning/global-metrics";
import { runAdaptation } from "@/lib/services/learning/adaptation";
import { logLearningError } from "@/lib/services/learning/errors";
import { logDecision } from "@/lib/services/learning/decision-log";
import type { Opportunity } from "@/lib/db/types";
import type { ScoredOpportunity } from "@/lib/services/learning/types";

export interface LearningInput {
  opportunities: Opportunity[];
  conversationId: string;
  phone: string;
  intent: string;
}

export interface LearningOutput {
  rankedOpportunities: ScoredOpportunity[];
  blocked: boolean;
}

export async function evaluateLearningPipeline(input: LearningInput): Promise<LearningOutput> {
  const f7Weights = await loadObjectiveWeights();
  const f7Load = await getSystemLoad();
  const f7Decision = adjustOpportunityRanking(input.opportunities, f7Weights, f7Load, [0], 0.3, 0.5);
  seedPolicies().catch((e) => logLearningError("seed-policies", e));
  const f8Result = await runPolicyEngine(f7Decision, f7Load, input.intent, 0, input.phone, input.conversationId);

  if (f8Result.blocked) {
    return { rankedOpportunities: [], blocked: true };
  }

  computeGlobalMetrics().catch((e) => logLearningError("global-metrics", e));
  logDecision(input.conversationId, f7Decision, f8Result).catch((e) => logLearningError("decision-log", e));
  runAdaptation(f7Decision, f8Result, input.conversationId, input.intent).catch((e) => logLearningError("adaptation-orchestrator", e));

  const finalOpps = f8Result.finalOverride?.ranked ?? f7Decision.ranked;
  return { rankedOpportunities: finalOpps, blocked: false };
}
