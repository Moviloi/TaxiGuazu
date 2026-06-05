// FASE 6.6: Tracer — helper para crear DecisionTrace.

import type { PolicyAction, PolicyInput } from "../policy/types";
import type { DecisionTrace, RuleEvaluationTrace } from "./types";

export function buildTrace(
  input: PolicyInput,
  selectedRuleId: string,
  selectedAction: PolicyAction,
  evaluated: RuleEvaluationTrace[],
): DecisionTrace {
  return {
    intent: input.intent,
    confidence: input.confidence,
    selectedRule: selectedRuleId,
    selectedAction,
    evaluatedRules: evaluated,
    lateralSnapshot: input.lateral ? { ...input.lateral } : undefined,
    metadata: {},
  };
}
