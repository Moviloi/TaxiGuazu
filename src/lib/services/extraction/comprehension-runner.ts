import { updateChatSessionComprehension, insertF4Log, setChatSessionEscalationReason } from "@/lib/db/database";
import { buildEscalationMessage } from "@/lib/ai/response-builder";
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
    const recoveryMsg = getRecoveryMessage(comprehensionState, session);
    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_RECOVERY", text: recoveryMsg });
    await sendAndPersist(phone, conversationId, recoveryMsg);
    return true;
  }

  return false;
}
