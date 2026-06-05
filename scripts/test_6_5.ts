// FASE 6.5: Rule Registry Test Suite
//
// Tests:
//   EMERGENCY rule override (2)
//   NOW rule dispatch logic (3)
//   BOOKING rule evaluation (3)
//   POST_SERVICE sentiment routing (2)
//   GREETING behavior (2)
//   FALLBACK always hit (2)
//   priority ordering validation (2)
//   regression 6.4 (router unchanged) (4)
// Total: 20 tests
//
// Aislamos cada regla vía matches()/execute() directamente.

import { core } from "@/lib/ai/core";
import { applyPolicy } from "@/lib/ai/policy";
import { router } from "@/lib/ai/router";
import { getAllRules } from "@/lib/ai/policy/registry/rule";
import type { PolicyRule } from "@/lib/ai/policy/registry/types";
import type { PolicyInput } from "@/lib/ai/policy/types";

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

const rules: PolicyRule[] = getAllRules();
const sorted = [...rules].sort((a, b) => a.priority - b.priority);

// ── EMERGENCY RULE ──
console.log("\n=== EMERGENCY RULE ===");
{
  const input = core("emergencia") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "EMERGENCY_RULE");
  ok("T010 EMERGENCY_RULE found", !!matched);
  check("T010 matches EMERGENCY", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T010 action", result.action, "ESCALATE_EMERGENCY");
  check("T010 reasonCodes", result.reasonCodes, ["EMERGENCY_RULE_MATCH"]);
  check("T010 confidence", result.confidence, 1);
}
{
  // POST_SERVICE with complaint → riskLevel high → EMERGENCY rule matches too
  const input = core("queja") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "EMERGENCY_RULE");
  check("T011 matches complaint", matched!.matches(input), true);
  // Pero POST_SERVICE_RULE también matchearía si llegara a evaluarse
  const psRule = sorted.find((r) => r.id === "POST_SERVICE_RULE");
  check("T011 POST_SERVICE_RULE also matches complaint", psRule!.matches(input), true);
  // La prioridad decide: EMERGENCY (1) < POST_SERVICE (4)
  ok("T011 EMERGENCY runs before POST_SERVICE", sorted.indexOf(matched!) < sorted.indexOf(psRule!));
}

// ── NOW RULE ──
console.log("\n=== NOW RULE ===");
{
  const input = core("estoy en el centro necesito ir al aeropuerto ahora urgente") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "NOW_RULE");
  ok("T020 NOW_RULE found", !!matched);
  check("T020 matches NOW", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T020 action PROCEED_NOW", result.action, "PROCEED_NOW");
  check("T020 reasonCodes", result.reasonCodes, ["NOW_RULE_MATCH"]);
}
{
  const input = core("necesito ahora urgente") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "NOW_RULE");
  check("T021 matches NOW sin route", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T021 action ASK_CLARIFICATION", result.action, "ASK_CLARIFICATION");
}
{
  const input = core("para ya") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "NOW_RULE");
  const result = matched!.execute(input);
  check("T022 action ASK_CLARIFICATION (urgency only)", result.action, "ASK_CLARIFICATION");
}

// ── BOOKING RULE ──
console.log("\n=== BOOKING RULE ===");
{
  const input = core("quiero reservar un viaje para mañana") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "BOOKING_RULE");
  ok("T030 BOOKING_RULE found", !!matched);
  check("T030 matches BOOKING", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T030 action PROCEED_BOOKING", result.action, "PROCEED_BOOKING");
  check("T030 reasonCodes", result.reasonCodes, ["BOOKING_RULE_MATCH"]);
}
{
  const input = core("quiero reservar un viaje") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "BOOKING_RULE");
  check("T031 matches BOOKING simple", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T031 action PROCEED_BOOKING", result.action, "PROCEED_BOOKING");
}
{
  const input = core("estoy en el centro quiero ir al aeropuerto") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "BOOKING_RULE");
  const result = matched!.execute(input);
  check("T032 action PROCEED_BOOKING (with route)", result.action, "PROCEED_BOOKING");
}

// ── POST_SERVICE RULE ──
console.log("\n=== POST_SERVICE RULE ===");
{
  const input = core("gracias por el viaje") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "POST_SERVICE_RULE");
  ok("T040 POST_SERVICE_RULE found", !!matched);
  check("T040 matches POST_SERVICE", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T040 action POST_SERVICE_HANDLE", result.action, "POST_SERVICE_HANDLE");
  check("T040 reasonCodes", result.reasonCodes, ["POST_SERVICE_RULE_MATCH"]);
}
{
  const input = core("excelente servicio") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "POST_SERVICE_RULE");
  check("T041 matches praise", matched!.matches(input), true);
}

// ── GREETING RULE ──
console.log("\n=== GREETING RULE ===");
{
  const input = core("hola") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "GREETING_RULE");
  ok("T050 GREETING_RULE found", !!matched);
  check("T050 matches hola", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T050 action SMALLTALK", result.action, "SMALLTALK");
  check("T050 reasonCodes", result.reasonCodes, ["GREETING_RULE_MATCH"]);
}
{
  const input = core("qué tal") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "GREETING_RULE");
  check("T051 matches qué tal", matched!.matches(input), true);
}

// ── FALLBACK RULE ──
console.log("\n=== FALLBACK RULE ===");
{
  const input = core("horarios") as unknown as PolicyInput;
  const matched = sorted.find((r) => r.id === "FALLBACK");
  ok("T060 FALLBACK found", !!matched);
  check("T060 matches INFORMATIONAL", matched!.matches(input), true);
  const result = matched!.execute(input);
  check("T060 action ASK_CLARIFICATION", result.action, "ASK_CLARIFICATION");
  check("T060 reasonCodes", result.reasonCodes, ["FALLBACK_RULE"]);
}
{
  const input = core(""); // AMBIGUOUS
  const matched = sorted.find((r) => r.id === "FALLBACK");
  check("T061 matches empty", matched!.matches(input), true);
}

// ── PRIORITY ORDERING ──
console.log("\n=== PRIORITY ===");
{
  const ids = sorted.map((r) => r.id);
  check("T070 priority order", ids, [
    "EMERGENCY_RULE",
    "NOW_RULE",
    "BOOKING_RULE",
    "POST_SERVICE_RULE",
    "GREETING_RULE",
    "FALLBACK",
  ]);
}
{
  // Verificar que FALLBACK tiene la prioridad más alta (número más grande = última)
  const fallback = sorted.find((r) => r.id === "FALLBACK");
  const highest = sorted[sorted.length - 1];
  check("T071 FALLBACK is last", highest.id, "FALLBACK");
  check("T071 FALLBACK priority 999", fallback!.priority, 999);
}

// ── REGRESSION: router unchanged ──
console.log("\n=== REGRESSION ===");
{
  const r = router("hola", "RESERVA");
  check("T080 router backward compat", r.mode, "RESERVA");
  ok("T080 has core", !!r.core);
  check("T080 reason no intent", r.reason.includes("intent="), false);
}
{
  const r = router("emergencia", "RESERVA");
  check("T081 router emergency", r.decision, "EXECUTE");
}
{
  const p = applyPolicy(core("quiero reservar un viaje para mañana"));
  check("T082 policy still works", p.action, "PROCEED_BOOKING");
  check("T082 reasonCodes", p.reasonCodes, ["BOOKING_RULE_MATCH"]);
}
{
  const p = applyPolicy(core("gracias por el viaje"));
  check("T083 policy post service", p.action, "POST_SERVICE_HANDLE");
  check("T083 reasonCodes", p.reasonCodes, ["POST_SERVICE_RULE_MATCH"]);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
