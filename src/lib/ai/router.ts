// ROUTER — capa ejecutora pura.
// NO contiene lógica de decisión (intent, confidence, keywords).
// SOLO consume CoreDecision y retorna OutputType.
//
// v5.0 FASE 6.4: router es 100% executor.
//   - route() mapea PolicyAction → handler name (pure function)
//   - router() legacy mantiene backward compat con handler.ts
//     (internamente usa core + policy-ahora/policy-reserva)
//
// v5.0 FASE 11: Purged dead imports (policy, trace, telemetry).
// router() now maps CoreDecision directly to OutputType.

import { core } from "./core";
import type { CoreDecision, FinalDecision, Mode, OutputType } from "./types";

function coreToOutputType(c: CoreDecision): { outputType: OutputType; reason: string } {
  const { intent, confidence } = c;

  if (intent === "EMERGENCY") return { outputType: "EXECUTE", reason: "intent=EMERGENCY → EXECUTE" };
  if (intent === "NOW")         return { outputType: "EXECUTE", reason: "intent=NOW → EXECUTE" };
  if (intent === "BOOKING")     return { outputType: "EXECUTE", reason: "intent=BOOKING → EXECUTE" };
  if (intent === "PRE_BOOKING") return { outputType: "EXECUTE", reason: "intent=PRE_BOOKING → EXECUTE" };
  if (intent === "RESCHEDULE")  return { outputType: "EXECUTE", reason: "intent=RESCHEDULE → EXECUTE" };
  if (intent === "POST_SERVICE")return { outputType: "ANSWER",  reason: "intent=POST_SERVICE → ANSWER" };
  if (intent === "INFORMATIONAL")return { outputType: "ANSWER", reason: "intent=INFORMATIONAL → ANSWER" };
  if (intent === "COMMERCIAL")  return { outputType: "ANSWER",  reason: "intent=COMMERCIAL → ANSWER" };

  if (confidence < 0.4)         return { outputType: "SAFE_FALLBACK", reason: `confidence=${confidence} < 0.4 → SAFE_FALLBACK` };
  if (intent === "AMBIGUOUS")   return { outputType: "CLARIFY", reason: "intent=AMBIGUOUS → CLARIFY" };

  return { outputType: "CLARIFY", reason: "default → CLARIFY" };
}

// ── router(): legacy backward compat — FASE 6.4 refactored ──
// Internamente usa core() + mapeo directo a OutputType.
// NO usa applyPolicy, NO usa telemetry, NO usa trace.
export function router(input: string, mode: Mode): FinalDecision {
  const c: CoreDecision = core(input);
  const { outputType, reason } = coreToOutputType(c);

  return {
    decision: outputType,
    mode,
    core: c,
    reason,
  };
}
