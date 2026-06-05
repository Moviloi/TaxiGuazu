// FASE 6.8: Trace Export + Safe Exporter
// Exporta DecisionTrace via OTEL spans. Fail-safe wrapper.

import type { DecisionTrace } from "../trace/types";
import type { DecisionEvent } from "./events";
import { getTracer } from "./tracer";
import { recordActionDistribution } from "./metrics";

export function safeExport(fn: () => void): void {
  try {
    fn();
  } catch {
    // NEVER break request flow
  }
}

export function exportTrace(traceData: DecisionTrace): void {
  safeExport(() => {
    recordActionDistribution(traceData.selectedAction);
    queueMicrotask(() => {
      safeExport(() => {
        const tracer = getTracer();
        tracer.startActiveSpan("decision_trace", (span) => {
          span.setAttributes({
            intent: traceData.intent,
            selectedRule: traceData.selectedRule,
            selectedAction: traceData.selectedAction,
            confidence: traceData.confidence,
            evaluatedRules: traceData.evaluatedRules.length,
          });
          span.end();
        });
      });
    });
  });
}

export function exportEvent(event: DecisionEvent): void {
  safeExport(() => {
    queueMicrotask(() => {
      safeExport(() => {
        const tracer = getTracer();
        tracer.startActiveSpan(`phase_${event.phase}`, (span) => {
          span.setAttributes({
            correlationId: event.correlationId,
            phase: event.phase,
            intent: event.intent,
            ruleId: event.ruleId ?? "",
            action: event.action ?? "",
            latencyMs: event.latencyMs,
            success: event.success,
          });
          span.end();
        });
      });
    });
  });
}
