import Groq from "groq-sdk";
import { getExtractionPrompt } from "./extraction-prompt";
import { getEnv } from "@/config/env";
import { GROQ_MODEL, GROQ_TIMEOUT_MS, GROQ_EXTRACTION_MAX_TOKENS } from "@/config/constants";

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

// v5.0 FASE 5B OUTPUT LOCK:
// generateGroqExtraction es el ÚNICO call al LLM permitido. Se usa solo para
// extracción de slots (rol CORE). Cualquier uso fuera de eso es bypass.
//
// generateGroqReply() fue ELIMINADO del output final. El handler (handler.ts)
// es la única fuente del texto que se envía al cliente. Esta función queda
// compilable por backward-compat pero debe considerarse LEGACY.
export async function generateGroqExtraction(
  userText: string,
  history: Message[],
  customerName?: string
): Promise<Record<string, any> | null> {
  const groq = getGroq();
  if (!groq) return null;

  const lang = detectLang(userText);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getExtractionPrompt() },
    {
      role: "system",
      content: [
        `IDIOMA_DETECTADO: ${lang.toUpperCase()}`,
        `NOMBRE_CLIENTE_CONOCIDO: ${customerName || "ninguno"}`,
      ].join(" | "),
    },
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
        temperature: 0.3,
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
  _userText: string,
  _history?: Message[],
  _trip?: null,
  _clientPhone?: string,
  _promoNote?: string,
  _customerName?: string,
  _extractionNote?: string,
): Promise<string> {
  console.error(
    "[LEGACY BLOCKED] generateGroqReply() invocado. v5.0 FASE 5B: el output final debe venir de POLICY via handleMessage().",
  );
  throw new Error(
    "LEGACY_FLOW_BLOCKED: generateGroqReply está deshabilitado. Use handleMessage() para obtener el finalResponse desde POLICY.",
  );
}
