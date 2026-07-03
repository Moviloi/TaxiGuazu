import { GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE } from "@/config/constants";
import { getLLMProvider } from "./llm-provider";
import type { PolicyOutput, HandlerContext, Lang } from "./types";
import { detectLeadLang } from "@/lib/detect-lang";
import { log } from "@/lib/utils/logger";
import { IGUAZU_KNOWLEDGE, getAttractionsDetailPrompt, getMigrationDetailPrompt, getBordersDetailPrompt } from "@/lib/ai/iguazu-knowledge";
import { getOperationalInfoPrompt } from "@/lib/ai/taxiguazu-knowledge";

function buildResponsePrompt(policy: PolicyOutput, ctx?: HandlerContext): string {
  const slots = ctx?.extraction?.slots ?? {};
  const tariff = ctx?.extraction?.tariff;

  // ── Detectar idioma del usuario (usado en toda la estructura del prompt) ──
  const userLang: Lang = ctx?.lang ?? detectLeadLang(ctx?.userText ?? "");

  // ── SYSTEM INSTRUCTION — MUST come first, in the user's language ──
  const systemIntro = userLang === "en"
    ? `You are Cris Virtual, 24/7 assistant for TaxiGuazú (remises and transfers in Puerto Iguazú, Argentina). You are a conversational bot — do not pretend to be human. For confirmed reservations or cases requiring human attention, Cristian or the assigned driver will contact the passenger.`
    : userLang === "pt"
      ? `Você é a Cris Virtual, assistente 24/7 da TaxiGuazú (remises e transfers em Puerto Iguazú, Argentina). Você é um bot conversacional — não se passe por humano. Para reservas confirmadas ou casos que precisem de atenção humana, Cristian ou o motorista designado entrarão em contato.`
      : `Eres Cris Virtual, asistente 24/7 de TaxiGuazú (remises y transfers en Puerto Iguazú, Argentina). Sos un bot conversacional — no te hagas pasar por humano. Para reservas confirmadas o casos que requieran atención humana, Cristian o el chofer asignado se contactarán según su disponibilidad.`;

  const contextLabel = userLang === "en" ? "CONTEXT (verified data — DO NOT modify or invent):"
    : userLang === "pt" ? "CONTEXTO (dados verificados — NÃO modificar nem inventar):"
    : "CONTEXTO (datos verificados — NO modificar ni inventar):";

  const intentionLabel = userLang === "en" ? "Intention" : userLang === "pt" ? "Intenção" : "Intención";
  const modeLabel = "Mode";
  const typeLabel = userLang === "en" ? "Type" : userLang === "pt" ? "Tipo" : "Tipo";
  const originLabel = userLang === "en" ? "Origin" : userLang === "pt" ? "Origem" : "Origen";
  const destLabel = userLang === "en" ? "Destination" : "Destino";
  const paxLabel = userLang === "en" ? "Passengers" : "Pasajeros";
  const priceLabel = userLang === "en" ? "Price" : "Precio";
  const nextFieldLabel = userLang === "en" ? "Next field needed" : userLang === "pt" ? "Próximo campo necessário" : "Siguiente campo";
  const undefined_ = userLang === "en" ? "undefined" : userLang === "pt" ? "não definido" : "no definido";
  const unavailable_ = userLang === "en" ? "unavailable" : userLang === "pt" ? "indisponível" : "no disponible";
  const passNameLabel = userLang === "en" ? "Passenger name" : userLang === "pt" ? "Nome do passageiro" : "Nombre del pasajero";

  const lines = [
    systemIntro,
    userLang === "en" ? `Write the message to the passenger based on this context.` : userLang === "pt" ? `Escreva a mensagem para o passageiro com base neste contexto.` : `Redactá el mensaje al pasajero en base a este contexto.`,
    ``,
    `${contextLabel}`,
    `- ${intentionLabel}: ${policy.decision}`,
    `- ${modeLabel}: ${policy.mode}`,
    `- ${typeLabel}: ${policy.policyHint}`,
    `- ${originLabel}: ${slots.origin?.value ?? undefined_}`,
    `- ${destLabel}: ${slots.destination?.value ?? undefined_}`,
    `- ${paxLabel}: ${slots.passengers?.value ?? undefined_}`,
    `- ${priceLabel}: ${tariff?.price != null ? `$${tariff.price} ARS` : unavailable_}`,
    `- ${nextFieldLabel}: ${policy.nextExpectedFields.join(", ") || (userLang === "en" ? "none" : userLang === "pt" ? "nenhum" : "ninguno")}`,
  ];
  if (ctx?.customerName) lines.push(`- ${passNameLabel}: ${ctx.customerName}`);

  const isInformational = policy.policyHint?.includes("(info)") || policy.policyHint?.includes("INFORMATION");
  const isGreeting = policy.policyHint?.includes("GREETING");

  // If informational, inject comprehensive Iguazú knowledge so the bot can answer questions about prices, hours, migration, borders, etc.
  if (isInformational) {
    const knownNames = IGUAZU_KNOWLEDGE.knownPlaces.map(p => p.name).join(", ");
    const refLabel = userLang === "en" ? "REFERENCE KNOWLEDGE (use if user asks about these topics):"
      : userLang === "pt" ? "CONHECIMENTO DE REFERÊNCIA (use se o usuário perguntar sobre estes tópicos):"
      : "CONOCIMIENTO DE REFERENCIA (usalo si el usuario pregunta sobre estos temas):";
    const knownLabel = userLang === "en" ? "Known places" : "Lugares conocidos";
    const attrLabel = userLang === "en" ? "ATTRACTIONS (2026 prices)" : "ATRACTIVOS (precios 2026)";
    const migLabel = userLang === "en" ? "MIGRATION" : "MIGRACIÓN";
    const bordLabel = userLang === "en" ? "BORDER CROSSING" : "CRUCE DE FRONTERAS";
    const infoLabel = userLang === "en" ? "PRACTICAL INFO" : "INFO PRÁCTICA";
    const eventsLabel = userLang === "en" ? "EVENTS" : "EVENTOS";
    const shoppingLabel = userLang === "en" ? "SHOPPING CDE" : "COMPRAS CDE";
    const noInvent = userLang === "en" ? "Do NOT invent prices or hours — use ONLY this reference."
      : "NO inventes precios ni horarios — usá SOLO esta referencia.";

    lines.push(
      ``,
      refLabel,
      `- ${knownLabel}: ${knownNames}`,
      ``,
      `--- ${attrLabel} ---`,
      getAttractionsDetailPrompt(),
      ``,
      `--- ${migLabel} ---`,
      getMigrationDetailPrompt(),
      ``,
      `--- ${bordLabel} ---`,
      getBordersDetailPrompt(),
      ``,
      `--- ${infoLabel} ---`,
      `- ${userLang === "en" ? "Weather: subtropical humid." : "Clima: subtropical húmedo."} ${IGUAZU_KNOWLEDGE.practical.weather.slice(0, 3).join(" ")}`,
      `- ${userLang === "en" ? "Currency: ARS (AR), BRL (BR), PYG (PY). USD accepted at hotels and tourism." : "Moneda: ARS (AR), BRL (BR), PYG (PY). USD aceptado en hoteles y turismo."}`,
      `- ${userLang === "en" ? "Safety: Puerto Iguazú very safe. Foz safe in tourist area. CDE: business hours only (07:00-16:00)." : "Seguridad: Puerto Iguazú muy segura. Foz segura en zona turística. CDE: solo horario comercial (07:00-16:00)."}`,
      `- ${userLang === "en" ? "Recommended restaurants: Aqva (premium), El Quincho del Tío Querido (traditional BBQ), La Rueda 1975, Pizza Color, La Mamma." : "Restaurantes recomendados: Aqva (premium cocina de autor), El Quincho del Tío Querido (asado tradicional), La Rueda 1975, Pizza Color, La Mamma."}`,
      `- ${userLang === "en" ? "Meal hours AR: lunch 12:30-14:30, dinner 21:00-23:30. BR: lunch 11:30-13:30, dinner 19:30-21:30." : "Horarios de comida AR: almuerzo 12:30-14:30, cena 21:00-23:30. BR: almuerzo 11:30-13:30, cena 19:30-21:30."}`,
      ``,
      `--- ${eventsLabel} ---`,
      `- ${userLang === "en" ? "Full Moon Tour:" : "Paseo Luna Llena:"} ${IGUAZU_KNOWLEDGE.calendar.lunaLlena.slice(1, 4).join(" | ")}`,
      `- ${userLang === "en" ? "High season: January, February, July, Easter, bridge holidays." : "Temporada alta: enero, febrero, julio, Semana Santa, feriados puente."}`,
      `- ${userLang === "en" ? "Low season: March-June (excl. Easter), August-November (excl. holidays)." : "Temporada baja: marzo-junio (excl. Semana Santa), agosto-noviembre (excl. feriados)."}`,
      ``,
      `--- ${shoppingLabel} ---`,
      `- ${userLang === "en" ? "Certified stores: Shopping Paris, Shopping China, Monalisa, Nissei." : "Tiendas certificadas: Shopping Paris, Shopping China, Monalisa, Nissei."}`,
      `- ${userLang === "en" ? "TaxiGuazú driver accompanies and advises on purchases in CDE." : "El chofer de TaxiGuazú acompaña y asesora en compras en CDE para evitar estafas."}`,
      `- ${userLang === "en" ? "Reference prices: iPhone ~USD 850 in CDE vs ~USD 1,800 in AR. Perfumes ~USD 95 vs ~USD 200." : "Precios referenciales: iPhone ~USD 850 en CDE vs ~USD 1.800 en AR. Perfumes ~USD 95 vs ~USD 200."}`,
      `- ${userLang === "en" ? "Operate only during business hours (07:00-16:00). Return before 16:00." : "Operar solo en horario comercial (07:00-16:00). Retornar antes de las 16:00."}`,
      ``,
      `- ${noInvent}`,
    );
  }

  // Operational knowledge en el idioma del usuario
  const opLabel = userLang === "en" ? "TAXIGUAZÚ SERVICE INFO (mandatory reference):"
    : userLang === "pt" ? "INFORMAÇÕES DO SERVIÇO TAXIGUAZÚ (referência obrigatória):"
    : "INFORMACIÓN DEL SERVICIO TAXIGUAZÚ (referencia obligatoria):";
  lines.push(
    ``,
    opLabel,
    getOperationalInfoPrompt(),
  );

  // ── Reglas base (traducidas) ──
  const RULES_TRANSLATIONS: Record<string, string[]> = {
    en: [
      `LANGUAGE (MANDATORY): The user wrote in English. You MUST respond in English. Do NOT respond in Spanish or Portuguese.`,
      `Do NOT invent data. Use ONLY the CONTEXT and REFERENCE information.`,
      `If there's a price, keep it exactly as given.`,
      `Natural conversational tone, like a real person helping a traveler in Iguazú. No corporate jargon. ${policy.decision === "ANSWER" ? "Max 5 sentences (informational response)." : (isGreeting ? "Max 1-2 lines, very brief." : "Max 2-3 sentences.")}`,
      `The passenger wrote in English. You MUST reply in English.`,
      `If you need a field, ask only for what's missing, naturally.`,
      `If you didn't understand, admit it and ask to rephrase.`,
      `No bullet points or list formatting. Write in natural paragraphs.`,
      `The bot prepares the reservation and passes the info — the DRIVER coordinates meeting details with the passenger. Do NOT say "I will come" or "I will pick you up": say "the driver will contact you".`,
    ],
    pt: [
      `IDIOMA (OBRIGATÓRIO): O usuário escreveu em português. Você DEVE responder em português.`,
      `NÃO invente dados. Use SOMENTE as informações do CONTEXTO e REFERÊNCIA.`,
      `Se houver preço, mantenha exatamente como fornecido.`,
      `Tom natural e conversacional, como uma pessoa real ajudando um viajante em Iguazú. Sem jargão corporativo. ${policy.decision === "ANSWER" ? "Máx 5 frases (resposta informativa)." : (isGreeting ? "Máx 1-2 linhas, bem breve." : "Máx 2-3 frases.")}`,
      `O passageiro escreveu em português. Você DEVE responder em português.`,
      `Se precisar de um campo, pergunte apenas o que falta, naturalmente.`,
      `Se não entendeu, admita e peça para reformular.`,
      `Sem marcadores ou formato de lista. Escreva em parágrafos naturais.`,
      `O bot prepara a reserva e repassa as informações — o MOTORISTA coordena os detalhes do encontro com o passageiro.`,
    ],
    es: [
      `IDIOMA (OBLIGATORIO): El usuario escribe en español. Respondé SOLO en español.`,
      `No inventes datos. Usá SOLO la información del CONTEXTO y la REFERENCIA.`,
      `Si hay precio, respetalo exactamente.`,
      `Tono natural y conversacional, como una persona real ayudando a un viajero en Iguazú. Sin jerga corporativa. ${policy.decision === "ANSWER" ? "Máx 5 oraciones (es una respuesta informativa)." : (isGreeting ? "Máx 1-2 líneas, muy breve." : "Máx 2-3 oraciones.")}`,
      `Respondé en el MISMO IDIOMA que el pasajero.`,
      `Si necesitás un campo, preguntá solo por lo que falta de forma natural.`,
      `Si no entendiste, admitilo y pedí reformular.`,
      `No uses viñetas ni formato de lista. Escribí en párrafo natural.`,
      `El bot prepara la reserva y pasa la información — el CHOFER es quien coordina los detalles del encuentro con el pasajero. No digas "llegaré" o "te buscaré": decí "el chofer se contactará con usted".`,
    ],
  };
  const rules: string[] = RULES_TRANSLATIONS[userLang] ?? RULES_TRANSLATIONS.es;

  // ── Reglas por modo (traducidas) ──
  const MODE_RULES: Record<string, Record<string, Record<string, string>>> = {
    en: {
      AHORA: {
        EXECUTE: `Immediate ACTION. Confirm without delay. Do NOT ask anything else. Explain the driver will contact them.`,
        ANSWER: `Direct ANSWER. Give the price/info without extending the conversation.`,
        CLARIFY: `CLARIFICATION. Ask ONLY for the missing field (don't ask for confirmation or repeat previous data).`,
      },
      RESERVA: {
        EXECUTE: `Future RESERVATION. Confirm the data and explain the driver will contact them 1 day before the trip.`,
        ANSWER: `Respond with reservation context. If any data is missing, mention it gently.`,
        CLARIFY: `CLARIFICATION FOR RESERVATION. Ask for the missing field to schedule the future trip.`,
      },
    },
    pt: {
      AHORA: {
        EXECUTE: `Ação IMEDIATA. Confirme o serviço sem demora. Não pergunte nada adicional. Explique que o motorista entrará em contato.`,
        ANSWER: `Resposta DIRETA. Dê o preço/informação sem prolongar a conversa.`,
        CLARIFY: `ESCLARECIMENTO. Pergunte APENAS pelo campo faltante.`,
      },
      RESERVA: {
        EXECUTE: `RESERVA futura. Confirme os dados e explique que o motorista entrará em contato 1 dia antes da viagem.`,
        ANSWER: `Responda com contexto da reserva. Se faltar algum dado, mencione suavemente.`,
        CLARIFY: `ESCLARECIMENTO PARA RESERVA. Pergunte pelo campo faltante para agendar a viagem futura.`,
      },
    },
    es: {
      AHORA: {
        EXECUTE: `Es una ACCIÓN INMEDIATA. Confirmá el servicio sin demora y sin preguntar nada adicional. Explicá que el chofer se contactará.`,
        ANSWER: `Es RESPUESTA DIRECTA. Dá el precio/información sin extender la conversación.`,
        CLARIFY: `Es CLARIFICACIÓN. Preguntá SOLO por el dato faltante (sin pedir confirmación ni repetir datos previos).`,
      },
      RESERVA: {
        EXECUTE: `Es una RESERVA FUTURA. Confirmá los datos y explicá que el chofer se contactará 1 día antes del viaje para reconfirmar.`,
        ANSWER: `Respondé con contexto de la reserva. Si falta algún dato, mencionalo suavemente.`,
        CLARIFY: `Es CLARIFICACIÓN PARA RESERVA. Preguntá por el dato faltante para programar el viaje futuro.`,
      },
    },
  };
  const modeKey = policy.mode === "RESERVA" ? "RESERVA" : "AHORA";
  const modeRules = MODE_RULES[userLang]?.[modeKey]?.[policy.decision];
  if (modeRules) rules.push(`9. ${modeRules}`);

  // P0.9.2: Informational redirect
  if (isInformational) {
    const infoRule = userLang === "en"
      ? `The passenger is asking for info (schedules, prices, how things work). Respond DIRECTLY with REFERENCE KNOWLEDGE. Do NOT ask for trip data, do NOT redirect to booking, do NOT ask for passengers/origin. If the info is in REFERENCE, give it. If not, say to check the official website.`
      : userLang === "pt"
        ? `O passageiro está perguntando por informações (horários, preços, funcionamento). Responda DIRETAMENTE com o CONHECIMENTO DE REFERÊNCIA. NÃO peça dados de viagem, NÃO redirecione para reserva, NÃO pergunte passageiros/origem.`
        : `El pasajero pregunta por info (horarios, precios, funcionamiento). Respondé DIRECTAMENTE con la CONOCIMIENTO DE REFERENCIA. NO pidas datos de viaje, NO redirijas a booking, NO preguntes pasajeros/origen. Si la info está en REFERENCIA, dala. Si no, decí que consulten en el sitio oficial.`;
    rules.push(`12. ${infoRule}`);
  }

  if (isGreeting) {
    const greetRule = userLang === "en" ? "It's a GREETING. Respond in max 1-2 lines. Very brief. Do NOT ask anything."
      : userLang === "pt" ? "É um CUMPRIMENTO. Responda em no máximo 1-2 linhas. Seja breve. Não pergunte nada."
      : "Es un SALUDO. Respondé en máximo 1-2 líneas. Sé muy breve y no preguntes nada adicional.";
    rules.push(`11. ${greetRule}`);
  }

  const rulesLabel = userLang === "en" ? "RULES (mandatory):"
    : userLang === "pt" ? "REGRAS (obrigatórias):"
    : "REGLAS (obligatorias):";

  const reminder = userLang === "en"
    ? `⚠️ FINAL REMINDER — LANGUAGE: The user wrote in English. You MUST respond in English.`
    : userLang === "pt"
      ? `⚠️ LEMBRETE FINAL — IDIOMA: O usuário escreveu em português. Você DEVE responder em português.`
      : `⚠️ RECORDATORIO FINAL — IDIOMA: El usuario escribe en español. Respondé SOLO en español.`;

  const templateLabel = userLang === "en" ? "REFERENCE TEMPLATE (improve it keeping the data):"
    : userLang === "pt" ? "TEMPLATE DE REFERÊNCIA (melhore-o mantendo os dados):"
    : "TEMPLATE DE REFERENCIA (mejoralo manteniendo los datos):";

  lines.push(
    ``,
    rulesLabel,
    ...rules,
    ``,
    reminder,
    ``,
    templateLabel,
    policy.finalResponse,
  );

  return lines.join("\n");
}

