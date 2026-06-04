// ROUTER — único punto de decisión.
// Llama a CORE y mapea intent → OutputType según mode.

import { core } from "./core";
import type { CoreDecision, FinalDecision, Intent, Mode, OutputType } from "./types";

export function router(input: string, mode: Mode): FinalDecision {
  const c: CoreDecision = core(input);
  const decision = mapIntentToOutput(c.intent, mode);
  return {
    decision,
    mode,
    core: c,
    reason: reasonFor(c.intent, mode, decision),
  };
}

function mapIntentToOutput(intent: Intent, mode: Mode): OutputType {
  if (intent === "ACTION") return "EXECUTE";
  if (intent === "QUERY") return "ANSWER";
  if (intent === "AMBIGUOUS") return "CLARIFY";
  if (intent === "STATEFUL") {
    return mode === "RESERVA" ? "EXECUTE" : "SAFE_FALLBACK";
  }
  return "SAFE_FALLBACK";
}

function reasonFor(intent: Intent, mode: Mode, decision: OutputType): string {
  if (intent === "STATEFUL" && mode === "AHORA") {
    return "AHORA es stateless; STATEFUL cae a SAFE_FALLBACK";
  }
  if (intent === "STATEFUL" && mode === "RESERVA" && decision === "EXECUTE") {
    return "RESERVA continúa estado existente";
  }
  return `intent=${intent} → ${decision} (mode=${mode})`;
}
