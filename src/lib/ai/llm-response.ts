import { GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE } from "@/config/constants";
import { getLLMProvider } from "./llm-provider";
import type { PolicyOutput, HandlerContext } from "./types";
import { log } from "@/lib/utils/logger";
import { IGUAZU_KNOWLEDGE, getAttractionsDetailPrompt, getMigrationDetailPrompt, getBordersDetailPrompt } from "@/lib/ai/iguazu-knowledge";
import { getOperationalInfoPrompt } from "@/lib/ai/taxiguazu-knowledge";

function buildResponsePrompt(policy: PolicyOutput, ctx?: HandlerContext): string {
  const slots = ctx?.extraction?.slots ?? {};
  const tariff = ctx?.extraction?.tariff;

  const lines = [
    `Eres Cris Virtual, asistente 24/7 de TaxiGuazú (remises y transfers en Puerto Iguazú, Argentina). Sos un bot conversacional — no te hagas pasar por humano. Para reservas confirmadas o casos que requieran atención humana, Cristian o el chofer asignado se contactarán según su disponibilidad.`,
    `Redactá el mensaje al pasajero en base a este contexto.`,
    ``,
    `CONTEXTO (datos verificados — NO modificar ni inventar):`,
    `- Intención: ${policy.decision}`,
    `- Modo: ${policy.mode}`,
    `- Tipo: ${policy.policyHint}`,
    `- Origen: ${slots.origin?.value ?? "no definido"}`,
    `- Destino: ${slots.destination?.value ?? "no definido"}`,
    `- Pasajeros: ${slots.passengers?.value ?? "no definido"}`,
    `- Precio: ${tariff?.price != null ? `$${tariff.price} ARS` : "no disponible"}`,
    `- Siguiente campo: ${policy.nextExpectedFields.join(", ") || "ninguno"}`,
  ];
  if (ctx?.customerName) lines.push(`- Nombre del pasajero: ${ctx.customerName}`);

  const isInformational = policy.policyHint?.includes("(info)") || policy.policyHint?.includes("INFORMATION");
  const isGreeting = policy.policyHint?.includes("GREETING");

  // If informational, inject comprehensive Iguazú knowledge so the bot can answer questions about prices, hours, migration, borders, etc.
  if (isInformational) {
    const knownNames = IGUAZU_KNOWLEDGE.knownPlaces.map(p => p.name).join(", ");
    lines.push(
      ``,
      `CONOCIMIENTO DE REFERENCIA (usalo si el usuario pregunta sobre estos temas):`,
      `- Lugares conocidos: ${knownNames}`,
      ``,
      `--- ATRACTIVOS (precios 2026) ---`,
      getAttractionsDetailPrompt(),
      ``,
      `--- MIGRACIÓN ---`,
      getMigrationDetailPrompt(),
      ``,
      `--- CRUCE DE FRONTERAS ---`,
      getBordersDetailPrompt(),
      ``,
      `--- INFO PRÁCTICA ---`,
      `- Clima: subtropical húmedo. ${IGUAZU_KNOWLEDGE.practical.weather.slice(0, 3).join(" ")}`,
      `- Moneda: ARS (AR), BRL (BR), PYG (PY). USD aceptado en hoteles y turismo.`,
      `- Seguridad: Puerto Iguazú muy segura. Foz segura en zona turística. CDE: solo horario comercial (07:00-16:00).`,
      `- Restaurantes recomendados: Aqva (premium cocina de autor), El Quincho del Tío Querido (asado tradicional), La Rueda 1975, Pizza Color, La Mamma.`,
      `- Horarios de comida AR: almuerzo 12:30-14:30, cena 21:00-23:30. BR: almuerzo 11:30-13:30, cena 19:30-21:30.`,
      ``,
      `--- EVENTOS ---`,
      `- Paseo Luna Llena: ${IGUAZU_KNOWLEDGE.calendar.lunaLlena.slice(1, 4).join(" | ")}`,
      `- Temporada alta: enero, febrero, julio, Semana Santa, feriados puente.`,
      `- Temporada baja: marzo-junio (excl. Semana Santa), agosto-noviembre (excl. feriados).`,
      ``,
      `--- COMPRAS CDE ---`,
      `- Tiendas certificadas: Shopping Paris, Shopping China, Monalisa, Nissei.`,
      `- El chofer de TaxiGuazú acompaña y asesora en compras en CDE para evitar estafas.`,
      `- Precios referenciales: iPhone ~USD 850 en CDE vs ~USD 1.800 en AR. Perfumes ~USD 95 vs ~USD 200.`,
      `- Operar solo en horario comercial (07:00-16:00). Retornar antes de las 16:00.`,
      ``,
      `- NO inventes precios ni horarios — usá SOLO esta referencia o decí que consulten en el sitio oficial.`,
    );
  }

  // Operational knowledge: cómo funciona TaxiGuazú en la práctica (útil para responder preguntas del pasajero)
  lines.push(
    ``,
    `INFORMACIÓN DEL SERVICIO TAXIGUAZÚ (referencia obligatoria):`,
    getOperationalInfoPrompt(),
  );

  // ── Reglas base (aplican siempre) ──
  const rules: string[] = [
    `1. No inventes datos. Usá SOLO la información del CONTEXTO y la REFERENCIA.`,
    `2. Si hay precio, respetalo exactamente.`,
    `3. Tono natural y conversacional, como una persona real ayudando a un viajero en Iguazú. Sin jerga corporativa. ${policy.decision === "ANSWER" ? "Máx 5 oraciones (es una respuesta informativa)." : (isGreeting ? "Máx 1-2 líneas, muy breve." : "Máx 2-3 oraciones.")}`,
    `4. Respondé en el MISMO IDIOMA que el pasajero. Si escribe en portugués, respondé en portugués.`,
    `5. Si necesitás un campo, preguntá solo por lo que falta de forma natural.`,
    `6. Si no entendiste, admitilo y pedí reformular.`,
    `7. No uses viñetas ni formato de lista. Escribí en párrafo natural.`,
    `8. El bot prepara la reserva y pasa la información — el CHOFER es quien coordina los detalles del encuentro con el pasajero. No digas "llegaré" o "te buscaré": decí "el chofer se contactará con usted".`,
  ];

  // ── Reglas por modo (behavioral guidelines, no scripts) ──
  if (policy.mode === "AHORA") {
    if (policy.decision === "EXECUTE") {
      rules.push(`9. Es una ACCIÓN INMEDIATA. Confirmá el servicio sin demora y sin preguntar nada adicional. Explicá que el chofer se contactará.`);
    } else if (policy.decision === "ANSWER") {
      rules.push(`9. Es RESPUESTA DIRECTA. Dá el precio/información sin extender la conversación.`);
    } else if (policy.decision === "CLARIFY") {
      rules.push(`9. Es CLARIFICACIÓN. Preguntá SOLO por el dato faltante (sin pedir confirmación ni repetir datos previos).`);
    }
  } else if (policy.mode === "RESERVA") {
    if (policy.decision === "EXECUTE") {
      rules.push(`10. Es una RESERVA FUTURA. Confirmá los datos y explicá que el chofer se contactará 1 día antes del viaje para reconfirmar.`);
    } else if (policy.decision === "ANSWER") {
      rules.push(`10. Respondé con contexto de la reserva. Si falta algún dato, mencionalo suavemente.`);
    } else if (policy.decision === "CLARIFY") {
      rules.push(`10. Es CLARIFICACIÓN PARA RESERVA. Preguntá por el dato faltante para programar el viaje futuro.`);
    }
  }

  // P0.9.2: Si es informational, respondé directamente con la REFERENCIA.
  // NO pidas datos de viaje. El pasajero quiere info, no reservar.
  if (isInformational) {
    rules.push(`12. El pasajero pregunta por info (horarios, precios, funcionamiento). Respondé DIRECTAMENTE con la CONOCIMIENTO DE REFERENCIA. NO pidas datos de viaje, NO redirijas a booking, NO preguntes pasajeros/origen. Si la info está en REFERENCIA, dala. Si no, decí que consulten en el sitio oficial.`);
  }

  if (isGreeting) {
    rules.push(`11. Es un SALUDO. Respondé en máximo 1-2 líneas. Sé muy breve y no preguntes nada adicional.`);
  }

  lines.push(
    ``,
    `REGLAS (obligatorias):`,
    ...rules,
    ``,
    `TEMPLATE DE REFERENCIA (mejoralo manteniendo los datos):`,
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
