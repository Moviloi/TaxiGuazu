// FASE 5B.4: test spec para el contexto de CORE que se inyecta al LLM.
//
// Verifica que `getExtractionContextMessage` genera el system message
// correcto basado en role lock, slot stability y prev slots de CORE.
//
// Este test NO requiere llamada al LLM (no mock): valida la composición
// del mensaje de约束 (constraint) que el LLM recibe.
//
// Cadena de prioridad que el LLM debe respetar:
//   1. role lock de CORE (NO contradecir roles)
//   2. prev slots (NO re-extraer valores ya persistidos)
//   3. focus en info NUEVA del mensaje actual

import { getExtractionContextMessage } from "@/lib/ai/extraction-prompt";

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
function contains(label: string, actual: string, expected: string) {
  if (actual.includes(expected)) {
    pass++;
    console.log(`  ✓ ${label}`);
  } else {
    fail++;
    console.log(`  ✗ ${label}`);
    console.log(`    expected to contain: ${JSON.stringify(expected)}`);
    console.log(`    actual: ${JSON.stringify(actual)}`);
  }
}

console.log("=== T1: no context → empty message ===");
const t1 = getExtractionContextMessage(undefined);
check("T1 returns empty string", t1, "");

console.log("=== T2: empty context object → empty message ===");
const t2 = getExtractionContextMessage({});
check("T2 returns empty string", t2, "");

console.log("=== T3: role lock origin only ===");
const t3 = getExtractionContextMessage({
  roleLock: { origin: "aeropuerto", destination: null },
});
contains("T3 has CORE_ROLE_LOCK header", t3, "CONTEXTO_CORE");
contains("T3 has role lock origin constraint", t3, 'ROLE_LOCK_ORIGIN: "aeropuerto"');
contains("T3 says no contradecir", t3, "NO contradecir");
contains("T3 mentions CORE detectó estoy en/desde", t3, "estoy en");

console.log("=== T4: role lock destination only ===");
const t4 = getExtractionContextMessage({
  roleLock: { origin: null, destination: "centro" },
});
contains("T4 has role lock destination constraint", t4, 'ROLE_LOCK_DESTINATION: "centro"');
contains("T4 says no contradecir", t4, "NO contradecir");
contains("T4 mentions voy a/ir a", t4, "voy a");

console.log("=== T5: both origin and destination locked ===");
const t5 = getExtractionContextMessage({
  roleLock: { origin: "aeropuerto", destination: "centro" },
  slotStability: { origin: "ambiguous", destination: "ambiguous" },
});
contains("T5 has role lock origin", t5, 'ROLE_LOCK_ORIGIN: "aeropuerto"');
contains("T5 has role lock destination", t5, 'ROLE_LOCK_DESTINATION: "centro"');
contains("T5 has origin stability", t5, "ORIGIN_STABILITY: ambiguous");
contains("T5 has destination stability", t5, "DESTINATION_STABILITY: ambiguous");

console.log("=== T6: prev slots only (no role lock) ===");
const t6 = getExtractionContextMessage({
  prevSlots: { origin: "aeropuerto", destination: "centro", scheduled_at: "15:00" },
});
contains("T6 has PREV_SLOTS_PERSISTIDOS", t6, "PREV_SLOTS_PERSISTIDOS");
contains("T6 has origin", t6, 'origin="aeropuerto"');
contains("T6 has destination", t6, 'destination="centro"');
contains("T6 has scheduled_at", t6, 'scheduled_at="15:00"');
contains("T6 says NO re-extraer", t6, "NO re-extraer");
contains("T6 says agregar info NUEVA", t6, "info NUEVA");

console.log("=== T7: full context (role lock + stability + prev slots) ===");
const t7 = getExtractionContextMessage({
  roleLock: { origin: "hotel", destination: null },
  slotStability: { origin: "locked", destination: "open" },
  prevSlots: { destination: "centro", scheduled_at: "15:00", passengers: 3 },
});
contains("T7 has role lock origin", t7, 'ROLE_LOCK_ORIGIN: "hotel"');
contains("T7 has origin stability locked", t7, "ORIGIN_STABILITY: locked");
check("T7 filters destination_stability when open (no line emitted)", t7.includes("DESTINATION_STABILITY: open"), false);
contains("T7 has prev slots", t7, 'destination="centro"');
contains("T7 has passengers prev", t7, 'passengers="3"');

console.log("=== T8: prev slots with empty values filtered ===");
const t8 = getExtractionContextMessage({
  prevSlots: { origin: "aeropuerto", destination: "", passengers: null as any },
});
contains("T8 has origin", t8, 'origin="aeropuerto"');
check("T8 does NOT include empty destination", t8.includes('destination=""'), false);
check("T8 does NOT include null passengers", t8.includes('passengers="null"'), false);

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
