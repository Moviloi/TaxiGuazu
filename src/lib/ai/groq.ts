import Groq from "groq-sdk";
import { getSystemPrompt } from "./system-prompt";

interface Trip {
  trip_id: string;
  destination?: string;
  price_base?: number;
  discount_explicit?: number;
  status?: string;
}

interface Message {
  role: string;
  content: string;
  created_at: number;
}

function getGroq(): Groq | null {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    console.error("[GROQ] GROQ_API_KEY no configurada");
    return null;
  }
  return new Groq({ apiKey });
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

  if (rows.length === 0) return "\n\nDATOS CONOCIDOS: (ninguno aún, preguntá todo)";

  return `\n\nDATOS CONOCIDOS (NO preguntes lo que ya está marcado):\n${rows.join("\n")}
  `;
}

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  _phone: string
): Promise<string> {
  const groq = getGroq();
  if (!groq) return "Disculpá, estoy teniendo problemas técnicos. Un operador te atenderá en breve.";

  const systemPrompt = getSystemPrompt();

  const tripInfo = trip
    ? `\n\nVIAJE ACTUAL:\n- Destino: ${trip.destination || "por definir"}\n- Precio base: $${trip.price_base || "por definir"}\n- Descuento actual: ${trip.discount_explicit || 0}%\n- Estado: ${trip.status || "en consulta"}`
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

  messages.push({
    role: "user",
    content: `Cliente: ${userText}\n\nBot (respondé en español, breve y servicial, sin preguntar datos que el cliente ya dio):`,
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
