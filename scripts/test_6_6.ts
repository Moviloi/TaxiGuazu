// FASE 6.6: Decision Trace Test Suite
//
// Tests:
//   TRACE VALIDATION (5)
//   RULE EVALUATION ORDER (3)
//   FALLBACK TRACE (2)
//   PERFORMANCE TRACKING (2)
//   REGRESSION (4)
// Total: 16 blocks / ~30 checks

import { core } from "@/lib/ai/core";
import { applyPolicy } from "@/lib/ai/policy";
import type { DecisionTrace } from "@/lib/ai/trace/types";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) { pass++; console.log(`  ✓ ${label}`); }
  else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
  }
}

function ok(label: string, condition: boolean) {
  if (condition) { pass++; console.log(`  ✓ ${label}`); }
  else { fail++; console.log(`  ✗ ${label} (condition false)`); }
}

// Helper para TypeScript: cast del resultado con trace
function withTrace(input: ReturnType<typeof applyPolicy>): { decision: ReturnType<typeof applyPolicy>; trace: DecisionTrace } {
  const decision = input;
  const trace = (decision as any).trace as DecisionTrace;
  return { decision, trace };
}

// ── TRACE VALIDATION ──
console.log("\n=== TRACE VALIDATION ===");
{
  const { trace } = withTrace(applyPolicy(core("emergencia")));
  ok("T010 trace exists", !!trace);
  check("T010 selectedRule", trace.selectedRule, "EMERGENCY_RULE");
  check("T010 selectedAction", trace.selectedAction, "ESCALATE_EMERGENCY");
  check("T010 intent", trace.intent, "EMERGENCY");
  ok("T010 evaluatedRules > 0", trace.evaluatedRules.length > 0);
  const matchedRule = trace.evaluatedRules.find((r) => r.matched);
  check("T010 matched rule is EMERGENCY_RULE", matchedRule?.ruleId, "EMERGENCY_RULE");
}
{
  const { trace } = withTrace(applyPolicy(core("estoy en el centro necesito ir al aeropuerto ahora urgente")));
  ok("T020 trace exists", !!trace);
  check("T020 selectedRule", trace.selectedRule, "NOW_RULE");
  check("T020 selectedAction", trace.selectedAction, "PROCEED_NOW");
  const matchedRule = trace.evaluatedRules.find((r) => r.matched);
  check("T020 matched rule is NOW_RULE", matchedRule?.ruleId, "NOW_RULE");
}
{
  const { trace } = withTrace(applyPolicy(core("quiero reservar un viaje para mañana")));
  ok("T030 trace exists", !!trace);
  check("T030 selectedRule", trace.selectedRule, "BOOKING_RULE");
  check("T030 selectedAction", trace.selectedAction, "PROCEED_BOOKING");
  const matchedRule = trace.evaluatedRules.find((r) => r.matched);
  check("T030 matched rule is BOOKING_RULE", matchedRule?.ruleId, "BOOKING_RULE");
}
{
  const { trace } = withTrace(applyPolicy(core("gracias por el viaje")));
  ok("T040 trace exists", !!trace);
  check("T040 selectedRule", trace.selectedRule, "POST_SERVICE_RULE");
  check("T040 selectedAction", trace.selectedAction, "POST_SERVICE_HANDLE");
  const matchedRule = trace.evaluatedRules.find((r) => r.matched);
  check("T040 matched rule is POST_SERVICE_RULE", matchedRule?.ruleId, "POST_SERVICE_RULE");
}
{
  const { trace } = withTrace(applyPolicy(core("hola")));
  ok("T050 trace exists", !!trace);
  check("T050 selectedRule", trace.selectedRule, "GREETING_RULE");
  check("T050 selectedAction", trace.selectedAction, "SMALLTALK");
  const matchedRule = trace.evaluatedRules.find((r) => r.matched);
  check("T050 matched rule is GREETING_RULE", matchedRule?.ruleId, "GREETING_RULE");
}

