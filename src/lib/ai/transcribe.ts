// TRANSCRIBE — Transcripción de audio vía Gemini 2.0 Flash multimodal.
// P3: Convierte audios de WhatsApp (ogg/opus, mp3, wav) a texto para pipeline de lead.
// Ubicación: AI layer (respeta ADR-004: Services → AI import permitido).

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

const TRANSCRIPTION_PROMPT =
  "Transcribe el audio al texto exactamente como se escucha. " +
  "Detectá el idioma automáticamente (español, portugués o inglés). " +
  "Devolvé SOLO el texto transcribido, sin introducción ni comentarios.";

const FALLBACK_TEXT = "🎤 [mensaje de voz]";
const VALID_MIME_PREFIXES = ["audio/"];

/**
 * Limpia el MIME type de parámetros extra (ej: "audio/ogg; codecs=opus" → "audio/ogg").
 * Gemini espera tipos simples, sin codecs.
 */
function cleanMimeType(raw: string): string {
  const semi = raw.indexOf(";");
  return semi > 0 ? raw.substring(0, semi).trim() : raw.trim();
}

/**
 * Transcribe un buffer de audio a texto usando Gemini 2.0 Flash multimodal.
 *
 * @param audioBuffer - Buffer con el contenido del audio
 * @param mimeType   - MIME type del audio (ej: "audio/ogg", "audio/mp3")
 * @returns texto transcrito, o fallback si falla
 */
export async function transcribeAudio(
  audioBuffer: Buffer,
  mimeType: string
): Promise<string> {
  const cleanType = cleanMimeType(mimeType);

  if (!VALID_MIME_PREFIXES.some((p) => cleanType.startsWith(p))) {
    log.warn(`[TRANSCRIBE] unsupported mime type "${mimeType}", using fallback`);
    return FALLBACK_TEXT;
  }

  const env = getEnv();
  if (!env.GEMINI_API_KEY) {
    log.warn("[TRANSCRIBE] GEMINI_API_KEY not configured, using fallback");
    return FALLBACK_TEXT;
  }

  try {
    const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const base64Data = audioBuffer.toString("base64");
    const result = await model.generateContent([
      { text: TRANSCRIPTION_PROMPT },
      { inlineData: { mimeType: cleanType, data: base64Data } },
    ]);

    const text = result.response.text()?.trim();
    if (!text) {
      log.warn("[TRANSCRIBE] Gemini returned empty transcription, using fallback");
      return FALLBACK_TEXT;
    }

    log.info(`[TRANSCRIBE] OK → "${text.substring(0, 80)}${text.length > 80 ? "..." : ""}"`);
    return text;
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    log.error(`[TRANSCRIBE] Gemini error: ${msg}, using fallback`);
    return FALLBACK_TEXT;
  }
}
