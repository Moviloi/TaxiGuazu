// FASE 8: Policy Variant System
// Variantes experimentales del policy engine.
// CONTROL = comportamiento prod actual (applyPolicy).
// EXPERIMENT_A = modify risk threshold (urgency más sensible).
// EXPERIMENT_B = modify dispatch priority (NOW bias reforzado).

import { applyPolicy } from "../policy/engine";
import type { PolicyInput, PolicyDecision } from "../policy/types";
import type { PolicyVariant } from "./types";

function modifyRiskThreshold(input: PolicyInput): PolicyDecision {
  const base = applyPolicy(input);
  // EXPERIMENT_A: reduce confidence threshold for urgency escalation
  if (base.action === "PROCEED_BOOKING" && base.confidence >= 0.5) {
    return { ...base, action: "PROCEED_NOW", confidence: base.confidence + 0.1, reasonCodes: [...base.reasonCodes, "EXPERIMENT_A_URGENCY_BIAS"] };
  }
  return base;
}

function modifyDispatchPriority(input: PolicyInput): PolicyDecision {
  const base = applyPolicy(input);
  // EXPERIMENT_B: increase NOW bias over BOOKING when urgency is medium-high
  if (base.action === "PROCEED_BOOKING" && base.confidence >= 0.6) {
    return { ...base, action: "PROCEED_NOW", confidence: base.confidence + 0.05, reasonCodes: [...base.reasonCodes, "EXPERIMENT_B_DISPATCH_BIAS"] };
  }
  return base;
}

export function applyVariantPolicy(input: PolicyInput, variant: PolicyVariant): PolicyDecision {
  switch (variant) {
    case "CONTROL":
      return applyPolicy(input);
    case "EXPERIMENT_A":
      return modifyRiskThreshold(input);
    case "EXPERIMENT_B":
      return modifyDispatchPriority(input);
    default:
      return applyPolicy(input);
  }
}
