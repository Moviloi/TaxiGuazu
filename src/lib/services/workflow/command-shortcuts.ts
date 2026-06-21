import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { getOrCreateConversation, getConversationByPhone, insertMessage } from "@/lib/db/database";
import { resetToIdle } from "@/lib/services/dispatch/dispatch-workflow";
import { HABLAR_HUMANO } from "@/lib/config/lead-constants";
import { notifyAdmin } from "@/lib/services/admin/admin.service";

export async function handleCommandShortcuts(
  phone: string,
  trimmed: string,
  lower: string,
): Promise<boolean> {
  if (lower === ".id") {
    const resp = `Tu número: ${phone}`;
    await sendWhatsAppMessage(phone, resp);
    const conv = await getOrCreateConversation(phone);
    await insertMessage(conv.id, "assistant", resp);
    return true;
  }

  if (lower === "sigo yo") {
    const resp = "Perfecto, continuás vos. Avisame cuando termines para volver con Cris Virtual.";
    await sendWhatsAppMessage(phone, resp);
    const conv = await getOrCreateConversation(phone);
    await insertMessage(conv.id, "assistant", resp);
    return true;
  }

  if (lower === "seguí vos" || lower === "seguimos vos") {
    const resp = "¡Genial! Retomo la atención. ¿En qué estábamos?";
    await sendWhatsAppMessage(phone, resp);
    const conv = await getConversationByPhone(phone);
    if (conv) {
      await insertMessage(conv.id, "assistant", resp);
      await resetToIdle(conv.id);
    }
    return true;
  }

  if (HABLAR_HUMANO.some((h) => lower.includes(h))) {
    const resp = "Te va a atender el primer chofer disponible. En breve te contactarán.";
    await sendWhatsAppMessage(phone, resp);
    const conv = await getOrCreateConversation(phone);
    await insertMessage(conv.id, "assistant", resp);
    await notifyAdmin(`🗣️ *Cliente pide atención humana*\n\nTeléfono: ${phone}\nMensaje: "${trimmed.substring(0, 100)}"`);
    return true;
  }

  return false;
}
