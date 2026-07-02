// GUARD — Hard enforcement del flujo CORE → ROUTER → POLICY → OUTPUT.
// Cualquier intento de emitir output fuera de POLICY se BLOQUEA.
//
// Historia: Este módulo tenía estado global (coreState, finalState, policyState)
// que causaba riesgos de contaminación cross-request en Node.js single-threaded
// con awaits entre resetRequestState() (lead.service.ts:115) y
// runExtractionPipeline() (lead.service.ts:511).
//
// Solución (DEBT-03): Eliminado el estado global. assertPipelineComplete y
// assertOutputSource ya estaban correctamente parametrizadas.
// assertCoreRouterPolicy() retorna true siempre — su función de detectar estado
// mixto era un safety net redundante con assertPipelineComplete().
// setRequestState() y resetRequestState() se mantienen como no-ops documentados
// para señalizar intención en el flujo sin riesgo de concurrencia.
//
// Reglas vigentes:
// - Cualquier output final al usuario debe pasar assertOutputSource("POLICY").
// - El pipeline completo debe estar armado antes de emitir (assertPipelineComplete).
// - LEADING PRINCIPLE: toda validación usa parámetros explícitos, no estado global.

import type { CoreDecision, OutputSource, PolicyOutput, FinalDecision } from "./types";
import { log } from "@/lib/utils/logger";

export interface BlockResult {
  status: "BLOCKED_LEGACY_FLOW";
  reason: "CORE_ROUTER_REQUIRED" | "OUTPUT_SOURCE_NOT_POLICY" | "PIPELINE_INCOMPLETE";
  context: string;
}

/**
 * No-op documentado. Antes escribía en vars globales (coreState, finalState, policyState).
 * Ahora el estado se pasa por parámetro donde sea necesario.
 * Se conserva para señalizar intención en handler.ts sin riesgo de concurrencia.
 */
export function setRequestState(_core: CoreDecision, _final: FinalDecision, _policy: PolicyOutput): void {
  // No-op intencional. El estado se valida vía assertPipelineComplete con params explícitos.
}

/**
 * Siempre retorna true. Antes verificaba estado mixto en vars globales.
 * Su función es redundante con assertPipelineComplete (que usa parámetros explícitos).
 * Se conserva la firma para compatibilidad con extraction-runner.ts.
 */
export function assertCoreRouterPolicy(): true | BlockResult {
  // No-op intencional. Sin estado global, no hay estado mixto que verificar.
  // La validación real del pipeline ocurre en assertPipelineComplete().
  return true;
}

/**
 * Hard guardrail para outputs no-POLICY.
 * Lanza OUTPUT_VIOLATION. Uso: assertOutputSource(policy.outputSource).
 */
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

/**
 * Assert runtime que el pipeline CORE+ROUTER+POLICY está armado.
 * Uso: assertPipelineComplete(decision.core, decision, policy).
 * ÚNICO guardrail real del pipeline (usa parámetros explícitos).
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
      context: `core=${!!core} router=${!!decision} policy=${!!policy}`,
    };
    log.info("[BLOCKED]", block);
    return block;
  }
  return true;
}

/**
 * No-op documentado. Antes limpiaba vars globales (coreState, finalState, policyState).
 * Se conserva para señalizar intención en lead.service.ts.
 */
export function resetRequestState(): void {
  // No-op intencional. Sin estado global, no hay estado que resetear.
}
