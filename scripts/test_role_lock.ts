import { core } from "@/lib/ai/core";

console.log("=== TEST: 'estoy en el aeropuerto quiero ir al centro' ===");
const c1 = core("estoy en el aeropuerto quiero ir al centro");
console.log("intent:", c1.intent);
console.log("facts:", c1.facts);
console.log("slotStability:", c1.slotStability);
console.log("roleLock:", c1.roleLock);

console.log("\n=== TEST: 'voy al amerian desde el aeropuerto' ===");
const c2 = core("voy al amerian desde el aeropuerto");
console.log("intent:", c2.intent);
console.log("slotStability:", c2.slotStability);
console.log("roleLock:", c2.roleLock);

console.log("\n=== TEST: 'voy al aeropuerto desde el centro' ===");
const c3 = core("voy al aeropuerto desde el centro");
console.log("intent:", c3.intent);
console.log("slotStability:", c3.slotStability);
console.log("roleLock:", c3.roleLock);

console.log("\n=== TEST: 'hola' ===");
const c4 = core("hola");
console.log("slotStability:", c4.slotStability);
console.log("roleLock:", c4.roleLock);

console.log("\n=== TEST: 'aeropuerto' (single word) ===");
const c5 = core("aeropuerto");
console.log("slotStability:", c5.slotStability);
console.log("roleLock:", c5.roleLock);
