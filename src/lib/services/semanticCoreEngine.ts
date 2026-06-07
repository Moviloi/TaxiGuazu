// Semantic Core Engine — unified semantic decision layer.
// Fase 9.5: single source of truth for intent classification, policy evaluation,
// and decision routing. Replaces intentClassifier + policyEngine + decisionEngine.

import type {
  DecisionAction,
  Decision as CoreDecision,
  DecisionInput,
  Intent,
  IntentResult,
  PolicyAction,
  PolicyDecision,
  PolicyInput,
  ConfidenceBucket,
} from "@/lib/core/types";
import { evaluateBookingCompleteness } from "@/lib/services/completenessEngine";

// Re-export all public types for consumers (backward compat)
export type {
  DecisionAction,
  CoreDecision as Decision,
  DecisionInput,
  Intent,
  IntentResult,
  PolicyAction,
  PolicyDecision,
  PolicyInput,
  ConfidenceBucket,
};

// ── Intent classification ──

const TRAVEL_VERBS = /\b(ir|voy|vamos|necesito|llevar|llevame|taxi|traslado|transfer|busco|buscar|viaje|viajar|quiero|querría|quisiera|preciso|precisamos)\b/i;
const AFFIRMATIVE = /^(sí|si|ok|okey|dale|de una|correcto|confirmo|confirmar|así es|exacto|bien|de acuerdo|perfecto)$/i;
const PRICE_KEYWORDS = /\b(precio|cuanto cuest|cuánto cuest|tarifa|vale|cuesta|sale|valor|presupuesto|cotiza)\b/i;

export function classifyIntent(text: string, slots: Record<string, any>): IntentResult {
  const t = text.trim();

  if (t.length < 30 && AFFIRMATIVE.test(t)) {
    return { intent: "CONFIRM" };
  }

  if (PRICE_KEYWORDS.test(t)) {
    return { intent: "INFO" };
  }

  const origin = slots?.origin ?? null;
  const destination = slots?.destination ?? null;
  if (origin && destination && String(origin).trim() !== "" && String(destination).trim() !== "") {
    return { intent: "MOVE" };
  }

  if (TRAVEL_VERBS.test(t)) {
    return { intent: "MOVE" };
  }

  if (origin || destination) {
    return { intent: "AMBIGUOUS" };
  }

  return { intent: "AMBIGUOUS" };
}

// ── Policy evaluation ──

export function evaluatePolicy(input: PolicyInput): PolicyDecision {
  if (input.completeness.status === "ASK") {
    return { action: "QUESTION", message: "¿Desde dónde salís?" };
  }

  if (input.confidence < 0.4) {
    return {
      action: "CLARIFY",
      message: "No estoy seguro del destino. ¿Podés confirmarlo?",
    };
  }

  if (input.confidence < 0.75) {
    const origin = input.slots?.origin?.value ?? "...";
    const destination = input.slots?.destination?.value ?? "...";
    return {
      action: "CONFIRM",
      message: `Perfecto, tengo origen en ${origin} y destino en ${destination}. ¿Confirmás el viaje?`,
    };
  }

  return { action: "FINAL", message: "" };
}

// ── Unified decision ──

function bucketConfidence(c: number): ConfidenceBucket {
  if (c >= 0.75) return "HIGH";
  if (c >= 0.4) return "MID";
  return "LOW";
}

export function resolveDecision(input: DecisionInput): CoreDecision {
  const intent = classifyIntent(input.text, input.slots).intent;
  const cb = bucketConfidence(input.confidence);

  // INFO + tariff available → price response
  if (intent === "INFO" && input.tariffMatch?.matched) {
    const t = input.tariffMatch;
    const priceMsg = input.lang.startsWith("pt")
      ? `O traslado de ${t.canonicalOrigin} para ${t.canonicalDestination} custa R$ ${t.price}.`
      : `El traslado de ${t.canonicalOrigin} a ${t.canonicalDestination} cuesta $${t.price} ARS.`;
    return { action: "INFO_PRICE", message: priceMsg, metadata: { intent, policy: "FINAL", confidenceBucket: cb } };
  }

  // CONFIRM → direct handler route
  if (intent === "CONFIRM") {
    return { action: "CONFIRM_ROUTE", message: "", metadata: { intent, policy: "FINAL", confidenceBucket: cb } };
  }

  // AMBIGUOUS → ask for missing field
  if (intent === "AMBIGUOUS") {
    const origin = input.slots?.origin ?? null;
    const destination = input.slots?.destination ?? null;

    if (origin && !destination) {
      const msg = input.lang.startsWith("pt") ? "Para onde você precisa ir?" : "¿A dónde necesitás ir?";
      return { action: "ASK_DESTINATION", message: msg, metadata: { intent, policy: "QUESTION", confidenceBucket: cb } };
    }

    if (!origin && destination) {
      const msg = input.lang.startsWith("pt") ? "De onde você vai sair?" : "¿Desde dónde salís?";
      return { action: "ASK_ORIGIN", message: msg, metadata: { intent, policy: "QUESTION", confidenceBucket: cb } };
    }

    const msg = input.lang.startsWith("pt")
      ? "Para onde você precisa ir?"
      : "¿A dónde necesitás ir?";
    return { action: "ASK_DESTINATION", message: msg, metadata: { intent, policy: "QUESTION", confidenceBucket: cb } };
  }

  // MOVE → policy by confidence
  const policy = evaluatePolicy({
    slots: input.slots,
    completeness: { status: "COMPLETE" },
    intent: "MOVE",
    confidence: input.confidence,
  });

  if (input.confidence < 0.4) {
    return {
      action: "CLARIFY",
      message: policy.message,
      metadata: { intent, policy: "CLARIFY", confidenceBucket: cb },
    };
  }

  const bookingStatus = evaluateBookingCompleteness(input.slots);

  if (bookingStatus.status === "MISSING_ROUTE") {
    return {
      action: "CLARIFY",
      message: "¿Podés decirme desde dónde y hacia dónde necesitás el traslado?",
      metadata: { intent, policy: "CLARIFY", confidenceBucket: cb },
    };
  }

  if (bookingStatus.status === "MISSING_DATETIME") {
    return {
      action: "CONFIRM_INTERPRETATION",
      message: "",
      metadata: { intent, policy: "CONFIRM", confidenceBucket: cb },
    };
  }

  return {
    action: "BOOKING_SUMMARY",
    message: "",
    metadata: { intent, policy: "FINAL", confidenceBucket: cb },
  };
}
