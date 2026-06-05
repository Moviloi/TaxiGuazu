// FASE 6.7: Observability Hardening Tests
// 20+ tests covering correlation, sampling, non-blocking, debug mode, regression.

import { core } from "../src/lib/ai/core";
import { router, route } from "../src/lib/ai/router";
import { applyPolicy } from "../src/lib/ai/policy";
import { generateCorrelationId } from "../src/lib/ai/observability/correlation";
import { shouldSample, hashId } from "../src/lib/ai/observability/sampler";
import { logDecision, replayDecision } from "../src/lib/ai/observability/logger";
import type { DecisionLog } from "../src/lib/ai/observability/types";
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

console.log("\n=== CORRELATION ===");
{
  const id1 = generateCorrelationId();
  const id2 = generateCorrelationId();
  ok("C010 correlationId is string", typeof id1 === "string");
  ok("C010 correlationId non-empty", id1.length > 0);
  check("C011 unique ids", id1 !== id2, true);
  ok("C012 uuid format", /^[0-9a-f-]+$/.test(id1));
}

console.log("\n=== SAMPLING ===");
{
  ok("S010 shouldSample returns bool", typeof shouldSample("abc") === "boolean");
  check("S020 deterministic (same id)", shouldSample("abc"), shouldSample("abc"));
  check("S030 hashId deterministic", hashId("abc"), hashId("abc"));
}

console.log("\n=== NON-BLOCKING ===");
{
  const log: DecisionLog = {
    correlationId: generateCorrelationId(),
    timestamp: Date.now(),
    intent: "GREETING",
    confidence: 0.5,
    selectedRule: "GREETING_RULE",
    selectedAction: "SMALLTALK",
    latencyMs: 1,
    metadata: {},
  };
  // logDecision must never throw
  let threw = false;
  try {
    logDecision(log);
  } catch {
    threw = true;
  }
  check("N010 logDecision never throws", threw, false);
  // Decision pipeline completes even after log
  const result = router("hola", "RESERVA");
  ok("N020 router completes despite logging", !!result.decision);
}

console.log("\n=== DEBUG MODE ===");
{
  // Module-level OBS_DEBUG is read once — verify replayDecision works as stub
  const replay = replayDecision({
    intent: "BOOKING",
    confidence: 0.9,
    selectedRule: "BOOKING_RULE",
    selectedAction: "PROCEED_BOOKING",
    evaluatedRules: [],
    metadata: {},
  });
  check("D010 replay returns intent", replay.intent, "BOOKING");
  check("D010 replay returns selectedRule", replay.selectedRule, "BOOKING_RULE");
  check("D010 replay returns selectedAction", replay.selectedAction, "PROCEED_BOOKING");
}

console.log("\n=== ROUTER INTEGRATION ===");
{
  const result = router("hola", "RESERVA");
  ok("I010 router returns decision", !!result.decision);
  ok("I010 router returns core", !!result.core);
  check("I010 greeting decision", result.decision, "CLARIFY");

  const emergency = router("ayuda urgente", "AHORA");
  check("I020 emergency decision", emergency.decision, "EXECUTE");

  const booking = router("quiero reservar para 3 personas", "RESERVA");
  check("I030 booking decision", booking.decision, "EXECUTE");

  const postService = router("gracias por el viaje", "RESERVA");
  check("I040 post service decision", postService.decision, "ANSWER");

  const fallback = router("cuanto sale", "RESERVA");
  check("I050 commercial fallback decision", fallback.decision, "CLARIFY");
}

console.log("\n=== REGRESSION ===");
{
  const c = core("emergencia");
  const p = applyPolicy(c);
  check("RE010 emergency action", p.action, "ESCALATE_EMERGENCY");
  ok("RE010 emergency has trace", "trace" in p);

  const c2 = core("quiero reservar");
  const p2 = applyPolicy(c2);
  check("RE020 booking action", p2.action as string, "PROCEED_BOOKING");

  const c3 = core("gracias por el viaje");
  const p3 = applyPolicy(c3);
  check("RE030 postService action", p3.action as string, "POST_SERVICE_HANDLE");

  // route() pure function unchanged
  const routeResult = route({ action: "PROCEED_BOOKING", confidence: 0.8, reasonCodes: ["BOOKING"], metadata: {} });
  ok("RE040 route returns result", !!routeResult);
  check("RE040 route handler", routeResult!.handler, "booking");
}

console.log(`\n${pass} pass, ${fail} fail${fail > 0 ? " ***" : ""}`);
if (fail > 0) process.exit(1);
