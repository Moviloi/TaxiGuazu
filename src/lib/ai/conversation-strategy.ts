// CONVERSATION STRATEGY — Estrategia conversacional (R1).
// Función pura: sintetiza señales existentes (purchaseIntent, urgency,
// clientObjective, messageType) en un StrategyDecision que las policies
// consumen en vez de evaluar señales sueltas.
//
// Responsabilidad: responder "¿cómo conducir esta conversación?"
// - mode: modo de interacción (execute_immediate, execute_confirm, clarify, answer, safe_fallback)
// - tone: tono de la respuesta (urgent, warm, direct, gentle)
// - speed: velocidad de la conversación (fast, normal, slow)
// - behaviorFlags: banderas de comportamiento que reemplazan decisiones distribuidas
//
// Principios:
// - Función pura: sin side effects, sin DB, sin servicios, sin async.
// - No crear nuevas señales. Usar solo las existentes en HandlerContext.
// - No modificar CORE, Router, ni prompts LLM.
// - Migración gradual: una señal por vez, comportamiento observable idéntico.
//
// Orden de migración (Phase 1):
// 1. purchaseIntent → behaviorFlags.skipLLM
// 2. urgency → (usado dentro de clientObjective)
// 3. clientObjective → behaviorFlags.skipFieldResolution + inhibitBookingAccept
// 4. messageType → behaviorFlags.inhibitNewBooking + preserveContext

import type { ClientObjective, Intent, OutputType, ResponseLength, CTAIntensity, FieldAcquisitionMode, StrategyDecision } from "./types";

/**
 * Parámetros de entrada para computeStrategyDecision.
 * Subconjunto de HandlerContext + FinalDecision — solo las señales
 * necesarias para decisiones estratégicas.
 */
export interface StrategyInput {
  facts: string[];
  purchaseIntent?: string;
  urgency?: string | null;
  messageType?: string;
  isCorrection?: boolean;
  clientObjective?: ClientObjective;
  decision: OutputType;
  intent: Intent;
}

/**
 * Sintetiza señales existentes en una StrategyDecision.
 *
 * @param input — señales del sistema (HandlerContext + FinalDecision subset)
 * @returns StrategyDecision — modo, tono, velocidad y flags de comportamiento
 */
