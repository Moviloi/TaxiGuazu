// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICIES.
// Es el ÚNICO punto de decisión. No contiene lógica propia.

import { router } from "./router";
import { policyAhora } from "./policy-ahora";
import { policyReserva } from "./policy-reserva";
import type { FinalDecision, Mode, PolicyOutput } from "./types";

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}

export function handleMessage(input: string, mode: Mode): HandleMessageResult {
  const decision = router(input, mode);
  const policy = mode === "AHORA" ? policyAhora(decision) : policyReserva(decision);
  return { decision, policy };
}
