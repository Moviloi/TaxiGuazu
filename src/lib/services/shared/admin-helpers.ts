import { getEnv } from "@/config/env";
import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { insertMessage, getOrCreateConversation } from "@/lib/db/database";

export async function assertAdmin(phone: string, action: string): Promise<boolean> {
  if (phone !== getEnv().ADMIN_PHONE) {
    const msg = `❌ Solo el administrador puede ${action}.`;
    await sendWhatsAppMessage(phone, msg);
    const conv = await getOrCreateConversation(phone);
    await insertMessage(conv.id, "assistant", msg);
    return false;
  }
  return true;
}
