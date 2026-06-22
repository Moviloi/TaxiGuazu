// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICY → OUTPUT.
// ÚNICO punto de salida. El finalResponse viene de POLICY.
// Prohibido: cualquier LLM que redacte el mensaje al usuario fuera de aquí.
//
// Logging obligatorio en cada request:
//   [CORE] intent + confidence + facts
//   [ROUTER] mode + outputType + reason
//   [POLICY] mode + hint + requiresConfirmation + stateful
//   [OUTPUT_SOURCE]=POLICY  (hard-enforced por assertOutputSource)
//
// Asserts runtime:
//   - assertPipelineComplete (core/decision/policy armados)
//   - assertOutputSource(policy.outputSource) === "POLICY"

import { core } from "./core";
import { router } from "./router";
import { policyAhora } from "./policy-ahora";
import { policyReserva } from "./policy-reserva";
import { assertOutputSource, assertPipelineComplete, setRequestState } from "./guard";
import { buildInformationalResponse, buildCommercialResponse } from "./response-builder";
import type { HandleMessageResult, HandlerContext, Mode, PolicyOutput, ConversationDomain, OperationalMode } from "./types";
import { operationalModeToMode } from "./types";
import { log } from "@/lib/utils/logger";

function buildSafeFallback(decision: ReturnType<typeof router>, _lang: string): PolicyOutput {
  return {
    decision: "SAFE_FALLBACK",
    mode: decision.mode,
    policyHint: "SAFE_FALLBACK: respuesta genérica segura",
    requiresConfirmation: false,
    finalResponse: "No pude procesar eso. Un operador te va a asistir en breve.",
    requiresUserInput: false,
    nextExpectedFields: [],
    outputSource: "POLICY",
    needsGeo: false,
    needsSaveContext: false,
  };
}

function buildDomainPolicy(decision: ReturnType<typeof router>, domain: ConversationDomain, ctx?: HandlerContext): PolicyOutput {
  const lang = ctx?.lang ?? "es";
  if (decision.core.confidence < 0.4 && !ctx?.extraction?.slots) {
    return buildSafeFallback(decision, lang);
  }
  if (domain === "information" || domain === "commercial") {
    const domainHint = domain === "information" ? "INFORMATION" : "COMMERCIAL";
    const msg = domain === "information"
      ? buildInformationalResponse(decision.core.intent, lang)
      : buildCommercialResponse(decision.core.intent, lang);
    return {
      decision: decision.decision,
      mode: decision.mode,
      policyHint: `${domainHint}: respuesta para ${decision.core.intent}`,
      requiresConfirmation: false,
      finalResponse: msg,
      requiresUserInput: false,
      nextExpectedFields: [],
      outputSource: "POLICY",
      needsGeo: false,
      needsSaveContext: false,
    };
  }
  // FASE 16: usar operationalMode si está disponible, fallback a mode
  const opMode: OperationalMode | undefined = ctx?.operationalMode;
  const isAhora = opMode ? opMode !== "RESERVATION" : decision.mode === "AHORA";
  return isAhora
    ? policyAhora(decision, ctx)
    : policyReserva(decision, ctx);
}

export function handleMessage(input: string, mode: Mode, ctx?: HandlerContext): HandleMessageResult {
  const coreDecision = core(input);
  const decision = router(coreDecision, mode);
  const hasExtraction = !!ctx?.extraction?.slots && Object.keys(ctx.extraction.slots).length > 0;
  // FASE 16: usar operationalMode para domain si disponible
  const opMode = ctx?.operationalMode;
  const domain: ConversationDomain = opMode === "INFO" ? (decision.core.intent === "COMMERCIAL" ? "commercial" : "information")
    : opMode === "DISPATCH" ? "dispatch"
    : opMode === "CLARIFY" ? "reservation"
    : opMode === "RESERVATION" ? "reservation"
    : (ctx?.domain && !hasExtraction) ? ctx.domain
    : (mode === "AHORA" ? "dispatch" : "reservation");
  const policy = buildDomainPolicy(decision, domain, ctx);

  // Hard enforcement: policy debe ser la fuente del output.
  assertOutputSource(policy.outputSource);
  // Pipeline debe estar armado (defensa en profundidad; setea state justo después).
  assertPipelineComplete(decision.core, decision, policy);

  setRequestState(decision.core, decision, policy);

  log.info(
    `[CORE] intent=${decision.core.intent} confidence=${decision.core.confidence.toFixed(2)} facts=[${decision.core.facts.join(",")}]`,
  );
  log.info("[ROUTING]", {
    domain: domain ?? "unknown",
    policySelected: opMode ?? (mode === "AHORA" ? "policyAhora" : "policyReserva"),
    decision: decision.decision,
    reason: decision.reason,
    mode,
    operationalMode: opMode,
    hasExtraction,
  });
  log.info(
    `[POLICY] mode=${policy.mode} hint="${policy.policyHint}" requiresConfirmation=${policy.requiresConfirmation}`,
  );
  log.info(`[OUTPUT_SOURCE]=POLICY`);

  return { decision, policy };
}
