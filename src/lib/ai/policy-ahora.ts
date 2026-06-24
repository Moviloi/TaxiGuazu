// POLICY AHORA — ejecución inmediata, sin estado, mínima inferencia.
// policy es la ÚNICA fuente de finalResponse. Sin LLM.
// Prohibido: pricing logic, inferencia geográfica, generación libre.

import { buildGreeting, buildNowDispatchResponse, buildPriceInfo, buildLocationConfirmationResponse, buildGenericClarify } from "./response-builder";
import {
  buildLateralEmergencyResponse,
  buildLateralRescheduleResponse,
  buildAdminNotifyBody,
} from "./policy-reserva";
import type { FinalDecision, HandlerContext, Lang, PolicyOutput } from "./types";
import { resolveNextRequiredField } from "./field-resolver";
import { log } from "@/lib/utils/logger";

export function policyAhora(decision: FinalDecision, ctx?: HandlerContext): PolicyOutput {
  const lang = ctx?.lang ?? "es";
  const finalResponse = buildAhoraFinalResponse(decision, ctx, lang);
  const requiresUserInput = decision.decision === "CLARIFY";

  let policyHint: string;
  let requiresConfirmation = false;
  let nextExpectedFields: string[] = [];

  switch (decision.decision) {
    case "EXECUTE":
      policyHint = "AHORA: ejecutar acción inmediata.";
      break;
    case "ANSWER":
      policyHint = "AHORA: responder directo sin seguimiento conversacional.";
      break;
    case "CLARIFY": {
      policyHint = "AHORA: pedir solo el dato mínimo necesario.";
      const next = resolveNextRequiredField(ctx, decision.core.facts);
      nextExpectedFields = next.field ? [next.field] : [];
      break;
    }
    case "SAFE_FALLBACK":
    default:
      policyHint = "AHORA: respuesta segura genérica sin inferencias.";
  }

  const output: PolicyOutput = {
    decision: decision.decision,
    mode: "AHORA",
    policyHint,
    requiresConfirmation,
    finalResponse,
    requiresUserInput,
    nextExpectedFields,
    outputSource: "POLICY",
    needsGeo: false,
    needsSaveContext: false,
  };

  if (decision.core.intent === "EMERGENCY" || decision.core.intent === "RESCHEDULE") {
    output.needsAdminNotify = true;
    output.adminNotifyBody = buildAdminNotifyBody(decision.core.intent, ctx?.phone, ctx?.userText);
  }

  log.info("[POLICY_ahora]", {
    decision: output.decision,
    policyHint: output.policyHint,
    finalResponse: output.finalResponse?.substring(0, 120),
    requiresConfirmation: output.requiresConfirmation,
    requiresUserInput: output.requiresUserInput,
    nextExpectedFields: output.nextExpectedFields,
    needsAdminNotify: output.needsAdminNotify ?? false,
  });

  return output;
}

function buildAhoraFinalResponse(decision: FinalDecision, ctx: HandlerContext | undefined, lang: Lang): string {
  const greet = buildGreeting(lang, ctx?.customerName);

  switch (decision.decision) {
    case "EXECUTE": {
      if (decision.core.intent === "EMERGENCY") return buildLateralEmergencyResponse(lang);
      if (decision.core.intent === "RESCHEDULE") return buildLateralRescheduleResponse(lang);
      // FASE 18.1: Usar resolveNextRequiredField en vez de hardcodear hora.
      // Solo BOOKING necesita clarificación en EXECUTE (falta pasajeros/horario).
      // NOW/EMERGENCY dispatchean directo si ruta es completa y no ambigua.
      if (decision.core.intent === "BOOKING") {
        const next = resolveNextRequiredField(ctx, decision.core.facts);
        log.info("[POLICY_DECISION]", {
          branch: "EXECUTE",
          intent: "BOOKING",
          nextField: next.field,
          nextReason: next.reason,
        });
        if (next.field) {
          if (next.reason === "ambiguous") {
            if (ctx?.extraction) {
              return buildLocationConfirmationResponse(ctx.extraction, lang);
            }
            return buildGenericClarify("origin", lang);
          }
          const mapped = next.field === "scheduled_at" ? "time" : next.field;
          return buildGenericClarify(mapped, lang);
        }
      }
      return buildNowDispatchResponse(lang);
    }
    case "ANSWER": {
      const tariff = ctx?.extraction?.tariff;
      if (tariff?.matched && tariff.price != null) {
        return buildPriceInfo(
          tariff.canonicalOrigin ?? "origen",
          tariff.canonicalDestination ?? "destino",
          tariff.price,
          lang,
          tariff.displayOrigin,
          tariff.displayDestination,
        );
      }
      if (lang === "en") return `${greet}, for pricing and availability, an operator will assist you shortly.`;
      if (lang === "pt") return `${greet}, para valores e disponibilidade, um operador vai te atender em breve.`;
      return `${greet}, para tarifas y disponibilidad, un operador te va a asistir en breve.`;
    }
    case "CLARIFY": {
      const next = resolveNextRequiredField(ctx, decision.core.facts);
      if (next.reason === "ambiguous") {
        if (ctx?.extraction) {
          return buildLocationConfirmationResponse(ctx.extraction, lang);
        }
        return buildGenericClarify("origin", lang);
      }
      const mapped = next.field === "scheduled_at" ? "time" : next.field;
      return buildGenericClarify(mapped, lang);
    }
    case "SAFE_FALLBACK":
    default: {
      if (lang === "en") return `${greet}, I didn't catch that. Could you rephrase?`;
      if (lang === "pt") return `${greet}, não entendi. Pode reformular?`;
      return `${greet}, no te entendí. ¿Podés reformularlo?`;
    }
  }
}