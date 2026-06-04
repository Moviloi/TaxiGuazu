// Tipos base de la arquitectura CORE → ROUTER → POLICIES
// Determinista, sin LLM en la decisión ni en el output final.
//
// v5.0 FASE 5B: PolicyOutput es la ÚNICA fuente del finalResponse.
// outputSource es un discriminante que el guardrail enforce.

export type Intent = "ACTION" | "QUERY" | "STATEFUL" | "AMBIGUOUS";

export type Mode = "AHORA" | "RESERVA";

export type OutputType = "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";

export type OutputSource = "POLICY";

export type Lang = "es" | "en" | "pt";

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

// Slot confirmado (origen, destino, pasajeros, horario, vuelo, etc.)
export interface ConfirmedSlot {
  value: string | number | null;
  score: number;
  reason: string;
}

export interface ExtractionContext {
  slots: Record<string, ConfirmedSlot | undefined>;
  overallConfidence: number;
  workflowState: string;
  clarifyField: string | null;
  askForConfirmation: boolean;
  tariff?: {
    matched: boolean;
    price?: number;
    canonicalOrigin?: string;
    canonicalDestination?: string;
    method?: string;
  };
}

export interface HandlerContext {
  history?: Array<{ role: string; content: string; created_at: number }>;
  customerName?: string;
  extraction?: ExtractionContext;
  lang?: Lang;
}

export interface PolicyOutput {
  decision: OutputType;
  mode: Mode;
  policyHint: string;
  requiresConfirmation: boolean;
  stateful: boolean;
  finalResponse: string;
  requiresUserInput: boolean;
  nextExpectedFields: string[];
  outputSource: OutputSource;
}

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}
