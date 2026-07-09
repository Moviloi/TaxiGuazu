// Conversation Interpreter — Pipeline component.
// ADR-007. Classifies the conversational role of each message.
// Pure function: no state, no DB, no side effects, no LLM.

import type { Intent } from "@/lib/ai/types";

export type MessageType =
  | "new_request"
  | "clarification"
  | "correction"
  | "confirmation"
  | "selection"
  | "answer"
  | "continuation"
  | "topic_change"
  | "cancel"
  | "inquiry"
  | "small_talk"
  | "other";

export interface ConversationContext {
  text: string;
  intent: Intent;
  slotState: string | null | undefined;
  prevSlots: Record<string, any>;
  lastClarifyField: string | null;
}

export interface MessageClassification {
  type: MessageType;
  confidence: number;
  targetSlot: string | null;
  isClarification: boolean;
  isCorrection: boolean;
  reason: string;
}

export function interpretMessage(ctx: ConversationContext): MessageClassification {
  const t = ctx.text.trim().toLowerCase();
  const hasLocationSlots = !!(ctx.prevSlots?.origin || ctx.prevSlots?.destination);

  // ── Single-word or very short messages with active conversation ──
  const isShortMessage = t.split(/\s+/).length <= 2;
  const hasActiveConversation = ctx.slotState && ctx.slotState !== "idle";

  // ── Explicit cancellation ──
  if (/^(cancelar|cancel|anular|olvidate|dejalo|dejá|abortar|abort)$/i.test(t)) {
    return { type: "cancel", confidence: 0.95, targetSlot: null, isClarification: false, isCorrection: false, reason: "explicit_cancel" };
  }

  // ── Affirmation/negation in awaiting states ──
  if (ctx.slotState === "awaiting_confirmation" || ctx.slotState === "awaiting_passenger" || ctx.slotState === "slot_confirmation") {
    if (/^(s[ií]|si|sim|yes|ok|okey|dale|confirmo|confirmado|de acuerdo|adelante|perfecto|listo)\b/i.test(t)) {
      return { type: "confirmation", confidence: 0.95, targetSlot: null, isClarification: false, isCorrection: false, reason: "affirmation_in_awaiting_state" };
    }
    if (/^(no|não|nao|negativo|nop)\b/i.test(t)) {
      return { type: "confirmation", confidence: 0.95, targetSlot: null, isClarification: false, isCorrection: false, reason: "negation_in_awaiting_state" };
    }
  }

  // ── Explicit corrections ──
  if (/\b(?:no\s*,?\s*|corrig(?:o|e|ir)\s*,?\s*|cambia(?:r)?\s*,?\s*|me\s+equivoqu[ée])\s*(?:el|la|los|las|mi|en|de)?/i.test(t) ||
      /\b(?:no\s+es\s+eso|no\s+era\s+eso|as[ií]\s+no)\b/i.test(t)) {
    return { type: "correction", confidence: 0.85, targetSlot: null, isClarification: false, isCorrection: true, reason: "explicit_correction_marker" };
  }

  // ── Short message with active conversation and location slots → clarification ──
  if (isShortMessage && hasActiveConversation && hasLocationSlots) {
    // If it's a known location pattern (contains "desde", "hasta", etc.), it's a new request
    if (/\b(?:desde|de[lr]?\s|hacia|hasta|para|voy\s+a|quiero\s+ir|necesito\s+ir)\b/i.test(t)) {
      return { type: "new_request", confidence: 0.80, targetSlot: null, isClarification: false, isCorrection: false, reason: "location_markers_detected" };
    }
    // Single word with active conversation and no location markers → clarification
    if (t.split(/\s+/).length === 1 && !/^\d+$/.test(t)) {
      return { type: "clarification", confidence: 0.60, targetSlot: null, isClarification: true, isCorrection: false, reason: "single_word_in_active_conversation" };
    }
  }

  // ── Answer to a specific question (bot asked for a field) ──
  if (ctx.lastClarifyField && hasActiveConversation) {
    if (/^\d{1,2}$/.test(t) && ctx.lastClarifyField === "passengers") {
      return { type: "answer", confidence: 0.85, targetSlot: ctx.lastClarifyField, isClarification: false, isCorrection: false, reason: "numeric_answer_to_passengers_question" };
    }
    if (/\b(?:mañana|hoy|pasado|temprano|tarde|noche|\d{1,2}(?::\d{2})?)\b/i.test(t) && (ctx.lastClarifyField === "time" || ctx.lastClarifyField === "scheduled_at")) {
      return { type: "answer", confidence: 0.75, targetSlot: ctx.lastClarifyField, isClarification: false, isCorrection: false, reason: "time_answer_to_schedule_question" };
    }
  }

  // ── Greetings / small talk ──
  if (ctx.intent === "GREETING" && !hasLocationSlots) {
    return { type: "small_talk", confidence: 0.90, targetSlot: null, isClarification: false, isCorrection: false, reason: "greeting_intent_no_context" };
  }

  // ── Inquiry (asking for information, not booking) ──
  if (/\b(?:cu[aá]nto|precio|tarifa|costo|vale|sale|cuestan|horario|abierto|abren|cierra|aceptan|puedo|info)\b/i.test(t) && !hasLocationSlots) {
    return { type: "inquiry", confidence: 0.75, targetSlot: null, isClarification: false, isCorrection: false, reason: "inquiry_pattern_no_location" };
  }

  // ── Default: new request ──
  return { type: "new_request", confidence: 0.50, targetSlot: null, isClarification: false, isCorrection: false, reason: "default_classification" };
}
