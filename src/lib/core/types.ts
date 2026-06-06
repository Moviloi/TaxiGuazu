// Core types — single source of truth for all semantic decision types (Fase 10)

export type DecisionAction =
  | "INFO_PRICE"
  | "CONFIRM_ROUTE"
  | "ASK_ORIGIN"
  | "ASK_DESTINATION"
  | "CLARIFY"
  | "CONFIRM"
  | "FINAL";

export type Intent = "MOVE" | "INFO" | "CONFIRM" | "AMBIGUOUS";

export type PolicyAction = "QUESTION" | "CLARIFY" | "CONFIRM" | "FINAL";

export type ConfidenceBucket = "LOW" | "MID" | "HIGH";

export interface Decision {
  action: DecisionAction;
  message: string;
  metadata: {
    intent: Intent;
    policy: PolicyAction;
    confidenceBucket: ConfidenceBucket;
  };
}

export interface DecisionInput {
  text: string;
  slots: Record<string, any>;
  tariffMatch?: {
    matched: boolean;
    price?: number;
    canonicalOrigin?: string;
    canonicalDestination?: string;
  };
  confidence: number;
  lang: string;
}

export interface IntentResult {
  intent: Intent;
}

export interface PolicyInput {
  slots: Record<string, any>;
  completeness: { status: string };
  intent: string;
  confidence: number;
}

export interface PolicyDecision {
  action: PolicyAction;
  message: string;
}
