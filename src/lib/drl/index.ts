// DRL — Deterministic Reasoning Layer: punto de entrada público.
// PR-5A: Foundation.
// PR-5C: Suficiencia rules implementadas.

export { DRLEngine, getDRLEngine } from "./drl-engine";
export * from "./types";

// Reglas
export { completitudRule } from "./rules/completitud";
export { consistenciaRule } from "./rules/consistencia";
export { clasificacionRule } from "./rules/clasificacion";
export { suficienciaRule } from "./rules/suficiencia";
export {
  s1SlotsComplete,
  s2SlotPartial,
  s3LocationMention,
  s4RecoveryContext,
} from "./rules/suficiencia";
export type { SuficienciaInput } from "./rules/suficiencia";
export { escalamientoRule } from "./rules/escalamiento";
export { prioridadRule } from "./rules/prioridad";