// ── RULE EVALUATION ORDER ──
console.log("\n=== RULE EVALUATION ORDER ===");
{
  const { trace } = withTrace(applyPolicy(core("hola")));
  // GREETING gana → solo las 5 reglas previas a FALLBACK se evalúan
  const ids = trace.evaluatedRules.map((r) => r.ruleId);
  check("T060 rule evaluation order (before match)", ids, [
    "EMERGENCY_RULE",
    "NOW_RULE",
    "BOOKING_RULE",
    "POST_SERVICE_RULE",
    "GREETING_RULE",
  ]);
  check("T060 exactly 1 matched (GREETING wins)", trace.evaluatedRules.filter((r) => r.matched).length, 1);
  check("T060 GREETING_RULE matched", trace.evaluatedRules[4].matched, true);
}
{
  // EMERGENCY gana inmediatamente → solo 1 regla evaluada
  const { trace } = withTrace(applyPolicy(core("emergencia")));
  check("T061 EMERGENCY immediate win", trace.evaluatedRules.length, 1);
  check("T061 first rule is EMERGENCY_RULE", trace.evaluatedRules[0].ruleId, "EMERGENCY_RULE");
  ok("T061 EMERGENCY_RULE matched", trace.evaluatedRules[0].matched);
}
{
  const { trace } = withTrace(applyPolicy(core("horarios")));
  // INFORMATIONAL → fallback → todas las 6 reglas evaluadas
  check("T062 all 6 rules evaluated on fallback", trace.evaluatedRules.length, 6);
  const lastIdx = trace.evaluatedRules.length - 1;
  check("T062 FALLBACK is last rule", trace.evaluatedRules[lastIdx].ruleId, "FALLBACK");
  ok("T062 FALLBACK matched", trace.evaluatedRules[lastIdx].matched);
  check("T062 only FALLBACK matched", trace.evaluatedRules.filter((r) => r.matched).length, 1);
}

// ── FALLBACK TRACE ──
console.log("\n=== FALLBACK TRACE ===");
{
  const { trace } = withTrace(applyPolicy(core("horarios")));
  ok("T070 fallback trace exists", !!trace);
  check("T070 selectedRule is FALLBACK", trace.selectedRule, "FALLBACK");
  check("T070 selectedAction", trace.selectedAction, "ASK_CLARIFICATION");
}
{
  const { trace } = withTrace(applyPolicy(core("")));
  ok("T071 fallback trace for empty", !!trace);
  check("T071 selectedRule is FALLBACK", trace.selectedRule, "FALLBACK");
  check("T071 selectedAction", trace.selectedAction, "ASK_CLARIFICATION");
}

// ── PERFORMANCE TRACKING ──
console.log("\n=== PERFORMANCE ===");
{
  const { trace } = withTrace(applyPolicy(core("emergencia")));
  for (const r of trace.evaluatedRules) {
    ok(`T080 ${r.ruleId} executionTimeMs exists`, typeof r.executionTimeMs === "number");
    ok(`T080 ${r.ruleId} executionTimeMs >= 0`, r.executionTimeMs >= 0);
  }
}
{
  const { trace } = withTrace(applyPolicy(core("foo bar")));
  ok("T081 all evaluated rules have executionTimeMs",
    trace.evaluatedRules.every((r) => typeof r.executionTimeMs === "number" && r.executionTimeMs >= 0));
}

// ── REGRESSION: decisions unchanged ──
console.log("\n=== REGRESSION ===");
{
  const p = applyPolicy(core("emergencia"));
  check("T090 EMERGENCY action unchanged", p.action, "ESCALATE_EMERGENCY");
  check("T090 EMERGENCY confidence unchanged", p.confidence, 1);
  ok("T090 EMERGENCY has trace", !!(p as any).trace);
}
{
  const p = applyPolicy(core("quiero reservar un viaje para mañana"));
  check("T091 BOOKING action unchanged", p.action, "PROCEED_BOOKING");
  ok("T091 BOOKING has trace", !!(p as any).trace);
}
{
  const p = applyPolicy(core("estoy en el centro necesito ir al aeropuerto ahora urgente"));
  check("T092 NOW action unchanged", p.action, "PROCEED_NOW");
  ok("T092 NOW has trace", !!(p as any).trace);
}
{
  const p = applyPolicy(core("gracias por el viaje"));
  check("T093 POST_SERVICE action unchanged", p.action, "POST_SERVICE_HANDLE");
  ok("T093 POST_SERVICE has trace", !!(p as any).trace);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
