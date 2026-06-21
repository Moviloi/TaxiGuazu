// ROUTER — capa ejecutora pura.
// NO contiene lógica de decisión (intent, confidence, keywords).
// NO llama a core() internamente — recibe CoreDecision como parámetro.
// SOLO mapea CoreDecision → OutputType.
//
// router es 100% executor.
//   - route() mapea PolicyAction → handler name (pure function)
//   - router() recibe CoreDecision + Mode, retorna FinalDecision
//
// Purged dead imports (policy, trace, telemetry).

import type { CoreDecision, FinalDecision, Mode, OutputType } from "./types";

function coreToOutputType(c: CoreDecision): { outputType: OutputType; reason: string } {
  const { intent, confidence } = c;

  if (intent === "EMERGENCY") return { outputType: "EXECUTE", reason: "intent=EMERGENCY → EXECUTE" };
  if (intent === "NOW")       return { outputType: "EXECUTE", reason: "intent=NOW → EXECUTE" };
  if (intent === "BOOKING")   return { outputType: "EXECUTE", reason: "intent=BOOKING → EXECUTE" };
  if (intent === "PRE_BOOKING") return { outputType: "EXECUTE", reason: "intent=PRE_BOOKING → EXECUTE" };
  if (intent === "RESCHEDULE")return { outputType: "EXECUTE", reason: "intent=RESCHEDULE → EXECUTE" };
  if (intent === "POST_SERVICE") return { outputType: "ANSWER", reason: "intent=POST_SERVICE → ANSWER" };
  if (intent === "INFORMATIONAL") return { outputType: "ANSWER", reason: "intent=INFORMATIONAL → ANSWER" };
  if (intent === "COMMERCIAL") return { outputType: "ANSWER", reason: "intent=COMMERCIAL → ANSWER" };
  if (intent === "GREETING")  return { outputType: "CLARIFY", reason: "intent=GREETING → CLARIFY" };
  if (intent === "CONSULTA")  return { outputType: "CLARIFY", reason: "intent=CONSULTA → CLARIFY" };

  if (confidence < 0.4)       return { outputType: "SAFE_FALLBACK", reason: `confidence=${confidence} < 0.4 → SAFE_FALLBACK` };
  if (intent === "AMBIGUOUS") return { outputType: "CLARIFY", reason: "intent=AMBIGUOUS → CLARIFY" };

  return { outputType: "CLARIFY", reason: "default → CLARIFY" };
}

// ── router(): recibe CoreDecision + Mode, retorna FinalDecision ──
// NO llama a core() internamente — el caller (handler.ts) pasa el CoreDecision.
// NO usa applyPolicy, NO usa telemetry, NO usa trace.
export function router(c: CoreDecision, mode: Mode): FinalDecision {
  const { outputType, reason } = coreToOutputType(c);

  return {
    decision: outputType,
    mode,
    core: c,
    reason,
  };
}
