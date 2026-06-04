// POLICY RESERVA — flujos multi-step, STATEFUL, confirmación obligatoria en EXECUTE.
// NO contiene lógica de decisión: solo transforma FinalDecision → PolicyOutput.

import type { FinalDecision, PolicyOutput } from "./types";

export function policyReserva(decision: FinalDecision): PolicyOutput {
  const stateful = decision.core.intent === "STATEFUL";
  const requiresConfirmation = decision.decision === "EXECUTE";

  let policyHint: string;
  switch (decision.decision) {
    case "EXECUTE":
      policyHint = stateful
        ? "RESERVA: continuar estado existente (STATEFUL)."
        : "RESERVA: ejecutar acción con confirmación obligatoria.";
      break;
    case "ANSWER":
      policyHint = "RESERVA: responder con contexto enriquecido si existe.";
      break;
    case "CLARIFY":
      policyHint = "RESERVA: pedir clarificación estructurada.";
      break;
    case "SAFE_FALLBACK":
    default:
      policyHint = "RESERVA: requerir confirmación antes de actuar.";
  }

  return {
    decision: decision.decision,
    mode: "RESERVA",
    policyHint,
    requiresConfirmation,
    stateful,
  };
}
