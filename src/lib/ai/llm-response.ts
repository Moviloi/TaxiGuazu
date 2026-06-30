import Groq from "groq-sdk";
import { getEnv } from "@/config/env";
import { GROQ_MODEL, GROQ_TIMEOUT_MS, GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE } from "@/config/constants";
import type { PolicyOutput, HandlerContext } from "./types";
import { log } from "@/lib/utils/logger";
import { IGUAZU_KNOWLEDGE } from "@/lib/ai/iguazu-knowledge";

function getGroq(): Groq | null {
  try {
    const env = getEnv();
    return new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (e) {
    log.error("[LLM_GROQ]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function buildResponsePrompt(policy: PolicyOutput, ctx?: HandlerContext): string {
  const slots = ctx?.extraction?.slots ?? {};
  const tariff = ctx?.extraction?.tariff;

  const lines = [
    `Eres Cris, asistente virtual de TaxiGuazú (remises y transfers en Puerto Iguazú, Argentina).`,
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

  // If informational, inject Iguazú knowledge so the bot can answer questions about prices, hours, migration
  if (isInformational) {
    const knownNames = IGUAZU_KNOWLEDGE.knownPlaces.map(p => p.name).join(", ");
    lines.push(
      ``,
      `CONOCIMIENTO DE REFERENCIA (usalo si el usuario pregunta sobre estos temas):`,
      `- Lugares conocidos: ${knownNames}`,
      `- Migración AR→BR: DNI físico obligatorio (no digital). Pre-Cadastro QR recomendado. Franquicia USD 300/adulto, USD 150/menor.`,
      `- Transporte: Aeropuerto IGR a 15 km del centro (20-25 min). Taxi y remís tienen tarifas preestablecidas. Uber no recomendado.`,
      `- Cataratas lado AR: $45.000 ARS turista general, 8:00-18:00. Lado BR: R$ 134,00, 09:00-16:00.`,
      `- NO inventes precios ni horarios — usá SOLO esta referencia o decí que consulten en el sitio oficial.`,
    );
  }

  // ── Reglas base (aplican siempre) ──
  const rules: string[] = [
    `1. No inventes datos. Usá SOLO la información del CONTEXTO.`,
    `2. Si hay precio, respetalo exactamente.`,
    `3. Tono amable, profesional, conciso (máx 3 oraciones).`,
    `4. Respondé en el MISMO IDIOMA que el pasajero. Si escribe en portugués, respondé en portugués.`,
    `5. Si necesitás un campo, preguntá solo por lo que falta de forma natural.`,
    `6. Si no entendiste, admitilo y pedí reformular.`,
    `7. No uses viñetas ni formato de lista. Escribí en párrafo natural.`,
  ];

  // ── Reglas por modo (behavioral guidelines, no scripts) ──
  if (policy.mode === "AHORA") {
    if (policy.decision === "EXECUTE") {
      rules.push(`8. Es una ACCIÓN INMEDIATA. Confirmá el servicio sin demora y sin preguntar nada adicional.`);
    } else if (policy.decision === "ANSWER") {
      rules.push(`8. Es RESPUESTA DIRECTA. Dá el precio/ información sin extender la conversación.`);
    } else if (policy.decision === "CLARIFY") {
      rules.push(`8. Es CLARIFICACIÓN. Preguntá SOLO por el dato faltante (sin pedir confirmación ni repetir datos previos).`);
    }
  } else if (policy.mode === "RESERVA") {
    if (policy.decision === "EXECUTE") {
      rules.push(`8. Es una RESERVA FUTURA. Confirmá los datos y explicá que se notificará al pasajero antes del viaje.`);
    } else if (policy.decision === "ANSWER") {
      rules.push(`8. Respondé con contexto de la reserva. Si falta algún dato, mencionalo suavemente.`);
    } else if (policy.decision === "CLARIFY") {
      rules.push(`8. Es CLARIFICACIÓN PARA RESERVA. Preguntá por el dato faltante para programar el viaje futuro.`);
    }
  }

  if (isGreeting) {
    rules.push(`9. Es un SALUDO. Respondé en máximo 1-2 líneas. Sé muy breve y no preguntes nada adicional.`);
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
  const origin = String(slots.origin?.value ?? "").toLowerCase();
  const dest = String(slots.destination?.value ?? "").toLowerCase();

  if (origin && dest && origin.length > 3 && dest.length > 3) {
    const llmLow = llmText.toLowerCase();
    const matchesDest = llmLow.includes(dest);
    const matchesOrigin = llmLow.includes(origin);
    if (!matchesDest || !matchesOrigin) {
      return { valid: false, reason: `origin_dest_mismatch: expected '${origin}' and '${dest}' in response` };
    }
  }

  return { valid: true };
}

export async function generateLLMResponse(
  policy: PolicyOutput,
  ctx?: HandlerContext,
): Promise<string | null> {
  if (policy.decision === "SAFE_FALLBACK") return null;

  const groq = getGroq();
  if (!groq) return null;

  const prompt = buildResponsePrompt(policy, ctx);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [{ role: "system", content: prompt }],
        max_tokens: GROQ_RESPONSE_MAX_TOKENS,
        temperature: GROQ_RESPONSE_TEMPERATURE,
      },
      { timeout: GROQ_TIMEOUT_MS },
    );

    const content = completion.choices[0]?.message?.content?.trim();
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
