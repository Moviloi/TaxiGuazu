// Cognitive Metrics — Barrel export
// PR-5F: Public API del sistema de observabilidad cognitiva.

export {
  captureEvent,
  captureBKEEvent,
  captureDRLEvent,
  captureLLMEvent,
  captureFallbackEvent,
  capturePipelineEvent,
  startRequest,
  endRequest,
  linkEventToRequest,
  getCognitiveMetricsState,
  resetCognitiveMetricsState,
} from "./collector";

export { calculateBudget } from "./budget";

export type {
  CognitiveStage,
  CognitiveEvent,
  CognitiveBudget,
  CognitiveRequestMetrics,
  CognitiveMetricsState,
  BKEEventDetails,
  DRLEventDetails,
  LLMEventDetails,
  FallbackEventDetails,
  PipelineEventDetails,
} from "./types";
