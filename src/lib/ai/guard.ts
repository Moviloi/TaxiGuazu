// GUARD — Hard enforcement del flujo CORE → ROUTER → POLICY → LLM.
// Cualquier intento de invocar LLM sin pasar por el flujo se BLOQUEA.
//
// Reglas:
// - handleMessage() setea el state (CORE, FinalDecision, PolicyOutput).
// - Cualquier llamada a Groq/LLM debe pasar assertCoreRouterPolicy().
// - Si el state falta → retorna block con log [LEGACY BLOCKED].
//
// El state es module-level. Cada request debe llamar resetRequestState() al inicio
// y handleMessage() antes de cualquier LLM call.

import type { CoreDecision, FinalDecision, PolicyOutput } from "./types";

export interface BlockResult {
  status: "BLOCKED_LEGACY_FLOW";
  reason: "CORE_ROUTER_REQUIRED";
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
    console.log("[LEGACY BLOCKED]", block);
    return block;
  }
  return true;
}

export function resetRequestState(): void {
  coreState = null;
  finalState = null;
  policyState = null;
}
