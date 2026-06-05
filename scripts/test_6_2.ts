// FASE 6.2: Lateral Handlers Test Suite
//
// Tests:
//   GREETING (3), BOOKING (4), NOW (4), POST_SERVICE (3), EMERGENCY (2)
//   REGRESSION (4), STRESS (4)
// Total: 24 tests
//
// Cada test verifica:
//   - lateral output correcto según estado de facts+slotStability
//   - intent principal NO modificado
//   - flags, riskLevel, metadata correctos

import { core } from "@/lib/ai/core";

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

// ── GREETING_LATERAL ──
console.log("\n=== GREETING ===");
{
  const c = core("hola");
  check("T001 intent unchanged", c.intent, "GREETING");
  ok("T001 has lateral", !!c.lateral);
  check("T001 engagement neutral", c.lateral?.metadata?.engagementLevel, "neutral");
  check("T001 riskLevel low", c.lateral?.riskLevel, "low");
  check("T001 contextFlags", c.lateral?.contextFlags, ["engagement_neutral"]);
  check("T001 nextAction", c.lateral?.nextAction, "engage_conversation");
}
{
  const c = core("cómo estás");
  check("T002 intent unchanged", c.intent, "GREETING");
  check("T002 engagement warm", c.lateral?.metadata?.engagementLevel, "warm");
  check("T002 contextFlags", c.lateral?.contextFlags, ["engagement_warm"]);
}
{
  const c = core("buenas tardes");
  check("T003 intent unchanged", c.intent, "GREETING");
  check("T003 engagement neutral", c.lateral?.metadata?.engagementLevel, "neutral");
}

// ── BOOKING_LATERAL ──
console.log("\n=== BOOKING ===");
// Nota: inputs con "ahora" o "urgente" se clasifican como NOW (prioridad más alta).
// Para probar BOOKING lateral, usamos booking + date sin now/urgency.
{
  const c = core("quiero reservar un viaje para mañana");
  check("T010 intent unchanged", c.intent, "BOOKING");
  ok("T010 has lateral", !!c.lateral);
  ok("T010 urgencyScore 0.6 (has date)", (c.lateral?.metadata?.urgencyScore as number) === 0.6);
  check("T010 timeSensitivity today", c.lateral?.metadata?.timeSensitivity, "today");
}
{
  const c = core("quiero reservar un viaje");
  check("T011 intent unchanged", c.intent, "BOOKING");
  ok("T011 urgencyScore < 0.5", (c.lateral?.metadata?.urgencyScore as number) < 0.5);
  check("T011 timeSensitivity flexible", c.lateral?.metadata?.timeSensitivity, "flexible");
}
{
  const c = core("estoy en el centro quiero ir al aeropuerto");
  check("T012 intent unchanged", c.intent, "BOOKING");
  ok("T012 has origin fact", c.facts.some(f => f.startsWith("origin:")));
  ok("T012 urgencyScore 0.5 (has route)", (c.lateral?.metadata?.urgencyScore as number) === 0.5);
  check("T012 timeSensitivity flexible", c.lateral?.metadata?.timeSensitivity, "flexible");
}
{
  const c = core("confirmar viaje para el lunes");
  check("T013 intent BOOKING (action:confirmar + date:lunes)", c.intent, "BOOKING");
  // BOOKING tiene lateral
  ok("T013 has lateral", !!c.lateral);
  ok("T013 lateral nextAction start_booking_flow", c.lateral?.nextAction === "start_booking_flow");
}

// ── NOW_LATERAL ──
console.log("\n=== NOW ===");
{
  const c = core("estoy en el centro necesito ir al aeropuerto ahora urgente");
  check("T020 intent unchanged", c.intent, "NOW");
  check("T020 dispatchPriority max", c.lateral?.metadata?.dispatchPriority, "max");
  check("T020 contextFlags", c.lateral?.contextFlags, ["dispatch_priority_max"]);
}
{
  const c = core("necesito ahora urgente");
  check("T021 intent unchanged", c.intent, "NOW");
  // Sin slots locked → false urgency flag → priority = high
  check("T021 dispatchPriority high (false urgency)", c.lateral?.metadata?.dispatchPriority, "high");
}
{
  const c = core("urgente");
  check("T022 intent unchanged", c.intent, "NOW");
  // "urgente" produce now:urgente (NOW_RE) y urgency:urgente (URGENCY_RE)
  // Sin slots locked → false urgency → high
  check("T022 dispatchPriority high (now fact present)", c.lateral?.metadata?.dispatchPriority, "high");
}
{
  const c = core("necesito ya");
  check("T023 intent unchanged", c.intent, "NOW");
  check("T023 dispatchPriority high", c.lateral?.metadata?.dispatchPriority, "high");
}

