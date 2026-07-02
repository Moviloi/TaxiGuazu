// FALLBACK PROVIDER — Wrapper que intenta Gemini primero y cae a Groq si falla.
// P5: Garantiza disponibilidad del LLM incluso si el provider principal tiene rate limits.

import { log } from "@/lib/utils/logger";
import type { LLMProvider } from "../llm-provider";
import { GeminiProvider } from "./gemini-provider";
import { GroqProvider } from "./groq-provider";

export class FallbackProvider implements LLMProvider {
  name = "fallback";
  private primary: LLMProvider;
  private fallback: LLMProvider;

  constructor() {
    try {
      this.primary = new GeminiProvider();
    } catch (e) {
      log.warn("[FALLBACK_PROVIDER]", { error: "Gemini init failed", message: e instanceof Error ? e.message : String(e) });
      this.primary = new GroqProvider();
    }
    this.fallback = new GroqProvider();
  }

  async extractSlots(prompt: string, maxTokens: number, temperature: number): Promise<Record<string, any> | null> {
    const result = await this.primary.extractSlots(prompt, maxTokens, temperature);
    if (result !== null) return result;

    if (this.primary.name !== this.fallback.name) {
      log.warn("[FALLBACK_PROVIDER]", { primary: this.primary.name, action: "falling back to", fallback: this.fallback.name });
      return this.fallback.extractSlots(prompt, maxTokens, temperature);
    }
    return null;
  }

  async generateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    const result = await this.primary.generateResponse(prompt, maxTokens, temperature);
    if (result !== null) return result;

    if (this.primary.name !== this.fallback.name) {
      log.warn("[FALLBACK_PROVIDER]", { primary: this.primary.name, action: "falling back to", fallback: this.fallback.name });
      return this.fallback.generateResponse(prompt, maxTokens, temperature);
    }
    return null;
  }

  async interpretAmbiguity(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    const result = await this.primary.interpretAmbiguity(prompt, maxTokens, temperature);
    if (result !== null) return result;

    if (this.primary.name !== this.fallback.name) {
      log.warn("[FALLBACK_PROVIDER]", { primary: this.primary.name, action: "falling back to", fallback: this.fallback.name });
      return this.fallback.interpretAmbiguity(prompt, maxTokens, temperature);
    }
    return null;
  }
}
