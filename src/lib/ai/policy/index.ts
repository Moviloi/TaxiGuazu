// FASE 6.5: Entry point del Policy Layer.
// applyPolicy delega al Rule Registry Engine.
// El engine itera reglas por prioridad estricta vía matches()/execute().

export { applyPolicy } from "./engine";
export type { PolicyDecision, PolicyInput, PolicyAction } from "./types";