export interface LLMValidationResult {
  valid: boolean;
  reason?: string;
}

export function validateLLMResponse(
  llmText: string,
  ctx?: HandlerContext,
): LLMValidationResult {
  if (llmText.length < 5) return { valid: false, reason: "too_short" };
  if (llmText.length > 500) return { valid: false, reason: "too_long" };

  if (/https?:\/\/|www\./i.test(llmText)) return { valid: false, reason: "contains_url" };

  const tariff = ctx?.extraction?.tariff;
  if (tariff?.price != null) {
    const pricesInText = llmText.match(/\$?\d{2,}(?:[.,]\d{3})*/g);
    if (pricesInText) {
      const policyPrice = tariff.price;
      for (const p of pricesInText) {
        const num = parseInt(p.replace(/[$.,]/g, ""), 10);
        if (num !== 0) {
          const ratio = Math.abs(num - policyPrice) / policyPrice;
          if (ratio > 0.2) {
            return { valid: false, reason: `price_mismatch: LLM dijo ${num}, policy=${policyPrice}` };
          }
        }
      }
    }
  }

  const slots = ctx?.extraction?.slots ?? {};
  const dest = String(slots.destination?.value ?? "").toLowerCase();

  // Normalizar: lowercase, sin acentos, tomar prefijo significativo (4+ chars).
  // Esto permite que "aeropuerto_igr" matchee con "aeropuerto" en la respuesta.
  function normalizeForMatch(s: string): string {
    return s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // quitar acentos
      .replace(/[_-]/g, " ")
      .trim();
  }

  // Solo exigir que el DESTINO aparezca (es lo que el pasajero quiere saber).
  // El origen puede omitirse si el contexto está claro (ej: "te busco a las 6am").
  if (dest && dest.length > 3) {
    const llmNorm = normalizeForMatch(llmText);
    const destNorm = normalizeForMatch(dest);
    const destToken = destNorm.split(" ")[0]; // primera palabra significativa
    if (destToken.length >= 4 && !llmNorm.includes(destToken)) {
      // Intentar también con el destino completo
      if (!llmNorm.includes(destNorm)) {
        return { valid: false, reason: `dest_mismatch: expected '${dest}' (token: '${destToken}') in response` };
      }
    }
  }

  return { valid: true };
}

// P5: generateLLMResponse ahora usa el LLMProvider (Gemini por defecto, Groq fallback)
export async function generateLLMResponse(
  policy: PolicyOutput,
  ctx?: HandlerContext,
): Promise<string | null> {
  if (policy.decision === "SAFE_FALLBACK") return null;

  const provider = getLLMProvider();
  const prompt = buildResponsePrompt(policy, ctx);

  try {
    const content = await provider.generateResponse(prompt, GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE);
    if (!content || content.length < 5) return null;

    const validation = validateLLMResponse(content, ctx);
    if (!validation.valid) {
      log.warn("[LLM_RESPONSE] Validation failed", { reason: validation.reason, content: content.substring(0, 80) });
      return null;
    }

    return content;
  } catch (e) {
    log.warn("[LLM_RESPONSE] Generation failed", e instanceof Error ? e.message : String(e));
    return null;
  }
}
