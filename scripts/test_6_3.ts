// FASE 6.3: Policy Layer Test Suite
//
// Tests:
//   EMERGENCY override (2)
//   NOW dispatch priority (3)
//   BOOKING with/without urgency (3)
//   POST_SERVICE mapping (2)
//   GREETING mapping (2)
//   fallback INFORMATIONAL (2)
//   AMBIGUOUS → clarification (2)
//   stress NOW vs BOOKING (2)
// Total: 18 tests
//
// pipeline: input → core() → applyPolicy()

import { core } from "@/lib/ai/core";
import { applyPolicy } from "@/lib/ai/policy";

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

// ── EMERGENCY OVERRIDE ──
console.log("\n=== EMERGENCY ===");
{
  const d = core("emergencia");
  const p = applyPolicy(d);
  check("T001 action ESCALATE_EMERGENCY", p.action, "ESCALATE_EMERGENCY");
  check("T001 confidence 1", p.confidence, 1);
  check("T001 reasonCodes", p.reasonCodes, ["EMERGENCY_RULE_MATCH"]);
  check("T001 originalIntent", d.intent, "EMERGENCY");
}
{
  // POST_SERVICE with complaint → riskLevel high → EMERGENCY override
  const d = core("queja");
  const p = applyPolicy(d);
  check("T002 action ESCALATE_EMERGENCY (complaint)", p.action, "ESCALATE_EMERGENCY");
  check("T002 confidence 1", p.confidence, 1);
  check("T002 reasonCodes", p.reasonCodes, ["EMERGENCY_RULE_MATCH"]);
  check("T002 originalIntent POST_SERVICE", p.metadata?.originalIntent, "POST_SERVICE");
}

