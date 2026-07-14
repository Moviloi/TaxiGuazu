// Tipos base de la arquitectura CORE â†’ ROUTER â†’ POLICIES
// Determinista, sin LLM en la decisiÃ³n ni en el output final.
//
// PolicyOutput es la ÃšNICA fuente del finalResponse.
// outputSource es un discriminante que el guardrail enforce.

export type Intent = "GREETING" | "INFORMATIONAL" | "COMMERCIAL" | "PRE_BOOKING" | "BOOKING" | "NOW" | "RESCHEDULE" | "POST_SERVICE" | "EMERGENCY" | "CONSULTA" | "AMBIGUOUS";

export type Mode = "AHORA" | "RESERVA";
export type TemporalMode = "NOW" | "FUTURE" | "UNKNOWN";
export type OperationalMode = "DISPATCH" | "RESERVATION" | "CLARIFY" | "INFO";

export type OutputType = "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";

export type ConversationDomain = "information" | "commercial" | "reservation" | "dispatch";

export type ConversationalState = "idle" | "collecting_slots" | "slot_confirmation" | "awaiting_passenger" | "awaiting_confirmation" | "pending_human_review" | "ambiguity_pending";

export type DispatchState = "idle" | "nivel_1" | "nivel_2" | "nivel_3" | "waiting_driver" | "closed";

// E12: Client Objective Model â€” sintetiza seÃ±ales existentes en un valor
// que describe quÃ© quiere lograr el pasajero en este turno conversacional.
export type ClientObjective =
  | "booking_urgent"      // purchaseIntent=high + urgency: o now: fact
  | "booking_future"      // purchaseIntent=high + date: o time: fact
  | "booking_generic"     // purchaseIntent=high sin seÃ±ales temporales
  | "inquiry_price"       // commercial: fact presente + purchaseIntent NOT high
  | "comparing_options"   // pre_booking: fact presente
  | "trust_check"         // preguntas de confianza/seguridad (nueva detecciÃ³n E12)
  | "info_request"        // informational: fact presente
  | "cancelling"          // messageType === "cancel"
  | "none";               // sin objetivo claro

// R1: Strategy Decision â€” sÃ­ntesis de seÃ±ales estratÃ©gicas para Policy.
// Determinado por computeStrategyDecision() en conversation-strategy.ts.
// Centraliza decisiones que antes estaban distribuidas en policies.

export type ConversationMode = "execute_immediate" | "execute_confirm" | "clarify" | "answer" | "safe_fallback";
export type ConversationTone = "urgent" | "warm" | "direct" | "gentle";
export type ConversationSpeed = "fast" | "normal" | "slow";

export interface BehaviorFlags {
  /** booking_urgent â†’ dispatch sin preguntar campos faltantes */
  skipFieldResolution: boolean;
  /** inquiry_price â†’ no cerrar booking en affirmation */
  inhibitBookingAccept: boolean;
  /** cancel â†’ no continuar flujo comercial */
  inhibitNewBooking: boolean;
  /** correction â†’ preservar contexto conversacional */
  preserveContext: boolean;
  /** low purchaseIntent o execute sin placeholder â†’ saltar LLM */
  skipLLM: boolean;
  /** EMERGENCY/RESCHEDULE â†’ notificar admin */
  needsAdminNotify: boolean;
  // â”€â”€ R2 Phase 1: Conversation Speed â”€â”€
  /** speed=fast â†’ saltar turno de confirmaciÃ³n (no preguntar "Â¿ConfirmÃ¡s?") */
  skipConfirmation: boolean;
  /** speed=fast â†’ minimizar preguntas al usuario */
  minimizeQuestions: boolean;
}

// R3: Response length â€” quÃ© tan verbose debe ser la respuesta.
// short=1-2 oraciones, normal=2-3 oraciones, detailed=hasta 5 oraciones.
export type ResponseLength = "short" | "normal" | "detailed";

// R3: Call-to-action intensity â€” si el bot debe intentar cerrar booking.
export type CTAIntensity = "none" | "soft" | "direct";

// R4: Field acquisition mode â€” quÃ© tan agresivamente preguntar campos faltantes.
// skip=no preguntar (booking_urgent/emergency), minimal=solo esencial (fast speed), normal=preguntar todo.
export type FieldAcquisitionMode = "skip" | "minimal" | "normal";

