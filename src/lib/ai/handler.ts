// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICY → OUTPUT.
// v5.0 FASE 5B: ÚNICO punto de salida. El finalResponse viene de POLICY.
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

import { router } from "./router";
import { policyAhora } from "./policy-ahora";
import { policyReserva } from "./policy-reserva";
import { assertOutputSource, assertPipelineComplete, setRequestState } from "./guard";
import type { HandleMessageResult, HandlerContext, Mode } from "./types";

export function handleMessage(input: string, mode: Mode, ctx?: HandlerContext): HandleMessageResult {
  const decision = router(input, mode);
  const policy =
    mode === "AHORA"
      ? policyAhora(decision, ctx)
      : policyReserva(decision, ctx);

  // Hard enforcement: policy debe ser la fuente del output.
  assertOutputSource(policy.outputSource);
  // Pipeline debe estar armado (defensa en profundidad; setea state justo después).
  assertPipelineComplete(decision.core, decision, policy);

  setRequestState(decision.core, decision, policy);

  console.log(
    `[CORE] intent=${decision.core.intent} confidence=${decision.core.confidence.toFixed(2)} facts=[${decision.core.facts.join(",")}]`,
  );
  console.log(`[ROUTER] mode=${mode} outputType=${decision.decision} reason="${decision.reason}"`);
  console.log(
    `[POLICY] mode=${policy.mode} hint="${policy.policyHint}" requiresConfirmation=${policy.requiresConfirmation} stateful=${policy.stateful}`,
  );
  console.log(`[OUTPUT_SOURCE]=POLICY`);

  return { decision, policy };
}
