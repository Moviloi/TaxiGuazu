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

function getGroq() {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) throw new Error("GROQ_API_KEY no configurada");
  return new Groq({ apiKey });
}

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  _phone: string
): Promise<string> {
  const groq = getGroq();
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

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${systemPrompt}\n\n${tripInfo}`,
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
    content: `Cliente: ${userText}\n\nBot (respondé en español, breve y servicial):`,
  });

  try {
    const completion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages,
      max_tokens: 512,
      temperature: 0.7,
    });

    return completion.choices[0]?.message?.content?.trim() || "Disculpá, no pude procesar tu mensaje. Un operador te atenderá en breve.";
  } catch (error: any) {
    console.error("[GROQ] Error:", error?.message || error);
    return "Disculpá, estoy teniendo problemas técnicos. Un operador te atenderá en breve.";
  }
}
