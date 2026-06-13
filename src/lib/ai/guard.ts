// GUARD — Hard enforcement del flujo CORE → ROUTER → POLICY → OUTPUT.
// cualquier intento de emitir output fuera de POLICY se BLOQUEA.
//
// Reglas:
// - handleMessage() setea el state (CORE, FinalDecision, PolicyOutput).
// - Cualquier LLM call (CORE/extraction) debe pasar assertCoreRouterPolicy().
// - Cualquier output final al usuario debe pasar assertOutputSource("POLICY").
// - El pipeline completo debe estar armado antes de emitir (assertPipelineComplete).
//
// El state es module-level. Cada request debe llamar resetRequestState() al inicio
// y handleMessage() antes de cualquier LLM call o send al usuario.

import type { CoreDecision, FinalDecision, OutputSource, PolicyOutput } from "./types";

export interface BlockResult {
  status: "BLOCKED_LEGACY_FLOW";
  reason: "CORE_ROUTER_REQUIRED" | "OUTPUT_SOURCE_NOT_POLICY" | "PIPELINE_INCOMPLETE";
  context: string;
}

let coreState: CoreDecision | null = null;
let finalState: FinalDecision | null = null;
let policyState: PolicyOutput | null = null;

export function setRequestState(core: CoreDecision, final: FinalDecision, policy: PolicyOutput): void {
  coreState = core;
  finalState = final;
  policyState = policy;
}

export function getCoreState(): CoreDecision | null {
  return coreState;
}

export function getFinalState(): FinalDecision | null {
  return finalState;
}

export function getPolicyState(): PolicyOutput | null {
  return policyState;
}

export function assertCoreRouterPolicy(): true | BlockResult {
  if (!coreState || !finalState || !policyState) {
    const block: BlockResult = {
      status: "BLOCKED_LEGACY_FLOW",
      reason: "CORE_ROUTER_REQUIRED",
      context: `core=${!!coreState} router=${!!finalState} policy=${!!policyState}`,
    };
    console.log("[BLOCKED]", block);
    return block;
  }
  return true;
}

// hard guardrail para outputs no-POLICY.
// Lanza OUTPUT_VIOLATION. Uso: assertOutputSource(policy.outputSource).
export function assertOutputSource(source: OutputSource | string): true {
  if (source !== "POLICY") {
    const err = new Error(
      `OUTPUT_VIOLATION: NON_POLICY_RESPONSE_BLOCKED (source=${source ?? "undefined"})`,
    );
    console.error("[OUTPUT_VIOLATION]", err.message);
    throw err;
  }
  return true;
}

// assert runtime que el pipeline CORE+ROUTER+POLICY está armado.
// Uso: assertPipelineComplete(decision.core, decision, policy).
export function assertPipelineComplete(
  core: CoreDecision | null | undefined,
  decision: FinalDecision | null | undefined,
  policy: PolicyOutput | null | undefined,
): true | BlockResult {
  if (!core || !decision || !policy) {
    const block: BlockResult = {
      status: "BLOCKED_LEGACY_FLOW",
      reason: "PIPELINE_INCOMPLETE",
      context: `core=${!!core} router=${!!decision} policy=${!!policy}`,
    };
    console.log("[BLOCKED]", block);
    return block;
  }
  return true;
}

export function resetRequestState(): void {
  coreState = null;
  finalState = null;
  policyState = null;
}
