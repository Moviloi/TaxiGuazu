// FASE 6.6: Decision Trace Types
// Observabilidad completa del sistema de decisión.

import type { Intent } from "../types";
import type { PolicyAction } from "../policy/types";
import type { CoreLateral } from "../laterals/types";

export interface RuleEvaluationTrace {
  ruleId: string;
  matched: boolean;
  priority: number;
  executionTimeMs: number;
}

export interface DecisionTrace {
  intent: Intent;
  confidence: number;
  selectedRule: string;
  selectedAction: PolicyAction;
  evaluatedRules: RuleEvaluationTrace[];
  lateralSnapshot?: CoreLateral;
  metadata: Record<string, unknown>;
}
