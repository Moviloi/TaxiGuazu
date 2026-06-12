// Tipos base de la arquitectura CORE → ROUTER → POLICIES
// Determinista, sin LLM en la decisión ni en el output final.
//
// v5.0 FASE 5B: PolicyOutput es la ÚNICA fuente del finalResponse.
// outputSource es un discriminante que el guardrail enforce.

export type Intent = "GREETING" | "INFORMATIONAL" | "COMMERCIAL" | "PRE_BOOKING" | "BOOKING" | "NOW" | "RESCHEDULE" | "POST_SERVICE" | "EMERGENCY" | "AMBIGUOUS";

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

import type { CoreLateral } from "./laterals/types";

export interface CoreDecision {
  intent: Intent;
  facts: string[];
  confidence: number;
  slotStability: SlotStabilityMap;
  roleLock: RoleLock;
  // FASE 6.2: lateral metadata (optional for backward compat)
  lateral?: CoreLateral;
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
  phone?: string;
  userText?: string;
}

export interface PolicyOutput {
  decision: OutputType;
  mode: Mode;
  policyHint: string;
  requiresConfirmation: boolean;
  finalResponse: string;
  requiresUserInput: boolean;
  nextExpectedFields: string[];
  outputSource: OutputSource;
  // EXECUTION METADATA — flags para efectos secundarios post-decisión.
  // Indican qué efectos secundarios ejecutar además de send+persist.
  needsGeo: boolean;
  needsSaveContext: boolean;
  // ADMIN NOTIFY — side effect flag for lateral intents (EMERGENCY, RESCHEDULE).
  needsAdminNotify?: boolean;
  adminNotifyBody?: string;
}

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}
