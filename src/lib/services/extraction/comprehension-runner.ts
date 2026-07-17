import escalationPolicies from "../../../../data/knowledge/policies/escalation.json";
import { updateChatSessionComprehension, insertF4Log, setChatSessionEscalationReason } from "@/lib/db/database";
import { buildEscalationMessage, buildGenericClarify, inferMissingFieldFromCore } from "@/lib/ai/response-builder";
import { enrichComprehensionSignals } from "@/lib/services/memory/predictive-routing";
import { logEscalation } from "@/lib/services/learning/event-tracking";
import { recordComprehensionOutcome, getComprehensionThresholdAdjustment } from "@/lib/services/learning/learning-utils";
import { buildComprehensionSignals, computeComprehensionScore, getComprehensionState, getRecoveryMessage } from "@/lib/services/extraction/comprehension";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { log } from "@/lib/utils/logger";
import type { CoreDecision } from "@/lib/ai/types";
import type { PredictedContext } from "@/lib/services/memory/predictive-routing";
import type { ChatSessionRow } from "@/lib/db/types";
import { sendAndPersist } from "@/lib/services/shared/message-helpers";
import { detectLangWithFallback } from "@/lib/detect-lang";
import { isDrlComprehensionEnabled, isDrlFrustrationAssistanceEnabled } from "@/config/feature-flags";
import { buildDrlEnrichment } from "@/lib/drl/assistance";
import type { DRLInput } from "@/lib/drl/types";
import { capturePipelineEvent, captureDRLEvent } from "@/lib/cognitive/collector";
import type { PipelineEventDetails } from "@/lib/cognitive/types";

// P0.10.3: Detección de frustración del usuario (pattern desde escalation.json)
const FRUSTRATION_RE = new RegExp(escalationPolicies.frustrationPattern, escalationPolicies.frustrationPatternFlags);

export interface ComprehensionRunnerParams {
  phone: string;
  text: string;
  conversationId: number;
  leadCore: CoreDecision;
  predictedContext: PredictedContext;
  session: ChatSessionRow | null;
  isFirstTurn?: boolean;
}

