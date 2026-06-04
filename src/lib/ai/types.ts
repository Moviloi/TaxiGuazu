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

// v5.0 FASE 5B.2 (slot stability + role lock):
// "locked" = el slot fue fijado por la estructura sintáctica del input
//   (ej. "estoy en X" → origin locked a X). No se reinterpreta en turnos
//   posteriores.
// "ambiguous" = el slot tiene un valor genérico (centro, hotel) que requiere
//   refinamiento, pero su rol (origin/destination) ya está fijado.
// "open" = el slot no fue detectado; está disponible para asignación.
export type SlotStability = "locked" | "ambiguous" | "open";

export interface RoleLock {
  origin: string | null;
  destination: string | null;
}

export interface SlotStabilityMap {
  origin: SlotStability;
  destination: SlotStability;
}

export interface CoreDecision {
  intent: Intent;
  facts: string[];
  confidence: number;
  slotStability: SlotStabilityMap;
  roleLock: RoleLock;
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
  // v5.0 FASE 5B.2: role lock + slot stability detectados por CORE.
  // POLICY usa esto para decidir entre "Perfecto, tengo origen en X..."
  // (cuando slots están locked) vs CLARIFY.
  roleLock?: RoleLock;
  slotStability?: SlotStabilityMap;
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
