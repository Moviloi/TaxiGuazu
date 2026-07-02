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
import { detectLeadLang } from "@/lib/detect-lang";

// P0.10.3: Detección de frustración del usuario
const FRUSTRATION_RE = /\b(ya\s+(te\s+)?dije|ya\s+respond[ií]|no\s+entend[ée]s|ya\s+lo\s+dije|te\s+lo\s+dije|obvio|evidente|ya\s+contest[ée]|repito|otra\s+vez|no\s+me\s+escuch[áa]s|no\s+le[ée]s|le[ée]\s+bien|ya\s+esta\s+respondid[ao]|ya\s+te\s+lo\s+dije|ya\s+te\s+contest[ée])\b/i;

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

  log.info("[TRACE INPUT]", { event: "comprehension_check", phone: phone.slice(-4), textLen: text.length });

  // P0.10.3: Detectar frustración del usuario — usar LLM para interpretar
  if (FRUSTRATION_RE.test(text)) {
    log.info("[FRUSTRATION_DETECTED]", { phone: phone.slice(-4), text: text.slice(0, 100) });
    const frustratedMsg = await generateFrustrationResponse(text, session);
    if (frustratedMsg) {
      log.info("[TRACE RESPONSE]", { source: "FRUSTRATION_RECOVERY", text: frustratedMsg });
      await sendAndPersist(phone, conversationId, frustratedMsg);
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
    const reason = `comprehension_score=${comprehensionScore.toFixed(2)} state=${comprehensionState}`;
    await setChatSessionEscalationReason(phone, reason);
    logEscalation(String(conversationId), reason, comprehensionScore);
    await notifyAdmin(`⚠️ *ESCALACIÓN — Bajo nivel de comprensión*\n\nTeléfono: ******${phone.slice(-4)}\nScore: ${comprehensionScore.toFixed(2)}`);
    const escMsg = buildEscalationMessage();
    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_ESCALATION", text: escMsg });
    await sendAndPersist(phone, conversationId, escMsg);
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
    if (recoveryMsg === buildGenericClarify(null, detectLeadLang(text))) {
      const missingField = inferMissingFieldFromCore(leadCore);
      if (missingField) {
        recoveryMsg = buildGenericClarify(missingField, detectLeadLang(text));
        log.info("[COMPREHENSION] core facts inferred missing field", { field: missingField });
      }
    }

    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_RECOVERY", text: recoveryMsg });
    await sendAndPersist(phone, conversationId, recoveryMsg);
    return true;
  }

  return false;
}

// P0.10.3: LLM para interpretar mensajes frustrados del usuario
// P5: Ahora usa LLMProvider (Gemini por defecto, Groq fallback)
async function generateFrustrationResponse(userText: string, session: ChatSessionRow | null): Promise<string | null> {
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

    const prompt = [
      `Sos Cris, asistente de TaxiGuazú.`,
      `El usuario está frustrado porque siente que no lo estás escuchando.`,
      ``,
      `Mensaje del usuario: "${userText}"`,
      ``,
      context,
      ``,
      `Tu tarea:`,
      `1. Reconocé brevemente la frustración del usuario (una frase corta, empática).`,
      `2. Intentá entender qué está tratando de decirte.`,
      `3. Respondé de forma que demuestres que lo escuchaste.`,
      ``,
      `Ejemplo bueno: "Perdón, tenés razón. Entiendo que ya me dijiste que salís del aeropuerto. ¿A dónde necesitás ir?"`,
      `Ejemplo malo: "¿Desde dónde salís?" (ignora lo que dijo, repite pregunta)`,
      ``,
      `Respondé EN EL MISMO IDIOMA que el usuario. Máximo 2-3 líneas.`,
      `No inventes datos. No agregues opciones numeradas.`,
      `Si el usuario mencionó un dato específico (origen, destino, pasajeros), reconocelo.`,
    ].join("\n");

    return await provider.generateResponse(prompt, 120, 0.3);
  } catch (e) {
    log.warn("[FRUSTRATION_LLM]", e instanceof Error ? e.message : String(e));
    return null;
  }
}
