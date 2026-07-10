// CLIENT OBJECTIVE — Modelo de objetivo del cliente (E12).
// Función pura: sintetiza señales existentes (facts, purchaseIntent, messageType)
// en un valor discreto de client_objective que Policy y LLM pueden consumir.
//
// Responsabilidad: responder "¿qué quiere lograr este pasajero?"
// - booking_urgent: comprar YA (alta urgencia + alta intención)
// - booking_future: comprar con fecha planificada
// - booking_generic: comprar sin señales temporales claras
// - inquiry_price: consultar precio sin compromiso
// - comparing_options: comparar alternativas sin decisión
// - trust_check: evaluar confiabilidad del servicio
// - info_request: buscar información factual
// - cancelling: quiere cancelar una reserva existente
// - none: sin objetivo claro detectable
//
// Principios:
// - No crear nuevas señales ni regex. Usar solo las existentes.
// - trust_check es la excepción: no existe señal actual que lo cubra.
// - No modificar core.ts ni conversation-interpreter.ts.

import type { ClientObjective } from "./types";

/**
 * Regex para detectar preguntas de confianza/seguridad.
 * No existe en ningún otro lugar — es la ÚNICA señal nueva de E12.
 */
const TRUST_CHECK_RE = /\b(confianz|confiable|segur[oa]|garant[ií]a|recomendad[oa]|referencia|estafa|fiable|seriedad|son\s+confiables|es\s+seguro|me\s+d[aa]s?\s+confianza|conf[ií]o)\b/i;

/**
 * Determina si el texto del usuario expresa una preocupación de confianza/seguridad.
 */
function detectTrustCheck(text: string): boolean {
  return TRUST_CHECK_RE.test(text);
}

/**
 * Detecta si hay señales de urgencia en los facts.
 */
function hasUrgency(facts: string[]): boolean {
  return facts.some(f => f.startsWith("urgency:") || f.startsWith("now:"));
}

/**
 * Detecta si hay señales de fecha/horario en los facts.
 */
function hasDateOrTime(facts: string[]): boolean {
  return facts.some(f => f.startsWith("date:") || f.startsWith("time:"));
}

/**
 * Determina el client_objective del mensaje actual basado en señales existentes.
 *
 * Orden de evaluación (más específico primero):
 * 1. trust_check — preocupación de confianza/seguridad
 * 2. cancelling — el usuario quiere cancelar
 * 3. booking_urgent — alta intención + urgencia temporal
 * 4. booking_future — alta intención + fecha planificada
 * 5. booking_generic — alta intención sin señales temporales
 * 6. inquiry_price — consulta de precio sin compromiso
 * 7. comparing_options — comparación de alternativas
 * 8. info_request — búsqueda de información factual
 * 9. none — sin objetivo claro
 *
 * @param facts — array de facts de CORE (core().facts)
 * @param purchaseIntent — purchaseIntent de CORE ("high" | "medium" | "low")
 * @param messageType — MessageType del Conversation Interpreter (opcional)
 * @param userText — texto original del usuario (opcional, necesario para trust_check)
 */
export function computeClientObjective(
  facts: string[],
  purchaseIntent?: string,
  messageType?: string,
  userText?: string,
): ClientObjective {
  // 1. trust_check (requiere texto del usuario)
  if (userText && detectTrustCheck(userText)) {
    return "trust_check";
  }

  // 2. cancelling
  if (messageType === "cancel") {
    return "cancelling";
  }

  // 3-5. Escenarios de compra
  if (purchaseIntent === "high") {
    if (hasUrgency(facts)) return "booking_urgent";
    if (hasDateOrTime(facts)) return "booking_future";
    return "booking_generic";
  }

  // 6. Consulta de precio
  if (facts.some(f => f.startsWith("commercial:"))) {
    return "inquiry_price";
  }

  // 7. Comparación
  if (facts.some(f => f.startsWith("pre_booking:"))) {
    return "comparing_options";
  }

  // 8. Solicitud de información
  if (facts.some(f => f.startsWith("informational:"))) {
    return "info_request";
  }

  // 9. Sin objetivo claro
  return "none";
}
