// Tipos base de la arquitectura CORE → ROUTER → POLICIES
// Determinista, sin LLM en la decisión ni en el output final.
//
// PolicyOutput es la ÚNICA fuente del finalResponse.
// outputSource es un discriminante que el guardrail enforce.

export type Intent = "GREETING" | "INFORMATIONAL" | "COMMERCIAL" | "PRE_BOOKING" | "BOOKING" | "NOW" | "RESCHEDULE" | "POST_SERVICE" | "EMERGENCY" | "CONSULTA" | "AMBIGUOUS";

export type Mode = "AHORA" | "RESERVA";
export type TemporalMode = "NOW" | "FUTURE" | "UNKNOWN";
export type OperationalMode = "DISPATCH" | "RESERVATION" | "CLARIFY" | "INFO";

export type OutputType = "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";

export type ConversationDomain = "information" | "commercial" | "reservation" | "dispatch";

export type ConversationalState = "idle" | "collecting_slots" | "slot_confirmation" | "awaiting_passenger" | "awaiting_confirmation" | "pending_human_review" | "ambiguity_pending";

export type DispatchState = "idle" | "nivel_1" | "nivel_2" | "nivel_3" | "waiting_driver" | "closed";

// TripState: solo "opportunity" es operativo.
// El cierre real del viaje usa trips.status / trips.trip_phase.
// null = sin opportunity activa.
export type TripState = "opportunity" | null;

export type OutputSource = "POLICY";

export type Lang = "es" | "en" | "pt";

// slot stability + role lock:
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

/** Confianza de asignación de slot basada en sintaxis.
 *  "estoy en {X}" → origin=0.95, "ir a {Y}" → destination=0.90
 *  0 = no detectado, 1 = certeza absoluta del rol.
 *  Esto NO es confianza de entidad (cuál lugar específico).
 */
export interface SlotAssignmentConfidence {
  origin: number;
  destination: number;
}

import type { CoreLateral } from "./laterals/types";

export interface CoreDecision {
  intent: Intent;
  facts: string[];
  confidence: number;
  slotStability: SlotStabilityMap;
  roleLock: RoleLock;
  slotAssignmentConfidence?: SlotAssignmentConfidence;
  // lateral metadata (optional for backward compat)
  lateral?: CoreLateral;
  // P0.6: detección de intención de compra (high = pasajero da datos específicos, low = especula)
  purchaseIntent?: "high" | "medium" | "low";
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
  display?: string;
  score: number;
  reason: string;
  source?: string;
  status?: string;
}

// Mapa de certeza por dimensión (FASE A4)
// Cada dimensión representa qué tan seguro está el sistema del valor detectado.
// 0.0 = completamente incierto, 1.0 = completamente cierto.
export interface ConfidenceMap {
  intent: number;
  origin: number;
  destination: number;
  date: number;
  time: number;
  passengers: number;
  mode: number;
  luggage?: number;
}

export interface ExtractionContext {
  slots: Record<string, ConfirmedSlot | undefined>;
  overallConfidence: number;
  conversationalState: ConversationalState;
  clarifyField: string | null;
  askForConfirmation: boolean;
  tariff?: {
    matched: boolean;
    price?: number;
    canonicalOrigin?: string;
    canonicalDestination?: string;
    displayOrigin?: string;
    displayDestination?: string;
    method?: string;
  };
  // role lock + slot stability detectados por CORE.
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
  domain?: ConversationDomain;
  temporalMode?: TemporalMode;
  operationalMode?: OperationalMode;
}

export function operationalModeToMode(om: OperationalMode): Mode {
  return om === "RESERVATION" ? "RESERVA" : "AHORA";
}

export function temporalFromFacts(facts: string[]): TemporalMode {
  const hasNow = facts.some(f => f.startsWith("now:") || f.startsWith("urgency:"));
  const hasFuture = facts.some(f => f.startsWith("date:") || f.startsWith("time:"));
  if (hasNow) return "NOW";
  if (hasFuture) return "FUTURE";
  return "UNKNOWN";
}

export function operationalModeFromIntent(intent: Intent, temporal: TemporalMode): OperationalMode {
  if (intent === "CONSULTA" || intent === "GREETING" || intent === "COMMERCIAL" || intent === "INFORMATIONAL" || intent === "AMBIGUOUS") {
    return "INFO";
  }
  if (intent === "EMERGENCY") return "DISPATCH";
  if (intent === "NOW") return "DISPATCH";
  if (intent === "BOOKING") {
    if (temporal === "NOW") return "DISPATCH";
    if (temporal === "FUTURE") return "RESERVATION";
    return "CLARIFY";
  }
  if (intent === "PRE_BOOKING" || intent === "RESCHEDULE") return "RESERVATION";
  return "INFO";
}

export function hasNowSignal(facts: string[]): boolean {
  return facts.some(f => f.startsWith("now:") || f.startsWith("urgency:"));
}

export function hasFutureSignal(facts: string[], scheduledAt: boolean): boolean {
  return scheduledAt || facts.some(f => f.startsWith("date:") || f.startsWith("time:"));
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
  // CONFIRMATION UI — cuando la respuesta es una confirmación de ubicación,
  // transporta los botones interactivos para sendInteractiveButtons.
  confirmationUI?: import("./slot-confirmation").SlotConfirmationUI;
}

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}

// ─── Opportunity types (shared across ai/ and services/learning) ───

export interface OpportunityOffer {
  type: string;
  label: string;
  description: string | null;
  savings: number;
  already_applied: boolean;
  valid_until: number | null;
}

export interface OpportunityResult {
  available: boolean;
  opportunities: OpportunityOffer[];
}