// ── NOW DISPATCH PRIORITY ──
console.log("\n=== NOW ===");
{
  // Input con route locked + now/urgency → dispatch_priority_max → PROCEED_NOW
  const d = core("estoy en el centro necesito ir al aeropuerto ahora urgente");
  const p = applyPolicy(d);
  check("T010 intent NOW", d.intent, "NOW");
  check("T010 action PROCEED_NOW", p.action, "PROCEED_NOW");
  check("T010 reasonCodes", p.reasonCodes, ["NOW_RULE_MATCH"]);
  ok("T010 confidence > 0", p.confidence > 0);
}
{
  // Input con now + sin slots locked → dispatch_priority_high → ASK_CLARIFICATION
  const d = core("necesito ahora urgente");
  const p = applyPolicy(d);
  check("T011 intent NOW", d.intent, "NOW");
  check("T011 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
  check("T011 reasonCodes", p.reasonCodes, ["NOW_RULE_MATCH"]);
}
{
  // Input con solo urgency (sin now fact) → dispatch_priority_normal → ASK_CLARIFICATION
  const d = core("para ya");
  const p = applyPolicy(d);
  check("T012 intent NOW", d.intent, "NOW");
  check("T012 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
  check("T012 reasonCodes", p.reasonCodes, ["NOW_RULE_MATCH"]);
}

// ── BOOKING ──
console.log("\n=== BOOKING ===");
{
  const d = core("quiero reservar un viaje para mañana");
  const p = applyPolicy(d);
  check("T020 intent BOOKING", d.intent, "BOOKING");
  check("T020 action PROCEED_BOOKING", p.action, "PROCEED_BOOKING");
  check("T020 reasonCodes", p.reasonCodes, ["BOOKING_RULE_MATCH"]);
}
{
  const d = core("quiero reservar un viaje");
  const p = applyPolicy(d);
  check("T021 intent BOOKING", d.intent, "BOOKING");
  check("T021 action PROCEED_BOOKING", p.action, "PROCEED_BOOKING");
  check("T021 reasonCodes", p.reasonCodes, ["BOOKING_RULE_MATCH"]);
}
{
  const d = core("estoy en el centro quiero ir al aeropuerto");
  const p = applyPolicy(d);
  check("T022 intent BOOKING", d.intent, "BOOKING");
  check("T022 action PROCEED_BOOKING", p.action, "PROCEED_BOOKING");
  check("T022 reasonCodes", p.reasonCodes, ["BOOKING_RULE_MATCH"]);
}

// ── POST_SERVICE ──
console.log("\n=== POST_SERVICE ===");
{
  const d = core("gracias por el viaje");
  const p = applyPolicy(d);
  check("T030 intent POST_SERVICE", d.intent, "POST_SERVICE");
  check("T030 action POST_SERVICE_HANDLE", p.action, "POST_SERVICE_HANDLE");
  check("T030 reasonCodes", p.reasonCodes, ["POST_SERVICE_RULE_MATCH"]);
}
{
  const d = core("excelente servicio");
  const p = applyPolicy(d);
  check("T031 intent POST_SERVICE", d.intent, "POST_SERVICE");
  check("T031 action POST_SERVICE_HANDLE", p.action, "POST_SERVICE_HANDLE");
  check("T031 reasonCodes", p.reasonCodes, ["POST_SERVICE_RULE_MATCH"]);
}

// ── GREETING ──
console.log("\n=== GREETING ===");
{
  const d = core("hola");
  const p = applyPolicy(d);
  check("T040 intent GREETING", d.intent, "GREETING");
  check("T040 action SMALLTALK", p.action, "SMALLTALK");
  check("T040 reasonCodes", p.reasonCodes, ["GREETING_RULE_MATCH"]);
}
{
  const d = core("qué tal");
  const p = applyPolicy(d);
  check("T041 intent GREETING", d.intent, "GREETING");
  check("T041 action SMALLTALK", p.action, "SMALLTALK");
  check("T041 reasonCodes", p.reasonCodes, ["GREETING_RULE_MATCH"]);
}

// ── FALLBACK (INFORMATIONAL / COMMERCIAL / PRE_BOOKING) ──
console.log("\n=== FALLBACK ===");
{
  const d = core("horarios");
  const p = applyPolicy(d);
  check("T050 intent INFORMATIONAL", d.intent, "INFORMATIONAL");
  check("T050 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
  check("T050 reasonCodes", p.reasonCodes, ["FALLBACK_RULE"]);
}
{
  const d = core("cómo funciona");
  const p = applyPolicy(d);
  check("T051 intent INFORMATIONAL", d.intent, "INFORMATIONAL");
  check("T051 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
}

// ── AMBIGUOUS ──
console.log("\n=== AMBIGUOUS ===");
{
  const d = core("");
  const p = applyPolicy(d);
  check("T060 intent AMBIGUOUS", d.intent, "AMBIGUOUS");
  check("T060 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
  check("T060 reasonCodes", p.reasonCodes, ["FALLBACK_RULE"]);
  check("T060 confidence fallback", p.confidence, 0.5);
}
{
  const d = core("foo bar");
  const p = applyPolicy(d);
  check("T061 intent AMBIGUOUS", d.intent, "AMBIGUOUS");
  check("T061 action ASK_CLARIFICATION", p.action, "ASK_CLARIFICATION");
  check("T061 confidence fallback", p.confidence, 0.5);
}

// ── STRESS: NOW vs BOOKING ──
console.log("\n=== STRESS ===");
{
  const now = core("estoy en el centro necesito ir al aeropuerto ahora urgente");
  const booking = core("quiero reservar un viaje para mañana");
  const pNow = applyPolicy(now);
  const pBk = applyPolicy(booking);
  check("T070 NOW action PROCEED_NOW", pNow.action, "PROCEED_NOW");
  check("T070 BOOKING action PROCEED_BOOKING", pBk.action, "PROCEED_BOOKING");
}
{
  const nowNeedsClarification = core("necesito ahora urgente");
  const bookingReady = core("quiero reservar un viaje para mañana");
  const pNow = applyPolicy(nowNeedsClarification);
  const pBk = applyPolicy(bookingReady);
  check("T071 NOW without slots ASK_CLARIFICATION", pNow.action, "ASK_CLARIFICATION");
  check("T071 BOOKING remains PROCEED_BOOKING", pBk.action, "PROCEED_BOOKING");
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
