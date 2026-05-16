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

const DESTINATIONS = [
  "cataratas", "cataratas argentina", "cataratas lado argentino",
  "aeropuerto", "aeropuerto igr",
  "iguazú", "iguazu", "puerto iguazú", "puerto iguazu",
  "wanda", "minas wanda",
  "san ignacio",
  "foz", "foz do iguaçu", "cataratas brasil",
  "paraguay", "ciudad del este", "cd del este",
  "duty free", "hito 3 fronteras",
  "centro", "centro puerto iguazú",
];

function detectLang(text: string): "es" | "en" | "pt" {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "por favor", "gostaria", "quero", "para", "iguaçu",
    "brasil", "foz", "português", "então", "são", "estou", "está"];
  const enMarkers = ["please", "thank you", "i want", "i would like", "how much",
    "hello", "hi ", "help", "airport", "hotel"];

  let ptScore = ptMarkers.filter((m) => lower.includes(m)).length;
  let enScore = enMarkers.filter((m) => lower.includes(m)).length;

  if (ptScore > enScore && ptScore >= 2) return "pt";
  if (enScore > ptScore && enScore >= 2) return "en";
  return "es";
}

function extractKnownData(history: Message[], userText: string): string {
  const allText = [...history.map((m) => m.content), userText].join(" ");

  const rows: string[] = [];

  const passMatch = allText.match(/(\d+)\s*pasajeros?/i);
  if (passMatch) rows.push(`- Pasajeros: ${passMatch[1]}`);

  const found = DESTINATIONS.find((d) => allText.toLowerCase().includes(d));
  if (found) rows.push(`- Destino: ${found}`);

  const timeMatch = allText.match(/(?:a\s*las\s*)?(\d{1,2})\s*(?::|\.)?\s*(\d{2})\s*(?:hs|hrs|horas)?/i);
  if (timeMatch) {
    rows.push(`- Hora: ${timeMatch[1]}:${timeMatch[2]}`);
  } else {
    const hourOnly = allText.match(/(?:a\s*las\s*)(\d{1,2})(?:\s|$)/i);
    if (hourOnly) rows.push(`- Hora: ~${hourOnly[1]}:00`);
  }

  if (/mañana|hoy|pasado\s*mañana/i.test(allText)) rows.push(`- Fecha: mencionada`);
  if (/\bvuelo\b/i.test(allText)) rows.push(`- Nro vuelo: mencionado`);
  if (/\$\s*\d[\d.]*/i.test(allText)) rows.push(`- Precio: conversado`);

  const originMatch = allText.match(/(?:desde|de|from)\s+([a-záéíóúñ\s]+?)(?:\s+(?:hasta|a|to|para|hacia|pará)\s+)/i);
  if (originMatch) rows.push(`- Posible origen: ${originMatch[1].trim()}`);

  if (rows.length === 0) return "\n\nDATOS CONOCIDOS: (ninguno aún, preguntá todo)";

  return `\n\nDATOS CONOCIDOS (NO preguntes lo que ya está marcado):\n${rows.join("\n")}
  `;
}

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  _phone: string,
  promoNote?: string
): Promise<string> {
  const groq = getGroq();
  if (!groq) return "Disculpá, estoy teniendo problemas técnicos. Un operador te atenderá en breve.";

  const lang = detectLang(userText);
  const systemPrompt = getSystemPrompt(lang, promoNote);

  const tripInfo = trip
    ? `\n\nVIAJE ACTUAL:\n- Origen: ${trip.destination ? "conversado" : "por definir"}\n- Destino: ${trip.destination || "por definir"}\n- Precio: $${trip.price_base || "por definir"}\n- Descuento: ${trip.discount_explicit || 0}%\n- Estado: ${trip.status || "en consulta"}`
    : "\n\n(No hay viaje activo aún)";

  const conversationHistory = history
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "Bot" : "Cliente";
      return `${role}: ${m.content}`;
    })
    .join("\n");

  const knownData = extractKnownData(history, userText);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\n${tripInfo}${knownData}`,
    },
  ];

  if (conversationHistory) {
    messages.push({
      role: "system",
      content: `CONVERSACIÓN RECIENTE:\n${conversationHistory}`,
    });
  }

  const langInstruction = lang === "en"
    ? "Respond in English, brief and helpful."
    : lang === "pt"
    ? "Responda em português, breve e útil."
    : "Respondé en español, breve y servicial.";

  messages.push({
    role: "user",
    content: `Cliente: ${userText}\n\n${langInstruction} No preguntes datos que el cliente ya dio. Usá formato itinerario. No menciones códigos internos.`,
  });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() || "Disculpá, no pude procesar tu mensaje. Un operador te atenderá en breve.";
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[GROQ] Error:", msg);
    return "Disculpá, estoy teniendo problemas técnicos. Un operador te atenderá en breve.";
  }
}
