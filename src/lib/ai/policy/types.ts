import type { Intent, SlotStabilityMap } from "../types";
import type { CoreLateral } from "../laterals/types";

export type PolicyAction =
  | "PROCEED_BOOKING"
  | "PROCEED_NOW"
  | "ASK_CLARIFICATION"
  | "ESCALATE_EMERGENCY"
  | "POST_SERVICE_HANDLE"
  | "SMALLTALK"
  | "IGNORE";

export interface PolicyDecision {
  action: PolicyAction;
  confidence: number;
  reasonCodes: string[];
  metadata: Record<string, unknown>;
}

export interface PolicyInput {
  intent: Intent;
  confidence: number;
  facts: string[];
  slotStability: SlotStabilityMap;
  lateral?: CoreLateral;
}
