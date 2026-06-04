// POLICY AHORA — ejecución inmediata, sin estado, mínima inferencia.
// v5.0 FASE 5B: policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic, inferencia geográfica, generación libre.

import type { FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";

export function policyAhora(decision: FinalDecision, ctx?: HandlerContext): PolicyOutput {
  const lang = ctx?.lang ?? "es";
  const finalResponse = buildAhoraFinalResponse(decision, ctx, lang);
  const requiresUserInput = decision.decision === "CLARIFY";
  const stateful = false;

  let policyHint: string;
  let requiresConfirmation = false;
  let nextExpectedFields: string[] = [];

  switch (decision.decision) {
    case "EXECUTE":
      policyHint = "AHORA: ejecutar acción inmediata.";
      break;
    case "ANSWER":
      policyHint = "AHORA: responder directo sin seguimiento conversacional.";
      break;
    case "CLARIFY": {
      policyHint = "AHORA: pedir solo el dato mínimo necesario.";
      const factField = inferMissingFieldFromCore(decision);
      nextExpectedFields = factField ? [factField] : [];
      break;
    }
    case "SAFE_FALLBACK":
    default:
      policyHint = "AHORA: respuesta segura genérica sin inferencias.";
  }

  return {
    decision: decision.decision,
    mode: "AHORA",
    policyHint,
    requiresConfirmation,
    stateful,
    finalResponse,
    requiresUserInput,
    nextExpectedFields,
    outputSource: "POLICY",
  };
}

function buildAhoraFinalResponse(decision: FinalDecision, ctx: HandlerContext | undefined, lang: Lang): string {
  const greet = lang === "en" ? "Hi!" : lang === "pt" ? "Olá!" : "¡Hola!";
  const name = ctx?.customerName ? ` ${ctx.customerName}` : "";

  switch (decision.decision) {
    case "EXECUTE": {
      if (lang === "en") return `${greet}${name}, we're processing your request. A driver will contact you shortly.`;
      if (lang === "pt") return `${greet}${name}, estamos processando seu pedido. Um motorista entrará em contato em breve.`;
      return `${greet}${name}, estamos procesando tu pedido. En breve un chofer te contacta.`;
    }
    case "ANSWER": {
      if (lang === "en") return `${greet}${name}, for pricing and availability, an operator will assist you shortly.`;
      if (lang === "pt") return `${greet}${name}, para valores e disponibilidade, um operador vai te atender em breve.`;
      return `${greet}${name}, para tarifas y disponibilidad, un operador te va a asistir en breve.`;
    }
    case "CLARIFY": {
      const field = inferMissingFieldFromCore(decision);
      if (field === "location_ambiguous") {
        if (lang === "en") return `${greet}${name}, which specific place and time do you need the ride?`;
        if (lang === "pt") return `${greet}${name}, qual local específico e que horas você precisa da corrida?`;
        return `${greet}${name}, ¿qué lugar específico y a qué hora necesitás el viaje?`;
      }
      if (field === "origin") {
        if (lang === "en") return `${greet}${name}, where are you right now?`;
        if (lang === "pt") return `${greet}${name}, onde você está agora?`;
        return `${greet}${name}, ¿desde dónde salís?`;
      }
      if (field === "destination") {
        if (lang === "en") return `${greet}${name}, where do you need to go?`;
        if (lang === "pt") return `${greet}${name}, para onde você precisa ir?`;
        return `${greet}${name}, ¿a dónde necesitás ir?`;
      }
      if (field === "time") {
        if (lang === "en") return `${greet}${name}, what time do you need the ride?`;
        if (lang === "pt") return `${greet}${name}, a que horas você precisa da corrida?`;
        return `${greet}${name}, ¿a qué hora necesitás el viaje?`;
      }
      if (lang === "en") return `${greet}${name}, could you tell me more about what you need?`;
      if (lang === "pt") return `${greet}${name}, pode me contar melhor o que você precisa?`;
      return `${greet}${name}, ¿podés contarme un poco más sobre lo que necesitás?`;
    }
    case "SAFE_FALLBACK":
    default: {
      if (lang === "en") return `${greet}${name}, I didn't catch that. Could you rephrase?`;
      if (lang === "pt") return `${greet}${name}, não entendi. Pode reformular?`;
      return `${greet}${name}, no te entendí. ¿Podés reformularlo?`;
    }
  }
}

function inferMissingFieldFromCore(decision: FinalDecision): string | null {
  const facts = decision.core.facts;
  const hasLocationAmbiguous = facts.includes("location_ambiguous:true");
  if (hasLocationAmbiguous) return "location_ambiguous";
  if (!facts.some((f) => f.startsWith("origin:"))) return "origin";
  if (!facts.some((f) => f.startsWith("destination:"))) return "destination";
  if (!facts.some((f) => f.startsWith("time:")) && !facts.some((f) => f.startsWith("date:"))) return "time";
  if (!facts.some((f) => f.startsWith("passengers:"))) return "passengers";
  return null;
}
