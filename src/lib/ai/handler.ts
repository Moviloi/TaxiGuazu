// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICIES.
// Es el ÚNICO punto de decisión. No contiene lógica propia.
// Setea el state del guard para que cualquier LLM call posterior pueda validarse.

import { router } from "./router";
import { policyAhora } from "./policy-ahora";
import { policyReserva } from "./policy-reserva";
import { setRequestState } from "./guard";
import type { FinalDecision, Mode, PolicyOutput } from "./types";

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}

export function handleMessage(input: string, mode: Mode): HandleMessageResult {
  const decision = router(input, mode);
  const policy = mode === "AHORA" ? policyAhora(decision) : policyReserva(decision);

  setRequestState(decision.core, decision, policy);

  console.log(
    `[CORE] intent=${decision.core.intent} confidence=${decision.core.confidence.toFixed(2)} facts=[${decision.core.facts.join(",")}]`,
  );
  console.log(`[ROUTER] mode=${mode} outputType=${decision.decision} reason="${decision.reason}"`);
  console.log(`[POLICY] mode=${policy.mode} hint="${policy.policyHint}" requiresConfirmation=${policy.requiresConfirmation} stateful=${policy.stateful}`);

  return { decision, policy };
}
