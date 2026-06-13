import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, updateChatSessionComprehension, insertF4Log, setChatSessionEscalationReason } from "@/lib/db/database";
import { buildEscalationMessage } from "@/lib/ai/response-builder";
import { enrichComprehensionSignals } from "@/lib/services/memory/predictive-routing";
import { logEscalation } from "@/lib/services/learning/event-tracking";
import { recordComprehensionOutcome, getComprehensionThresholdAdjustment } from "@/lib/services/learning/learning-utils";
import { buildComprehensionSignals, computeComprehensionScore, getComprehensionState, getRecoveryMessage } from "@/lib/services/extraction/comprehension";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { log } from "@/lib/utils/logger";
import type { CoreDecision } from "@/lib/ai/types";
import type { PredictedContext } from "@/lib/services/memory/predictive-routing";
import type { ChatSessionRow } from "@/lib/db/types";

export interface ComprehensionRunnerParams {
  phone: string;
  text: string;
  conversationId: number;
  leadCore: CoreDecision;
  predictedContext: PredictedContext;
  session: ChatSessionRow | null;
}

export async function runComprehensionCheck(params: ComprehensionRunnerParams): Promise<boolean> {
  const { phone, text, conversationId, leadCore, predictedContext, session } = params;

  log.info("[TRACE INPUT]", { event: "comprehension_check", phone: phone.slice(-4), textLen: text.length });
  const f4Signals = enrichComprehensionSignals(
    buildComprehensionSignals({
      text,
      coreIntent: leadCore.intent,
      slotStability: leadCore.slotStability,
      roleLock: leadCore.roleLock,
      session,
    }),
    predictedContext.entityPrediction,
    predictedContext.intentPrediction,
  );
  const f4Score = computeComprehensionScore(f4Signals);
  const f4ThresholdAdj = await getComprehensionThresholdAdjustment();
  const f4State = getComprehensionState(f4Score, f4ThresholdAdj);

  log.info("[TRACE COMPREHENSION]", {
    state: f4State,
    score: f4Score,
    thresholdAdj: f4ThresholdAdj,
    intent: leadCore.intent,
    roleLock: leadCore.roleLock,
    slotStability: leadCore.slotStability,
  });

  await Promise.all([
    updateChatSessionComprehension(phone, f4State, f4Score),
    insertF4Log(String(conversationId), f4Score, f4State, null),
  ]);

  recordComprehensionOutcome(f4State === "ESCALATION");

  if (f4State === "ESCALATION") {
    const reason = `comprehension_score=${f4Score.toFixed(2)} state=${f4State}`;
    await setChatSessionEscalationReason(phone, reason);
    logEscalation(String(conversationId), reason, f4Score);
    await notifyAdmin(`⚠️ *ESCALACIÓN — Bajo nivel de comprensión*\n\nTeléfono: ******${phone.slice(-4)}\nScore: ${f4Score.toFixed(2)}`);
    const escMsg = buildEscalationMessage();
    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_ESCALATION", text: escMsg });
    await sendWhatsAppMessage(phone, escMsg);
    await insertMessage(conversationId, "assistant", escMsg);
    return true;
  }

  if (f4State === "RECOVERY") {
    log.info("[TRACE RECOVERY]", {
      state: f4State,
      score: f4Score,
      phone: phone.slice(-4),
      textLen: text.length,
    });
    const recoveryMsg = getRecoveryMessage(f4State, session);
    log.info("[TRACE RESPONSE]", { source: "COMPREHENSION_RECOVERY", text: recoveryMsg });
    await sendWhatsAppMessage(phone, recoveryMsg);
    await insertMessage(conversationId, "assistant", recoveryMsg);
    return true;
  }

  return false;
}
