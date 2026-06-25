// RESPONSE BUILDER — única fuente de mensajes textuales.
// Toda respuesta al usuario debe construirse aquí.
// Las policies deciden QUÉ responder; response-builder decide CÓMO escribirlo.
//
// Categorías (separadas conceptualmente para evitar GOD file):
//   1. Conversacional — saludos
//   2. Operacional — clarificación, precio, oportunidades
//   3. Fleet — capacidad, tarifa faltante
//   4. Error — fallback, escalación, error global

import type { FinalDecision, Lang, OpportunityResult, ExtractionContext } from "./types";
import { buildSlotConfirmationMessage, type SlotConfirmationUI } from "./slot-confirmation";

// ─── 1. CONVERSACIONAL ───────────────────────────────────────────────────────

export function buildGreeting(lang: Lang, customerName?: string): string {
  const greet = lang === "en" ? "Hi!" : lang === "pt" ? "Olá!" : "¡Hola!";
  return customerName ? `${greet} ${customerName}` : greet;
}

// ─── 2. OPERACIONAL ──────────────────────────────────────────────────────────

export function inferMissingFieldFromCore(decision: FinalDecision): string | null {
  const facts = decision.core.facts;
  if (!facts.some((f) => f.startsWith("origin:"))) return "origin";
  if (!facts.some((f) => f.startsWith("destination:"))) return "destination";
  if (facts.includes("location_ambiguous:true")) return "location_ambiguous";
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
  originDisplay?: string,
  destDisplay?: string,
): string {
  const o = originDisplay ?? originName;
  const d = destDisplay ?? destinationName;
  if (lang.startsWith("pt")) {
    return `O traslado de ${o} para ${d} custa R$ ${price}.`;
  }
  return `El traslado de ${o} a ${d} cuesta $${price} ARS.`;
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

// ─── 2b. DOMAIN RESPONSES (informational/commercial, no booking cycle) ────────

export function buildInformationalResponse(intent: string, lang: Lang): string {
  if (intent === "GREETING") {
    if (lang === "en") return "Hi! How can I help you with your transfer?";
    if (lang === "pt") return "Olá! Como posso ajudar com seu traslado?";
    return "¡Hola! ¿En qué puedo ayudarte con tu traslado?";
  }
  if (lang === "en") return "I'm here to help with information about transfers and tours in Iguazú. What would you like to know?";
  if (lang === "pt") return "Estou aqui para ajudar com informações sobre traslados e passeios em Iguaçu. O que gostaria de saber?";
  return "Estoy acá para ayudarte con información sobre traslados y paseos en Iguazú. ¿Qué querés saber?";
}

export function buildCommercialResponse(_intent: string, lang: Lang): string {
  if (lang === "en") return "For pricing and availability, please let me know your route and how many passengers.";
  if (lang === "pt") return "Para valores e disponibilidade, informe seu trajeto e quantos passageiros.";
  return "Para tarifas y disponibilidad, indicame tu recorrido y cuántos pasajeros son.";
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

export function buildCancellationMessage(lang: Lang): string {
  if (lang === "en") return "No problem. Your booking has been cancelled. Let me know if you need anything else.";
  if (lang === "pt") return "Sem problemas. Sua solicitação foi cancelada. Me avise se precisar de mais alguma coisa.";
  return "No hay problema. Se canceló la confirmación. Avísame si necesitás algo más.";
}

export function buildGlobalErrorMessage(): string {
  return "Disculpe, ocurrió un error. Un operador lo asistirá.";
}

export function buildEscalationMessage(): string {
  return "No entendí bien tu consulta. Un operador humano te va a contactar para ayudarte.";
}

export function buildNowDispatchResponse(lang: Lang): string {
  if (lang === "en") return "Looking for an available driver for your trip. We'll notify you when someone picks it up.";
  if (lang === "pt") return "Procurando um motorista disponível para sua corrida. Avisamos quando alguém aceitar.";
  return "Buscando chofer disponible para tu viaje. Te avisamos cuando alguien tome el servicio.";
}

/** @deprecated Usar buildSlotConfirmationMessage (slot-confirmation.ts) o buildLocationConfirmationResponse */
export function buildAmbiguousLocationConfirm(
  origin: string,
  dest: string,
  lang: Lang,
  originDisplay?: string,
  destDisplay?: string,
): string {
  const o = originDisplay ?? origin;
  const d = destDisplay ?? dest;
  if (lang === "en") return `Just to confirm: from ${o} to ${d}. Could you give me the exact addresses?`;
  if (lang === "pt") return `Só para confirmar: de ${o} para ${d}. Pode me passar os endereços exatos?`;
  return `Solo para confirmar: de ${o} a ${d}. ¿Podés darme las direcciones exactas?`;
}

export function buildLocationConfirmationResponse(
  extractionCtx: ExtractionContext,
  lang: Lang,
): SlotConfirmationUI {
  return buildSlotConfirmationMessage(extractionCtx, lang);
}
