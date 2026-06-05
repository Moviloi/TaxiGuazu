// ROUTER — capa ejecutora pura.
// NO contiene lógica de decisión (intent, confidence, keywords).
// SOLO consume PolicyDecision y retorna qué handler ejecutar.
//
// v5.0 FASE 6.4: router es 100% executor.
//   - route() mapea PolicyAction → handler name (pure function)
//   - router() legacy mantiene backward compat con handler.ts / policies
//     (internamente usa core + applyPolicy, NUNCA intent)
//
// v5.0 FASE 6.7: router() incluye observabilidad side-channel
//   - logDecision async, non-blocking, fail-safe
// v5.0 FASE 6.8: router() emite eventos de fase (core, lateral, policy, router)
//   y span decision_trace via OpenTelemetry.

import { core } from "./core";
import { applyPolicy } from "./policy";
import type { PolicyAction, PolicyDecision } from "./policy/types";
import type { CoreDecision, FinalDecision, Mode, OutputType } from "./types";
import { logDecision, generateCorrelationId } from "./observability";
import type { DecisionTrace } from "./trace/types";
import type { DecisionLog } from "./observability/types";
import { recordEvent, exportEvent } from "./telemetry";

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
// FASE 6.7: observabilidad side-channel non-blocking.
export function router(input: string, mode: Mode): FinalDecision {
  const correlationId = generateCorrelationId();
  const start = performance.now();

  // FASE 6.2/6.8: Core + Lateral phases
  const c: CoreDecision = core(input);
  recordEvent({ correlationId, phase: "core", intent: c.intent, latencyMs: performance.now() - start, success: true, metadata: {} });
  recordEvent({ correlationId, phase: "lateral", intent: c.intent, latencyMs: 0, success: true, metadata: {} });

  // Policy phase (metrics inside applyPolicy)
  const policy: PolicyDecision = applyPolicy(c);
  const outputType = actionToOutputType(policy.action);
  const end = performance.now();
  recordEvent({ correlationId, phase: "policy", intent: c.intent, latencyMs: end - start, success: true, metadata: {} });

  // Router phase
  recordEvent({ correlationId, phase: "router", intent: c.intent, action: policy.action, latencyMs: end - start, success: true, metadata: {} });

  // FASE 6.7: observabilidad side-channel (non-blocking)
  const trace = (policy as PolicyDecision & { trace?: DecisionTrace }).trace;
  const log: DecisionLog = {
    correlationId,
    timestamp: Date.now(),
    intent: c.intent,
    confidence: policy.confidence,
    selectedRule: trace?.selectedRule ?? "unknown",
    selectedAction: policy.action,
    latencyMs: end - start,
    lateralSnapshot: c.lateral,
    trace,
    metadata: {},
  };
  logDecision(log);

  // FASE 6.8: export each phase event via telemetry
  if (trace) {
    exportEvent({ correlationId, phase: "core", intent: c.intent, latencyMs: 0, success: true, metadata: {} });
    exportEvent({ correlationId, phase: "lateral", intent: c.intent, latencyMs: 0, success: true, metadata: {} });
    exportEvent({ correlationId, phase: "policy", intent: c.intent, latencyMs: end - start, success: true, metadata: {} });
    exportEvent({ correlationId, phase: "router", intent: c.intent, action: policy.action, latencyMs: end - start, success: true, metadata: {} });
  }

  return {
    decision: outputType,
    mode,
    core: c,
    reason: `action=${policy.action} → ${outputType}`,
  };
}
