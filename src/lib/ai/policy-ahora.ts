// POLICY AHORA — ejecución inmediata, sin estado, mínima inferencia.
// v5.0 FASE 5B: policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic, inferencia geográfica, generación libre.

import { inferMissingFieldFromCore, buildGreeting } from "./response-builder";
import type { FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";

export function policyAhora(decision: FinalDecision, ctx?: HandlerContext): PolicyOutput {
  const lang = ctx?.lang ?? "es";
  const finalResponse = buildAhoraFinalResponse(decision, ctx, lang);
  const requiresUserInput = decision.decision === "CLARIFY";

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
    finalResponse,
    requiresUserInput,
    nextExpectedFields,
    outputSource: "POLICY",
    needsGeo: false,
    needsSaveContext: false,
  };
}

function buildAhoraFinalResponse(decision: FinalDecision, ctx: HandlerContext | undefined, lang: Lang): string {
  const greet = buildGreeting(lang, ctx?.customerName);

  switch (decision.decision) {
    case "EXECUTE": {
      if (lang === "en") return `${greet}, we're processing your request. A driver will contact you shortly.`;
      if (lang === "pt") return `${greet}, estamos processando seu pedido. Um motorista entrará em contato em breve.`;
      return `${greet}, estamos procesando tu pedido. En breve un chofer te contacta.`;
    }
    case "ANSWER": {
      if (lang === "en") return `${greet}, for pricing and availability, an operator will assist you shortly.`;
      if (lang === "pt") return `${greet}, para valores e disponibilidade, um operador vai te atender em breve.`;
      return `${greet}, para tarifas y disponibilidad, un operador te va a asistir en breve.`;
    }
    case "CLARIFY": {
      const field = inferMissingFieldFromCore(decision);
      if (field === "location_ambiguous") {
        if (lang === "en") return `${greet}, which specific place and time do you need the ride?`;
        if (lang === "pt") return `${greet}, qual local específico e que horas você precisa da corrida?`;
        return `${greet}, ¿qué lugar específico y a qué hora necesitás el viaje?`;
      }
      if (field === "origin") {
        if (lang === "en") return `${greet}, where are you right now?`;
        if (lang === "pt") return `${greet}, onde você está agora?`;
        return `${greet}, ¿desde dónde salís?`;
      }
      if (field === "destination") {
        if (lang === "en") return `${greet}, where do you need to go?`;
        if (lang === "pt") return `${greet}, para onde você precisa ir?`;
        return `${greet}, ¿a dónde necesitás ir?`;
      }
      if (field === "time") {
        if (lang === "en") return `${greet}, what time do you need the ride?`;
        if (lang === "pt") return `${greet}, a que horas você precisa da corrida?`;
        return `${greet}, ¿a qué hora necesitás el viaje?`;
      }
      if (lang === "en") return `${greet}, could you tell me more about what you need?`;
      if (lang === "pt") return `${greet}, pode me contar melhor o que você precisa?`;
      return `${greet}, ¿podés contarme un poco más sobre lo que necesitás?`;
    }
    case "SAFE_FALLBACK":
    default: {
      if (lang === "en") return `${greet}, I didn't catch that. Could you rephrase?`;
      if (lang === "pt") return `${greet}, não entendi. Pode reformular?`;
      return `${greet}, no te entendí. ¿Podés reformularlo?`;
    }
  }
}