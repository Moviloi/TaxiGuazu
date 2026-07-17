// FALLBACK PROVIDER — Wrapper que intenta Gemini primero y cae a Groq si falla.
// P5: Garantiza disponibilidad del LLM incluso si el provider principal tiene rate limits.
//
// PR-5F: Captura métricas cognitivas de cada llamada LLM.

import { log } from "@/lib/utils/logger";
import type { LLMProvider } from "../llm-provider";
import { GeminiProvider } from "./gemini-provider";
import { GroqProvider } from "./groq-provider";
import { captureLLMEvent, captureFallbackEvent } from "@/lib/cognitive/collector";
import type { LLMEventDetails, FallbackEventDetails } from "@/lib/cognitive/types";

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

  private async callWithMetrics<T>(
    operation: "extract" | "respond" | "interpret",
    primaryCall: () => Promise<T>,
    fallbackCall: () => Promise<T>,
  ): Promise<T | null> {
    const startPrimary = performance.now();
    let result: T | null = null;
    let primaryError: string | undefined;

    try {
      result = await primaryCall();
    } catch (e) {
      primaryError = e instanceof Error ? e.message : String(e);
    }

    const primaryDuration = Math.round((performance.now() - startPrimary) * 100) / 100;

    if (result !== null && result !== undefined) {
      // Gemini success
      const geminiDetails: LLMEventDetails = {
        provider: "gemini",
        model: "gemini-2.0-flash",
        operation,
        isFallback: false,
      };
      captureLLMEvent(primaryDuration, true, geminiDetails);
      return result;
    }

    // Gemini failed → registrar fallback
    if (primaryError) {
      const geminiDetails: LLMEventDetails = {
        provider: "gemini",
        model: "gemini-2.0-flash",
        operation,
        isFallback: false,
        error: primaryError.slice(0, 200),
      };
      captureLLMEvent(primaryDuration, false, geminiDetails);
    }

    // Intentar fallback a Groq
    if (this.primary.name !== this.fallback.name) {
      log.warn("[FALLBACK_PROVIDER]", {
        primary: this.primary.name,
        action: "falling back to",
        fallback: this.fallback.name,
        operation,
        reason: primaryError ?? "null_result",
      });

      const startFallback = performance.now();
      try {
        result = await fallbackCall();
      } catch (e) {
        const fbError = e instanceof Error ? e.message : String(e);
        const fbDuration = Math.round((performance.now() - startFallback) * 100) / 100;
        const groqDetails: LLMEventDetails = {
          provider: "groq",
          model: "llama-3.3-70b-versatile",
          operation,
          isFallback: true,
          error: fbError.slice(0, 200),
        };
        captureLLMEvent(fbDuration, false, groqDetails);

        const fallbackDetails: FallbackEventDetails = {
          from: "gemini",
          to: "groq",
          reason: primaryError ?? "null_result",
          originalError: fbError,
        };
        captureFallbackEvent(primaryDuration + fbDuration, false, fallbackDetails);
        return null;
      }

      const fbDuration = Math.round((performance.now() - startFallback) * 100) / 100;
      const groqDetails: LLMEventDetails = {
        provider: "groq",
        model: "llama-3.3-70b-versatile",
        operation,
        isFallback: true,
      };
      captureLLMEvent(fbDuration, result !== null, groqDetails);

      const fallbackDetails: FallbackEventDetails = {
        from: "gemini",
        to: "groq",
        reason: primaryError ?? "null_result",
      };
      captureFallbackEvent(primaryDuration + fbDuration, result !== null, fallbackDetails);

      return result;
    }

    return null;
  }

  async extractSlots(prompt: string, maxTokens: number, temperature: number): Promise<Record<string, any> | null> {
    return this.callWithMetrics(
      "extract",
      () => this.primary.extractSlots(prompt, maxTokens, temperature),
      () => this.fallback.extractSlots(prompt, maxTokens, temperature),
    );
  }

  async generateResponse(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    return this.callWithMetrics(
      "respond",
      () => this.primary.generateResponse(prompt, maxTokens, temperature),
      () => this.fallback.generateResponse(prompt, maxTokens, temperature),
    );
  }

  async interpretAmbiguity(prompt: string, maxTokens: number, temperature: number): Promise<string | null> {
    return this.callWithMetrics(
      "interpret",
      () => this.primary.interpretAmbiguity(prompt, maxTokens, temperature),
      () => this.fallback.interpretAmbiguity(prompt, maxTokens, temperature),
    );
  }
}
