import { loadObjectiveWeights } from "@/lib/services/f7-objectives";
import { adjustOpportunityRanking } from "@/lib/services/f7-routing";
import { getSystemLoad } from "@/lib/services/f7-load";
import { runF8 } from "@/lib/services/f8-index";
import { seedPolicies } from "@/lib/services/f8-policy";
import { computeGlobalMetrics } from "@/lib/services/f8-global";
import { runF9 } from "@/lib/services/f9-index";
import { logF9Error } from "@/lib/services/f9-error";
import { logDecision } from "@/lib/services/decision-log";
import type { Opportunity } from "@/lib/db/types";
import type { F7ScoredOpportunity } from "@/lib/services/f7-types";

export interface LearningInput {
  opportunities: Opportunity[];
  conversationId: string;
  phone: string;
  intent: string;
}

export interface LearningOutput {
  rankedOpportunities: F7ScoredOpportunity[];
  blocked: boolean;
}

export async function evaluateLearningPipeline(input: LearningInput): Promise<LearningOutput> {
  const f7Weights = await loadObjectiveWeights();
  const f7Load = await getSystemLoad();
  const f7Decision = adjustOpportunityRanking(input.opportunities, f7Weights, f7Load, [0], 0.3, 0.5);
  seedPolicies().catch((e) => logF9Error("seed-policies", e));
  const f8Result = await runF8(f7Decision, f7Load, input.intent, 0, input.phone, input.conversationId);

  if (f8Result.blocked) {
    return { rankedOpportunities: [], blocked: true };
  }

  computeGlobalMetrics().catch((e) => logF9Error("global-metrics", e));
  logDecision(input.conversationId, f7Decision, f8Result).catch((e) => logF9Error("decision-log", e));
  runF9(f7Decision, f8Result, input.conversationId, input.intent).catch((e) => logF9Error("f9-orchestrator", e));

  const finalOpps = f8Result.finalOverride?.ranked ?? f7Decision.ranked;
  return { rankedOpportunities: finalOpps, blocked: false };
}
