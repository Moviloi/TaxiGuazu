// RESPONSE BUILDER — única fuente de mensajes textuales.
// Toda respuesta al usuario debe construirse aquí.
// Las policies deciden QUÉ responder; response-builder decide CÓMO escribirlo.
//
// Categorías (separadas conceptualmente para evitar GOD file):
//   1. Conversacional — saludos
//   2. Operacional — clarificación, precio, oportunidades
//   3. Fleet — capacidad, tarifa faltante
//   4. Error — fallback, escalación, error global

import type { CoreDecision, Lang, OpportunityResult, ExtractionContext } from "./types";
import { buildSlotConfirmationMessage, type SlotConfirmationUI } from "./slot-confirmation";
import { t } from "@/lib/services/i18n/t";

// ─── 1. CONVERSACIONAL ───────────────────────────────────────────────────────

export function buildGreeting(lang: Lang, customerName?: string): string {
  const greet = t("greeting.hi", lang);
  return customerName ? `${greet} ${customerName}` : greet;
}

/** Intro corta con presentación de Cris, SIN instrucciones de viaje.
 *  Se usa para mensajes combinados (saludo + pedido sustantivo en el mismo texto).
 *  buildInformationalResponse("GREETING", lang) tiene la versión completa
 *  con instrucciones "Decime desde dónde y hacia dónde".
 */
export function buildGreetingIntro(lang: Lang, customerName?: string): string {
  if (customerName) return t("greeting.introWithName", lang, { name: customerName });
  return t("greeting.intro", lang);
}

// ─── 2. OPERACIONAL ──────────────────────────────────────────────────────────

export function inferMissingFieldFromCore(decision: CoreDecision): string | null {
  const facts = decision.facts;
  if (!facts.some((f) => f.startsWith("origin:"))) return "origin";
  if (!facts.some((f) => f.startsWith("destination:"))) return "destination";
  if (facts.includes("location_ambiguous:true")) return "location_ambiguous";
  if (!facts.some((f) => f.startsWith("time:")) && !facts.some((f) => f.startsWith("date:"))) return "time";
  if (!facts.some((f) => f.startsWith("passengers:"))) return "passengers";
  return null;
}

export function buildGenericClarify(field: string | null, lang: Lang): string {
  const keyMap: Record<string, string> = {
    location_ambiguous: "clarify.locationAmbiguous",
    origin: "clarify.origin",
    destination: "clarify.destination",
    time: "clarify.time",
    passengers: "clarify.passengers",
  };
  const key = field ? keyMap[field] : undefined;
  if (key) return t(key, lang);
  return t("clarify.generic", lang);
}

export function buildPriceInfo(
  originName: string,
  destinationName: string,
  price: number,
  lang: Lang,
  originDisplay?: string,
  destDisplay?: string,
): string {
  const o = originDisplay ?? originName;
  const d = destDisplay ?? destinationName;
  return t("price.quote", lang, { origin: o, destination: d, price: String(price) });
}

export function buildOpportunityNoPricingMessage(lang: Lang = "es"): string {
  return t("opportunity.noPricing", lang);
}

export function buildOpportunityOfferMessage(description: string, lang: Lang = "es"): string {
  return t("opportunity.offer", lang, { description });
}

export function buildOpportunityAcceptedMessage(label: string, lang: Lang = "es"): string {
  return t("opportunity.accepted", lang, { label });
}

export function buildOpportunityDeclinedMessage(lang: Lang = "es"): string {
  return t("opportunity.declined", lang);
}

export function formatOpportunityResponse(
  result: OpportunityResult,
  lang: Lang = "es",
): string {
  if (!result.available) {
    return t("opportunity.noneAvailable", lang);
  }

  const lines: string[] = [];
  const applied = result.opportunities.filter(o => o.already_applied);
  const available = result.opportunities.filter(o => !o.already_applied);

  if (applied.length > 0) {
    lines.push(t("opportunity.applied", lang));
    for (const o of applied) {
      lines.push(`• ${o.label} (${t("opportunity.savings", lang)}: $${o.savings})`);
    }
  }

  if (available.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(t("opportunity.available", lang));
    for (const o of available) {
      const suffix = o.valid_until
        ? ` (${t("opportunity.validUntil", lang)} ${new Date(o.valid_until * 1000).toLocaleDateString()})`
        : "";
      lines.push(`• ${o.label} — ${t("opportunity.savings", lang)} de $${o.savings}${suffix}`);
    }
  }

  return lines.join("\n");
}

// ─── 2b. DOMAIN RESPONSES (informational/commercial, no booking cycle) ────────

export function buildInformationalResponse(intent: string, lang: Lang): string {
  if (intent === "GREETING") return t("greeting.full", lang);
  return t("greeting.info", lang);
}

export function buildCommercialResponse(lang: Lang): string {
  return t("commercial.prompt", lang);
}

// ─── 3. FLEET ─────────────────────────────────────────────────────────────────

export function buildFleetCapacityMessage(maxCapacity: number | null, lang: Lang = "es"): string {
  if (maxCapacity === null) {
    return t("fleet.unavailable", lang);
  }
  return t("fleet.capacityExceeded", lang, { maxCapacity: String(maxCapacity) });
}

export function buildFleetTariffMessage(lang: Lang = "es"): string {
  return t("fleet.noTariff", lang);
}

// ─── 4. ERROR ─────────────────────────────────────────────────────────────────

export function buildGenericSafeFallback(lang: Lang): string {
  return t("error.fallback", lang);
}

export function buildCancellationMessage(lang: Lang): string {
  return t("cancel.confirmed", lang);
}

export function buildGlobalErrorMessage(lang: Lang = "es"): string {
  return t("error.global", lang);
}

export function buildEscalationMessage(lang: Lang = "es"): string {
  return t("error.escalation", lang);
}

export function buildNowDispatchResponse(lang: Lang): string {
  return t("dispatch.searching", lang);
}

export function buildLocationConfirmationResponse(
  extractionCtx: ExtractionContext,
  lang: Lang,
): SlotConfirmationUI {
  return buildSlotConfirmationMessage(extractionCtx, lang);
}
