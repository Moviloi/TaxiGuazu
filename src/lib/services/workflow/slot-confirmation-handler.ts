// Slot Confirmation Handler — Workflow domain.
// Extracted from lead.service.ts (Roadmap Fase 2 — A2).
// Handles interactive button presses during slot confirmation.

import { getChatSession, upsertChatSession, insertMessage } from "@/lib/db/database";
import { setConversationalState } from "@/lib/db/state-accessors";
import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";
import { getSuggestionType, buildFieldSelector } from "@/lib/ai/slot-confirmation";
import { logEvent } from "@/lib/services/learning/event-tracking";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";
import { sendWhatsAppMessage } from "@/lib/sender";
import { detectLangWithFallback } from "@/lib/detect-lang";
import { log } from "@/lib/utils/logger";

export async function handleSlotConfirmationButton(
  phone: string,
  buttonId: string,
  conversation: { id: number },
  session: Awaited<ReturnType<typeof getChatSession>>,
): Promise<void> {
  const lang = detectLangWithFallback(buttonId, session?.lang);
  const buttonType = buttonId as string;

  log.info("[BUTTON_ROUTING]", {
    buttonId,
    currentState: session?.conversational_state ?? "unknown",
    action: buttonType === "slot_confirm" ? "confirm"
      : buttonType === "slot_change" ? "show_field_selector"
      : buttonType.startsWith("change_") ? `change_field:${buttonType.replace("change_", "")}`
      : "unknown",
  });

  if (buttonType === "slot_confirm") {
    let rawSlots: Record<string, any> = {};
    let rawConfidence: Record<string, number> = {};
    let sessionId: string | null = null;
    try {
      const s = await getChatSession(phone);
      rawSlots = parseSessionSlots(s?.slots ?? null) as Record<string, any>;
      rawConfidence = parseConfidenceJson(s?.confidence ?? null);
      sessionId = s?.phone ?? phone;

      for (const [key, slot] of Object.entries(rawSlots)) {
        const st = getSuggestionType(key, slot);
        if (st) {
          await logEvent(sessionId, "oi_suggestion", { type: st, accepted: true, slotKey: key });
        }
      }
    } catch { /* ignore */ }

    if (rawSlots.origin) rawConfidence.origin = 1.0;
    if (rawSlots.destination) rawConfidence.destination = 1.0;

    const syntheticSlots: any = {};
    if (rawSlots.origin != null) syntheticSlots.origin = { value: rawSlots.origin?.value ?? rawSlots.origin, score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.destination != null) syntheticSlots.destination = { value: rawSlots.destination?.value ?? rawSlots.destination, score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.passengers != null) syntheticSlots.passengers = { value: String(rawSlots.passengers), score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };
    if (rawSlots.scheduled_at != null) syntheticSlots.scheduled_at = { value: String(rawSlots.scheduled_at), score: 1.0, reason: "user_confirmed", source: "USER_CONFIRMED", status: "CONFIRMED" };

    const syntheticConfidence: any = { slots: syntheticSlots, overall_confidence: 1.0, action: "proceed" };
    const workflowResult = await evaluateWorkflowTransition(phone, syntheticConfidence);
    await upsertChatSession(phone, rawSlots, rawConfidence, workflowResult.state, workflowResult.clarifyField ?? undefined);

    log.info("[USER_SLOT_CONFIRM]", {
      action: "confirm",
      confirmedSlots: Object.keys(rawSlots).filter(k => k === "origin" || k === "destination" || k === "passengers"),
      correctedSlots: [],
    });

    let priceMsg: string | null = null;
    if (rawSlots.origin && rawSlots.destination) {
      const existingPax = rawSlots.passengers?.value ?? rawSlots.passengers;
      if (existingPax) {
        try {
          const resolved = await resolvePricingForSlots({
            origin: rawSlots.origin?.value ?? rawSlots.origin,
            destination: rawSlots.destination?.value ?? rawSlots.destination,
            passengers: Number(existingPax),
          });
          if (resolved.pricingResult.final_price > 0) {
            const p = resolved.pricingResult;
            const originRaw = rawSlots.origin?.value ?? rawSlots.origin;
            const destRaw = rawSlots.destination?.value ?? rawSlots.destination;
            const originDisplay = rawSlots.origin?.display ?? originRaw;
            const destDisplay = rawSlots.destination?.display ?? destRaw;
            const originName = p.origin.canonical_name ?? originDisplay;
            const destName = p.destination.canonical_name ?? destDisplay;
            priceMsg = `El traslado de ${originName} a ${destName} cuesta $${p.final_price} ARS.\n\n¿Confirmamos el viaje?`;
            await setConversationalState(phone, "awaiting_confirmation");
          }
        } catch (e) {
          log.error("[SLOT_CONFIRM] pricing error:", e);
        }
      } else {
        priceMsg = lang === "en"
          ? "How many passengers will there be?"
          : lang === "pt"
            ? "Quantos passageiros serão?"
            : "¿Cuántos pasajeros son?";
        await setConversationalState(phone, "awaiting_passenger");
      }
    }

    if (priceMsg) {
      await sendWhatsAppMessage(phone, priceMsg);
      await insertMessage(conversation.id, "assistant", priceMsg);
    } else {
      const originDisplay = rawSlots.origin?.display ?? rawSlots.origin?.value ?? rawSlots.origin;
      const destDisplay = rawSlots.destination?.display ?? rawSlots.destination?.value ?? rawSlots.destination;
      const originDn = originDisplay != null ? String(originDisplay) : "?";
      const destDn = destDisplay != null ? String(destDisplay) : "?";
      const msg = `Gracias por confirmar los datos de tu viaje 🚖\n\n📍 De: ${originDn}\n📍 A: ${destDn}\n\nEstamos verificando la tarifa y te la confirmamos en breve por este chat.`;
      await sendWhatsAppMessage(phone, msg);
      await insertMessage(conversation.id, "assistant", msg);
      await setConversationalState(phone, "pending_human_review");
    }
    return;
  }

  if (buttonType === "slot_change") {
    try {
      const s = await getChatSession(phone);
      const rawSlots = parseSessionSlots(s?.slots ?? null) as Record<string, any>;
      const sid = s?.phone ?? phone;
      for (const [key, slot] of Object.entries(rawSlots)) {
        const st = getSuggestionType(key, slot);
        if (st) {
          await logEvent(sid, "oi_suggestion", { type: st, accepted: false, slotKey: key });
        }
      }
    } catch { /* ignore */ }

    const selector = buildFieldSelector(lang);
    await sendWhatsAppMessage(phone, selector.text);
    await insertMessage(conversation.id, "assistant", selector.text);
    return;
  }

  if (buttonType === "change_origin" || buttonType === "change_destination") {
    const label = buttonType === "change_origin" ? "origen" : "destino";
    const msg = `Escribí el ${label} exacto.`;
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_passengers") {
    const msg = "¿Cuántos pasajeros son?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_scheduled_at") {
    const msg = "¿Para qué día y horario necesitás el viaje?";
    await sendWhatsAppMessage(phone, msg);
    await insertMessage(conversation.id, "assistant", msg);
    return;
  }

  if (buttonType === "change_back") {
    await sendWhatsAppMessage(phone, "Escribí los datos de tu viaje.");
    await insertMessage(conversation.id, "assistant", "Escribí los datos de tu viaje.");
    return;
  }
}
