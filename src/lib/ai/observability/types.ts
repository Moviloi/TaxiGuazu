// FASE 6.7: Observability Types
// Structured log model for decision pipeline.

import type { Intent } from "../types";
import type { CoreLateral } from "../laterals/types";
import type { DecisionTrace } from "../trace/types";

export interface DecisionLog {
  correlationId: string;
  timestamp: number;
  intent: Intent;
  confidence: number;
  selectedRule: string;
  selectedAction: string;
  latencyMs: number;
  lateralSnapshot?: CoreLateral;
  trace?: DecisionTrace;
  metadata: Record<string, unknown>;
}
