// FASE 7: Business Decision Layer Tests
// 24 tests covering lead maturity, funnel state, customer value, regression.

import { core } from "../src/lib/ai/core";
import { router, route } from "../src/lib/ai/router";
import { applyPolicy } from "../src/lib/ai/policy";
import { evaluateBusiness } from "../src/lib/ai/business";
import type { BusinessInput } from "../src/lib/ai/business/types";

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

function makeInput(overrides: Partial<BusinessInput>): BusinessInput {
  return {
    intent: "GREETING",
    policyAction: "SMALLTALK",
    ...overrides,
  };
}

console.log("\n=== LEAD MATURITY ===");
{
  const emergency = evaluateBusiness(makeInput({ intent: "EMERGENCY", policyAction: "ESCALATE_EMERGENCY" }));
  check("L010 EMERGENCY → conversion_ready", emergency.leadMaturity, "conversion_ready");

  const nowMax = evaluateBusiness(makeInput({ intent: "NOW", policyAction: "PROCEED_NOW", lateral: { contextFlags: ["dispatch_max"], riskLevel: "high", metadata: {} } }));
  check("L020 NOW+dispatch_max → conversion_ready", nowMax.leadMaturity, "conversion_ready");

  const nowHot = evaluateBusiness(makeInput({ intent: "NOW", policyAction: "PROCEED_NOW" }));
  check("L030 NOW → hot", nowHot.leadMaturity, "hot");

  const booking = evaluateBusiness(makeInput({ intent: "BOOKING", policyAction: "PROCEED_BOOKING" }));
  check("L040 BOOKING → warm", booking.leadMaturity, "warm");

  const greeting = evaluateBusiness(makeInput({ intent: "GREETING", policyAction: "SMALLTALK" }));
  check("L050 GREETING → cold", greeting.leadMaturity, "cold");

  const informational = evaluateBusiness(makeInput({ intent: "INFORMATIONAL", policyAction: "ASK_CLARIFICATION" }));
  check("L060 INFORMATIONAL → cold", informational.leadMaturity, "cold");
}

console.log("\n=== FUNNEL STATE ===");
{
  const map = (intent: string, action?: string) =>
    evaluateBusiness(makeInput({ intent: intent as any, policyAction: (action || "ASK_CLARIFICATION") as any })).funnelState;

  check("F010 GREETING → awareness", map("GREETING"), "awareness");
  check("F020 INFORMATIONAL → consideration", map("INFORMATIONAL"), "consideration");
  check("F030 COMMERCIAL → consideration", map("COMMERCIAL"), "consideration");
  check("F040 BOOKING → intent", map("BOOKING", "PROCEED_BOOKING"), "intent");
  check("F050 NOW → conversion", map("NOW", "PROCEED_NOW"), "conversion");
  check("F060 POST_SERVICE → post_conversion", map("POST_SERVICE"), "post_conversion");
  check("F070 EMERGENCY → conversion", map("EMERGENCY", "ESCALATE_EMERGENCY"), "conversion");
}

console.log("\n=== CUSTOMER VALUE ===");
{
  const premium = evaluateBusiness(makeInput({ intent: "EMERGENCY", policyAction: "ESCALATE_EMERGENCY" }));
  check("C010 EMERGENCY → premium", premium.customerValue, "premium");

  const highBooking = evaluateBusiness(makeInput({ intent: "BOOKING", policyAction: "PROCEED_BOOKING" }));
  check("C020 BOOKING → high", highBooking.customerValue, "high");

  const mediumCommercial = evaluateBusiness(makeInput({ intent: "COMMERCIAL", policyAction: "ASK_CLARIFICATION" }));
  check("C030 COMMERCIAL → medium", mediumCommercial.customerValue, "medium");

  const lowGreeting = evaluateBusiness(makeInput({ intent: "GREETING", policyAction: "SMALLTALK" }));
  check("C040 GREETING → low", lowGreeting.customerValue, "low");
}

console.log("\n=== REGRESSION ===");
{
  // FASE 7 does NOT affect pipeline outputs
  const c = core("emergencia");
  const p = applyPolicy(c);
  check("RE010 emergency action unchanged", p.action, "ESCALATE_EMERGENCY");

  const routeResult = route({ action: "PROCEED_BOOKING", confidence: 0.8, reasonCodes: ["BOOKING"], metadata: {} });
  ok("RE020 route still works", !!routeResult);
  check("RE020 route handler", routeResult!.handler, "booking");

  const result = router("hola", "RESERVA");
  check("RE030 router greeting unchanged", result.decision, "CLARIFY");

  // FASE 7 produces correct BusinessDecision shape
  const bd = evaluateBusiness(makeInput({ intent: "NOW", policyAction: "PROCEED_NOW" }));
  ok("RE040 leadMaturity present", !!bd.leadMaturity);
  ok("RE040 customerValue present", !!bd.customerValue);
  ok("RE040 funnelState present", !!bd.funnelState);
  ok("RE040 metadata.derivedFrom present", !!bd.metadata.derivedFrom);
}

console.log(`\n${pass} pass, ${fail} fail${fail > 0 ? " ***" : ""}`);
if (fail > 0) process.exit(1);
