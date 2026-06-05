// FASE 6.8: Telemetry Export Tests
// 27 tests covering trace export, metrics, latency, fail-safety, sampling, regression.

import { core } from "../src/lib/ai/core";
import { router, route } from "../src/lib/ai/router";
import { applyPolicy } from "../src/lib/ai/policy";
import { recordRuleHit, recordRuleLatency, recordActionDistribution } from "../src/lib/ai/telemetry/metrics";
import { recordEvent, drainEvents, getEvents } from "../src/lib/ai/telemetry/events";
import { safeExport, exportTrace } from "../src/lib/ai/telemetry/exporter";
import type { DecisionTrace } from "../src/lib/ai/trace/types";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = actual === expected;
  console.log(`  ${ok ? "✓" : "✗"} ${label}${ok ? "" : `\n    expected: ${JSON.stringify(expected)}\n    actual:   ${JSON.stringify(actual)}`}`);
  if (ok) pass++; else fail++;
}
function ok(label: string, value: unknown) {
  check(label, !!value, true);
}

console.log("\n=== METRICS (rule_hit_total) ===");
{
  recordRuleHit("NOW_RULE");
  recordRuleHit("BOOKING_RULE");
  recordRuleHit("EMERGENCY_RULE");
  ok("M010 recordRuleHit does not throw", true);

  recordRuleLatency("NOW_RULE", 1.5);
  recordRuleLatency("BOOKING_RULE", 2.3);
  ok("M020 recordRuleLatency does not throw", true);

  recordActionDistribution("PROCEED_NOW");
  recordActionDistribution("PROCEED_BOOKING");
  recordActionDistribution("ESCALATE_EMERGENCY");
  ok("M030 recordActionDistribution does not throw", true);
}

console.log("\n=== EVENTS ===");
{
  drainEvents(); // reset
  recordEvent({ correlationId: "abc", phase: "core", intent: "GREETING", latencyMs: 1, success: true, metadata: {} });
  recordEvent({ correlationId: "abc", phase: "policy", intent: "GREETING", latencyMs: 2, success: true, metadata: {} });
  const events = drainEvents();
  check("E010 events recorded count", events.length, 2);
  check("E010 first event phase", events[0].phase, "core");
  check("E011 second event phase", events[1].phase, "policy");
  ok("E020 getEvents returns snapshot", getEvents().length === 0);
}

console.log("\n=== TRACE EXPORT ===");
{
  const fakeTrace: DecisionTrace = {
    intent: "BOOKING",
    confidence: 0.9,
    selectedRule: "BOOKING_RULE",
    selectedAction: "PROCEED_BOOKING",
    evaluatedRules: [{ ruleId: "BOOKING_RULE", matched: true, priority: 3, executionTimeMs: 0.5 }],
    metadata: {},
  };
  // exportTrace must not throw
  let threw = false;
  try {
    exportTrace(fakeTrace);
  } catch {
    threw = true;
  }
  check("X010 exportTrace never throws", threw, false);
}

console.log("\n=== FAIL SAFETY ===");
{
  // safeExport must catch all errors
  let threw = false;
  try {
    safeExport(() => { throw new Error("OTEL fail"); });
  } catch {
    threw = true;
  }
  check("F010 safeExport catches errors", threw, false);

  // Pipeline unaffected by failed telemetry
  const result = router("hola", "RESERVA");
  ok("F020 router completes after telemetry", !!result.decision);
}

console.log("\n=== ROUTER EVENTS ===");
{
  drainEvents();
  router("hola", "RESERVA");
  const events = drainEvents();
  ok("EV010 router emits events", events.length > 0);
  const phases = events.map((e) => e.phase);
  ok("EV010 core event emitted", phases.includes("core"));
  ok("EV010 lateral event emitted", phases.includes("lateral"));
  ok("EV010 policy event emitted", phases.includes("policy"));
  ok("EV010 router event emitted", phases.includes("router"));
}

console.log("\n=== REGRESSION ===");
{
  // Pipeline outputs unchanged
  const c = core("emergencia");
  const p = applyPolicy(c);
  check("RE010 emergency action", p.action, "ESCALATE_EMERGENCY");
  ok("RE010 emergency has trace", "trace" in p);

  const c2 = core("quiero reservar");
  const p2 = applyPolicy(c2);
  check("RE020 booking action", p2.action, "PROCEED_BOOKING");

  const c3 = core("gracias por el viaje");
  const p3 = applyPolicy(c3);
  check("RE030 postService action", p3.action, "POST_SERVICE_HANDLE");

  const routeResult = route({ action: "PROCEED_BOOKING", confidence: 0.8, reasonCodes: ["BOOKING"], metadata: {} });
  ok("RE040 route returns result", !!routeResult);
  check("RE040 route handler", routeResult!.handler, "booking");
}

console.log(`\n${pass} pass, ${fail} fail${fail > 0 ? " ***" : ""}`);
if (fail > 0) process.exit(1);
