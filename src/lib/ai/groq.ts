import Groq from "groq-sdk";
import { getSystemPrompt } from "./system-prompt";
import { getEnv } from "@/config/env";
import type { TripRow } from "@/lib/db/types";

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

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  clientPhone: string,
  promoNote?: string
): Promise<string> {
  const groq = getGroq();
  if (!groq) return "Disculpe, no pude procesar su mensaje. Un operador lo asistirá.";

  const lang = detectLang(userText);
  const systemPromptBase = getSystemPrompt(lang);

  const dolar = process.env.COTIZACION_DOLAR || "1250";
  const real = process.env.COTIZACION_REAL || "250";

  let dynamicContext = `[ESTADO_SISTEMA_DINÁMICO]\n`;
  dynamicContext += `Cotización Dólar: $${dolar} ARS | Cotización Real: $${real} ARS\n`;
  dynamicContext += `Nota Promocional Vigente del Traslado: ${promoNote || "Ninguna promoción activa"}\n`;
  dynamicContext += `Teléfono del Cliente: ${clientPhone}\n`;

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
        model: "llama-3.3-70b-versatile",
        messages,
        max_tokens: 512,
        temperature: 0.3,
      },
      { timeout: 8000 }
    );

    return completion.choices[0]?.message?.content?.trim() || "Disculpe, no pude procesar su mensaje.";
  } catch (e) {
    console.error("[GROQ_ERROR]", e);
    return "Disculpe, no pude procesar su mensaje. Un operador lo asistirá.";
  }
}
