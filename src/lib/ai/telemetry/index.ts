// FASE 6.8: Telemetry Module Entry Point

export { getTracer, startSpan, endSpan } from "./tracer";
export { recordRuleHit, recordRuleLatency, recordActionDistribution } from "./metrics";
export { recordEvent, drainEvents, getEvents } from "./events";
export { safeExport, exportTrace, exportEvent } from "./exporter";
export type { DecisionEvent } from "./events";
