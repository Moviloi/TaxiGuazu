import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { getOrCreateConversation, getConversationByPhone, insertMessage, clearConversationHistory } from "@/lib/db/database";
import { fullReset } from "@/lib/services/shared/reset-helpers";

export async function handleResponseReset(
  phone: string,
  trimmed: string,
): Promise<boolean> {
  const conv = await getConversationByPhone(phone);
  if (conv) {
    await clearConversationHistory(conv.id);
    await fullReset(phone, conv.id);
  } else {
    await fullReset(phone, 0);
  }
  const isStructured = trimmed.length > 20 || /(reserva|quiero|necesito|traslado|viaje|aeropuerto|hotel)/i.test(trimmed);
  const welcome = isStructured
    ? "Bienvenido a TaxiGuazú! Soy Cris Virtual (Asistente 24/7). ¿A dónde necesitas ir?"
    : "Hola! Soy Cris Virtual (Asistente 24/7). ¿En qué te ayudo?";
  await sendWhatsAppMessage(phone, welcome);
  const c = await getOrCreateConversation(phone);
  await insertMessage(c.id, "assistant", welcome);
  return true;
}
