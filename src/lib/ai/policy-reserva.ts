// POLICY RESERVA — flujos multi-step, STATEFUL, confirmación obligatoria en EXECUTE.
// v5.0 FASE 5B: policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic nueva, inferencia geográfica, generación libre.
//
// v5.0 FASE 5B.1 (patch): se eliminó la heurística "centro = origin" que
// invertía slots. La policy ya NO asigna automáticamente "centro" a origin.
// Cualquier ambigüedad → CLARIFY explícito. La detección de hoteles/landmarks
// ambiguos (amerian, meliá, etc.) genera preguntas específicas sin asumir
// estructura de ruta turística.

import type { ExtractionContext, FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";

// Hotel/landmark names que requieren clarificación: el LLM puede extraerlos
// pero la policy no puede inferir a qué dirección específica se refieren.
const AMBIGUOUS_HOTEL_LANDMARKS_RE =
  /\b(amerian|meli[áa]|panoramic|gran\s+hotel|falls\s+hotel|iguaz[uú]\s+grand|lo\s+de\s+ramona|hotel\s+\w+)\b/i;

// Términos genéricos de ubicación que el LLM o el regex extrae como "ambiguous_term"
// pero que la policy no debe asociar automáticamente a un campo (origin/destination).
const GENERIC_AMBIGUOUS_LOCATION_RE = /\b(centro|microcentro|hotel|iguaz[uú]|cerca|zona|alrededores)\b/i;

function isAmbiguous(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  return GENERIC_AMBIGUOUS_LOCATION_RE.test(v) || AMBIGUOUS_HOTEL_LANDMARKS_RE.test(v);
}

// v5.0 FASE 5B.1: safeSlotResolution NO infiere ni reordena. Solo respeta lo
// que el extractor (LLM o regex) ya asignó a cada slot.
function safeSlotResolution(extraction: ExtractionContext | undefined): {
  origin: string | null;
  destination: string | null;
  ambiguityFlags: string[];
} {
  if (!extraction) {
    return { origin: null, destination: null, ambiguityFlags: ["no_extraction"] };
  }
  const origin = extraction.slots.origin?.value != null ? String(extraction.slots.origin.value) : null;
  const destination =
    extraction.slots.destination?.value != null ? String(extraction.slots.destination.value) : null;
  const ambiguityFlags: string[] = [];
  if (extraction.slots.origin?.reason === "ambiguous_term") ambiguityFlags.push("origin:ambiguous_term");
  if (extraction.slots.destination?.reason === "ambiguous_term") ambiguityFlags.push("destination:ambiguous_term");
  if (origin && isAmbiguous(origin)) ambiguityFlags.push("origin:generic_ambiguous");
  if (destination && isAmbiguous(destination)) ambiguityFlags.push("destination:generic_ambiguous");
  if (destination && AMBIGUOUS_HOTEL_LANDMARKS_RE.test(destination)) {
    ambiguityFlags.push("destination:hotel_landmark");
  }
  return { origin, destination, ambiguityFlags };
}

// v5.0 FASE 5B.1: formatHotelLandmarkLabel agrega "Hotel " como prefijo
// cosmético cuando el usuario mencionó un nombre de hotel suelto (ej. "amerian"
// → "Hotel Amerian"). Si el value ya contiene "centro", no agrega "en el centro"
// al final (sería redundante). NO infiere dirección ni ubicación: solo label.
function formatHotelLandmarkLabel(value: string): string {
  const v = value.trim();
  if (!v) return v;
  const hasHotelPrefix = /^\s*hotel\b/i.test(v);
  const hasCentro = /\bcentro\b/i.test(v);
  const capital = v.charAt(0).toUpperCase() + v.slice(1);
  if (hasHotelPrefix) {
    return hasCentro ? capital : `${capital} en el centro`;
  }
  return hasCentro ? `Hotel ${v}` : `Hotel ${capital} en el centro`;
}

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
    // v5.0 FASE 5B.2: SAFE RESPONSE FALLBACK.
    // Si el role lock fijó origin y destination (ambos roles estables) y NO
    // hay scheduled_at → acknowledge lo que ya tenemos y pedir refinamiento
    // (hora + dirección si destination es ambiguo). NO resetear, NO pedir todo
    // de nuevo. Esta ruta tiene PRIORIDAD sobre la clarificación estándar.
    const stableAck = buildStableAcknowledge(extraction, lang);
    if (stableAck) {
      return { finalResponse: stableAck, nextExpectedFields: ["scheduled_at"] };
    }

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
  const slots = extraction.slots;
  const safe = safeSlotResolution(extraction);
  const destValue = safe.destination;
  const originValue = safe.origin;

  if (field === "destination") {
    // Caso especial: destination es un hotel/landmark ambiguo (amerian, meliá, etc.)
    // → la policy NO asume estructura de ruta, pregunta si es ese hotel en el centro
    //   o alguna dirección específica.
    if (destValue && AMBIGUOUS_HOTEL_LANDMARKS_RE.test(destValue)) {
      const label = formatHotelLandmarkLabel(destValue);
      if (lang === "en") {
        return `Do you mean ${label} in the city centre or a specific address?`;
      }
      if (lang === "pt") {
        return `Você se refere a ${label} no centro ou a outro endereço específico?`;
      }
      return `¿Te referís a ${label} o a otra dirección específica?`;
    }
    if (slots.destination?.reason === "ambiguous_term") {
      if (lang === "en") return `To which specific place are you going?`;
      if (lang === "pt") return `Para qual local específico você vai?`;
      return `¿A qué lugar específico vas?`;
    }
    if (lang === "en") return `Where do you need to go?`;
    if (lang === "pt") return `Para onde você precisa ir?`;
    return `¿A dónde necesitás ir?`;
  }

  if (field === "origin") {
    // v5.0 FASE 5B.1: NO preguntar "desde qué lugar del centro" hardcodeado.
    // El policy respeta lo que el extractor ya asignó. Si origin es ambiguo,
    // pregunta genéricamente sin asumir "centro" como referencia.
    if (slots.origin?.reason === "ambiguous_term" || (originValue && isAmbiguous(originValue))) {
      if (lang === "en") return `Could you give a more specific origin (street, hotel name, reference)?`;
      if (lang === "pt") return `Pode indicar um local de origem mais específico (rua, hotel, referência)?`;
      return `¿Podés indicarme un origen más específico (calle, nombre de hotel, referencia)?`;
    }
    if (lang === "en") return `Where are you leaving from?`;
    if (lang === "pt") return `De onde você está saindo?`;
    return `¿Desde dónde salís?`;
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

// v5.0 FASE 5B.2: SAFE RESPONSE FALLBACK.
// Retorna el acknowledge ("Perfecto, tengo origen en X y destino hacia Y...")
// si se cumplen las condiciones:
//   1. roleLock fija ambos roles (origin y destination), aunque los valores
//      sean ambiguos ("centro" está OK como destination locked).
//   2. NO hay scheduled_at confirmado → la pregunta es por hora.
//   3. NO está en estado awaiting_confirmation (ese flujo tiene su propio
//      acknowledgement más rico con precio).
// Si destination es ambiguo, también pregunta por la dirección exacta en
// el destination (no resetea, no pide todo de nuevo).
function buildStableAcknowledge(extraction: ExtractionContext, lang: Lang): string | null {
  const origin = extraction.slots.origin?.value;
  const destination = extraction.slots.destination?.value;
  if (origin == null || destination == null) return null;
  if (String(origin).trim() === "" || String(destination).trim() === "") return null;

  // Si ya tiene hora → no es el caso del fallback, el policy elige otra ruta.
  if (extraction.slots.scheduled_at?.value) return null;

  // Si el workflow ya está pidiendo confirmación → no superponer acknowledge.
  if (extraction.workflowState === "awaiting_confirmation") return null;

  const originStr = withDefiniteArticle(String(origin), lang);
  const destStr = withDefiniteArticle(String(destination), lang);
  const destStrRaw = String(destination).trim();
  const destReason = extraction.slots.destination?.reason;
  const destIsAmbiguous =
    destReason === "ambiguous_term" || GENERIC_AMBIGUOUS_LOCATION_RE.test(destStrRaw);

  if (lang === "en") {
    const askAddress = destIsAmbiguous ? `, and what's the exact address in ${destStrRaw}` : "";
    return `Got it. Origin: ${originStr}. Destination: ${destStr}. What time do you need the ride${askAddress}?`;
  }
  if (lang === "pt") {
    const askAddress = destIsAmbiguous ? ` e qual o endereço exato em ${destStrRaw}` : "";
    return `Certo. Origem: ${originStr}. Destino: ${destStr}. A que horas você precisa da corrida${askAddress}?`;
  }
  const askAddress = destIsAmbiguous ? ` y a qué dirección del ${destStrRaw} vas` : "";
  return `Perfecto. Tengo origen en ${originStr} y destino hacia ${destStr}. ¿A qué hora necesitás el traslado${askAddress}?`;
}

// v5.0 FASE 5B.2: prepend artículo definido cuando el value es un sustantivo
// común sin artículo ("aeropuerto" → "el aeropuerto", "centro" → "el centro").
// No agrega nada si el value ya tiene artículo o es un nombre propio.
function withDefiniteArticle(value: string, lang: Lang): string {
  const v = value.trim();
  if (!v) return v;
  if (/^(el|la|los|las|al|del)\s+/i.test(v)) return v;
  if (/^[A-ZÁÉÍÓÚÑ]/.test(v)) return v;
  if (lang === "en") {
    if (/^(the)\s+/i.test(v)) return v;
    return `the ${v}`;
  }
  if (lang === "pt") {
    if (/^(o|a|os|as)\s+/i.test(v)) return v;
    return `o ${v}`;
  }
  return `el ${v}`;
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
