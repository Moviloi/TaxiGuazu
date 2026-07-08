// Awaiting Passenger Handler — Workflow domain.
// Extracted from lead.service.ts (Roadmap Fase 2 — A4).
// Handles the conversational state where user is expected to provide passenger count.

import { sendWhatsAppMessage } from "@/lib/sender";
import { insertMessage, upsertChatSession } from "@/lib/db/database";
import { setConversationalState } from "@/lib/db/state-accessors";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { parseSessionSlots } from "@/lib/services/shared/session-helpers";
import { parsePassengerCount } from "@/lib/services/extraction/passenger-count";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { log } from "@/lib/utils/logger";
import type { ExtractionContext } from "@/lib/ai/extraction-prompt";
import type { ChatSessionRow } from "@/lib/db/types";

export async function handleAwaitingPassenger(
  phone: string,
  text: string,
  trimmed: string,
  conversation: { id: number },
  session: ChatSessionRow | null,
  history: any[],
  customerName: string | null,
): Promise<void> {
  log.info("[AWAITING_PASSENGER]", { text });

  // ── Capa 1: Regex determinista ──
  let paxCount = parsePassengerCount(trimmed);

  // ── Capa 2: Fallback LLM si regex no pudo resolver ──
  if (paxCount == null) {
    log.info("[AWAITING_PASSENGER] regex falló → probando LLM fallback");
    const prevSlots = session?.slots
      ? (parseSessionSlots(session.slots) as Record<string, string | number>)
      : undefined;
    const llmCtx: ExtractionContext = prevSlots ? { prevSlots } : {};
    const extracted = await extractSlots(trimmed, history, customerName || undefined, llmCtx)
      .catch(() => null);
    const llmPax = extracted?.passengers ?? null;
    if (llmPax != null && llmPax > 0 && llmPax <= 99) {
      paxCount = llmPax;
      log.info("[AWAITING_PASSENGER] LLM resolvió pax:", { paxCount });
    } else {
      log.info("[AWAITING_PASSENGER] LLM tampoco resolvió");
    }
  }

  if (paxCount != null) {
    if (paxCount > 6) {
      const msg = `Máximo 6 pasajeros por vehículo. Para ${paxCount} pasajeros necesitarían 2 vehículos. Contactanos para coordinar.`;
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      return;
    }

    let rawSlots: Record<string, any> = {};
    rawSlots = parseSessionSlots(session?.slots ?? null) as Record<string, any>;

    const recalculated = await resolvePricingForSlots({
      origin: rawSlots.origin?.value ?? rawSlots.origin ?? "",
      destination: rawSlots.destination?.value ?? rawSlots.destination ?? "",
      passengers: paxCount,
    });

    if (recalculated.pricingResult.final_price > 0) {
      const vehicleType = paxCount <= 4 ? "🚗 Auto" : "🚐 Camioneta";
      const price = recalculated.pricingResult.final_price;
      rawSlots.passengers = paxCount;
      const slotsJson = JSON.stringify(rawSlots);
      await upsertChatSession(phone, JSON.parse(slotsJson), undefined, "awaiting_confirmation", undefined);

      const msg = `Perfecto, ${vehicleType} para ${paxCount}. El traslado cuesta $${price} ARS.\n\n¿Confirmamos el viaje?`;
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      await setConversationalState(phone, "awaiting_confirmation");
      return;
    } else {
      log.warn("[AWAITING_PASSENGER] pricing no devolvió precio para", { paxCount });
    }
  }

  // ── Si llegamos acá: ni regex ni LLM resolvieron ──
  const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");

  if (isAffirmativeMessage(trimmed)) {
    const msg = "¿Cuántos pasajeros son así busco el vehículo correcto?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (isNegativeMessage(trimmed)) {
    const msg = "¿Qué querés cambiar?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    await setConversationalState(phone, "collecting_slots");
    return;
  }

  const msg = "¿Cuántos pasajeros son? (ej: 'somos 3')";
  await sendWhatsAppMessage(phone, msg);
  await insertMessage(conversation.id, "assistant", msg);
}
