// FASE 5B.3: test spec para multi-turn persistence.
//
// Simula varios turnos: el user menciona origin/destination en T1, luego
// agrega time/passengers en T2/T3. El merge debe mantener los prev slots
// y solo agregar los nuevos.
//
// Cadena de prioridad: role lock > LLM > prev slots.
// Este test verifica los SLOTS mergeados (el verdadero producto de 5B.3)
// más que el output del handler (que depende del workflow state).

import { core } from "@/lib/ai/core";
import type { ConfirmedSlot } from "@/lib/ai/types";

function simulateMerge(
  prevSlots: Record<string, string | number>,
  llmSlots: Record<string, ConfirmedSlot>,
  roleLock: { origin: string | null; destination: string | null },
): Record<string, ConfirmedSlot> {
  const slots: Record<string, ConfirmedSlot> = {};
  for (const [k, v] of Object.entries(prevSlots)) {
    if (v != null && String(v).trim() !== "") {
      slots[k] = { value: v, score: 0.8, reason: "previous_turn" };
    }
  }
  for (const [k, v] of Object.entries(llmSlots)) {
    if (v && v.value != null && String(v.value).trim() !== "") {
      slots[k] = v;
    }
  }
  if (roleLock.origin) {
    slots.origin = { value: roleLock.origin, score: 1.0, reason: "core_role_lock" };
  }
  if (roleLock.destination) {
    slots.destination = { value: roleLock.destination, score: 1.0, reason: "core_role_lock" };
  }
  return slots;
}

function persist(merged: Record<string, ConfirmedSlot>): Record<string, string | number> {
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(merged)) {
    if (v && v.value != null && String(v.value).trim() !== "") {
      out[k] = typeof v.value === "number" ? v.value : String(v.value);
    }
  }
  return out;
}

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

console.log("=== T1: 'estoy en el aeropuerto quiero ir al centro' (no prev) ===");
const t1Core = core("estoy en el aeropuerto quiero ir al centro");
const t1Llm: Record<string, ConfirmedSlot> = {
  origin: { value: "aeropuerto", score: 0.9, reason: "llm_extraction" },
  destination: { value: "centro", score: 0.9, reason: "llm_extraction" },
};
const t1Merged = simulateMerge({}, t1Llm, t1Core.roleLock);
check("T1 origin value", t1Merged.origin?.value, "aeropuerto");
check("T1 destination value", t1Merged.destination?.value, "centro");
check("T1 origin reason (role lock)", t1Merged.origin?.reason, "core_role_lock");
check("T1 destination reason (role lock)", t1Merged.destination?.reason, "core_role_lock");
const t1Persisted = persist(t1Merged);
console.log("");

console.log("=== T2: 'a las 15hs' (prev tiene origin/destination) ===");
const t2Core = core("a las 15hs");
const t2Llm: Record<string, ConfirmedSlot> = {
  scheduled_at: { value: "15:00", score: 0.9, reason: "llm_extraction" },
};
const t2Merged = simulateMerge(t1Persisted, t2Llm, t2Core.roleLock);
check("T2 origin preservado de prev", t2Merged.origin?.value, "aeropuerto");
check("T2 destination preservado de prev", t2Merged.destination?.value, "centro");
check("T2 origin reason (prev, no role lock)", t2Merged.origin?.reason, "previous_turn");
check("T2 destination reason (prev, no role lock)", t2Merged.destination?.reason, "previous_turn");
check("T2 scheduled_at agregado por LLM", t2Merged.scheduled_at?.value, "15:00");
check("T2 scheduled_at reason", t2Merged.scheduled_at?.reason, "llm_extraction");
const t2Persisted = persist(t2Merged);
console.log("");

console.log("=== T3: 'para 3 personas' (prev tiene origin/destination/scheduled_at) ===");
const t3Core = core("para 3 personas");
const t3Llm: Record<string, ConfirmedSlot> = {
  passengers: { value: 3, score: 0.9, reason: "llm_extraction" },
};
const t3Merged = simulateMerge(t2Persisted, t3Llm, t3Core.roleLock);
check("T3 origin preservado de prev", t3Merged.origin?.value, "aeropuerto");
check("T3 destination preservado de prev", t3Merged.destination?.value, "centro");
check("T3 scheduled_at preservado de prev", t3Merged.scheduled_at?.value, "15:00");
check("T3 passengers agregado por LLM", t3Merged.passengers?.value, 3);
const t3Persisted = persist(t3Merged);
console.log("");

console.log("=== T4: 'desde el hotel' (cambia origin via role lock) ===");
const t4Core = core("desde el hotel");
const t4Merged = simulateMerge(t3Persisted, {}, t4Core.roleLock);
check("T4 origin sobrescrito por role lock", t4Merged.origin?.value, "hotel");
check("T4 origin reason (core_role_lock)", t4Merged.origin?.reason, "core_role_lock");
check("T4 destination preservado de prev", t4Merged.destination?.value, "centro");
check("T4 scheduled_at preservado de prev", t4Merged.scheduled_at?.value, "15:00");
check("T4 passengers preservado de prev", Number(t4Merged.passengers?.value), 3);
console.log("");

console.log("=== T5: 'a las 18hs' (cambia scheduled_at, role lock no detecta) ===");
const t5Core = core("a las 18hs");
const t5Llm: Record<string, ConfirmedSlot> = {
  scheduled_at: { value: "18:00", score: 0.9, reason: "llm_extraction" },
};
const t5Merged = simulateMerge(t3Persisted, t5Llm, t5Core.roleLock);
check("T5 scheduled_at sobrescrito por LLM", t5Merged.scheduled_at?.value, "18:00");
check("T5 scheduled_at reason", t5Merged.scheduled_at?.reason, "llm_extraction");
check("T5 origin preservado de prev", t5Merged.origin?.value, "aeropuerto");
console.log("");

console.log("=== T6: 'desde el centro voy al aeropuerto' (change origin+dest) ===");
const t6Core = core("desde el centro voy al aeropuerto");
const t6Merged = simulateMerge(t3Persisted, {}, t6Core.roleLock);
check("T6 origin sobrescrito por role lock", t6Merged.origin?.value, "centro");
check("T6 destination sobrescrito por role lock", t6Merged.destination?.value, "aeropuerto");
check("T6 origin reason (core_role_lock)", t6Merged.origin?.reason, "core_role_lock");
check("T6 destination reason (core_role_lock)", t6Merged.destination?.reason, "core_role_lock");
check("T6 scheduled_at preservado de prev", t6Merged.scheduled_at?.value, "15:00");
console.log("");

console.log(`\n${pass} pass, ${fail} fail`);
process.exit(fail > 0 ? 1 : 0);
