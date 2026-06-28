import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { getOrCreateConversation, getConversationByPhone, insertMessage, getDriverByPhone, updateDriverShiftIfNull } from "@/lib/db/database";
import { buildShiftActivationMsg, buildShiftEndPrompt } from "@/lib/services/dispatch/shift-utils";
import { handleAdminCommand } from "@/lib/services/admin/admin-commands";
import { isAdminCommand, parseAdminCommand, executeAdminCommand } from "@/lib/services/learning/admin";
import { assertAdmin } from "@/lib/services/shared/admin-helpers";

export async function handleAdminCommands(
  phone: string,
  lower: string,
  trimmed: string,
): Promise<boolean> {
  const activarMatch = lower.match(/^[-.]activar$|^\.activo$/);
  if (activarMatch) {
    const existing = await getDriverByPhone(phone);
    if (!existing) {
      const conv = await getOrCreateConversation(phone);
      const resp = "❌ No estás registrado como chofer. Pedí al administrador que te dé de alta.";
      await sendWhatsAppMessage(phone, resp);
      await insertMessage(conv.id, "assistant", resp);
      return true;
    }
    await getOrCreateConversation(phone);
    const shift = await updateDriverShiftIfNull(phone);
    const msg = buildShiftActivationMsg(shift || "day", existing.name || "Chofer");
    await sendWhatsAppMessage(phone, msg || "✅ Activado!");
    const conv = await getConversationByPhone(phone);
    if (conv) await insertMessage(conv.id, "assistant", msg || "✅ Activado!");
    if (shift) {
      const prompt = buildShiftEndPrompt(shift);
      if (prompt) {
        await sendWhatsAppMessage(phone, prompt);
        if (conv) await insertMessage(conv.id, "assistant", prompt);
      }
    }
    return true;
  }

  const registrarMatch = lower.match(/^\.registrar\s*$/);
  if (registrarMatch) {
    const existing = await getDriverByPhone(phone);
    if (existing) {
      await getOrCreateConversation(phone);
      const shift = await updateDriverShiftIfNull(phone);
      const msg = buildShiftActivationMsg(shift || "day", existing.name || "Chofer");
      await sendWhatsAppMessage(phone, msg || "✅ Activado!");
      const conv = await getConversationByPhone(phone);
      if (conv) await insertMessage(conv.id, "assistant", msg || "✅ Activado!");
      if (shift) {
        const prompt = buildShiftEndPrompt(shift);
        if (prompt) {
          await sendWhatsAppMessage(phone, prompt);
          if (conv) await insertMessage(conv.id, "assistant", prompt);
        }
      }
    } else {
      const conv = await getOrCreateConversation(phone);
      const resp = "❌ No estás registrado como chofer. Pedí al administrador que te dé de alta.";
      await sendWhatsAppMessage(phone, resp);
      await insertMessage(conv.id, "assistant", resp);
    }
    return true;
  }

  if (await handleAdminCommand(phone, trimmed)) return true;

  if (isAdminCommand(trimmed)) {
    if (!(await assertAdmin(phone, "ejecutar comandos de administrador"))) return true;
    const parsed = parseAdminCommand(trimmed);
    if (parsed) {
      const result = await executeAdminCommand(parsed, phone);
      await sendWhatsAppMessage(phone, result.message);
      const conv = await getOrCreateConversation(phone);
      await insertMessage(conv.id, "assistant", result.message);
    }
    return true;
  }

  return false;
}