// ── POST_SERVICE_LATERAL ──
console.log("\n=== POST_SERVICE ===");
{
  const c = core("gracias por el viaje");
  check("T030 intent unchanged", c.intent, "POST_SERVICE");
  check("T030 sentimentRisk satisfied", c.lateral?.metadata?.sentimentRisk, "satisfied");
  check("T030 riskLevel low", c.lateral?.riskLevel, "low");
}
{
  const c = core("queja");
  check("T031 intent unchanged", c.intent, "POST_SERVICE");
  check("T031 sentimentRisk complaint", c.lateral?.metadata?.sentimentRisk, "complaint");
  check("T031 riskLevel high", c.lateral?.riskLevel, "high");
  check("T031 contextFlags", c.lateral?.contextFlags, ["sentiment_complaint"]);
}
{
  const c = core("excelente servicio");
  check("T032 intent unchanged", c.intent, "POST_SERVICE");
  check("T032 sentimentRisk satisfied", c.lateral?.metadata?.sentimentRisk, "satisfied");
  check("T032 riskLevel low", c.lateral?.riskLevel, "low");
}

// ── EMERGENCY_LATERAL ──
console.log("\n=== EMERGENCY ===");
{
  const c = core("emergencia");
  check("T040 intent unchanged", c.intent, "EMERGENCY");
  check("T040 escalationLevel MAX", c.lateral?.metadata?.escalationLevel, "MAX");
  check("T040 riskLevel high", c.lateral?.riskLevel, "high");
  check("T040 contextFlags", c.lateral?.contextFlags, ["escalation_urgent"]);
  check("T040 nextAction", c.lateral?.nextAction, "escalate_immediately");
}
{
  const c = core("ayuda no encuentro al chofer");
  check("T041 intent unchanged", c.intent, "EMERGENCY");
  check("T041 escalationLevel MAX", c.lateral?.metadata?.escalationLevel, "MAX");
  check("T041 riskLevel high", c.lateral?.riskLevel, "high");
}

// ── REGRESSION: backward compat ──
console.log("\n=== REGRESSION ===");
{
  const c = core("hola");
  check("T050 intent unchanged from FASE 6.1", c.intent, "GREETING");
  check("T050 confidence unchanged", c.confidence > 0, true);
}
{
  const c = core("cuánto sale un viaje");
  check("T051 intent unchanged", c.intent, "COMMERCIAL");
  // COMMERCIAL no tiene lateral → undefined or empty
  ok("T051 lateral is safe (empty or undefined)", !c.lateral || c.lateral.contextFlags.length === 0);
}
{
  const c = core("qué horarios tienen");
  check("T052 intent unchanged", c.intent, "INFORMATIONAL");
  ok("T052 lateral is safe", !c.lateral || c.lateral.contextFlags.length === 0);
}
{
  const c = core("estoy viendo un viaje");
  check("T053 intent unchanged", c.intent, "PRE_BOOKING");
  ok("T053 lateral is safe", !c.lateral || c.lateral.contextFlags.length === 0);
}

// ── STRESS: NOW ≠ BOOKING flags ──
console.log("\n=== STRESS ===");
// "para ya" → NOW (urgency sin now fact) → dispatch normal
// "quiero reservar un viaje para mañana" → BOOKING con date → urgency_implicit
{
  const now = core("para ya");
  const booking = core("quiero reservar un viaje para mañana");
  check("T060 NOW intent", now.intent, "NOW");
  check("T060 BOOKING intent", booking.intent, "BOOKING");
  check("T060 NOW dispatchPriority normal (urgency only)", now.lateral?.metadata?.dispatchPriority, "normal");
  check("T060 BOOKING timeSensitivity today", booking.lateral?.metadata?.timeSensitivity, "today");
  check("T060 NOW flags contain dispatch", (now.lateral?.contextFlags ?? []).join(",").includes("dispatch"), true);
  check("T060 BOOKING flags contain urgency", (booking.lateral?.contextFlags ?? []).join(",").includes("urgency"), true);
}
{
  const ps = core("gracias por el viaje");
  const inf = core("horarios");
  check("T061 POST_SERVICE intent", ps.intent, "POST_SERVICE");
  check("T061 INFORMATIONAL intent", inf.intent, "INFORMATIONAL");
  check("T061 PS has sentiment flag", (ps.lateral?.contextFlags ?? []).join(",").includes("sentiment"), true);
  ok("T061 INFORMATIONAL no lateral", !inf.lateral || inf.lateral.contextFlags.length === 0);
}
{
  const withSlots = core("estoy en el centro necesito ir al aeropuerto ahora urgente");
  const withoutSlots = core("necesito ahora urgente");
  check("T062 withSlots dispatchPriority max", withSlots.lateral?.metadata?.dispatchPriority, "max");
  check("T062 withoutSlots dispatchPriority high", withoutSlots.lateral?.metadata?.dispatchPriority, "high");
}
{
  const c = core("hola");
  check("T063 lateral NEVER changes intent", c.intent, "GREETING");
  const assignedBefore = "GREETING";
  const assignedAfter = c.intent;
  check("T063 intent identity preserved", assignedBefore === assignedAfter, true);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
