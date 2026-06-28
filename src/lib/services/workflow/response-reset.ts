import { sendWhatsAppMessage } from "@/lib/sender";
import { getOrCreateConversation, getConversationByPhone, insertMessage, clearConversationHistory } from "@/lib/db/database";
import { fullReset } from "@/lib/services/shared/reset-helpers";

export async function handleResponseReset(phone: string): Promise<boolean> {
  const conv = await getConversationByPhone(phone);
  if (conv) {
    await clearConversationHistory(conv.id);
    await fullReset(phone, conv.id);
  } else {
    await fullReset(phone, 0);
  }
  await sendWhatsAppMessage(phone, "🧹 Sesión limpiada para testeo");
  const c = await getOrCreateConversation(phone);
  await insertMessage(c.id, "assistant", "🧹 Sesión limpiada para testeo");
  return true;
}
