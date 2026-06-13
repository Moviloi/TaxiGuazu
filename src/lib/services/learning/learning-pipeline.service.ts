import { loadObjectiveWeights } from "@/lib/services/learning/objectives";
import { adjustOpportunityRanking } from "@/lib/services/learning/routing";
import { getSystemLoad, computeGlobalMetrics } from "@/lib/services/learning/system-load";
import { runPolicyEngine, seedPolicies, logLearningError } from "@/lib/services/learning/policy-engine";
import { runAdaptation } from "@/lib/services/learning/adaptation";
import { insertDecisionLog } from "@/lib/db/domains/learning";
import type { Opportunity } from "@/lib/services/learning/opportunity-types";
import type { ScoredOpportunity, LearningDecision, PolicyEngineResult } from "@/lib/services/learning/types";

export interface DecisionLogEntry {
  sessionId: string;
  selectedOpportunity: string;
  candidateOpportunities: string;
  utilityScore: number;
  loadAdjusted: boolean;
  policyOverride: boolean;
  guardrails: string;
  policies: string;
}

export async function logDecision(
  sessionId: string,
  f7Decision: LearningDecision,
  f8Result: PolicyEngineResult,
): Promise<void> {
  await insertDecisionLog({
    sessionId,
    selectedOpportunity: f7Decision.selected?.label ?? null,
    candidateOpportunities: JSON.stringify(f7Decision.ranked.map((o) => ({ label: o.label, utility: o.utilityScore, economicScore: o.economicScore }))),
    utilityScore: f7Decision.totalUtility,
    loadAdjusted: f7Decision.loadAdjusted,
    policyOverride: f8Result.finalOverride !== null,
    guardrails: JSON.stringify(f8Result.activeGuardrails.map((g) => ({ id: g.id, name: g.name, level: g.level }))),
    policies: JSON.stringify(f8Result.policyResults.map((p) => ({ id: p.policyId, name: p.policyName, matched: p.matched, action: p.action }))),
  });
}

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
