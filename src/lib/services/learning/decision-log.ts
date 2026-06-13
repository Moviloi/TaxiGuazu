// ARCHITECTURE NOTE (Phase D): Imports types from frozen learning/ subdomains (objectives, policy-engine).
// decision-log.ts bridges the conversation layer with the experimental learning pipeline.
// Kept separate to avoid coupling lead.service to learning/ types directly.
// Verify compatibility when learning/ types change.

import { insertDecisionLog } from "@/lib/db/domains/learning";
import type { LearningDecision, PolicyEngineResult } from "./types";

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