export async function runComprehensionCheck(params: ComprehensionRunnerParams): Promise<boolean> {
  const { phone, text, conversationId, leadCore, predictedContext, session, isFirstTurn } = params;
  const pipelineStart = performance.now();
  const pipelineDetails: PipelineEventDetails = {
    pipeline: "comprehension",
    phone: phone.slice(-4),
    intent: leadCore.intent,
  };
  capturePipelineEvent(0, true, pipelineDetails);

  log.info("[TRACE INPUT]", { event: "comprehension_check", phone: phone.slice(-4), textLen: text.length });

  // P0.10.3: Detectar frustración del usuario — usar LLM para interpretar
  if (FRUSTRATION_RE.test(text)) {
    log.info("[FRUSTRATION_DETECTED]", { phone: phone.slice(-4), text: text.slice(0, 100) });

    // PR-5D: Construir enriquecimiento DRL para C5 (frustration response)
    let frustrationEnrichment: string | undefined;
    if (isDrlFrustrationAssistanceEnabled()) {
      const drlInput: DRLInput = {
        slots: {
          _userText: text,
          ...(session?.slots ? (() => { try { return JSON.parse(session.slots); } catch { return {}; } })() : {}),
        },
        requiredSlots: ["origin", "destination", "passengers", "scheduled_at"],
        conversationState: "frustration",
      };
      const enrichment = buildDrlEnrichment(drlInput, "frustration");
      if (enrichment) {
        frustrationEnrichment = enrichment.text;
        log.info("[DRL_FRUSTRATION_ASSISTANCE]", {
          decision: enrichment.raw.decision,
          confidence: enrichment.raw.overallConfidence,
          executionMs: enrichment.raw.executionTimeMs,
        });
      }
    }

    const frustratedMsg = await generateFrustrationResponse(text, session, frustrationEnrichment);
    if (frustratedMsg) {
      log.info("[TRACE RESPONSE]", { source: "FRUSTRATION_RECOVERY", text: frustratedMsg });
      await sendAndPersist(phone, conversationId, frustratedMsg);
      const duration = Math.round((performance.now() - pipelineStart) * 100) / 100;
      pipelineDetails.workflowState = "frustration_resolved";
      capturePipelineEvent(duration, true, pipelineDetails);
      return true;
    }
  }

  const domain = mapIntentToDomain(leadCore.intent);
  const comprehensionSignals = enrichComprehensionSignals(
    buildComprehensionSignals({
      text,
      coreIntent: leadCore.intent,
      coreConfidence: leadCore.confidence,
      slotStability: leadCore.slotStability,
      roleLock: leadCore.roleLock,
      session,
      domain,
    }),
    predictedContext.entityPrediction,
    predictedContext.intentPrediction,
  );
  const comprehensionScore = computeComprehensionScore(comprehensionSignals, domain);
  const thresholdAdjustment = await getComprehensionThresholdAdjustment();
  const comprehensionState = getComprehensionState(comprehensionScore, thresholdAdjustment);

  log.info("[TRACE COMPREHENSION]", {
    state: comprehensionState,
    score: comprehensionScore,
    thresholdAdj: thresholdAdjustment,
    intent: leadCore.intent,
    domain,
    roleLock: leadCore.roleLock,
    slotStability: leadCore.slotStability,
    isFirstTurn,
  });

  const resolvedState = (isFirstTurn && comprehensionState === "RECOVERY") ? "CLARIFICATION"
    : (isFirstTurn && comprehensionState === "ESCALATION") ? "RECOVERY"
    : comprehensionState;

  await Promise.all([
    updateChatSessionComprehension(phone, resolvedState, comprehensionScore),
    insertF4Log(String(conversationId), comprehensionScore, resolvedState, null),
  ]);

  recordComprehensionOutcome(resolvedState === "ESCALATION");

  if (resolvedState === "ESCALATION") {
    // P1b: Si la sesión está en modo slot-filling (clarify_field activo o collecting_slots),
    // no escalar — dejar que el pipeline de extracción procese el texto como valor del slot.
    if (session?.clarify_field || session?.conversational_state === "collecting_slots" || session?.conversational_state === "slot_confirmation") {
      log.info("[COMPREHENSION] slot-filling active — skipping escalation, letting pipeline process", {
        clarifyField: session.clarify_field,
        state: session.conversational_state,
      });
      const skipDuration = Math.round((performance.now() - pipelineStart) * 100) / 100;
      pipelineDetails.workflowState = "slot_filling_skip";
      capturePipelineEvent(skipDuration, true, pipelineDetails);
      return false;
    }

    // PR-5C: DRL-first — si el feature flag está activo, intentar reinterpretación determinística
    // antes de llamar al LLM. Si DRL resuelve, se omite completamente la llamada LLM.
    let reinterpretMsg: string | null = null;

    if (isDrlComprehensionEnabled()) {
      const { resolveComprehension } = await import("@/lib/bke/services/comprehension-resolver");
      const drlStart = performance.now();
      const drlResult = await resolveComprehension(text, session, comprehensionScore);
      const drlDuration = Math.round((performance.now() - drlStart) * 100) / 100;
      if (drlResult) {
        reinterpretMsg = drlResult.message;
        log.info("[COMPREHENSION_DRL]", {
          source: drlResult.source,
          message: drlResult.message,
        });
        captureDRLEvent(drlDuration, true, {
          rule: "comprehension-resolver",
          decision: "PROCEED",
          confidence: 0.8,
          executionTimeMs: drlDuration,
        });
      } else {
        log.info("[COMPREHENSION_DRL_ESCALATE]", {
          reason: "DRL could not resolve — falling back to LLM",
        });
        captureDRLEvent(drlDuration, false, {
          rule: "comprehension-resolver",
          decision: "ESCALATE",
          confidence: 0,
          executionTimeMs: drlDuration,
        });
      }
    }

    // P3: Si DRL no resolvió (o flag deshabilitado), intentar que el LLM reinterprete.
    // Solo escalar a humano si el LLM también falla.
    if (!reinterpretMsg) {
      reinterpretMsg = await generateReinterpretResponse(text, session, comprehensionScore);
    }
    if (reinterpretMsg) {
      log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_REINTERPRET", text: reinterpretMsg });
      await sendAndPersist(phone, conversationId, reinterpretMsg);
      const duration = Math.round((performance.now() - pipelineStart) * 100) / 100;
      pipelineDetails.workflowState = "reinterpreted";
      capturePipelineEvent(duration, true, pipelineDetails);
      return true;
    }

    const reason = `comprehension_score=${comprehensionScore.toFixed(2)} state=${comprehensionState}`;
    await setChatSessionEscalationReason(phone, reason);
    logEscalation(String(conversationId), reason, comprehensionScore);
    const escAdminMsg = escalationPolicies.adminEscalationTemplate
      .replace("{phoneSuffix}", phone.slice(-4))
      .replace("{score}", comprehensionScore.toFixed(2));
    await notifyAdmin(escAdminMsg);
    const escMsg = buildEscalationMessage();
    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_ESCALATION", text: escMsg });
    await sendAndPersist(phone, conversationId, escMsg);
    const duration = Math.round((performance.now() - pipelineStart) * 100) / 100;
    pipelineDetails.workflowState = "escalated";
    capturePipelineEvent(duration, true, pipelineDetails);
    return true;
  }

  if (resolvedState === "RECOVERY") {
    log.info("[TRACE RECOVERY]", {
      state: comprehensionState,
      resolvedState,
      score: comprehensionScore,
      phone: phone.slice(-4),
      textLen: text.length,
    });
    let recoveryMsg = await getRecoveryMessage(comprehensionState, session, leadCore.roleLock, text, leadCore.facts);

    // Fallback: if getRecoveryMessage returned generic, try inferring from core facts
    if (recoveryMsg === buildGenericClarify(null, detectLangWithFallback(text, session?.lang))) {
      const missingField = inferMissingFieldFromCore(leadCore);
      if (missingField) {
        recoveryMsg = buildGenericClarify(missingField, detectLangWithFallback(text, session?.lang));
        log.info("[COMPREHENSION] core facts inferred missing field", { field: missingField });
      }
    }

    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_RECOVERY", text: recoveryMsg });
    await sendAndPersist(phone, conversationId, recoveryMsg);
    const duration = Math.round((performance.now() - pipelineStart) * 100) / 100;
    pipelineDetails.workflowState = "recovery";
    capturePipelineEvent(duration, true, pipelineDetails);
    return true;
  }

  const finalDuration = Math.round((performance.now() - pipelineStart) * 100) / 100;
  pipelineDetails.workflowState = "ok";
  capturePipelineEvent(finalDuration, true, pipelineDetails);
  return false;
}

