import { sendWhatsAppMessage } from "@/lib/sender";
import { insertMessage } from "@/lib/db/database";

export async function sendAndPersist(phone: string, conversationId: number, msg: string): Promise<void> {
  await sendWhatsAppMessage(phone, msg);
  await insertMessage(conversationId, "assistant", msg);
}
