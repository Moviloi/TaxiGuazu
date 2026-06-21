import { getOrCreateConversation, getConversationById, insertMessage, getRecentHistory, getActiveTripByPhone, updateTripState, clearConversationHistory, setCustomerName, getCustomerName, resetChatSession } from "@/lib/db/database";
import { resetToIdle } from "@/lib/services/dispatch/dispatch-workflow";
import { getConversationalState, getDispatchState } from "@/lib/db/state-accessors";
import { SESSION_INACTIVITY_48H_S } from "@/config/constants";
import { log } from "@/lib/utils/logger";

export interface ConversationSetupResult {
  conversation: { id: number };
  history: any[];
  customerName: string | null;
  sessionReset: boolean;
  workflow: null;
}

export async function handleConversationSetup(
  phone: string,
  text: string,
): Promise<ConversationSetupResult | null> {
  const conversation = await getOrCreateConversation(phone, undefined);
  const freshConv = await getConversationById(conversation.id);
  if (!freshConv || freshConv.taken_by_human) return null;

  const [, dispatchState] = await Promise.all([
    getConversationalState(phone),
    getDispatchState(phone),
  ]);

  if (dispatchState !== "idle" && dispatchState !== "closed") return null;

  const now = Math.floor(Date.now() / 1000);
  let sessionReset = false;
  let customerName = null as string | null;
  let trip = await getActiveTripByPhone(phone);

  if (trip && trip.scheduled_at && trip.scheduled_at < now) {
    log.info(`[SESSION] Cond A: trip ${trip.trip_id} expirado, archivando`);
    await updateTripState(trip.trip_id, 'completado');
    sessionReset = true;
    trip = null;
  }

  if (!sessionReset) {
    const lastMsgAt = freshConv.last_message_at || 0;
    const inactive48h = (now - lastMsgAt) > SESSION_INACTIVITY_48H_S;
    if (inactive48h && !trip) {
      log.info(`[SESSION] Cond B: inactividad >48h sin reserva, reseteando`);
      sessionReset = true;
    }
  }

  if (sessionReset) {
    await Promise.all([
      clearConversationHistory(conversation.id),
      resetToIdle(conversation.id),
      resetChatSession(phone),
    ]);
  }

  customerName = await getCustomerName(phone);

  const nameMatch = text.match(/(?:me llamo|soy|mi nombre es)\s+(\w+(?:\s+\w+)?)/i);
  if (nameMatch) {
    await setCustomerName(phone, nameMatch[1]);
    customerName = nameMatch[1];
  }

  await insertMessage(conversation.id, "user", text);

  const history = sessionReset ? [] : await getRecentHistory(conversation.id, 20);

  return { conversation, history, customerName, sessionReset, workflow: null };
}
