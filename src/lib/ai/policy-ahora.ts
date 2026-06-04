// POLICY AHORA — ejecución inmediata, sin estado, mínima inferencia.
// NO contiene lógica de decisión: solo transforma FinalDecision → PolicyOutput.

import type { FinalDecision, PolicyOutput } from "./types";

export function policyAhora(decision: FinalDecision): PolicyOutput {
  let policyHint: string;
  switch (decision.decision) {
    case "EXECUTE":
      policyHint = "AHORA: ejecutar acción inmediata. Silencio total después.";
      break;
    case "ANSWER":
      policyHint = "AHORA: responder directo sin seguimiento conversacional.";
      break;
    case "CLARIFY":
      policyHint = "AHORA: pedir solo el dato mínimo necesario.";
      break;
    case "SAFE_FALLBACK":
    default:
      policyHint = "AHORA: respuesta segura genérica sin inferencias.";
  }

  return {
    decision: decision.decision,
    mode: "AHORA",
    policyHint,
    requiresConfirmation: false,
    stateful: false,
  };
}
