// POLICY RESERVA — flujos multi-step, STATEFUL, confirmación obligatoria en EXECUTE.
// policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic nueva, inferencia geográfica, generación libre.
//
// (patch): se eliminó la heurística "centro = origin" que
// invertía slots. La policy ya NO asigna automáticamente "centro" a origin.
// Cualquier ambigüedad → CLARIFY explícito. La detección de hoteles/landmarks
// ambiguos (amerian, meliá, etc.) genera preguntas específicas sin asumir
// estructura de ruta turística.

import { buildGenericClarify, buildGenericSafeFallback, buildPriceInfo, buildLocationConfirmationResponse } from "./response-builder";
import type { SlotConfirmationUI } from "./slot-confirmation";
import { resolveNextRequiredField } from "./field-resolver";
import { AMBIGUOUS_HOTEL_LANDMARKS_RE, AMBIGUOUS_LOCATION_RE } from "./patterns";
import type { ExtractionContext, FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";
import { log } from "@/lib/utils/logger";

function isAmbiguous(value: string | number | null | undefined): boolean {
  if (value == null) return true;
  const v = String(value).trim();
  if (!v) return true;
  return AMBIGUOUS_LOCATION_RE.test(v) || AMBIGUOUS_HOTEL_LANDMARKS_RE.test(v);
}

// safeSlotResolution NO infiere ni reordena. Solo respeta lo
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

// formatHotelLandmarkLabel agrega "Hotel " como prefijo
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
  const extraction = ctx?.extraction;
  const requiresConfirmation = decision.decision === "EXECUTE";

  const built = buildReservaFinalResponse(decision, ctx);
  const requiresUserInput =
    decision.decision === "CLARIFY" ||
    (decision.decision === "EXECUTE" && extraction?.askForConfirmation === true);
  const nextExpectedFields = built.nextExpectedFields;
  const finalResponse = built.finalResponse;
  const confirmationUI = built.confirmationUI;

  let policyHint: string;
  switch (decision.decision) {
    case "EXECUTE":
      policyHint = "RESERVA: ejecutar acción con confirmación obligatoria.";
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

  // EXECUTION METADATA: cuando la reserva está completa (confirmación con tarifa),
  // el pipeline ejecuta geo + saveContext como efectos secundarios.
  const needsGeo = decision.decision === "EXECUTE" && extraction?.askForConfirmation === true && extraction?.tariff?.matched === true;
  const needsSaveContext = needsGeo;

  const output: PolicyOutput = {
    decision: decision.decision,
    mode: "RESERVA",
    policyHint,
    requiresConfirmation,
    finalResponse,
    requiresUserInput,
    nextExpectedFields,
    outputSource: "POLICY",
    needsGeo,
    needsSaveContext,
    confirmationUI,
  };

  // Lateral intents: EMERGENCY and RESCHEDULE require admin notification as side effect.
  if (decision.core.intent === "EMERGENCY" || decision.core.intent === "RESCHEDULE") {
    output.needsAdminNotify = true;
    output.adminNotifyBody = buildAdminNotifyBody(decision.core.intent, ctx?.phone, ctx?.userText);
  }

  log.info("[POLICY_reserva]", {
    decision: output.decision,
    policyHint: output.policyHint,
    finalResponse: output.finalResponse?.substring(0, 120),
    requiresConfirmation: output.requiresConfirmation,
    requiresUserInput: output.requiresUserInput,
    nextExpectedFields: output.nextExpectedFields,
    needsGeo: output.needsGeo,
    needsSaveContext: output.needsSaveContext,
    needsAdminNotify: output.needsAdminNotify ?? false,
  });

  return output;
}

interface BuiltResponse {
  finalResponse: string;
  nextExpectedFields: string[];
  confirmationUI?: SlotConfirmationUI;
}

function buildReservaFinalResponse(
  decision: FinalDecision,
  ctx: HandlerContext | undefined,
): BuiltResponse {
  const extraction = ctx?.extraction;
  const lang = ctx?.lang ?? "es";
  // Lateral intents: EMERGENCY, RESCHEDULE, POST_SERVICE get specialized responses.
  if (decision.core.intent === "EMERGENCY") {
    return { finalResponse: buildLateralEmergencyResponse(lang), nextExpectedFields: [] };
  }
  if (decision.core.intent === "RESCHEDULE") {
    return { finalResponse: buildLateralRescheduleResponse(lang), nextExpectedFields: [] };
  }
  if (decision.core.intent === "POST_SERVICE") {
    return { finalResponse: buildLateralPostServiceResponse(lang), nextExpectedFields: [] };
  }

  // Confirmación de booking: usuario afirma mientras el workflow esperaba confirmación.
  // La policy reconoce que el usuario ya dijo sí y produce el mensaje de booking aceptado.
  if (decision.core.facts.some((f) => f.startsWith("affirmation:")) && extraction?.conversationalState === "awaiting_confirmation") {
    const origin = extraction.slots.origin?.value ?? "";
    const destination = extraction.slots.destination?.value ?? "";
    const price = extraction.tariff?.price;
    if (price != null && extraction.tariff?.matched) {
      return {
        finalResponse: buildBookingAcceptedResponse(origin, destination, price, lang),
        nextExpectedFields: [],
      };
    }
    return {
      finalResponse: buildBookingAcceptedNoPriceResponse(origin, destination, lang),
      nextExpectedFields: [],
    };
  }

  if (extraction) {
    // SAFE RESPONSE FALLBACK.
    // Si el role lock fijó origin y destination (ambos roles estables) y NO
    // hay scheduled_at → acknowledge lo que ya tenemos y pedir refinamiento
    // (hora + dirección si destination es ambiguo). NO resetear, NO pedir todo
    // de nuevo. Esta ruta tiene PRIORIDAD sobre la clarificación estándar.
    const stableAck = buildStableAcknowledge(extraction, lang);
    if (stableAck) {
      return {
        finalResponse: stableAck.response,
        confirmationUI: stableAck.confirmationUI,
        nextExpectedFields: [stableAck.nextField],
      };
    }

    if (extraction.askForConfirmation && extraction.tariff?.matched && extraction.tariff.price != null) {
      return {
        finalResponse: buildConfirmationMessage(extraction, lang),
        nextExpectedFields: ["affirmation"],
      };
    }
    if (extraction.conversationalState === "collecting_slots" && extraction.clarifyField) {
      return {
        finalResponse: buildClarifyMessage(extraction, lang),
        nextExpectedFields: [extraction.clarifyField],
      };
    }
    if (extraction.conversationalState === "awaiting_confirmation") {
      return {
        finalResponse: buildNoTariffConfirmation(extraction, lang),
        nextExpectedFields: ["affirmation"],
      };
    }
  }

  // ANSWER + tariff matched → respuesta informativa de precio (INFO_PRICE).
  if (decision.decision === "ANSWER" && extraction?.tariff?.matched && extraction.tariff.price != null) {
    return {
      finalResponse: buildPriceInfo(
        extraction.tariff.canonicalOrigin ?? "origen",
        extraction.tariff.canonicalDestination ?? "destino",
        extraction.tariff.price,
        lang,
        extraction.tariff.displayOrigin,
        extraction.tariff.displayDestination,
      ),
      nextExpectedFields: [],
    };
  }

  if (decision.decision === "CLARIFY") {
    const next = resolveNextRequiredField(ctx, decision.core.facts);
    if (next.reason === "ambiguous") {
      if (extraction) {
        const ui = buildLocationConfirmationResponse(extraction, lang);
        return {
          finalResponse: ui.message ?? "",
          confirmationUI: ui,
          nextExpectedFields: [next.field ?? "location_ambiguous"],
        };
      }
      return { finalResponse: buildGenericClarify("origin", lang), nextExpectedFields: ["origin"] };
    }
    const mapped = next.field === "scheduled_at" ? "time" : next.field;
    return {
      finalResponse: buildGenericClarify(mapped, lang),
      nextExpectedFields: next.field ? [next.field] : [],
    };
  }

  // EXECUTE sin extractionCtx: pedir los slots faltantes antes de ejecutar.
  if (decision.decision === "EXECUTE") {
    const next = resolveNextRequiredField(ctx, decision.core.facts);
    if (next.reason === "ambiguous") {
      if (extraction) {
        const ui = buildLocationConfirmationResponse(extraction, lang);
        return {
          finalResponse: ui.message ?? "",
          confirmationUI: ui,
          nextExpectedFields: [next.field ?? "location_ambiguous"],
        };
      }
      return { finalResponse: buildGenericClarify("origin", lang), nextExpectedFields: ["origin"] };
    }
    if (next.field) {
      const mapped = next.field === "scheduled_at" ? "time" : next.field;
      return {
        finalResponse: buildGenericClarify(mapped, lang),
        nextExpectedFields: [next.field],
      };
    }
  }

  return {
    finalResponse: buildGenericSafeFallback(lang),
    nextExpectedFields: [],
  };
}

export function buildConfirmationMessage(extraction: ExtractionContext, lang: Lang): string {
  const tariff = extraction.tariff!;
  const slots = extraction.slots;
  const pax = Number(slots.passengers?.value ?? 1);
  const date = slots.scheduled_at?.value ? formatSchedule(slots.scheduled_at.value as string, lang) : null;
  const origin = tariff.displayOrigin ?? tariff.canonicalOrigin ?? slots.origin?.value ?? "origen";
  const destination = tariff.displayDestination ?? tariff.canonicalDestination ?? slots.destination?.value ?? "destino";
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

export function buildNoTariffConfirmation(extraction: ExtractionContext, lang: Lang): string {
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
    // NO preguntar "desde qué lugar del centro" hardcodeado.
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
  if (lang === "en") return `Could you provide ${field}?`;
  if (lang === "pt") return `Pode informar ${field}?`;
  return `¿Podés indicarme ${field}?`;
}



// SAFE RESPONSE FALLBACK.
// Retorna el acknowledge ("Perfecto, tengo origen en X y destino hacia Y...")
// si se cumplen las condiciones:
//   1. roleLock fija ambos roles (origin y destination), aunque los valores
//      sean ambiguos ("centro" está OK como destination locked).
//   2. NO hay scheduled_at confirmado → la pregunta es por hora.
//   3. NO está en estado awaiting_confirmation (ese flujo tiene su propio
//      acknowledgement más rico con precio).
// Si destination es ambiguo, también pregunta por la dirección exacta en
// el destination (no resetea, no pide todo de nuevo).
function buildStableAcknowledge(extraction: ExtractionContext, lang: Lang): { response: string; confirmationUI?: SlotConfirmationUI; nextField: string } | null {
  const origin = extraction.slots.origin?.value;
  const destination = extraction.slots.destination?.value;
  if (origin == null || destination == null) return null;
  if (String(origin).trim() === "" || String(destination).trim() === "") return null;

  // Si ya tiene hora → no es el caso del fallback, el policy elige otra ruta.
  if (extraction.slots.scheduled_at?.value) return null;

  // Si el workflow ya está pidiendo confirmación → no superponer acknowledge.
  if (extraction.conversationalState === "awaiting_confirmation") return null;

  const originStr = withDefiniteArticle(String(origin), lang);
  const destStr = withDefiniteArticle(String(destination), lang);
  const destStrRaw = String(destination).trim();
  const originReason = extraction.slots.origin?.reason;
  const destReason = extraction.slots.destination?.reason;
  const originIsAmbiguous =
    originReason === "ambiguous_term" || AMBIGUOUS_LOCATION_RE.test(String(origin));
  const destIsAmbiguous =
    destReason === "ambiguous_term" || AMBIGUOUS_LOCATION_RE.test(destStrRaw);

  if (originIsAmbiguous || destIsAmbiguous) {
    const ui = buildLocationConfirmationResponse(extraction, lang);
    return {
      response: ui.message ?? "",
      confirmationUI: ui,
      nextField: "location_ambiguous",
    };
  }

  // FASE 18.1: preguntar pasajeros antes que horario
  const paxScore = extraction.slots.passengers?.score ?? 0;
  if (paxScore < 0.7) {
    if (lang === "en") return { response: `Got it. Origin: ${originStr}. Destination: ${destStr}. How many passengers?`, nextField: "passengers" };
    if (lang === "pt") return { response: `Certo. Origem: ${originStr}. Destino: ${destStr}. Quantos passageiros?`, nextField: "passengers" };
    return { response: `Perfecto. Tengo origen en ${originStr} y destino hacia ${destStr}. ¿Cuántos pasajeros son?`, nextField: "passengers" };
  }

  if (lang === "en") {
    return { response: `Got it. Origin: ${originStr}. Destination: ${destStr}. What time do you need the ride?`, nextField: "scheduled_at" };
  }
  if (lang === "pt") {
    return { response: `Certo. Origem: ${originStr}. Destino: ${destStr}. A que horas você precisa da corrida?`, nextField: "scheduled_at" };
  }
  return { response: `Perfecto. Tengo origen en ${originStr} y destino hacia ${destStr}. ¿A qué hora necesitás el traslado?`, nextField: "scheduled_at" };
}

// prepend artículo definido cuando el value es un sustantivo
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

// ── booking accepted response builders ──────────────────────

function buildBookingAcceptedResponse(origin: string | number | null, destination: string | number | null, price: number, lang: Lang): string {
  if (lang === "en") return `✅ Booking confirmed.\n\nFrom: ${origin}\nTo: ${destination}\nPrice: $${price} ARS\n\nA driver will contact you shortly.`;
  if (lang === "pt") return `✅ Solicitação confirmada.\n\nOrigem: ${origin}\nDestino: ${destination}\nValor: R$ ${price} ARS\n\nEm breve um motorista entrará em contato.`;
  return `✅ Solicitud confirmada.\n\nOrigen: ${origin}\nDestino: ${destination}\nPrecio: $${price} ARS\n\nEn breve un chofer se pondrá en contacto con vos.`;
}

function buildBookingAcceptedNoPriceResponse(origin: string | number | null, destination: string | number | null, lang: Lang): string {
  if (lang === "en") return `✅ Booking confirmed.\n\nFrom: ${origin}\nTo: ${destination}\n\nAn operator will confirm availability and final price. A driver will contact you shortly.`;
  if (lang === "pt") return `✅ Solicitação confirmada.\n\nOrigem: ${origin}\nDestino: ${destination}\n\nUm operador vai confirmar disponibilidade e valor final. Em breve um motorista entrará em contato.`;
  return `✅ Solicitud confirmada.\n\nOrigen: ${origin}\nDestino: ${destination}\n\nUn operador va a confirmar disponibilidad y precio final. En breve un chofer se pondrá en contacto con vos.`;
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

// ── lateral intent response builders ───────────────────────────

export function buildLateralEmergencyResponse(lang: Lang): string {
  if (lang === "en") return "🚨 We're notifying our team. An operator will contact you urgently.";
  if (lang === "pt") return "🚨 Estamos notificando nossa equipe. Um operador entrará em contato urgente.";
  return "🚨 Estamos notificando a nuestro equipo. Un operador te va a contactar urgente.";
}

export function buildLateralRescheduleResponse(lang: Lang): string {
  if (lang === "en") return "Understood. An operator will review your reservation and contact you to reschedule.";
  if (lang === "pt") return "Entendido. Um operador vai revisar sua reserva e entrar em contato para reprogramar.";
  return "Entendido. Un operador va a revisar tu reserva y te contacta para reprogramar.";
}

function buildLateralPostServiceResponse(lang: Lang): string {
  if (lang === "en") return "Thank you for your message. If you need help with billing or have a complaint, an operator will contact you.";
  if (lang === "pt") return "Obrigado pela mensagem. Se precisar de ajuda com faturamento ou tiver alguma reclamação, um operador entrará em contato.";
  return "Gracias por tu mensaje. Si necesitás ayuda con facturación o tenés algún reclamo, un operador te va a contactar.";
}

export function buildAdminNotifyBody(intent: string, phone: string | undefined, userText: string | undefined): string {
  const msg = userText ?? "";
  const truncated = msg.substring(0, 200);
  if (intent === "EMERGENCY") {
    return `🚨 *EMERGENCIA — Cliente pide ayuda urgente*\n\nTeléfono: ${phone ?? "unknown"}\nMensaje: "${truncated}"`;
  }
  if (intent === "RESCHEDULE") {
    return `🔄 *REPROGRAMACIÓN — Cliente quiere modificar su viaje*\n\nTeléfono: ${phone ?? "unknown"}\nMensaje: "${truncated}"`;
  }
  return "";
}
