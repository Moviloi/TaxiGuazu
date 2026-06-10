// Core types — single source of truth for all semantic decision types (Fase 10)

export type DecisionAction =
  | "INFO_PRICE"
  | "OPPORTUNITY_QUERY"
  | "CONFIRM_ROUTE"
  | "CONFIRM_INTERPRETATION"
  | "BOOKING_SUMMARY"
  | "ASK_ORIGIN"
  | "ASK_DESTINATION"
  | "CLARIFY"
  | "CONFIRM"
  | "FINAL";

export type Intent = "MOVE" | "INFO" | "OPPORTUNITY" | "CONFIRM" | "AMBIGUOUS";

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
  pricing?: {
    final_price: number;
    base_price: number;
    markup: number;
    tariff_id: number | null;
    origin: { canonical_name: string | null };
    destination: { canonical_name: string | null };
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
