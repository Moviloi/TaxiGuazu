// GROQ PROVIDER — Implementación de LLMProvider usando Groq llama-3.3-70b-versatile.
// P5: Provider de fallback cuando Gemini falla o no está configurado.

import Groq from "groq-sdk";
import { getEnv } from "@/config/env";
import { GROQ_MODEL } from "@/config/constants";
import { log } from "@/lib/utils/logger";
import type { LLMProvider } from "../llm-provider";

export class GroqProvider implements LLMProvider {
  name = "groq";
  private groq: Groq;

  constructor() {
    const env = getEnv();
    this.groq = new Groq({ apiKey: env.GROQ_API_KEY });
  }

  async extractSlots(prompt: string, maxTokens: number, temperature: number): Promise<Record<string, any> | null> {
    try {
      const completion = await this.groq.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages: [{ role: "system", content: prompt }],
          response_format: { type: "json_object" },
          max_tokens: maxTokens,
          temperature,
        },
        { timeout: 5000 },
      );

      const content = completion.choices[0]?.message?.content;
      if (!content) return null;

      return JSON.parse(content);
    } catch (e) {
      log.error("[GROQ_EXTRACT]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async generateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    try {
      const completion = await this.groq.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages: [{ role: "system", content: prompt }],
          max_tokens: maxTokens,
          temperature,
        },
        { timeout: 5000 },
      );

      const content = completion.choices[0]?.message?.content?.trim();
      return content || null;
    } catch (e) {
      log.error("[GROQ_RESPONSE]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async interpretAmbiguity(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    try {
      const completion = await this.groq.chat.completions.create(
        {
          model: GROQ_MODEL,
          messages: [{ role: "system", content: prompt }],
          max_tokens: maxTokens,
          temperature,
        },
        { timeout: 5000 },
      );

      const content = completion.choices[0]?.message?.content?.trim();
      return content || null;
    } catch (e) {
      log.error("[GROQ_AMBIGUITY]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }
}
