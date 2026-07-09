// Awaiting Confirmation Handler — Workflow domain.
// Extracted from lead.service.ts (Roadmap Fase 2 — A5).
// Handles the conversational state where user is expected to confirm or cancel a priced trip.

import { sendWhatsAppMessage } from "@/lib/sender";
import { insertMessage, getChatSession } from "@/lib/db/database";
import { setConversationalState } from "@/lib/db/state-accessors";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { parseSessionSlots } from "@/lib/services/shared/session-helpers";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { detectLangWithFallback } from "@/lib/detect-lang";
import { log } from "@/lib/utils/logger";
import type { CoreDecision } from "@/lib/ai/types";

export async function handleAwaitingConfirmation(
  phone: string,
  trimmed: string,
  conversation: { id: number },
  customerName: string | null,
  leadCore: CoreDecision,
): Promise<void> {
  log.info("[AWAITING_CONFIRMATION]", { text: trimmed, phoneLen: phone.length });

  const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");

  // Negative / cancel → go back to collecting slots
  if (isNegativeMessage(trimmed)) {
    const msg = "¿Qué querés cambiar?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    await setConversationalState(phone, "collecting_slots");
    return;
  }

  // Affirmative → confirm and execute
  if (isAffirmativeMessage(trimmed)) {
    const s = await getChatSession(phone);
    const sessionLang = s?.lang;
    const rawSlots = parseSessionSlots(s?.slots ?? null) as Record<string, any>;
    const passengers = rawSlots?.passengers?.value ?? rawSlots?.passengers ?? 1;

    const resolved = await resolvePricingForSlots({
      origin: rawSlots?.origin?.value ?? rawSlots?.origin ?? "",
      destination: rawSlots?.destination?.value ?? rawSlots?.destination ?? "",
      passengers: passengers,
    });

    const p = resolved.pricingResult;
    const vehicleType = passengers <= 4 ? "🚗 Auto" : "🚐 Camioneta";
    const priceMsg = p.final_price > 0
      ? `Confirmado ✅ ${vehicleType} para ${passengers}. El traslado cuesta $${p.final_price} ARS.\n\nBuscando chofer...`
      : `Confirmado ✅ para ${passengers}.\n\nBuscando chofer...`;

    await sendWhatsAppMessage(phone, priceMsg);
    await insertMessage(conversation.id, "assistant", priceMsg);

    const temporal = leadCore.facts.some(f => f.startsWith("now:") || f.startsWith("urgency:")) ? "NOW" : "FUTURO";

    if (temporal === "NOW") {
      await executeNowTrip({
        phone,
        conversationId: conversation.id,
        origin: rawSlots?.origin?.value ?? rawSlots?.origin ?? "",
        destination: rawSlots?.destination?.value ?? rawSlots?.destination ?? "",
        passengers: Number(passengers),
        pricing: p.final_price > 0 ? p : undefined,
        customerName,
        lang: detectLangWithFallback(trimmed, sessionLang),
        text: trimmed,
      });
    } else {
      await setConversationalState(phone, "pending_human_review");
      await sendWhatsAppMessage(phone, "Tu reserva quedó registrada. Te confirmamos horario y chofer en breve.");
      await insertMessage(conversation.id, "assistant", "Tu reserva quedó registrada. Te confirmamos horario y chofer en breve.");
    }
    return;
  }

  // Not affirmative/negative → re-ask
  const msg = "¿Confirmamos el viaje?";
  await sendWhatsAppMessage(phone, msg);
  await insertMessage(conversation.id, "assistant", msg);
}
