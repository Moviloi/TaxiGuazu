import { getDbInstance } from "@/lib/db/database";
import type { F7Decision } from "./f7-types";
import type { F8Result } from "./f8-types";

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
  f7Decision: F7Decision,
  f8Result: F8Result,
): Promise<void> {
  await getDbInstance().execute({
    sql: `INSERT INTO decision_log
      (session_id, selected_opportunity, candidate_opportunities, utility_score, load_adjusted, policy_override, guardrails, policies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      sessionId,
      f7Decision.selected?.label ?? null,
      JSON.stringify(f7Decision.ranked.map((o) => ({ label: o.label, utility: o.utilityScore, economicScore: o.economicScore }))),
      f7Decision.totalUtility,
      f7Decision.loadAdjusted ? 1 : 0,
      f8Result.finalOverride !== null ? 1 : 0,
      JSON.stringify(f8Result.activeGuardrails.map((g) => ({ id: g.id, name: g.name, level: g.level }))),
      JSON.stringify(f8Result.policyResults.map((p) => ({ id: p.policyId, name: p.policyName, matched: p.matched, action: p.action }))),
    ],
  });
}
