// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICY → OUTPUT.
// ÚNICO punto de salida. El finalResponse viene de POLICY.
// Prohibido: cualquier LLM que redacte el mensaje al usuario fuera de aquí.
//
// Logging obligatorio en cada request:
//   [CORE] intent + confidence + facts
//   [ROUTER] mode + outputType + reason
//   [POLICY] mode + hint + requiresConfirmation + stateful
//   [OUTPUT_SOURCE]=POLICY  (hard-enforced por assertOutputSource)
//
// Asserts runtime:
//   - assertPipelineComplete (core/decision/policy armados)
//   - assertOutputSource(policy.outputSource) === "POLICY"

import { core } from "./core";
import { router } from "./router";
import { policyAhora } from "./policy-ahora";
import { policyReserva } from "./policy-reserva";
import { assertOutputSource, assertPipelineComplete, setRequestState } from "./guard";
import type { HandleMessageResult, HandlerContext, Mode } from "./types";
import { log } from "@/lib/utils/logger";

export function handleMessage(input: string, mode: Mode, ctx?: HandlerContext): HandleMessageResult {
  const coreDecision = core(input);
  const decision = router(coreDecision, mode);
  const policy =
    mode === "AHORA"
      ? policyAhora(decision, ctx)
      : policyReserva(decision, ctx);

  // Hard enforcement: policy debe ser la fuente del output.
  assertOutputSource(policy.outputSource);
  // Pipeline debe estar armado (defensa en profundidad; setea state justo después).
  assertPipelineComplete(decision.core, decision, policy);

  setRequestState(decision.core, decision, policy);

  log.info(
    `[CORE] intent=${decision.core.intent} confidence=${decision.core.confidence.toFixed(2)} facts=[${decision.core.facts.join(",")}]`,
  );
  log.info(`[ROUTER] mode=${mode} outputType=${decision.decision} reason="${decision.reason}"`);
  log.info(
    `[POLICY] mode=${policy.mode} hint="${policy.policyHint}" requiresConfirmation=${policy.requiresConfirmation}`,
  );
  log.info(`[OUTPUT_SOURCE]=POLICY`);

  return { decision, policy };
}
