// FASE 8: Experimentation Types

import type { Intent } from "../types";
import type { PolicyAction, PolicyInput, PolicyDecision } from "../policy/types";
import type { CoreLateral } from "../laterals/types";

export type PolicyVariant = "CONTROL" | "EXPERIMENT_A" | "EXPERIMENT_B";

export interface ExperimentContext {
  correlationId: string;
  intent: Intent;
  lateral?: CoreLateral;
  policyAction: PolicyAction;
}

export interface ShadowComparison {
  sameAction: boolean;
  divergence: boolean;
  impactLevel: "none" | "low" | "medium" | "high";
  real: Pick<PolicyDecision, "action" | "confidence">;
  shadow: Pick<PolicyDecision, "action" | "confidence">;
}
