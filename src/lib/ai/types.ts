// Tipos base de la arquitectura CORE → ROUTER → POLICIES
// Determinista, sin LLM en la decisión.

export type Intent = "ACTION" | "QUERY" | "STATEFUL" | "AMBIGUOUS";

export type Mode = "AHORA" | "RESERVA";

export type OutputType = "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";

export interface CoreDecision {
  intent: Intent;
  facts: string[];
  confidence: number;
}

export interface FinalDecision {
  decision: OutputType;
  mode: Mode;
  core: CoreDecision;
  reason: string;
}

export interface PolicyOutput {
  decision: OutputType;
  mode: Mode;
  policyHint: string;
  requiresConfirmation: boolean;
  stateful: boolean;
}
