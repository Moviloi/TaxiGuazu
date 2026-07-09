// GUARD — Hard enforcement del flujo CORE → ROUTER → POLICY → OUTPUT.
// Cualquier intento de emitir output fuera de POLICY se BLOQUEA.
//
// DEBT-03: Estado global eliminado. assertPipelineComplete y assertOutputSource 
// usan parámetros explícitos. setRequestState, resetRequestState y assertCoreRouterPolicy 
// fueron eliminados como no-ops.

import escalationPolicies from "../../../data/knowledge/policies/escalation.json";
import type { CoreDecision, OutputSource, PolicyOutput, FinalDecision } from "./types";
import { log } from "@/lib/utils/logger";

export interface BlockResult {
  status: "BLOCKED_LEGACY_FLOW";
  reason: "CORE_ROUTER_REQUIRED" | "OUTPUT_SOURCE_NOT_POLICY" | "PIPELINE_INCOMPLETE";
  context: string;
}

/**
 * Hard guardrail para outputs no-POLICY.
 * Lanza OUTPUT_VIOLATION. Uso: assertOutputSource(policy.outputSource).
 */
export function assertOutputSource(source: OutputSource | string): true {
  if (source !== "POLICY") {
    const err = new Error(
      escalationPolicies.guardMessages.outputViolation.replace("{source}", source ?? "undefined"),
    );
    log.error("[OUTPUT_VIOLATION]", err.message);
    throw err;
  }
  return true;
}

/**
 * Assert runtime que el pipeline CORE+ROUTER+POLICY está armado.
 * Uso: assertPipelineComplete(decision.core, decision, policy).
 */
export function assertPipelineComplete(
  core: CoreDecision | null | undefined,
  decision: FinalDecision | null | undefined,
  policy: PolicyOutput | null | undefined,
): true | BlockResult {
  if (!core || !decision || !policy) {
    const block: BlockResult = {
      status: "BLOCKED_LEGACY_FLOW",
      reason: "PIPELINE_INCOMPLETE",
      context: escalationPolicies.guardMessages.pipelineIncompleteTemplate
        .replace("{core}", String(!!core))
        .replace("{router}", String(!!decision))
        .replace("{policy}", String(!!policy)),
    };
    log.info("[BLOCKED]", block);
    return block;
  }
  return true;
}
