// FASE 6.1: Intent Expansion Test Suite
//
// Unit tests: core.ts classifyIntent + computeConfidence
// Integration tests: router.ts mapIntentToOutput
// Regression: backward compat with 4 legacy intents
//
// Cada test verifica 3 cosas:
//   T_NNN_intent: el intent correcto
//   T_NNN_confidence: confidence > 0 para intents accionables
//   T_NNN_router: el OutputType correcto

import { core } from "@/lib/ai/core";
import { router } from "@/lib/ai/router";

let pass = 0;
let fail = 0;

function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (ok) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`    expected: ${JSON.stringify(expected)}`);
    console.log(`    actual:   ${JSON.stringify(actual)}`);
  }
}

function checkConfidence(label: string, actual: number, min: number) {
  const ok = actual >= min;
  if (ok) {
    pass++;
    console.log(`  ✓ ${label} = ${actual.toFixed(2)}`);
  } else {
    fail++;
    console.log(`  ✗ ${label} = ${actual.toFixed(2)} (expected >= ${min})`);
  }
}

// ── UNIT TESTS: GREETING ──
console.log("\n=== GREETING ===");
{
  const c = core("hola");
  check("T001 intent hola", c.intent, "GREETING");
  checkConfidence("T001 confidence", c.confidence, 0.2);
}
{
  const c = core("buenas tardes");
  check("T002 intent buenas tardes", c.intent, "GREETING");
}
{
  const c = core("cómo estás");
  check("T003 intent cómo estás", c.intent, "GREETING");
  checkConfidence("T003 confidence", c.confidence, 0.2);
}

// ── UNIT TESTS: INFORMATIONAL ──
console.log("\n=== INFORMATIONAL ===");
{
  const c = core("qué horarios tienen");
  check("T010 intent horarios", c.intent, "INFORMATIONAL");
  checkConfidence("T010 confidence", c.confidence, 0.5);
}
{
  const c = core("cómo funciona el servicio");
  check("T011 intent cómo funciona", c.intent, "INFORMATIONAL");
}
{
  const c = core("dónde están");
  check("T012 intent dónde están", c.intent, "INFORMATIONAL");
}

// ── UNIT TESTS: COMMERCIAL ──
console.log("\n=== COMMERCIAL ===");
{
  const c = core("cuánto sale un viaje al aeropuerto");
  check("T020 intent cuánto sale", c.intent, "COMMERCIAL");
  checkConfidence("T020 confidence", c.confidence, 0.5);
}
{
  const c = core("precio al centro");
  check("T021 intent precio", c.intent, "COMMERCIAL");
  checkConfidence("T021 confidence", c.confidence, 0.6);
}
{
  const c = core("me das una tarifa");
  check("T022 intent tarifa", c.intent, "COMMERCIAL");
}

// ── UNIT TESTS: PRE_BOOKING ──
console.log("\n=== PRE_BOOKING ===");
{
  const c = core("estoy viendo un viaje");
  check("T030 intent estoy viendo", c.intent, "PRE_BOOKING");
  checkConfidence("T030 confidence", c.confidence, 0.6);
}
{
  const c = core("quiero información de un viaje");
  check("T031 intent info viaje", c.intent, "PRE_BOOKING");
}

// ── UNIT TESTS: BOOKING ──
console.log("\n=== BOOKING ===");
{
  const c = core("quiero reservar un viaje al aeropuerto");
  check("T040 intent reservar", c.intent, "BOOKING");
  checkConfidence("T040 confidence", c.confidence, 0.7);
}
{
  const c = core("confirmar viaje");
  check("T041 intent confirmar", c.intent, "BOOKING");
}
{
  const c = core("necesito un traslado");
  check("T042 intent necesito", c.intent, "BOOKING");
}
{
  const c = core("3 personas");
  check("T043 intent 3 personas", c.intent, "BOOKING");
  checkConfidence("T043 confidence", c.confidence, 0.5);
}
{
  const c = core("vuelo AA1234");
  check("T044 intent vuelo", c.intent, "BOOKING");
}

// ── UNIT TESTS: NOW ──
console.log("\n=== NOW ===");
{
  const c = core("necesito un viaje ahora urgente");
  check("T050 intent ahora", c.intent, "NOW");
  checkConfidence("T050 confidence", c.confidence, 0.7);
}
{
  const c = core("urgente para ya");
  check("T051 intent urgente", c.intent, "NOW");
}

// ── UNIT TESTS: LATERALS ──
console.log("\n=== LATERALS ===");
{
  const c = core("quiero cambiar mi reserva");
  check("T060 intent cambiar reserva", c.intent, "RESCHEDULE");
  checkConfidence("T060 confidence", c.confidence, 0.6);
  check("T060 facts have action", c.facts.some(f => f.startsWith("action:")), true);
  check("T060 facts have reschedule", c.facts.some(f => f.startsWith("reschedule:")), true);
}
{
  const c = core("modificar la fecha del viaje");
  check("T061 intent modificar fecha", c.intent, "RESCHEDULE");
}
{
  const c = core("gracias por el viaje");
  check("T062 intent gracias viaje", c.intent, "POST_SERVICE");
  checkConfidence("T062 confidence", c.confidence, 0.4);
}
{
  const c = core("excelente servicio");
  check("T063 intent excelente", c.intent, "POST_SERVICE");
}
{
  const c = core("ayuda no encuentro al chofer");
  check("T064 intent ayuda chofer", c.intent, "EMERGENCY");
  checkConfidence("T064 confidence", c.confidence, 0.8);
}
{
  const c = core("emergencia");
  check("T065 intent emergencia", c.intent, "EMERGENCY");
}

