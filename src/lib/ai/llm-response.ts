import Groq from "groq-sdk";
import { getEnv } from "@/config/env";
import { GROQ_MODEL, GROQ_TIMEOUT_MS, GROQ_RESPONSE_MAX_TOKENS, GROQ_RESPONSE_TEMPERATURE } from "@/config/constants";
import type { PolicyOutput, HandlerContext } from "./types";
import { log } from "@/lib/utils/logger";

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

  lines.push(
    ``,
    `REGLAS (obligatorias):`,
    `1. No inventes datos. Usá SOLO la información del CONTEXTO.`,
    `2. Si hay precio, respetalo exactamente.`,
    `3. Tono amable, profesional, conciso (máx 3 oraciones).`,
    `4. Respondé en el MISMO IDIOMA que el pasajero. Si escribe en portugués, respondé en portugués. Si escribe en francés, respondé en francés.`,
    `5. Si necesitás un campo, preguntá solo por lo que falta de forma natural.`,
    `6. Si no entendiste, admitilo y pedí reformular.`,
    `7. Si es confirmación con precio, mostrá resumen y pedí confirmación.`,
    `8. No uses viñetas ni formato de lista. Escribí en párrafo natural.`,
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
    const swapped = llmText.toLowerCase().includes(dest) && llmText.includes(origin);
    if (!swapped) return { valid: false, reason: "origin_dest_mismatch" };
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
