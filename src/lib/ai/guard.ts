// GUARD — Hard enforcement del flujo CORE → ROUTER → POLICY → OUTPUT.
// cualquier intento de emitir output fuera de POLICY se BLOQUEA.
//
// Reglas:
// - handleMessage() setea el state (CORE, FinalDecision, PolicyOutput).
// - extraction-runner llama assertCoreRouterPolicy() para verificar que no haya
//   estado parcial corrupto (algunos módulos inicializados y otros no).
// - Cualquier output final al usuario debe pasar assertOutputSource("POLICY").
// - El pipeline completo debe estar armado antes de emitir (assertPipelineComplete).
//
// El state es module-level. lead.service.ts llama resetRequestState() al inicio.
// La extracción corre entre core() y handleMessage(), por lo que el estado inicial
// (todo null) es válido — assertCoreRouterPolicy solo bloquea estado mixto.

import type { CoreDecision, FinalDecision, OutputSource, PolicyOutput } from "./types";
import { log } from "@/lib/utils/logger";

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

export function assertCoreRouterPolicy(): true | BlockResult {
  const hasCore = coreState !== null;
  const hasFinal = finalState !== null;
  const hasPolicy = policyState !== null;
  const hasAny = hasCore || hasFinal || hasPolicy;
  const hasAll = hasCore && hasFinal && hasPolicy;

  // Only block on mixed state (partial initialization = corruption).
  // All-null (initial state before pipeline) and all-set (pipeline complete) are valid.
  if (hasAny && !hasAll) {
    const block: BlockResult = {
      status: "BLOCKED_LEGACY_FLOW",
      reason: "CORE_ROUTER_REQUIRED",
      context: `core=${hasCore} router=${hasFinal} policy=${hasPolicy}`,
    };
    log.info("[BLOCKED]", block);
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
    log.error("[OUTPUT_VIOLATION]", err.message);
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
    log.info("[BLOCKED]", block);
    return block;
  }
  return true;
}

export function resetRequestState(): void {
  coreState = null;
  finalState = null;
  policyState = null;
}
