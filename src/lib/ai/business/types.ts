// FASE 7: Business Decision Types
// Capa de significado de negocio sobre el pipeline de decisión.

import type { Intent } from "../types";
import type { PolicyAction } from "../policy/types";
import type { CoreLateral } from "../laterals/types";
import type { DecisionTrace } from "../trace/types";

export type LeadMaturity = "cold" | "warm" | "hot" | "conversion_ready";
export type CustomerValue = "low" | "medium" | "high" | "premium";
export type FunnelState = "awareness" | "consideration" | "intent" | "conversion" | "post_conversion";

export interface BusinessInput {
  intent: Intent;
  policyAction: PolicyAction;
  lateral?: CoreLateral;
  trace?: DecisionTrace;
}

export interface BusinessDecision {
  leadMaturity: LeadMaturity;
  customerValue: CustomerValue;
  funnelState: FunnelState;
  metadata: {
    derivedFrom: PolicyAction;
  };
}
