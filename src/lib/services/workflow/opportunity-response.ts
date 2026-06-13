import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { getChatSession, insertMessage, updateOpportunityLogResponse } from "@/lib/db/database";
import { clearPendingOpportunity } from "@/lib/db/domains/learning";
import { resetToIdle } from "@/lib/services/workflow/conversation-workflow";
import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";
import { buildOpportunityAcceptedMessage, buildOpportunityDeclinedMessage } from "@/lib/ai/response-builder";
import { logUserResponse } from "@/lib/services/learning/event-tracking";

export async function handleOpportunityResponse(
  phone: string,
  text: string,
  conversationId: number,
  workflow: { state: string } | null,
): Promise<boolean> {
  if (workflow?.state !== "post_trip_opportunity") return false;

  const session = await getChatSession(phone);
  if (!session?.pending_opportunity) return false;

  let pending: { label: string; expires_at: number; logId: number };
  try {
    pending = JSON.parse(session.pending_opportunity);
  } catch {
    console.log(`[OPPORTUNITY] Invalid pending_opportunity JSON for ******${phone.slice(-4)}`);
    await clearPendingOpportunity(phone);
    await resetToIdle(conversationId);
    return false;
  }
  const now = Math.floor(Date.now() / 1000);

  if (now > pending.expires_at) {
    console.log(`[OPPORTUNITY] expired for ******${phone.slice(-4)} rule="${pending.label}"`);
    await Promise.all([
      updateOpportunityLogResponse(pending.logId, "expired", now),
      clearPendingOpportunity(phone),
      resetToIdle(conversationId),
    ]);
    logUserResponse(String(conversationId), "ignored", pending.label);
  } else if (isAffirmativeMessage(text)) {
    console.log(`[OPPORTUNITY] accepted by ******${phone.slice(-4)} rule="${pending.label}"`);
    const infoMsg = buildOpportunityAcceptedMessage(pending.label);
    await Promise.all([
      updateOpportunityLogResponse(pending.logId, "accepted", now),
      sendWhatsAppMessage(phone, infoMsg),
      insertMessage(conversationId, "assistant", infoMsg),
      clearPendingOpportunity(phone),
      resetToIdle(conversationId),
    ]);
    logUserResponse(String(conversationId), "accepted", pending.label);
    return true;
  } else if (isNegativeMessage(text)) {
    console.log(`[OPPORTUNITY] declined by ******${phone.slice(-4)} rule="${pending.label}"`);
    const declineMsg = buildOpportunityDeclinedMessage();
    await Promise.all([
      updateOpportunityLogResponse(pending.logId, "declined", now),
      sendWhatsAppMessage(phone, declineMsg),
      insertMessage(conversationId, "assistant", declineMsg),
      clearPendingOpportunity(phone),
      resetToIdle(conversationId),
    ]);
    logUserResponse(String(conversationId), "declined", pending.label);
    return true;
  } else {
    console.log(`[OPPORTUNITY] ignored for ******${phone.slice(-4)} rule="${pending.label}" — unrelated message`);
    await Promise.all([
      updateOpportunityLogResponse(pending.logId, "ignored", now),
      clearPendingOpportunity(phone),
      resetToIdle(conversationId),
    ]);
    logUserResponse(String(conversationId), "ignored", pending.label);
  }

  return false;
}
