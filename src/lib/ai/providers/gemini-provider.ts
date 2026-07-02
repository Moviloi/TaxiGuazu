// GEMINI PROVIDER — Implementación de LLMProvider usando Google Gemini 2.0 Flash.
// P5: Provider principal con rate limits generosos y mejor calidad de portugués.

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";
import type { LLMProvider } from "../llm-provider";

export class GeminiProvider implements LLMProvider {
  name = "gemini";
  private genAI: GoogleGenerativeAI;
  private model = "gemini-2.0-flash-exp";

  constructor() {
    const env = getEnv();
    if (!env.GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is required for GeminiProvider");
    }
    this.genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  }

  async extractSlots(prompt: string, maxTokens: number, temperature: number): Promise<Record<string, any> | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
          responseMimeType: "application/json",
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      if (!text) return null;
      return JSON.parse(text);
    } catch (e) {
      log.error("[GEMINI_EXTRACT]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async generateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return text || null;
    } catch (e) {
      log.error("[GEMINI_RESPONSE]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }

  async interpretAmbiguity(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    try {
      const model = this.genAI.getGenerativeModel({
        model: this.model,
        generationConfig: {
          maxOutputTokens: maxTokens,
          temperature,
        },
      });

      const result = await model.generateContent(prompt);
      const text = result.response.text();

      return text || null;
    } catch (e) {
      log.error("[GEMINI_AMBIGUITY]", e instanceof Error ? e.message : String(e));
      return null;
    }
  }
}
