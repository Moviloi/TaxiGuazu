// FASE 6.4: Router Simplification Test Suite
//
// Tests:
//   EMERGENCY siempre → emergency handler (2)
//   NOW PROCEED_NOW → dispatch correcto (2)
//   NOW ASK_CLARIFICATION → fallback correcto (2)
//   BOOKING PROCEED_BOOKING → booking pipeline (2)
//   POST_SERVICE siempre → post service handler (2)
//   SMALLTALK siempre → conversational flow (2)
//   IGNORE retorna null (2)
//   REGRESSION: router no usa intent ni facts (4)
// Total: 18 tests
//
// route() recibe PolicyDecision, retorna RouteResult | null.
// router() legacy mantiene backward compat.

import { core } from "@/lib/ai/core";
import { applyPolicy } from "@/lib/ai/policy";
import { route, router } from "@/lib/ai/router";
import type { RouteResult } from "@/lib/ai/router";

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

// ── EMERGENCY ──
console.log("\n=== EMERGENCY ===");
{
  const d = core("emergencia");
  const p = applyPolicy(d);
  const r = route(p);
  check("T001 EMERGENCY handler", (r as RouteResult).handler, "emergency");
  check("T001 action", (r as RouteResult).action, "ESCALATE_EMERGENCY");
}
{
  // POST_SERVICE with complaint → riskLevel high → EMERGENCY override
  const d = core("queja");
  const p = applyPolicy(d);
  const r = route(p);
  check("T002 complaint → EMERGENCY override", (r as RouteResult).handler, "emergency");
  check("T002 action", (r as RouteResult).action, "ESCALATE_EMERGENCY");
}

// ── NOW PROCEED_NOW ──
console.log("\n=== NOW PROCEED_NOW ===");
{
  const d = core("estoy en el centro necesito ir al aeropuerto ahora urgente");
  const p = applyPolicy(d);
  const r = route(p);
  check("T010 NOW max dispatch", (r as RouteResult).handler, "nowDispatch");
  check("T010 action", (r as RouteResult).action, "PROCEED_NOW");
  check("T010 reasonCodes", p.reasonCodes, ["NOW_RULE_MATCH"]);
}
{
  // NOW con dispatch_priority_max: route locked + now fact present
  const d = core("voy al centro desde el aeropuerto ahora mismo");
  const p = applyPolicy(d);
  const r = route(p);
  // "ahora" matches NOW_RE, "desde el aeropuerto" sets origin, "voy al centro" sets destination
  check("T011 NOW max dispatch v2", (r as RouteResult).handler, "nowDispatch");
  check("T011 action", (r as RouteResult).action, "PROCEED_NOW");
}

// ── NOW ASK_CLARIFICATION ──
console.log("\n=== NOW ASK_CLARIFICATION ===");
{
  const d = core("necesito ahora urgente");
  const p = applyPolicy(d);
  const r = route(p);
  check("T020 NOW sin slots", (r as RouteResult).handler, "clarification");
  check("T020 action", (r as RouteResult).action, "ASK_CLARIFICATION");
}
{
  const d = core("para ya");
  const p = applyPolicy(d);
  const r = route(p);
  check("T021 NOW urgency only", (r as RouteResult).handler, "clarification");
  check("T021 action", (r as RouteResult).action, "ASK_CLARIFICATION");
}

// ── BOOKING PROCEED_BOOKING ──
console.log("\n=== BOOKING PROCEED_BOOKING ===");
{
  const d = core("quiero reservar un viaje para mañana");
  const p = applyPolicy(d);
  const r = route(p);
  check("T030 BOOKING con date", (r as RouteResult).handler, "booking");
  check("T030 action", (r as RouteResult).action, "PROCEED_BOOKING");
}
{
  const d = core("estoy en el centro quiero ir al aeropuerto");
  const p = applyPolicy(d);
  const r = route(p);
  check("T031 BOOKING con ruta", (r as RouteResult).handler, "booking");
  check("T031 action", (r as RouteResult).action, "PROCEED_BOOKING");
}

// ── POST_SERVICE ──
console.log("\n=== POST_SERVICE ===");
{
  const d = core("gracias por el viaje");
  const p = applyPolicy(d);
  const r = route(p);
  check("T040 POST_SERVICE satisfied", (r as RouteResult).handler, "postService");
  check("T040 action", (r as RouteResult).action, "POST_SERVICE_HANDLE");
}
{
  const d = core("excelente servicio");
  const p = applyPolicy(d);
  const r = route(p);
  check("T041 POST_SERVICE praise", (r as RouteResult).handler, "postService");
  check("T041 action", (r as RouteResult).action, "POST_SERVICE_HANDLE");
}

// ── SMALLTALK ──
console.log("\n=== SMALLTALK ===");
{
  const d = core("hola");
  const p = applyPolicy(d);
  const r = route(p);
  check("T050 SMALLTALK hola", (r as RouteResult).handler, "smalltalk");
  check("T050 action", (r as RouteResult).action, "SMALLTALK");
}
{
  const d = core("cómo estás");
  const p = applyPolicy(d);
  const r = route(p);
  check("T051 SMALLTALK cómo estás", (r as RouteResult).handler, "smalltalk");
  check("T051 action", (r as RouteResult).action, "SMALLTALK");
}

// ── IGNORE ──
console.log("\n=== IGNORE ===");
{
  const r = route({ action: "IGNORE", confidence: 0, reasonCodes: [], metadata: {} });
  check("T060 IGNORE retorna null", r, null);
}
{
  // Verify that IGNORE never dispatches to operational handlers
  const r = route({ action: "IGNORE", confidence: 0, reasonCodes: [], metadata: {} });
  ok("T060 IGNORE no handler", r === null);
}

// ── REGRESSION: router legacy backward compat ──
console.log("\n=== REGRESSION ===");
{
  const r = router("hola", "RESERVA");
  check("T070 router() still works (greeting)", r.mode, "RESERVA");
  ok("T070 has core", !!r.core);
  ok("T070 has decision", !!r.decision);
  ok("T070 has reason", !!r.reason);
  check("T070 reason does NOT contain intent", r.reason.includes("intent="), false);
  check("T070 reason uses action", r.reason.startsWith("action="), true);
}
{
  const r = router("emergencia", "RESERVA");
  check("T071 router emergency", r.decision, "EXECUTE");
  check("T071 reason", r.reason.includes("ESCALATE_EMERGENCY"), true);
}
{
  const r = router("quiero reservar un viaje para mañana", "RESERVA");
  check("T072 router booking", r.decision, "EXECUTE");
  check("T072 reason", r.reason.includes("PROCEED_BOOKING"), true);
}
{
  const r = router("gracias por el viaje", "RESERVA");
  check("T073 router post service", r.decision, "ANSWER");
  check("T073 reason", r.reason.includes("POST_SERVICE_HANDLE"), true);
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
