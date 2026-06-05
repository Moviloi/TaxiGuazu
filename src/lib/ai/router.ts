// ROUTER — capa ejecutora pura.
// NO contiene lógica de decisión (intent, confidence, keywords).
// SOLO consume PolicyDecision y retorna qué handler ejecutar.
//
// v5.0 FASE 6.4: router es 100% executor.
//   - route() mapea PolicyAction → handler name (pure function)
//   - router() legacy mantiene backward compat con handler.ts / policies
//     (internamente usa core + applyPolicy, NUNCA intent)

import { core } from "./core";
import { applyPolicy } from "./policy";
import type { PolicyAction, PolicyDecision } from "./policy/types";
import type { CoreDecision, FinalDecision, Mode, OutputType } from "./types";

// ── RouteResult: descriptor de ejecución ──
export interface RouteResult {
  action: PolicyAction;
  handler: string;
  metadata: Record<string, unknown>;
}

// ── route(): pure executor — FASE 6.4 ──
// NO usa intent, NO usa confidence, NO branching por keywords.
// Solo mapea PolicyAction → handler name + metadata.
// Retorna null para IGNORE (no-op).
export function route(policy: PolicyDecision): RouteResult | null {
  switch (policy.action) {
    case "ESCALATE_EMERGENCY":
      return { action: policy.action, handler: "emergency", metadata: policy.metadata };
    case "PROCEED_NOW":
      return { action: policy.action, handler: "nowDispatch", metadata: policy.metadata };
    case "PROCEED_BOOKING":
      return { action: policy.action, handler: "booking", metadata: policy.metadata };
    case "POST_SERVICE_HANDLE":
      return { action: policy.action, handler: "postService", metadata: policy.metadata };
    case "SMALLTALK":
      return { action: policy.action, handler: "smalltalk", metadata: policy.metadata };
    case "ASK_CLARIFICATION":
      return { action: policy.action, handler: "clarification", metadata: policy.metadata };
    case "IGNORE":
      return null;
    default:
      return { action: policy.action, handler: "clarification", metadata: policy.metadata };
  }
}

// ── actionToOutputType: mapping puro PolicyAction → OutputType ──
function actionToOutputType(action: PolicyAction): OutputType {
  switch (action) {
    case "ESCALATE_EMERGENCY": return "EXECUTE";
    case "PROCEED_NOW":        return "EXECUTE";
    case "PROCEED_BOOKING":    return "EXECUTE";
    case "POST_SERVICE_HANDLE": return "ANSWER";
    case "SMALLTALK":          return "CLARIFY";
    case "ASK_CLARIFICATION":  return "CLARIFY";
    case "IGNORE":             return "SAFE_FALLBACK";
    default:                   return "SAFE_FALLBACK";
  }
}

// ── router(): legacy backward compat — FASE 6.4 refactored ──
// Internamente usa core() + applyPolicy().
// NO contiene switch sobre intent, NO contiene switch sobre keywords.
// Solo llama al pipeline y mapea el PolicyDecision.action → OutputType.
export function router(input: string, mode: Mode): FinalDecision {
  const c: CoreDecision = core(input);
  // lateral ya viene de core() (FASE 6.2)
  const policy: PolicyDecision = applyPolicy(c);
  const outputType = actionToOutputType(policy.action);
  return {
    decision: outputType,
    mode,
    core: c,
    reason: `action=${policy.action} → ${outputType}`,
  };
}
