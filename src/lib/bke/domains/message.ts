// BKE Domain — Message: resolución de plantillas, mensajes reutilizables e i18n.
// PR-5A: Foundation — stub.
// PR-5E: Implementación real — centraliza response-builder y disambiguation-templates.
//
// Reutiliza lógica existente sin duplicar:
// - response-builder.ts (buildGreeting, buildGenericClarify, buildEscalationMessage, etc.)
// - disambiguation-templates.ts (selectDisambiguationTemplate, buildConfirmationQuestion)
// - slot-confirmation.ts (buildSlotConfirmationMessage)
//
// NO genera lenguaje natural mediante LLM.

import type { BKEResult, MessageQuery, MessageResult } from "@/lib/bke/types";
import type { Lang } from "@/lib/ai/types";
import {
  buildGreeting,
  buildGenericClarify,
  buildEscalationMessage,
  buildPriceInfo,
  buildInformationalResponse,
  buildCommercialResponse,
  buildCancellationMessage,
  buildGenericSafeFallback,
  buildGlobalErrorMessage,
  buildNowDispatchResponse,
  buildFleetCapacityMessage,
  buildFleetTariffMessage,
} from "@/lib/ai/response-builder";
import { selectDisambiguationTemplate, buildConfirmationQuestion, type SlotContext, type ConversationTone } from "@/lib/ai/disambiguation-templates";
import { log } from "@/lib/utils/logger";
import { isBkeEnabled } from "@/config/feature-flags";

const DOMAIN = "message";

// ─── Catálogo de mensajes disponibles ────────────────────────────────────

export type MessageKey =
  | "greeting"
  | "clarify"
  | "escalation"
  | "price_info"
  | "informational"
  | "commercial"
  | "cancellation"
  | "safe_fallback"
  | "global_error"
  | "now_dispatch"
  | "location_confirmation"
  | "disambiguation"
  | "slot_confirmation"
  | "fleet_capacity"
  | "fleet_tariff";

const MESSAGE_KEYS: MessageKey[] = [
  "greeting", "clarify", "escalation", "price_info", "informational",
  "commercial", "cancellation", "safe_fallback", "global_error",
  "now_dispatch", "location_confirmation", "disambiguation",
  "slot_confirmation", "fleet_capacity", "fleet_tariff",
];

// ─── Resolver un mensaje plantilla ───────────────────────────────────────

/**
 * Resuelve un mensaje plantilla con parámetros.
 * Reutiliza response-builder.ts y disambiguation-templates.ts.
 *
 * @example
 *   resolveMessage({ key: "greeting", lang: "es", context: { name: "Juan" } })
 *   // → { key: "greeting", resolved: "¡Hola Juan!", lang: "es", params: { name: "Juan" } }
 *
 * Retorna null cuando:
 *   - BKE está deshabilitado
 *   - La clave no está en el catálogo
 *   - Faltan parámetros requeridos
 */
export async function resolveMessage(query: MessageQuery): Promise<BKEResult<MessageResult> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();
  const { key, lang, context } = query;

  try {
    const result = resolveMessageSync(key, lang, context);
    if (!result) {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      return { data: null, source: "message", confidence: 0, latencyMs };
    }

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.info("[BKE:MESSAGE]", { key, lang, resolved: result.resolved.slice(0, 60), latencyMs });

    return {
      data: result,
      source: "response-builder",
      confidence: 1.0,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.error("[BKE:MESSAGE:ERROR]", { key, lang, error: String(error), latencyMs });
    return { data: null, source: "error", confidence: 0, latencyMs };
  }
}

// ─── Resolución síncrona de mensajes ─────────────────────────────────────

/**
 * Resuelve un mensaje sin async overhead (la mayoría de response-builder es síncrono).
 * Separado para facilitar testing y uso interno.
 */
export function resolveMessageSync(
  key: string,
  lang: string,
  context?: Record<string, string>,
): MessageResult | null {
  const params: Record<string, string> = { ...context };
  const locale = lang as Lang;

  switch (key) {
    case "greeting": {
      const name = context?.name;
      return {
        key, lang, params,
        resolved: buildGreeting(locale, name),
      };
    }

    case "clarify": {
      const field = context?.field ?? null;
      return {
        key, lang, params,
        resolved: buildGenericClarify(field, locale),
      };
    }

    case "escalation": {
      return {
        key, lang, params,
        resolved: buildEscalationMessage(locale),
      };
    }

    case "price_info": {
      const origin = context?.origin ?? "";
      const destination = context?.destination ?? "";
      const price = Number(context?.price) || 0;
      return {
        key, lang, params,
        resolved: buildPriceInfo(origin, destination, price, locale),
      };
    }

    case "informational": {
      const intent = context?.intent ?? "GENERIC";
      return {
        key, lang, params,
        resolved: buildInformationalResponse(intent, locale),
      };
    }

    case "commercial": {
      return {
        key, lang, params,
        resolved: buildCommercialResponse(locale),
      };
    }

    case "cancellation": {
      return {
        key, lang, params,
        resolved: buildCancellationMessage(locale),
      };
    }

    case "safe_fallback": {
      return {
        key, lang, params,
        resolved: buildGenericSafeFallback(locale),
      };
    }

    case "global_error": {
      return {
        key, lang, params,
        resolved: buildGlobalErrorMessage(locale),
      };
    }

    case "now_dispatch": {
      return {
        key, lang, params,
        resolved: buildNowDispatchResponse(locale),
      };
    }

    case "location_confirmation": {
      // location_confirmation requiere ExtractionContext completo.
      // Para uso simplificado desde BKE, retornar un placeholder.
      const location = context?.location ?? context?.origin ?? "allí";
      return {
        key, lang, params,
        resolved: `Perfecto, te recojo en ${location}.`,
      };
    }

    case "fleet_capacity": {
      const pax = context?.passengers ? Number(context.passengers) : null;
      return {
        key, lang, params,
        resolved: buildFleetCapacityMessage(pax, locale),
      };
    }

    case "fleet_tariff": {
      return {
        key, lang, params,
        resolved: buildFleetTariffMessage(locale),
      };
    }

    case "disambiguation": {
      const slotCtx = (context?.slotContext ?? "generico") as SlotContext;
      const tone = (context?.tone ?? "casual") as ConversationTone;
      const candidates = context?.candidates;
      const template = selectDisambiguationTemplate(slotCtx, tone, locale);
      return {
        key, lang, params,
        resolved: candidates
          ? `${template}\n\n${candidates}`
          : template,
      };
    }

    case "slot_confirmation": {
      // buildConfirmationQuestion requiere origin y destination.
      const slotOrigin = context?.origin ?? "origen";
      const slotDest = context?.destination ?? "destino";
      return {
        key, lang, params,
        resolved: buildConfirmationQuestion(slotOrigin, slotDest, locale),
      };
    }

    default:
      log.warn("[BKE:MESSAGE:UNKNOWN_KEY]", { key, lang });
      return null;
  }
}

// ─── Utilidades ──────────────────────────────────────────────────────────

/**
 * Retorna la lista de claves de mensajes disponibles.
 */
export function getAvailableMessageKeys(): MessageKey[] {
  return [...MESSAGE_KEYS];
}

/**
 * Verifica si una clave de mensaje es válida.
 */
export function isValidMessageKey(key: string): key is MessageKey {
  return MESSAGE_KEYS.includes(key as MessageKey);
}

export function getDomainName(): string {
  return DOMAIN;
}
