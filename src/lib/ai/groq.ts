import { getExtractionPrompt, getExtractionContextMessage, type ExtractionContext } from "./extraction-prompt";
import { GROQ_EXTRACTION_MAX_TOKENS, GROQ_EXTRACTION_TEMPERATURE } from "@/config/constants";
import { getLLMProvider } from "./llm-provider";
import { log } from "@/lib/utils/logger";

interface Message {
  role: string;
  content: string;
  created_at: number;
}

function detectLang(text: string): "es" | "en" | "pt" {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor", "obrigada", "tudo bem", "por gentileza", "preciso", "gostaria"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please", "thanks", "help", "where", "hotel", "need", "i want", "how far"];

  if (ptMarkers.some(marker => lower.includes(marker))) return "pt";
  if (enMarkers.some(marker => lower.includes(marker))) return "en";
  return "es";
}

// P5: generateGroqExtraction ahora usa el LLMProvider (Gemini por defecto, Groq fallback)
export async function generateGroqExtraction(
  userText: string,
  history: Message[],
  customerName?: string,
  extractionContext?: ExtractionContext,
): Promise<Record<string, any> | null> {
  const provider = getLLMProvider();

  const lang = detectLang(userText);

  const promptParts: string[] = [
    getExtractionPrompt(),
  ];

  // inyectar contexto de CORE (role lock + prev slots)
  const coreContext = getExtractionContextMessage(extractionContext);
  if (coreContext) {
    promptParts.push(coreContext);
  }

  promptParts.push(
    `IDIOMA_DETECTADO: ${lang.toUpperCase()}`,
    `NOMBRE_CLIENTE_CONOCIDO: ${customerName || "ninguno"}`,
  );

  // Historial de conversación
  const nativeHistory = history
    .filter((m) => m.role !== "system")
    .slice(-6)
    .map((m) => `${m.role === "assistant" ? "Assistant" : "User"}: ${m.content}`);

  promptParts.push(...nativeHistory);
  promptParts.push(`User: ${userText}`);

  const fullPrompt = promptParts.join("\n\n");

  try {
    return await provider.extractSlots(fullPrompt, GROQ_EXTRACTION_MAX_TOKENS, GROQ_EXTRACTION_TEMPERATURE);
  } catch (e) {
    log.error("[EXTRACTION_ERROR]", e instanceof Error ? e.message : String(e));
    return null;
  }
}
