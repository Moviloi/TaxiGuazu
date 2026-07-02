// LLM PROVIDER — Abstracción multimodelo para llamadas a LLM.
// P5: Migración de Groq-only a arquitectura multimodelo con fallback.
//
// Providers:
// - FallbackProvider (default): Gemini 2.0 Flash → Groq fallback automático
// - GeminiProvider: Gemini 2.0 Flash, mejor portugués, rate limits generosos
// - GroqProvider: llama-3.3-70b-versatile, rápido pero rate limits ajustados
//
// Uso:
//   const provider = getLLMProvider();
//   const result = await provider.extractSlots(prompt, maxTokens, temperature);

import { log } from "@/lib/utils/logger";
import { FallbackProvider } from "./providers/fallback-provider";
import { GeminiProvider } from "./providers/gemini-provider";
import { GroqProvider } from "./providers/groq-provider";

export interface LLMProvider {
  name: string;
  extractSlots(prompt: string, maxTokens: number, temperature: number): Promise<Record<string, any> | null>;
  generateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string | null>;
  interpretAmbiguity(prompt: string, maxTokens: number, temperature: number): Promise<string | null>;
}

let _provider: LLMProvider | null = null;

export function getLLMProvider(): LLMProvider {
  if (_provider) return _provider;

  const providerName = process.env.LLM_PROVIDER || "fallback";

  switch (providerName) {
    case "gemini":
      try {
        _provider = new GeminiProvider();
        log.info("[LLM_PROVIDER]", { provider: "gemini", model: "gemini-2.0-flash" });
      } catch (e) {
        log.warn("[LLM_PROVIDER]", { error: "Gemini init failed, using fallback", message: e instanceof Error ? e.message : String(e) });
        _provider = new FallbackProvider();
      }
      break;

    case "groq":
      _provider = new GroqProvider();
      log.info("[LLM_PROVIDER]", { provider: "groq", model: "llama-3.3-70b-versatile" });
      break;

    case "fallback":
    default:
      _provider = new FallbackProvider();
      log.info("[LLM_PROVIDER]", { provider: "fallback", primary: "gemini", fallback: "groq" });
      break;
  }

  return _provider;
}

// Reset provider (para tests)
export function resetLLMProvider(): void {
  _provider = null;
}