export interface StrategyDecision {
  mode: ConversationMode;
  tone: ConversationTone;
  speed: ConversationSpeed;
  /** R4: Prioridad de campos a preguntar (ordenado, vacÃ­o si skip mode) */
  fieldPriority: string[];
  /** R2: Longitud del saludo segÃºn velocidad de conversaciÃ³n */
  greetingLength: "short" | "full";
  // â”€â”€ R3 Phase 1: Conversation Tone â”€â”€
  /** R3: Verbosidad de la respuesta (short=fast, detailed=ANSWER) */
  responseLength: ResponseLength;
  /** R3: Si la respuesta debe incluir lenguaje de confianza/seguridad */
  reassuranceNeeded: boolean;
  /** R3: Intensidad del llamado a acciÃ³n (none=info, booking) */
  callToAction: CTAIntensity;
  // â”€â”€ R4 Phase 1: Field Priority â”€â”€
  /** R4: Modo de adquisiciÃ³n de campos faltantes */
  fieldAcquisitionMode: FieldAcquisitionMode;
  behaviorFlags: BehaviorFlags;
}

// TripState: solo "opportunity" es operativo.
// El cierre real del viaje usa trips.status / trips.trip_phase.
// null = sin opportunity activa.
export type TripState = "opportunity" | null;

export type OutputSource = "POLICY";

export type Lang = "es" | "en" | "pt";

// slot stability + role lock:
// "locked" = el slot fue fijado por la estructura sintÃ¡ctica del input
//   (ej. "estoy en X" â†’ origin locked a X). No se reinterpreta en turnos
//   posteriores.
// "ambiguous" = el slot tiene un valor genÃ©rico (centro, hotel) que requiere
//   refinamiento, pero su rol (origin/destination) ya estÃ¡ fijado.
// "open" = el slot no fue detectado; estÃ¡ disponible para asignaciÃ³n.
export type SlotStability = "locked" | "ambiguous" | "open";

export interface RoleLock {
  origin: string | null;
  destination: string | null;
}

export interface SlotStabilityMap {
  origin: SlotStability;
  destination: SlotStability;
}

/** Confianza de asignaciÃ³n de slot basada en sintaxis.
 *  "estoy en {X}" â†’ origin=0.95, "ir a {Y}" â†’ destination=0.90
 *  0 = no detectado, 1 = certeza absoluta del rol.
 *  Esto NO es confianza de entidad (cuÃ¡l lugar especÃ­fico).
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
  // P0.6: detecciÃ³n de intenciÃ³n de compra (high = pasajero da datos especÃ­ficos, low = especula)
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

// Mapa de certeza por dimensiÃ³n (FASE A4)
// Cada dimensiÃ³n representa quÃ© tan seguro estÃ¡ el sistema del valor detectado.
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
  // (cuando slots estÃ¡n locked) vs CLARIFY.
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
  /** E11: purchase intent detectado por CORE (high=compra activa, low=especulaciÃ³n) */
  purchaseIntent?: "high" | "medium" | "low";
  /** E11-B: urgency detectada por CORE (valor del fact urgency:, ej: "ahora", "urgente") */
  urgency?: string | null;
  /** E11-B: MessageType del Conversation Interpreter (ADR-007) para decisiones de Policy */
  messageType?: string;
  /** E11-B: el mensaje actual es una correcciÃ³n explÃ­cita */
  isCorrection?: boolean;
  /** E12: Client Objective â€” quÃ© quiere lograr el pasajero */
  clientObjective?: ClientObjective;
  /** R1: Strategy Decision â€” sÃ­ntesis centralizada de decisiones estratÃ©gicas */
  strategyDecision?: StrategyDecision;
  /** PR-2A: CoreDecision pre-computado para eliminar doble ejecuciÃ³n de core() */
  analysis?: CoreDecision;
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
  // EXECUTION METADATA â€” flags para efectos secundarios post-decisiÃ³n.
  // Indican quÃ© efectos secundarios ejecutar ademÃ¡s de send+persist.
  needsGeo: boolean;
  needsSaveContext: boolean;
  // ADMIN NOTIFY â€” side effect flag for lateral intents (EMERGENCY, RESCHEDULE).
  needsAdminNotify?: boolean;
  adminNotifyBody?: string;
  // CONFIRMATION UI â€” cuando la respuesta es una confirmaciÃ³n de ubicaciÃ³n,
  // transporta los botones interactivos para sendInteractiveButtons.
  confirmationUI?: import("./slot-confirmation").SlotConfirmationUI;
}

export interface HandleMessageResult {
  decision: FinalDecision;
  policy: PolicyOutput;
}

// â”€â”€â”€ Opportunity types (shared across ai/ and services/learning) â”€â”€â”€

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
