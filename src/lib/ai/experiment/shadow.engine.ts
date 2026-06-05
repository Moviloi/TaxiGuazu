// FASE 8: Shadow Execution Engine
// Ejecuta policy en paralelo SIN afectar resultado real.
// Shadow failures son siempre silenciosos.

import { applyPolicy } from "../policy/engine";
import type { PolicyInput, PolicyDecision } from "../policy/types";
import type { ShadowComparison } from "./types";

export function runShadowPolicy(input: PolicyInput): PolicyDecision {
  try {
    const result = applyPolicy(input);
    queueMicrotask(() => {
      try {
        // reserved: log shadow comparison
      } catch {
        // silent
      }
    });
    return result;
  } catch {
    // shadow failure never breaks flow
    return { action: "ASK_CLARIFICATION", confidence: 0, reasonCodes: ["SHADOW_FAIL"], metadata: {} };
  }
}

function computeImpact(real: PolicyDecision, shadow: PolicyDecision): ShadowComparison["impactLevel"] {
  if (real.action === shadow.action) return "none";
  if (real.action === "IGNORE" || shadow.action === "IGNORE") return "medium";
  if (real.action === "ESCALATE_EMERGENCY" || shadow.action === "ESCALATE_EMERGENCY") return "high";
  return "low";
}

export function compareDecisions(real: PolicyDecision, shadow: PolicyDecision): ShadowComparison {
  const sameAction = real.action === shadow.action;
  return {
    sameAction,
    divergence: !sameAction,
    impactLevel: computeImpact(real, shadow),
    real: { action: real.action, confidence: real.confidence },
    shadow: { action: shadow.action, confidence: shadow.confidence },
  };
}
