// FASE 6.7: Observability Module Entry Point

export { generateCorrelationId } from "./correlation";
export { shouldSample, hashId, parseSampleRate } from "./sampler";
export { logDecision, OBS_DEBUG } from "./logger";
export type { DecisionLog } from "./types";
