// F9: DRIFT DETECTION & LEARNING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Detectar drift en predicciones y aprendizaje.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. f9-index.ts
//   orquesta housekeeping (limpieza de tablas). No modificar.
// MIGRATION NOTE: Deshabilitar perdería limpieza de tablas. Bloqueado hasta
//   Conversation Core + Pricing + Geo congelados.

import type { F7Decision } from "./f7-types";
import type { F8Result } from "./f8-types";
import { logF9Event } from "./f9-events";
import { detectPredictionDrift, detectConversionDrift, detectPolicyDrift } from "./f9-drift";
import { logF9Error } from "./f9-error";
import { runHousekeeping } from "./housekeeping";

export async function runF9(
  f7Decision: F7Decision,
  f8Result: F8Result,
  sessionId: string,
  intent: string,
): Promise<void> {
  try {
    const ts = Math.floor(Date.now() / 1000);

    if (f8Result.simulation && f7Decision.selected) {
      await logF9Event({
        sessionId, type: "conversion", entity: f7Decision.selected.label, intent,
        predictedValue: f8Result.simulation.expectedConversion,
        actualValue: undefined,
        timestamp: ts, source: "F7",
      });

      await detectPredictionDrift(
        f7Decision.selected.label,
        f8Result.simulation.expectedConversion,
        undefined,
        sessionId,
      );
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
      const f3_economic_score = f7Decision.selected?.economicScore ?? 0;
      await detectPolicyDrift(pr.policyId, f3_economic_score / 100, 0.3, sessionId);
    }

    if (f8Result.activeGuardrails.length > 0) {
      await logF9Event({
        sessionId, type: "manual_override", intent,
        timestamp: ts, source: "F8",
      });
    }

    console.log(`[F9] Meta-governanza completada para sesión ${sessionId}`);
  } catch (e) {
    await logF9Error("f9-orchestrator", e);
    console.error(`[F9] Error en meta-governanza:`, e);
  }

  runHousekeeping().catch((e) => logF9Error("housekeeping", e));
}
