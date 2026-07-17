// DRL — Deterministic Reasoning Layer: Tipos del razonamiento determinístico.
// CE-3B: Deterministic Reasoning Layer — reglas de decisión sin LLM.
// PR-5A: Foundation — tipos estables y desacoplados.

// ─── Tipos de decisión ──────────────────────────────────────────────────────

export type DRLDecisionType = "PROCEED" | "CLARIFY" | "ESCALATE" | "HALT";

// ─── Resultado de una regla individual ──────────────────────────────────────

export interface DRLRuleResult {
  ruleFamily: string;
  ruleName: string;
  passed: boolean;
  decision: DRLDecisionType;
  reason: string;
  confidence: number; // 0.0 – 1.0
  /** Campos faltantes o conflictivos (contexto para CLARIFY / ESCALATE) */
  details?: Record<string, unknown>;
}

// ─── Decisión compuesta (post-agregación) ───────────────────────────────────

export interface DRLDecision {
  decision: DRLDecisionType;
  reason: string;
  confidence: number;
  ruleResults: DRLRuleResult[];
  context: {
    slotCount: number;
    requiredSlotCount: number;
    completenessRatio: number; // 0.0 – 1.0
    hasConflicts: boolean;
  };
  escalateTo: "GROQ" | "GEMINI" | null;
}

// ─── Firma de función de regla ──────────────────────────────────────────────

export type DRLRule<TInput = DRLInput, TOutput = DRLRuleResult> = (
  input: TInput
) => TOutput | null;

// ─── Contexto de entrada para el motor DRL ──────────────────────────────────

export interface DRLInput {
  slots: Record<string, unknown>;
  requiredSlots: string[];
  conversationState?: string;
}
