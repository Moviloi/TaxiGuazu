// F8: POLICY SIMULATION & GUARDRAILS — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Simular políticas y aplicar guardrails de decisión.
// CURRENT STATUS: Cableado en learning-pipeline.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: F8 usa f9-error para logging. Todo el pipeline se desbloquea junto.

import type { F7Decision, SystemLoad } from "./f7-types";
import type { F8Result } from "./f8-types";
import { evaluatePolicies } from "./f8-policy";
import { simulateOpportunity, logSimulation } from "./f8-simulation";
import { assignVariant } from "./f8-experiment";
import { evaluateGuardrails } from "./f8-guardrails";
import { logF9Error } from "./f9-error";

export async function runF8(
  f7Decision: F7Decision,
  load: SystemLoad,
  intent: string,
  escalationRate: number,
  phone: string,
  sessionId: string,
): Promise<F8Result> {
  const policyResults = await evaluatePolicies(f7Decision, load, intent);

  const blockPolicy = policyResults.find((p) => p.matched && p.action === "block");
  const simulation = simulateOpportunity(f7Decision);

  if (simulation && f7Decision.selected) {
    logSimulation(sessionId, f7Decision.selected.label, simulation).catch(
      (e) => logF9Error("f8-simulation", e),
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
