// HANDLER — entry point de la arquitectura CORE → ROUTER → POLICY → OUTPUT.
// ÚNICO punto de salida. El finalResponse viene de POLICY.
// Prohibido: cualquier LLM que redacte el mensaje al usuario fuera de aquí.
//
// ── RNF-A16: Eficiencia computacional ──
// Este handler implementa un pipeline de eficiencia por construcción:
//   1. CORE determinista (regex-based, ~3μs por clasificación) — primer filtro.
//   2. ROUTER determinista (pure function, sin IO) — segundo filtro.
//   3. POLICY determinista (sin LLM, solo lógica de negocio) — tercer filtro.
//   4. LLM RESPONSE (solo cuando es necesario) — ÚLTIMO recurso.
//
// Decisiones de eficiencia:
//   - LLM se invoca SOLO cuando: policy no es EXECUTE O template tiene placeholders.
//   - purchaseIntent=low → skip LLM (especulador, no malgastar tokens).
//   - EXECUTE sin placeholders → template directo (sin LLM).
//   - Temperature baja (0.1) y max_tokens mínimo (256) en extraction.
//   - Logging estructurado con [LLM_RESPONSE] para tracking runtime.
//
// Contadores de eficiencia (runtime metrics):
//   - [CORE_SOURCE_AUDIT]: source = "lead.service" (reutiliza core()) vs
//     "handler_fallback" (doble clasificación — ineficiente, no debería ocurrir).
//   - [LLM_RESPONSE]: "skipped" (eficiente) vs "applied" (LLM usado).
//   - Pipeline duration capturado por capturePipelineEvent() para tracking.
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
import { assertOutputSource, assertPipelineComplete } from "./guard";
import { generateLLMResponse } from "./llm-response";
import { buildInformationalResponse, buildCommercialResponse } from "./response-builder";
import { interpretMessage } from "./conversation-interpreter";
import { computeClientObjective } from "./client-objective";
import { computeStrategyDecision } from "./conversation-strategy";
import type { HandleMessageResult, HandlerContext, Mode, PolicyOutput, ConversationDomain, OperationalMode } from "./types";
import { log } from "@/lib/utils/logger";
import { capturePipelineEvent } from "@/lib/cognitive/collector";
import type { PipelineEventDetails } from "@/lib/cognitive/types";

