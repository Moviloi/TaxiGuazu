// AMBIGUITY INTERPRETER — AI-driven disambiguation of place names.
//
// ADR 005: Uses LLM with full DB context instead of heuristic ranking.
// Given a user's ambiguous input and a list of candidate places, the LLM
// decides: auto-resolve (high confidence) or ask (low confidence).
//
// Output is always validated against the candidate list — no hallucination.

import Groq from "groq-sdk";
import { getEnv } from "@/config/env";
import { GROQ_MODEL, GROQ_TIMEOUT_MS } from "@/config/constants";
import type { PlaceCandidate } from "@/lib/db/domains/geo";
import { log } from "@/lib/utils/logger";

interface InterpretationResult {
  /** The place_id of the resolved place, or null if uncertain */
  selectedId: string | null;
  /** Confidence: "high" = auto-resolve, "low" = ask user, "failed" = LLM error */
  confidence: "high" | "low" | "failed";
  /** Suggested question to ask the user (only when confidence ≠ "high") */
  question?: string;
}

function getGroq(): Groq | null {
  try {
    const env = getEnv();
    return new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (e) {
    log.error("[AMBIGUITY_LLM]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function buildPrompt(
  userText: string,
  candidates: PlaceCandidate[],
  slotName: string,
): string {
  const candidatesText = candidates
    .map(
      (c, i) =>
        `${i + 1}. "${c.canonical_name}" — ${c.city}, ${c.country} (${c.place_type}, relevancia: ${c.tourist_relevance_score})`,
    )
    .join("\n");

  return [
    `Sos un asistente de TaxiGuazú. El usuario escribió: "${userText}"`,
    ``,
    `Se detectó que "${slotName}" es ambiguo. Estos son los lugares en la base de datos que coinciden:`,
    ``,
    candidatesText,
    ``,
    `INSTRUCCIONES:`,
    `1. Analizá el contexto del mensaje del usuario y los candidatos disponibles.`,
    `2. Si TENÉS CERTEZA de a cuál se refiere, respondé SOLO con el número del candidato.`,
    `3. Si NO ESTÁS SEGURO (ej: varios candidatos plausibles), respondé "0".`,
    `4. No inventes lugares. Elegí SOLO de la lista provista.`,
    ``,
    `IMPORTANTE: Conocé la geografía de la triple frontera (Puerto Iguazú AR, Foz do Iguaçu BR, Ciudad del Este PY).`,
    `Si el usuario menciona "centro", priorizá la interpretación local según el idioma y contexto.`,
    ``,
    `Respondé ÚNICAMENTE con un número del 0 al ${candidates.length}:`,
  ].join("\n");
}

export async function interpretAmbiguity(
  userText: string,
  candidates: PlaceCandidate[],
  slotName: "origin" | "destination",
): Promise<InterpretationResult> {
  if (candidates.length === 0) {
    return { selectedId: null, confidence: "low" };
  }
  if (candidates.length === 1) {
    // Only one candidate — no ambiguity
    return { selectedId: candidates[0].place_id, confidence: "high" };
  }

  const groq = getGroq();
  if (!groq) {
    // LLM unavailable — fall back to asking user
    return { selectedId: null, confidence: "low" };
  }

  const prompt = buildPrompt(userText, candidates, slotName);

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages: [{ role: "system", content: prompt }],
        max_tokens: 10,
        temperature: 0.1, // Low temp for deterministic selection
      },
      { timeout: GROQ_TIMEOUT_MS },
    );

    const content = completion.choices[0]?.message?.content?.trim();
    if (!content) {
      return { selectedId: null, confidence: "failed" };
    }

    const num = parseInt(content, 10);
    if (isNaN(num) || num < 0 || num > candidates.length) {
      return { selectedId: null, confidence: "failed" };
    }

    if (num === 0) {
      // LLM is uncertain — ask user
      return { selectedId: null, confidence: "low" };
    }

    // LLM selected a candidate (1-indexed)
    const selected = candidates[num - 1];
    log.info("[AMBIGUITY_LLM]", {
      slot: slotName,
      userText,
      selected: selected.canonical_name,
      confidence: "high",
    });
    return { selectedId: selected.place_id, confidence: "high" };
  } catch (e) {
    log.warn("[AMBIGUITY_LLM]", e instanceof Error ? e.message : String(e));
    return { selectedId: null, confidence: "failed" };
  }
}
