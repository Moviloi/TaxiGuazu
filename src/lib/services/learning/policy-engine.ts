import type { LearningDecision, SystemLoad, PolicyEngineResult } from "./types";
import { evaluatePolicies } from "./policies";
import { simulateOpportunity, logSimulation } from "./simulation";
import { assignVariant } from "./experiment";
import { evaluateGuardrails } from "./guardrails";
import { logLearningError } from "./errors";

export async function runPolicyEngine(
  f7Decision: LearningDecision,
  load: SystemLoad,
  intent: string,
  escalationRate: number,
  phone: string,
  sessionId: string,
): Promise<PolicyEngineResult> {
  const policyResults = await evaluatePolicies(f7Decision, load, intent);

  const blockPolicy = policyResults.find((p) => p.matched && p.action === "block");
  const simulation = simulateOpportunity(f7Decision);

  if (simulation && f7Decision.selected) {
    logSimulation(sessionId, f7Decision.selected.label, simulation).catch(
      (e) => logLearningError("policy-simulation", e),
    );
  }

  const experimentVariant = assignVariant(phone, "revenue_vs_conversion");

  const revenueDrop = f7Decision.selected === null;
  const activeGuardrails = await evaluateGuardrails(load, escalationRate, revenueDrop);

  const criticalGuardrail = activeGuardrails.find((g) => g.level === "critical" && g.action === "block");

  const blocked = (blockPolicy !== undefined || criticalGuardrail !== undefined) && f7Decision.selected !== null;

  const finalOverride = policyResults.find((p) => p.matched && p.override)?.override ?? null;

  return {
    policyResults,
    simulation,
    experimentVariant,
    activeGuardrails,
    blocked,
    finalOverride,
  };
}
