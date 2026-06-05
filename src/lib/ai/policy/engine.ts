// FASE 6.6: Rule Registry Engine + Decision Trace
// applyPolicy itera reglas por prioridad estricta.
// El engine NO contiene lógica de negocio — solo evalua matches().
// FASE 6.6: agrega DecisionTrace a cada output (observabilidad).

import type { PolicyDecision, PolicyInput } from "./types";
import { getAllRules } from "./registry/rule";
import type { DecisionTrace, RuleEvaluationTrace } from "../trace/types";
import { buildTrace } from "../trace/tracer";

export function applyPolicy(input: PolicyInput): PolicyDecision & { trace: DecisionTrace } {
  const rules = getAllRules();
  const sorted = [...rules].sort((a, b) => a.priority - b.priority);
  const evaluated: RuleEvaluationTrace[] = [];

  for (const rule of sorted) {
    const start = performance.now();
    const matched = rule.matches(input);
    const end = performance.now();
    evaluated.push({
      ruleId: rule.id,
      matched,
      priority: rule.priority,
      executionTimeMs: end - start,
    });

    if (matched) {
      const decision = rule.execute(input);
      const trace = buildTrace(input, rule.id, decision.action, evaluated);
      return { ...decision, trace };
    }
  }

  // fallback siempre matchea, pero por seguridad:
  const fallback = sorted.find((r) => r.id === "FALLBACK");
  if (fallback) {
    const decision = fallback.execute(input);
    const trace = buildTrace(input, fallback.id, decision.action, evaluated);
    return { ...decision, trace };
  }
  const safe: PolicyDecision = { action: "ASK_CLARIFICATION", confidence: 0, reasonCodes: ["FALLBACK"], metadata: {} };
  const trace = buildTrace(input, "FALLBACK", safe.action, evaluated);
  return { ...safe, trace };
}