function buildSafeFallback(decision: ReturnType<typeof router>): PolicyOutput {
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
    return buildSafeFallback(decision);
  }
  if (domain === "information" || domain === "commercial") {
    const domainHint = domain === "information" ? "INFORMATION" : "COMMERCIAL";
    // BKE.Message routing removido en BUILD OLA 4.5 (ADR-014).
    const msg = domain === "information"
      ? buildInformationalResponse(decision.core.intent, lang)
      : buildCommercialResponse(lang);
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

export async function handleMessage(input: string, mode: Mode, ctx?: HandlerContext): Promise<HandleMessageResult> {
  // PR-5F: Iniciar tracking de pipeline cognitivo
  const pipelineStart = performance.now();
  const pipelineDetails: PipelineEventDetails = {
    pipeline: "handler",
  };
  capturePipelineEvent(0, true, pipelineDetails);

  const analysis = ctx?.analysis ?? core(input);
  // PR-QA3-S2A: Audit trace — confirma clasificación única por mensaje.
  // source "lead.service" = reutiliza CoreDecision pre-computado (sin doble core()).
  // source "handler" = fallback a core() (no debería ocurrir tras S2A).
  log.info("[CORE_SOURCE_AUDIT]", {
    source: ctx?.analysis ? "lead.service" : "handler_fallback",
    intent: analysis.intent,
    confidence: analysis.confidence,
    facts: analysis.facts,
    inputPreview: input.substring(0, 60),
  });
  const decision = router(analysis, mode);
  pipelineDetails.intent = decision.core.intent;
  const hasExtraction = !!ctx?.extraction?.slots && Object.keys(ctx.extraction.slots).length > 0;
  // FASE 16: usar operationalMode para domain si disponible
  const opMode = ctx?.operationalMode;
  const domain: ConversationDomain = opMode === "INFO" ? (decision.core.intent === "COMMERCIAL" ? "commercial" : "information")
    : opMode === "DISPATCH" ? "dispatch"
    : opMode === "CLARIFY" ? "reservation"
    : opMode === "RESERVATION" ? "reservation"
    : (ctx?.domain && !hasExtraction) ? ctx.domain
    : (mode === "AHORA" ? "dispatch" : "reservation");
  // E11 + E11-B + E12: enriquecer ctx con señales semánticas para Policy
  const urgencyFact = decision.core.facts.find(f => f.startsWith("urgency:"));
  const urgency = urgencyFact ? urgencyFact.replace("urgency:", "") : null;
  const classification = interpretMessage({
    text: input,
    intent: decision.core.intent,
    slotState: ctx?.extraction?.conversationalState ?? null,
    prevSlots: Object.fromEntries(
      Object.entries(ctx?.extraction?.slots ?? {}).map(([k, v]) => [k, v?.value]),
    ),
    lastClarifyField: ctx?.extraction?.clarifyField ?? null,
  });
  // E12: sintetizar señales en clientObjective
  const clientObj = computeClientObjective(
    decision.core.facts,
    decision.core.purchaseIntent,
    classification.type,
    input,
  );
  // R1+R5: sintetizar StrategyDecision primero, luego crear enrichedCtx con ella
  const strategyDecision = computeStrategyDecision({
    facts: decision.core.facts,
    purchaseIntent: decision.core.purchaseIntent,
    urgency,
    messageType: classification.type,
    isCorrection: classification.isCorrection,
    clientObjective: clientObj,
    decision: decision.decision,
    intent: decision.core.intent,
  });
  const enrichedCtx: HandlerContext = ctx
    ? { ...ctx, purchaseIntent: decision.core.purchaseIntent, urgency, messageType: classification.type, isCorrection: classification.isCorrection, clientObjective: clientObj, strategyDecision }
    : { purchaseIntent: decision.core.purchaseIntent, urgency, messageType: classification.type, isCorrection: classification.isCorrection, clientObjective: clientObj, strategyDecision };

  // PR-5D: DRL Response Assistance removido en BUILD OLA 4.5 (ADR-014).

  log.info("[STRATEGY]", {
    mode: strategyDecision.mode,
    tone: strategyDecision.tone,
    speed: strategyDecision.speed,
    greetingLength: strategyDecision.greetingLength,
    responseLength: strategyDecision.responseLength,
    reassuranceNeeded: strategyDecision.reassuranceNeeded,
    callToAction: strategyDecision.callToAction,
    fieldAcquisitionMode: strategyDecision.fieldAcquisitionMode,
    fieldPriority: strategyDecision.fieldPriority,
    flags: strategyDecision.behaviorFlags,
  });
  const policy = buildDomainPolicy(decision, domain, enrichedCtx);

  // Hard enforcement: policy debe ser la fuente del output.
  assertOutputSource(policy.outputSource);
  assertPipelineComplete(decision.core, decision, policy);

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
    messageType: classification.type,
    urgency,
    clientObjective: clientObj,
  });
  log.info(
    `[POLICY] mode=${policy.mode} hint="${policy.policyHint}" requiresConfirmation=${policy.requiresConfirmation}`,
  );
  log.info(`[OUTPUT_SOURCE]=POLICY`);

  // P0.3: Gatear llamada LLM para ahorrar calls innecesarias.
  // - EXECUTE sin placeholders en template → usar template directo (ej: "Buscando chofer...")
  // - purchaseIntent=low → especulador, no malgastar LLM, template basta
  // R1: purchaseIntent migrado a strategyDecision.behaviorFlags.skipLLM
  const hasPlaceholder = policy.finalResponse.includes("{");
  const isExecute = policy.decision === "EXECUTE";
  const skipLLM = (isExecute && !hasPlaceholder) || strategyDecision.behaviorFlags.skipLLM;

  // RNF-A16: Contadores de eficiencia runtime (LLM vs no-LLM)
  let llmResponse: string | null = null;
  let llmSkippedReason: string | null = null;
  if (!skipLLM) {
    llmResponse = await generateLLMResponse(policy, enrichedCtx);
  } else if (strategyDecision.behaviorFlags.skipLLM) {
    llmSkippedReason = "low purchase intent — speculator path";
    log.info("[LLM_RESPONSE] skipped (low purchase intent — speculator path)");
  } else if (isExecute) {
    llmSkippedReason = "EXECUTE without placeholders — template is final";
    log.info("[LLM_RESPONSE] skipped (EXECUTE without placeholders — template is final)");
  }
  if (llmResponse) {
    policy.finalResponse = llmResponse;
    log.info("[LLM_RESPONSE] applied");
  }

  // PR-5F: Capturar evento de pipeline completado
  const pipelineDuration = Math.round((performance.now() - pipelineStart) * 100) / 100;

  // RNF-A16: Métrica runtime de eficiencia — registra si LLM se usó o se evitó
  log.info("[EFFICIENCY]", {
    llmUsed: llmResponse !== null,
    llmSkippedReason,
    decision: decision.decision,
    intent: decision.core.intent,
    purchaseIntent: decision.core.purchaseIntent,
    pipelineDurationMs: pipelineDuration,
  });
  pipelineDetails.workflowState = decision.decision;
  pipelineDetails.slotsCount = Object.keys(ctx?.extraction?.slots ?? {}).length;
  capturePipelineEvent(pipelineDuration, true, pipelineDetails);

  return { decision, policy };
}