// ── UNIT TESTS: AMBIGUOUS ──
console.log("\n=== AMBIGUOUS ===");
{
  const c = core("xyz123");
  check("T070 intent xyz (FLIGHT_RE match)", c.intent, "BOOKING");
  checkConfidence("T070 confidence", c.confidence, 0.7);
}
{
  const c = core("");
  check("T071 intent empty", c.intent, "AMBIGUOUS");
  check("T071 confidence = 0", c.confidence, 0);
}

// ── UNIT TESTS: REGRESSION (backward compat) ──
console.log("\n=== REGRESSION ===");
{
  const c = core("estoy en el aeropuerto quiero ir al centro");
  check("T080 intent estoy en ... quiero ir", c.intent, "BOOKING");
  check("T080 origin", c.roleLock.origin, "aeropuerto");
  check("T080 destination", c.roleLock.destination, "centro");
  check("T080 slotStability origin (aeropuerto es ambiguous)", c.slotStability.origin, "ambiguous");
  check("T080 slotStability destination", c.slotStability.destination, "ambiguous");
}
{
  const c = core("voy al amerian desde el aeropuerto");
  check("T081 intent voy al", c.intent, "BOOKING");
  check("T081 origin", c.roleLock.origin, "aeropuerto");
  check("T081 destination", c.roleLock.destination, "amerian");
}
{
  const c = core("sí confirmo");
  check("T082 intent sí confirmo", c.intent, "PRE_BOOKING");
  checkConfidence("T082 confidence", c.confidence, 0.6);
  check("T082 facts have affirmation", c.facts.includes("affirmation:true"), true);
}
{
  const c = core("a las 15hs");
  check("T083 intent a las 15hs", c.intent, "PRE_BOOKING");
  checkConfidence("T083 confidence", c.confidence, 0.6);
}
// ── UNIT TESTS: CONSULTA ──
console.log("\n=== CONSULTA ===");
{
  const c = core("quiero consultar");
  check("T090 intent consultar", c.intent, "CONSULTA");
  checkConfidence("T090 confidence", c.confidence, 0.4);
}
{
  const c = core("aeropuerto");
  check("T091 intent aeropuerto alone", c.intent, "CONSULTA");
}

// ── INTEGRATION TESTS: router (FASE A1) ──
console.log("\n=== ROUTER ===");
{
  const c = core("hola");
  const r = router(c, "RESERVA");
  check("T100 GREETING → CLARIFY", r.decision, "CLARIFY");
}
{
  const c = core("qué horarios tienen");
  const r = router(c, "RESERVA");
  check("T101 INFORMATIONAL → ANSWER", r.decision, "ANSWER");
}
{
  const c = core("cuánto sale un viaje");
  const r = router(c, "RESERVA");
  check("T102 COMMERCIAL → ANSWER", r.decision, "ANSWER");
}
{
  const c = core("estoy viendo un viaje");
  const r = router(c, "RESERVA");
  check("T103 PRE_BOOKING → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("estoy viendo un viaje");
  const r = router(c, "AHORA");
  check("T104 PRE_BOOKING AHORA → EXECUTE", r.decision, "EXECUTE");
  check("T104 mode AHORA", r.mode, "AHORA");
}
{
  const c = core("quiero reservar un viaje");
  const r = router(c, "RESERVA");
  check("T105 BOOKING → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("necesito un viaje ahora urgente");
  const r = router(c, "RESERVA");
  check("T106 NOW → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("quiero cambiar mi reserva");
  const r = router(c, "RESERVA");
  check("T107 RESCHEDULE → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("gracias por el viaje");
  const r = router(c, "RESERVA");
  check("T108 POST_SERVICE → ANSWER", r.decision, "ANSWER");
}
{
  const c = core("ayuda no encuentro al chofer");
  const r = router(c, "RESERVA");
  check("T109 EMERGENCY → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("xyz123");
  const r = router(c, "RESERVA");
  check("T110 FLIGHT → BOOKING → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("estoy en el aeropuerto quiero ir al centro");
  const r = router(c, "RESERVA");
  check("T111 BOOKING con ruta → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("sí confirmo");
  const r = router(c, "RESERVA");
  check("T112 PRE_BOOKING → EXECUTE", r.decision, "EXECUTE");
}
{
  const c = core("consultar");
  const r = router(c, "RESERVA");
  check("T113 CONSULTA → CLARIFY", r.decision, "CLARIFY");
}

// ── FASE A3 Capa 2: contexto de intención previa ──
console.log("\n=== CONTEXT INHERITANCE ===");
{
  const c = core("sí", "BOOKING");
  check("T120 BOOKING + sí → BOOKING", c.intent, "BOOKING");
}
{
  const c = core("mañana", "CONSULTA");
  check("T121 CONSULTA + mañana → CONSULTA", c.intent, "CONSULTA");
}
{
  const c = core("solo quiero saber precio", "BOOKING");
  check("T122 BOOKING + solo precio → CONSULTA", c.intent, "CONSULTA");
}
{
  const c = core("sí");
  check("T123 sí sin contexto → PRE_BOOKING", c.intent, "PRE_BOOKING");
}
{
  const c = core("sí", "AMBIGUOUS");
  check("T124 sí + AMBIGUOUS prev → PRE_BOOKING (no hereda)", c.intent, "PRE_BOOKING");
}

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