// P3: LLM re-prompt antes de escalación — reinterpretar el mensaje libremente
// y generar una pregunta aclaratoria. Retorna null si no puede interpretar.
async function generateReinterpretResponse(
  userText: string,
  session: ChatSessionRow | null,
  comprehensionScore: number,
): Promise<string | null> {
  try {
    const { getLLMProvider } = await import("@/lib/ai/llm-provider");
    const provider = getLLMProvider();

    const contextLines: string[] = [];
    if (session?.slots) {
      try {
        const slots = JSON.parse(session.slots);
        if (slots.origin?.value) contextLines.push(`Origen: ${slots.origin.value}`);
        if (slots.destination?.value) contextLines.push(`Destino: ${slots.destination.value}`);
        if (slots.passengers?.value) contextLines.push(`Pasajeros: ${slots.passengers.value}`);
        if (slots.scheduled_at?.value) contextLines.push(`Fecha/hora: ${slots.scheduled_at.value}`);
      } catch { /* ignore */ }
    }
    const context = contextLines.length > 0
      ? `Datos del viaje que ya tenemos:\n${contextLines.join("\n")}`
      : "No tenemos datos del viaje todavía.";

    const lang = detectLangWithFallback(userText, session?.lang);
    const langName = lang === "en" ? "English" : lang === "pt" ? "Portuguese" : "Spanish";

    const scoreStr = `(comprehension score: ${comprehensionScore.toFixed(2)}, where 1.0 = perfect, 0.0 = none)`;
    const prompt = escalationPolicies.llmPrompts.reinterpretPrompt
      .replace("{score}", scoreStr)
      .replace("{userText}", userText)
      .replace("{context}", context)
      .replace("{langName}", langName);

    const raw = await provider.generateResponse(prompt, 150, 0.4);
    const cleaned = raw?.trim() ?? "";
    if (cleaned === "NULL") return null;
    return cleaned;
  } catch (e) {
    log.warn("[REINTERPRET_LLM]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

// P0.10.3: LLM para interpretar mensajes frustrados del usuario
// P5: Ahora usa LLMProvider (Gemini por defecto, Groq fallback)
async function generateFrustrationResponse(
  userText: string,
  session: ChatSessionRow | null,
  drlEnrichment?: string, // PR-5D: enriquecimiento DRL opcional
): Promise<string | null> {
  try {
    const { getLLMProvider } = await import("@/lib/ai/llm-provider");
    const provider = getLLMProvider();

    // Construir contexto de la conversación
    const contextLines: string[] = [];
    if (session?.slots) {
      try {
        const slots = JSON.parse(session.slots);
        if (slots.origin?.value) contextLines.push(`Origen: ${slots.origin.value}`);
        if (slots.destination?.value) contextLines.push(`Destino: ${slots.destination.value}`);
        if (slots.passengers?.value) contextLines.push(`Pasajeros: ${slots.passengers.value}`);
        if (slots.scheduled_at?.value) contextLines.push(`Fecha/hora: ${slots.scheduled_at.value}`);
      } catch { /* ignore parse errors */ }
    }
    const context = contextLines.length > 0
      ? `Datos del viaje que ya tenemos:\n${contextLines.join("\n")}`
      : "No tenemos datos del viaje todavía.";

    const lang = detectLangWithFallback(userText, session?.lang);
    const langName = lang === "en" ? "English" : lang === "pt" ? "Portuguese" : "Spanish";

    let prompt = escalationPolicies.llmPrompts.frustrationPrompt
      .replace("{userText}", userText)
      .replace("{context}", context)
      .replace("{langName}", langName);

    // PR-5D: Inyectar enriquecimiento DRL antes del prompt de frustración
    if (drlEnrichment) {
      prompt = `${drlEnrichment}\n\n${prompt}`;
    }

    return await provider.generateResponse(prompt, 120, 0.3);
  } catch (e) {
    log.warn("[FRUSTRATION_LLM]", e instanceof Error ? e.message : String(e));
    return null;
  }
}
