import { handleMessage } from "@/lib/ai/handler";
import { core } from "@/lib/ai/core";
import type { ExtractionContext } from "@/lib/ai/types";

function makeExtraction(overrides: Partial<ExtractionContext>): ExtractionContext {
  return {
    slots: {},
    overallConfidence: 0.5,
    workflowState: "collecting_slots",
    clarifyField: null,
    askForConfirmation: false,
    ...overrides,
  };
}

console.log("=== TEST 1: 'estoy en el aeropuerto quiero ir al centro' ===");
const c1 = core("estoy en el aeropuerto quiero ir al centro");
console.log("intent:", c1.intent);
console.log("roleLock:", c1.roleLock);
console.log("slotStability:", c1.slotStability);
console.log("");

// Simular LLM extraction con role lock aplicado
const ex1 = makeExtraction({
  slots: {
    origin: { value: "aeropuerto", score: 1.0, reason: "core_role_lock" },
    destination: { value: "centro", score: 1.0, reason: "core_role_lock" },
  },
  roleLock: c1.roleLock,
  slotStability: c1.slotStability,
  workflowState: "collecting_slots",
  clarifyField: null,
});
const r1 = handleMessage("estoy en el aeropuerto quiero ir al centro", "RESERVA", { extraction: ex1 });
console.log("OUTPUT:", r1.policy.finalResponse);
console.log("expected: 'Perfecto. Tengo origen en el aeropuerto y destino hacia el centro. ¿A qué hora necesitás el traslado y a qué dirección del centro vas?'");
console.log("");

console.log("=== TEST 2: 'voy al amerian desde el aeropuerto' (previous test, regression) ===");
const c2 = core("voy al amerian desde el aeropuerto");
console.log("intent:", c2.intent);
console.log("roleLock:", c2.roleLock);
console.log("slotStability:", c2.slotStability);
console.log("");

const ex2 = makeExtraction({
  slots: {
    origin: { value: "aeropuerto", score: 1.0, reason: "core_role_lock" },
    destination: { value: "amerian", score: 1.0, reason: "core_role_lock" },
  },
  roleLock: c2.roleLock,
  slotStability: c2.slotStability,
});
const r2 = handleMessage("voy al amerian desde el aeropuerto", "RESERVA", { extraction: ex2 });
console.log("OUTPUT:", r2.policy.finalResponse);
console.log("");

console.log("=== TEST 3: regression 'hola' ===");
const r3 = handleMessage("hola", "RESERVA");
console.log("OUTPUT:", r3.policy.finalResponse);