export function computeStrategyDecision(input: StrategyInput): StrategyDecision {
  const {
    facts: _facts, // reservado para futuras señales temporales
    purchaseIntent,
    urgency: _urgency, // reservado para futura integración directa
    messageType,
    isCorrection,
    clientObjective,
    decision,
    intent,
  } = input;

  // ── Behavior flags (derivados de señales existentes) ──────────────

  // purchaseIntent: low → saltar LLM (speculator path)
  const skipLLM = purchaseIntent === "low";

  // messageType: cancel → no continuar flujo comercial
  const inhibitNewBooking = messageType === "cancel";

  // isCorrection → preservar contexto conversacional
  const preserveContext = isCorrection === true;

  // clientObjective: booking_urgent → skip field resolution, dispatch directo
  const skipFieldResolution = clientObjective === "booking_urgent";

  // clientObjective: inquiry_price → no interpretar affirmation como booking accept
  const inhibitBookingAccept = clientObjective === "inquiry_price";

  // Lateral intents → admin notify
  const needsAdminNotify = intent === "EMERGENCY" || intent === "RESCHEDULE";

  // ── Mode, tone, speed ─────────────────────────────────────────────

  let mode: StrategyDecision["mode"];
  let tone: StrategyDecision["tone"];
  let speed: StrategyDecision["speed"];

  // Prioridad: flags de comportamiento sobreescriben el default
  if (inhibitNewBooking) {
    // Cancel: respuesta directa, sin extender conversación
    mode = "answer";
    tone = "direct";
    speed = "fast";
  } else if (skipFieldResolution) {
    // booking_urgent: ejecución inmediata, tono urgente
    mode = "execute_immediate";
    tone = "urgent";
    speed = "fast";
  } else if (inhibitBookingAccept) {
    // inquiry_price: respuesta directa, sin cerrar booking
    mode = "answer";
    tone = "direct";
    speed = "normal";
  } else {
    // Default basado en OutputType
    switch (decision) {
      case "EXECUTE":
        mode = "execute_confirm";
        tone = "warm";
        speed = "normal";
        break;
      case "ANSWER":
        mode = "answer";
        tone = "direct";
        speed = "normal";
        break;
      case "CLARIFY":
        mode = "clarify";
        tone = "gentle";
        speed = "slow";
        break;
      default:
        mode = "safe_fallback";
        tone = "warm";
        speed = "normal";
    }
  }

  // ── R2: Greeting length (derivado de speed) ─────────────────────
  // fast → saludo corto para no demorar, normal/full → saludo completo
  const greetingLength: "short" | "full" = speed === "fast" ? "short" : "full";

  // ── R2: skipConfirmation (derivado de speed + signals) ──────────
  // fast → saltar confirmación, especialmente booking_urgent
  const skipConfirmation = speed === "fast" && (skipFieldResolution || inhibitNewBooking);

  // ── R2: minimizeQuestions (derivado de speed) ───────────────────
  // fast → minimizar preguntas, slow → preguntar todo necesario
  const minimizeQuestions = speed === "fast";

  // ── R3: Response length (derivado de decision + speed + clientObjective) ──
  // Refleja la lógica actual en llm-response.ts: Max 1-2 (greeting/short),
  // Max 2-3 (normal), Max 5 (informational/ANSWER).
  let responseLength: ResponseLength;
  if (inhibitNewBooking || skipFieldResolution) {
    // Cancel o booking_urgent: respuesta directa y breve
    responseLength = "short";
  } else if (decision === "ANSWER") {
    // Informational: respuesta detallada
    responseLength = "detailed";
  } else if (decision === "CLARIFY") {
    // Clarificación: respuestas cortas
    responseLength = "short";
  } else {
    responseLength = "normal";
  }

  // ── R3: Reassurance (derivado de clientObjective) ─────────────────
  // trust_check → necesita tono de confianza/seguridad
  const reassuranceNeeded = clientObjective === "trust_check";

  // ── R3: Call to action (derivado de intent + clientObjective) ─────
  // Refleja la lógica actual en CLIENT_OBJ_RULES e isInformational
  let callToAction: CTAIntensity;
  if (inhibitNewBooking || inhibitBookingAccept || clientObjective === "info_request" || clientObjective === "trust_check") {
    // Cancel, inquiry_price, info, trust: NO intentar booking
    callToAction = "none";
  } else if (intent === "BOOKING" || intent === "NOW" || skipFieldResolution) {
    // Booking activo: llamado directo a confirmar/ejecutar
    callToAction = "direct";
  } else if (intent === "PRE_BOOKING" || clientObjective === "comparing_options") {
    // Comparando: invitación suave
    callToAction = "soft";
  } else {
    callToAction = "none";
  }

  // ── R4: Field acquisition mode (derivado de señales + speed) ─────
  // skip → no preguntar nada (booking_urgent, cancel, emergency)
  // minimal → solo preguntar esencial (fast speed)
  // normal → preguntar todo (slow/normal speed)
  let fieldAcquisitionMode: FieldAcquisitionMode;
  if (skipFieldResolution || inhibitNewBooking || needsAdminNotify) {
    // booking_urgent, cancel, emergency: no preguntar campos
    fieldAcquisitionMode = "skip";
  } else if (minimizeQuestions) {
    // fast speed: solo preguntar esencial
    fieldAcquisitionMode = "minimal";
  } else {
    fieldAcquisitionMode = "normal";
  }

  // ── R4: Field priority (orden canónico de adquisición) ──────────
  // El orden refleja la prioridad de resolveNextRequiredField (field-resolver.ts):
  //   1. origin (siempre primero)
  //   2. destination
  //   3. passengers
  //   4. scheduled_at
  // En skip mode → vacío (no preguntar nada).
  // En minimal mode → solo origin + destination (esenciales).
  let fieldPriority: string[];
  if (fieldAcquisitionMode === "skip") {
    fieldPriority = [];
  } else if (fieldAcquisitionMode === "minimal") {
    fieldPriority = ["origin", "destination"];
  } else {
    fieldPriority = ["origin", "destination", "passengers", "scheduled_at"];
  }

  return {
    mode,
    tone,
    speed,
    greetingLength,
    responseLength,
    reassuranceNeeded,
    callToAction,
    fieldAcquisitionMode,
    fieldPriority,
    behaviorFlags: {
      skipFieldResolution,
      inhibitBookingAccept,
      inhibitNewBooking,
      preserveContext,
      skipLLM,
      needsAdminNotify,
      // R2 Phase 1
      skipConfirmation,
      minimizeQuestions,
    },
  };
}
