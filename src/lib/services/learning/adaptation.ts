import type { LearningDecision, PolicyEngineResult } from "./types";
import { logLearningEvent } from "./events";
import { detectPredictionDrift, detectConversionDrift, detectPolicyDrift } from "./drift";
import { logLearningError } from "./errors";
import { runHousekeeping } from "../housekeeping";

export async function runAdaptation(
  f7Decision: LearningDecision,
  f8Result: PolicyEngineResult,
  sessionId: string,
  intent: string,
): Promise<void> {
  try {
    const ts = Math.floor(Date.now() / 1000);

    if (f8Result.simulation && f7Decision.selected) {
      await logLearningEvent({
        sessionId, type: "conversion", entity: f7Decision.selected.label, intent,
        predictedValue: f8Result.simulation.expectedConversion,
        actualValue: undefined,
        timestamp: ts, source: "F7",
      });
    }

    if (f7Decision.selected) {
      await detectConversionDrift(
        f7Decision.selected.label,
        f7Decision.utilityBreakdown.conversion,
        0.5,
        sessionId,
      );
    }

    for (const pr of f8Result.policyResults) {
      const economicScore = f7Decision.selected?.economicScore ?? 0;
      await detectPolicyDrift(pr.policyId, economicScore / 100, 0.3, sessionId);
    }

    if (f8Result.activeGuardrails.length > 0) {
      await logLearningEvent({
        sessionId, type: "manual_override", intent,
        timestamp: ts, source: "F8",
      });
    }

    console.log(`[LEARNING] Meta-governanza completada para sesión ${sessionId}`);
  } catch (e) {
    await logLearningError("adaptation-orchestrator", e);
    console.error(`[LEARNING] Error en meta-governanza:`, e);
  }

  runHousekeeping().catch((e) => logLearningError("housekeeping", e));
}
