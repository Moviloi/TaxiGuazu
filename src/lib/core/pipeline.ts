// Core pipeline — frozen, deterministic entry point for semantic processing (Fase 10).
//
// Pipeline:
//   semanticCoreEngine.resolveDecision → executionEngine.executeDecision

import { resolveDecision } from "@/lib/services/semanticCoreEngine";
import { executeDecision, type ExecutionContext, type ExecutionDeps } from "@/lib/services/executionEngine";
import type { DecisionInput } from "@/lib/core/types";

export type ProcessLeadResult = "completed" | "incomplete" | "error";

// Run the frozen decision → execution pipeline.
// This is the single entry point for all semantic message processing.
//
// Extraction and completeness are handled upstream by lead.service.
// This pipeline takes the already-extracted slots and runs:
//   1. Semantic decision (intent + confidence → action)
//   2. Action execution (send WhatsApp, persist, geo → fare → handler)
export async function processLead(
  decisionInput: DecisionInput,
  execCtx: ExecutionContext,
  deps: ExecutionDeps,
): Promise<ProcessLeadResult> {
  try {
    const decision = resolveDecision(decisionInput);
    await executeDecision(decision, execCtx, deps);
    return decision.action === "FINAL" || decision.action === "BOOKING_SUMMARY" ? "completed" : "incomplete";
  } catch (e) {
    console.error("[PIPELINE] error:", e);
    return "error";
  }
}
