import { getChatSession, updateChatSessionConversation, getDb } from "@/lib/db/database";
import { updateChatSessionComprehension } from "@/lib/db/domains/learning";
import type { DbExecutor } from "@/lib/db/core/connection";
import type { ConversationalState, DispatchState, TripState } from "@/lib/ai/types";

export async function getConversationalState(phone: string): Promise<ConversationalState> {
  const session = await getChatSession(phone);
  if (session?.conversational_state != null) return session.conversational_state as ConversationalState;
  return "idle";
}

export async function setConversationalState(phone: string, state: ConversationalState, clarifyField?: string): Promise<void> {
  await updateChatSessionConversation(phone, state, clarifyField);
}

export async function getDispatchState(phone: string): Promise<DispatchState> {
  const session = await getChatSession(phone);
  if (session?.dispatch_state != null) return session.dispatch_state as DispatchState;
  return "idle";
}

export async function setDispatchState(phone: string, state: DispatchState): Promise<void> {
  await getDb().execute({
    sql: "UPDATE chat_sessions SET dispatch_state = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [state, phone],
  });
}

export async function setTripState(phone: string, state: TripState, tx?: DbExecutor): Promise<void> {
  const db = tx ?? getDb();
  await db.execute({
    sql: "UPDATE chat_sessions SET trip_state = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [state, phone],
  });
}

export async function getComprehensionState(phone: string): Promise<string | null> {
  const session = await getChatSession(phone);
  return session?.comprehension_state ?? null;
}

export async function setComprehensionState(phone: string, state: string, score?: number): Promise<void> {
  await updateChatSessionComprehension(phone, state, score ?? 0);
}
