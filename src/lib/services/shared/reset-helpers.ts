import { resetChatSession } from "@/lib/db/database";
import { resetToIdle } from "@/lib/services/dispatch/dispatch-workflow";

export async function fullReset(phone: string, conversationId: number): Promise<void> {
  await resetToIdle(conversationId);
  await resetChatSession(phone);
}
