// RESPONSE BUILDER — única fuente de mensajes textuales.
// Toda respuesta al usuario debe construirse aquí.
// Las policies deciden QUÉ responder; response-builder decide CÓMO escribirlo.
//
// Categorías (separadas conceptualmente para evitar GOD file):
//   1. Conversacional — saludos
//   2. Operacional — clarificación, precio, oportunidades
//   3. Fleet — capacidad, tarifa faltante
//   4. Error — fallback, escalación, error global

import type { FinalDecision, Lang } from "./types";
import type { OpportunityResult } from "@/lib/services/opportunity-engine";

// ─── 1. CONVERSACIONAL ───────────────────────────────────────────────────────

export function buildGreeting(lang: Lang, customerName?: string): string {
  const greet = lang === "en" ? "Hi!" : lang === "pt" ? "Olá!" : "¡Hola!";
  return customerName ? `${greet} ${customerName}` : greet;
}

// ─── 2. OPERACIONAL ──────────────────────────────────────────────────────────

export function inferMissingFieldFromCore(decision: FinalDecision): string | null {
  const facts = decision.core.facts;
  if (facts.includes("location_ambiguous:true")) return "location_ambiguous";
  if (!facts.some((f) => f.startsWith("origin:"))) return "origin";
  if (!facts.some((f) => f.startsWith("destination:"))) return "destination";
  if (!facts.some((f) => f.startsWith("time:")) && !facts.some((f) => f.startsWith("date:"))) return "time";
  if (!facts.some((f) => f.startsWith("passengers:"))) return "passengers";
  return null;
}

export function buildGenericClarify(field: string | null, lang: Lang): string {
  if (field === "location_ambiguous") {
    if (lang === "en") return "Which specific place and what time do you need the ride?";
    if (lang === "pt") return "Qual local específico e que horas você precisa da corrida?";
    return "¿Qué lugar específico y a qué hora necesitás el viaje?";
  }
  if (field === "origin") {
    if (lang === "en") return "Where are you leaving from?";
    if (lang === "pt") return "De onde você está saindo?";
    return "¿Desde dónde salís?";
  }
  if (field === "destination") {
    if (lang === "en") return "Where do you need to go?";
    if (lang === "pt") return "Para onde você precisa ir?";
    return "¿A dónde necesitás ir?";
  }
  if (field === "time") {
    if (lang === "en") return "What time do you need the ride?";
    if (lang === "pt") return "A que horas você precisa da corrida?";
    return "¿A qué hora necesitás el viaje?";
  }
  if (field === "passengers") {
    if (lang === "en") return "How many passengers?";
    if (lang === "pt") return "Quantos passageiros?";
    return "¿Cuántos pasajeros?";
  }
  if (lang === "en") return "Could you tell me more about the trip you need?";
  if (lang === "pt") return "Pode me contar mais sobre a viagem que você precisa?";
  return "¿Podés contarme un poco más sobre el viaje que necesitás?";
}

export function buildSlotClarify(slot: string, lang: Lang): string {
  if (slot === "origin") {
    if (lang === "en") return "Where are you leaving from?";
    if (lang === "pt") return "De onde você vai sair?";
    return "¿Desde dónde salís?";
  }
  if (slot === "destination") {
    if (lang === "en") return "Where do you need to go?";
    if (lang === "pt") return "Para onde você precisa ir?";
    return "¿A dónde necesitás ir?";
  }
  if (lang === "en") return "I'm not sure about the destination. Could you confirm it?";
  if (lang === "pt") return "Não tenho certeza do destino. Pode confirmar?";
  return "No estoy seguro del destino. ¿Podés confirmarlo?";
}

export function buildPriceInfo(
  originName: string,
  destinationName: string,
  price: number,
  lang: Lang,
): string {
  if (lang.startsWith("pt")) {
    return `O traslado de ${originName} para ${destinationName} custa R$ ${price}.`;
  }
  return `El traslado de ${originName} a ${destinationName} cuesta $${price} ARS.`;
}

export function buildOpportunityNoPricingMessage(lang: string): string {
  return lang.startsWith("pt")
    ? "Primeiro preciso saber o trajeto para verificar benefícios disponíveis."
    : "Primero necesito saber el trayecto para verificar beneficios disponibles.";
}

export function buildOpportunityOfferMessage(description: string): string {
  return `${description} ¿Te interesa recibir información?`;
}

export function buildOpportunityAcceptedMessage(label: string): string {
  return `Perfecto. Te comparto información sobre ${label}.`;
}

export function buildOpportunityDeclinedMessage(): string {
  return "Entendido. Quedamos a disposición.";
}

export function formatOpportunityResponse(
  result: OpportunityResult,
  lang: string,
): string {
  if (!result.available) {
    return lang.startsWith("pt")
      ? "No momento, não há benefícios adicionais disponíveis para esta rota. O preço oficial já é o melhor que podemos oferecer."
      : "Por el momento no hay beneficios adicionales disponibles para esta ruta. El precio oficial ya es el mejor que podemos ofrecer.";
  }

  const lines: string[] = [];
  const applied = result.opportunities.filter(o => o.already_applied);
  const available = result.opportunities.filter(o => !o.already_applied);

  if (applied.length > 0) {
    lines.push(lang.startsWith("pt")
      ? "✅ *Benefícios já aplicados ao preço:*"
      : "✅ *Beneficios ya aplicados al precio:*");
    for (const o of applied) {
      lines.push(`• ${o.label} (${lang.startsWith("pt") ? "economia" : "ahorro"}: $${o.savings})`);
    }
  }

  if (available.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(lang.startsWith("pt")
      ? "🎯 *Oportunidades disponíveis:*"
      : "🎯 *Oportunidades disponibles:*");
    for (const o of available) {
      const suffix = o.valid_until
        ? ` (${lang.startsWith("pt") ? "válido até" : "válido hasta"} ${new Date(o.valid_until * 1000).toLocaleDateString()})`
        : "";
      lines.push(`• ${o.label} — ${lang.startsWith("pt") ? "economia de" : "ahorro de"} $${o.savings}${suffix}`);
    }
  }

  return lines.join("\n");
}

// ─── 3. FLEET ─────────────────────────────────────────────────────────────────

export function buildFleetCapacityMessage(maxCapacity: number | null): string {
  if (maxCapacity === null) {
    return "Actualmente no tenemos vehículos disponibles. Para reservar, comuníquese con un operador.";
  }
  return `Actualmente nuestra flota admite hasta ${maxCapacity} pasajeros por vehículo. Para grupos mayores, comuníquese con un operador.`;
}

export function buildFleetTariffMessage(): string {
  return `Por el momento no tenemos una tarifa configurada para esa cantidad de pasajeros. Comuníquese con un operador para coordinar el viaje.`;
}

// ─── 4. ERROR ─────────────────────────────────────────────────────────────────

export function buildGenericSafeFallback(lang: Lang): string {
  if (lang === "en") return "I couldn't process that. An operator will assist you shortly.";
  if (lang === "pt") return "Não consegui processar isso. Um operador vai te atender em breve.";
  return "No pude procesar eso. Un operador te va a asistir en breve.";
}

export function buildGlobalErrorMessage(): string {
  return "Disculpe, ocurrió un error. Un operador lo asistirá.";
}

export function buildF4EscalationMessage(): string {
  return "No entendí bien tu consulta. Un operador humano te va a contactar para ayudarte.";
}
