import Groq from "groq-sdk";
import { getSystemPrompt } from "./system-prompt";
import { getExtractionPrompt } from "./extraction-prompt";
import { getEnv } from "@/config/env";
import type { TripRow } from "@/lib/db/types";
import { GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TIMEOUT_MS, GROQ_EXTRACTION_MAX_TOKENS, GROQ_EXTRACTION_TEMPERATURE } from "@/config/constants";

type Trip = Pick<TripRow, "trip_id" | "destination" | "price_base" | "discount_explicit" | "status">;

interface Message {
  role: string;
  content: string;
  created_at: number;
}

function getGroq(): Groq | null {
  try {
    const env = getEnv();
    return new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (e) {
    console.error("[GROQ]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function detectLang(text: string): "es" | "en" | "pt" {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please"];

  if (ptMarkers.some(marker => lower.includes(marker))) return "pt";
  if (enMarkers.some(marker => lower.includes(marker))) return "en";
  return "es";
}

export async function generateGroqExtraction(
  userText: string,
  history: Message[],
  customerName?: string
): Promise<Record<string, any> | null> {
  const groq = getGroq();
  if (!groq) return null;

  const lang = detectLang(userText);
  const systemPrompt = getExtractionPrompt(lang);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "system", content: `IDIOMA_DETECTADO: ${lang.toUpperCase()}` },
    { role: "system", content: customerName ? `NOMBRE_CLIENTE_CONOCIDO: ${customerName}` : "NOMBRE_CLIENTE_CONOCIDO: ninguno" },
  ];

  const nativeHistory = history
    .filter((m) => m.role !== "system")
    .slice(-6)
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    }));

  messages.push(...nativeHistory);
  messages.push({ role: "user", content: userText });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        response_format: { type: "json_object" },
        max_tokens: GROQ_EXTRACTION_MAX_TOKENS,
        temperature: GROQ_EXTRACTION_TEMPERATURE,
      },
      { timeout: GROQ_TIMEOUT_MS }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (e) {
    console.error("[GROQ_EXTRACTION_ERROR]", e);
    return null;
  }
}

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  clientPhone: string,
  promoNote?: string,
  customerName?: string,
  extractionNote?: string,
  skipMarkers = false,
): Promise<string> {
  const groq = getGroq();
  if (!groq) return "Disculpe, no pude responder. Un operador lo asistirá.";

  const lang = detectLang(userText);
  const systemPromptBase = getSystemPrompt(lang, !skipMarkers);

  const dolar = process.env.COTIZACION_DOLAR || "1250";
  const real = process.env.COTIZACION_REAL || "250";

  const isExtranjero = !clientPhone.startsWith('+54') || lang !== 'es';
  const monedaSugerida = isExtranjero ? (lang === 'pt' ? 'BRL' : 'USD') : 'ARS';

  let dynamicContext = `[ESTADO_SISTEMA_DINÁMICO]\n`;
  dynamicContext += `Cotización Dólar: $${dolar} ARS | Cotización Real: $${real} ARS\n`;
  dynamicContext += `Nota Promocional Vigente del Traslado: ${promoNote || "Ninguna promoción activa"}\n`;
  dynamicContext += `Teléfono del Cliente: ${clientPhone}\n`;
  dynamicContext += `[CLIENTE_EXTRANJERO: ${isExtranjero}]\n`;
  dynamicContext += `[MONEDA_SUGERIDA: ${monedaSugerida}]\n`;
  dynamicContext += `[SESION_LIMPIA: ${!!customerName}]\n`;
  if (customerName) {
    dynamicContext += `[NOMBRE_CLIENTE: ${customerName}]\n`;
  }
  if (extractionNote) {
    dynamicContext += `[EXTRACCION_CONFIANZA]\n${extractionNote}\n`;
  }

  if (trip) {
    dynamicContext += `Viaje Actual Activo en Base de Datos: ID ${trip.trip_id} | Destino: ${trip.destination} | Estado: ${trip.status}\n`;
  } else {
    dynamicContext += `Viaje Actual Activo en Base de Datos: Ninguno.\n`;
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: systemPromptBase
    },
    {
      role: "system",
      content: `[CONTEXTO_EJECUCIÓN_SESIÓN]\n${dynamicContext}\nIDIOMA_OBLIGATORIO_DE_RESPUESTA: ${lang.toUpperCase()}`
    }
  ];

  const nativeHistory = history
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content
    }));

  messages.push(...nativeHistory);

  messages.push({
    role: "user",
    content: userText
  });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.3,
      },
      { timeout: GROQ_TIMEOUT_MS }
    );

    return completion.choices[0]?.message?.content?.trim() || "Disculpe, no pude responder.";
  } catch (e) {
    console.error("[GROQ_ERROR]", e);
    return "Disculpe, no pude responder. Un operador lo asistirá.";
  }
}
