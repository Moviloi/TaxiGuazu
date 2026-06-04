// POLICY RESERVA — flujos multi-step, STATEFUL, confirmación obligatoria en EXECUTE.
// v5.0 FASE 5B: policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic nueva, inferencia geográfica, generación libre.

import type { ExtractionContext, FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";

export function policyReserva(decision: FinalDecision, ctx?: HandlerContext): PolicyOutput {
  const lang = ctx?.lang ?? "es";
  const extraction = ctx?.extraction;
  const stateful = decision.core.intent === "STATEFUL";
  const requiresConfirmation = decision.decision === "EXECUTE";

  const built = buildReservaFinalResponse(decision, extraction, lang);
  const requiresUserInput =
    decision.decision === "CLARIFY" ||
    (decision.decision === "EXECUTE" && extraction?.askForConfirmation === true);
  const nextExpectedFields = built.nextExpectedFields;
  const finalResponse = built.finalResponse;

  let policyHint: string;
  switch (decision.decision) {
    case "EXECUTE":
      policyHint = stateful
        ? "RESERVA: continuar estado existente (STATEFUL)."
        : "RESERVA: ejecutar acción con confirmación obligatoria.";
      break;
    case "ANSWER":
      policyHint = "RESERVA: responder con contexto si existe.";
      break;
    case "CLARIFY":
      policyHint = "RESERVA: pedir clarificación estructurada.";
      break;
    case "SAFE_FALLBACK":
    default:
      policyHint = "RESERVA: requerir confirmación antes de actuar.";
  }

  return {
    decision: decision.decision,
    mode: "RESERVA",
    policyHint,
    requiresConfirmation,
    stateful,
    finalResponse,
    requiresUserInput,
    nextExpectedFields,
    outputSource: "POLICY",
  };
}

interface BuiltResponse {
  finalResponse: string;
  nextExpectedFields: string[];
}

function buildReservaFinalResponse(
  decision: FinalDecision,
  extraction: ExtractionContext | undefined,
  lang: Lang,
): BuiltResponse {
  if (extraction) {
    if (extraction.askForConfirmation && extraction.tariff?.matched && extraction.tariff.price != null) {
      return {
        finalResponse: buildConfirmationMessage(extraction, lang),
        nextExpectedFields: ["affirmation"],
      };
    }
    if (extraction.workflowState === "collecting_slots" && extraction.clarifyField) {
      return {
        finalResponse: buildClarifyMessage(extraction, lang),
        nextExpectedFields: [extraction.clarifyField],
      };
    }
    if (extraction.workflowState === "awaiting_confirmation") {
      return {
        finalResponse: buildNoTariffConfirmation(extraction, lang),
        nextExpectedFields: ["affirmation"],
      };
    }
  }

  if (decision.decision === "CLARIFY") {
    const field = inferMissingFieldFromCore(decision);
    return {
      finalResponse: buildGenericClarify(field, lang),
      nextExpectedFields: field ? [field] : [],
    };
  }

  // EXECUTE sin extractionCtx: pedir los slots faltantes antes de ejecutar.
  if (decision.decision === "EXECUTE") {
    const field = inferMissingFieldFromCore(decision);
    if (field) {
      return {
        finalResponse: buildGenericClarify(field, lang),
        nextExpectedFields: [field],
      };
    }
  }

  return {
    finalResponse: buildGenericSafeFallback(lang),
    nextExpectedFields: [],
  };
}

function buildConfirmationMessage(extraction: ExtractionContext, lang: Lang): string {
  const tariff = extraction.tariff!;
  const slots = extraction.slots;
  const pax = Number(slots.passengers?.value ?? 1);
  const date = slots.scheduled_at?.value ? formatSchedule(slots.scheduled_at.value as string, lang) : null;
  const origin = tariff.canonicalOrigin ?? slots.origin?.value ?? "origen";
  const destination = tariff.canonicalDestination ?? slots.destination?.value ?? "destino";
  const price = tariff.price!;

  if (lang === "en") {
    const parts = [
      `Trip summary:`,
      `From: ${origin}`,
      `To: ${destination}`,
      `Passengers: ${pax}`,
    ];
    if (date) parts.push(`When: ${date}`);
    parts.push(`Price: $${price} ARS (up to ${pax > 4 ? 6 : 4} passengers).`);
    parts.push(`Do you confirm?`);
    return parts.join("\n");
  }
  if (lang === "pt") {
    const parts = [
      `Resumo da viagem:`,
      `Origem: ${origin}`,
      `Destino: ${destination}`,
      `Passageiros: ${pax}`,
    ];
    if (date) parts.push(`Data/hora: ${date}`);
    parts.push(`Valor: R$ ${price} ARS (até ${pax > 4 ? 6 : 4} passageiros).`);
    parts.push(`Confirma?`);
    return parts.join("\n");
  }

  const paxLabel = pax > 4 ? "hasta 6 pasajeros" : "hasta 4 pasajeros";
  const parts = [
    `Resumen del viaje:`,
    `Origen: ${origin}`,
    `Destino: ${destination}`,
    `Pasajeros: ${pax}`,
  ];
  if (date) parts.push(`Fecha/hora: ${date}`);
  parts.push(`Precio: $${price} ARS (${paxLabel}).`);
  parts.push(`¿Confirmás?`);
  return parts.join("\n");
}

function buildNoTariffConfirmation(extraction: ExtractionContext, lang: Lang): string {
  const slots = extraction.slots;
  const origin = slots.origin?.value ?? "";
  const destination = slots.destination?.value ?? "";

  if (lang === "en") {
    return `I couldn't find a published rate for that route (${origin} → ${destination}). An operator will confirm availability and final price. Do you want to proceed?`;
  }
  if (lang === "pt") {
    return `Não localizei uma tarifa publicada para essa rota (${origin} → ${destination}). Um operador vai confirmar disponibilidade e valor final. Deseja prosseguir?`;
  }
  return `No encontré una tarifa publicada para esa ruta (${origin} → ${destination}). Un operador va a confirmar disponibilidad y precio final. ¿Querés que sigamos?`;
}

function buildClarifyMessage(extraction: ExtractionContext, lang: Lang): string {
  const field = extraction.clarifyField!;
  const hasAmbiguousLocation = extraction.slots.origin?.reason === "ambiguous_term" || extraction.slots.destination?.reason === "ambiguous_term";

  if (field === "origin") {
    if (hasAmbiguousLocation) {
      if (lang === "en") return `From which specific place in the city centre are you leaving?`;
      if (lang === "pt") return `De qual ponto específico do centro você sai?`;
      return `¿Desde qué lugar específico del centro salís?`;
    }
    if (lang === "en") return `Where are you leaving from?`;
    if (lang === "pt") return `De onde você está saindo?`;
    return `¿Desde dónde salís?`;
  }
  if (field === "destination") {
    if (hasAmbiguousLocation) {
      if (lang === "en") return `To which specific place are you going?`;
      if (lang === "pt") return `Para qual local específico você vai?`;
      return `¿A qué lugar específico vas?`;
    }
    if (lang === "en") return `Where do you need to go?`;
    if (lang === "pt") return `Para onde você precisa ir?`;
    return `¿A dónde necesitás ir?`;
  }
  if (field === "passengers") {
    if (lang === "en") return `How many passengers?`;
    if (lang === "pt") return `Quantos passageiros?`;
    return `¿Cuántos pasajeros?`;
  }
  if (field === "scheduled_at" || field === "scheduled_at_date" || field === "scheduled_at_time") {
    if (lang === "en") return `What date and time do you need the ride?`;
    if (lang === "pt") return `Para que dia e horário você precisa da corrida?`;
    return `¿Para qué día y horario necesitás el viaje?`;
  }
  if (field === "flight") {
    if (lang === "en") return `What's your flight number?`;
    if (lang === "pt") return `Qual é o número do voo?`;
    return `¿Cuál es el número de vuelo?`;
  }
  if (lang === "en") return `Could you provide ${field}?`;
  if (lang === "pt") return `Pode informar ${field}?`;
  return `¿Podés indicarme ${field}?`;
}

function buildGenericClarify(field: string | null, lang: Lang): string {
  if (field === "location_ambiguous") {
    if (lang === "en") return `Which specific place and what time do you need the ride?`;
    if (lang === "pt") return `Qual local específico e que horas você precisa da corrida?`;
    return `¿Qué lugar específico y a qué hora necesitás el viaje?`;
  }
  if (field === "origin") {
    if (lang === "en") return `Where are you leaving from?`;
    if (lang === "pt") return `De onde você está saindo?`;
    return `¿Desde dónde salís?`;
  }
  if (field === "destination") {
    if (lang === "en") return `Where do you need to go?`;
    if (lang === "pt") return `Para onde você precisa ir?`;
    return `¿A dónde necesitás ir?`;
  }
  if (field === "time") {
    if (lang === "en") return `What time do you need the ride?`;
    if (lang === "pt") return `A que horas você precisa da corrida?`;
    return `¿A qué hora necesitás el viaje?`;
  }
  if (field === "passengers") {
    if (lang === "en") return `How many passengers?`;
    if (lang === "pt") return `Quantos passageiros?`;
    return `¿Cuántos pasajeros?`;
  }
  if (lang === "en") return `Could you tell me more about the trip you need?`;
  if (lang === "pt") return `Pode me contar mais sobre a viagem que você precisa?`;
  return `¿Podés contarme un poco más sobre el viaje que necesitás?`;
}

function buildGenericSafeFallback(lang: Lang): string {
  if (lang === "en") return `I couldn't process that. An operator will assist you shortly.`;
  if (lang === "pt") return `Não consegui processar isso. Um operador vai te atender em breve.`;
  return `No pude procesar eso. Un operador te va a asistir en breve.`;
}

function inferMissingFieldFromCore(decision: FinalDecision): string | null {
  const facts = decision.core.facts;
  if (facts.includes("location_ambiguous:true")) return "location_ambiguous";
  if (!facts.some((f) => f.startsWith("origin:"))) return "origin";
  if (!facts.some((f) => f.startsWith("destination:"))) return "destination";
  if (!facts.some((f) => f.startsWith("time:")) && !facts.some((f) => f.startsWith("date:"))) return "time";
  if (!facts.some((f) => f.startsWith("passengers:"))) return "passengers";
  return null;
}

function formatSchedule(value: string, lang: Lang): string {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  try {
    return d.toLocaleString(lang === "en" ? "en-US" : lang === "pt" ? "pt-BR" : "es-AR", {
      dateStyle: "short",
      timeStyle: "short",
    });
  } catch {
    return value;
  }
}
