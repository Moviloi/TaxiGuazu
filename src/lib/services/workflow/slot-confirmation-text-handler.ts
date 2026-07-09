// Slot Confirmation Text Handler — Workflow domain.
// Extracted from lead.service.ts (A6).
// Handles free-text input during slot_confirmation state:
// affirmatives, negatives, corrections, and slot updates.

import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/sender";
import { insertMessage, upsertChatSession } from "@/lib/db/database";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";
import { buildSlotConfirmationMessage } from "@/lib/ai/slot-confirmation";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import { handleSlotConfirmationButton } from "@/lib/services/workflow/slot-confirmation-handler";
import { detectLangWithFallback } from "@/lib/detect-lang";
import { log } from "@/lib/utils/logger";
import type { CoreDecision } from "@/lib/ai/types";
import type { ChatSessionRow } from "@/lib/db/types";

export async function handleSlotConfirmationText(
  phone: string,
  text: string,
  trimmed: string,
  conversation: { id: number },
  session: ChatSessionRow | null,
  leadCore: CoreDecision,
): Promise<void> {
  const slotState = session?.conversational_state;
  if (slotState !== "slot_confirmation") return;

  log.info("[SLOT_TEXT_IN_CONFIRMATION]", { text, state: slotState });

  const { isAffirmativeMessage, isNegativeMessage, isCorrectionMessage } = await import("@/lib/ai/patterns");

  // 1) Affirmative → treat as slot_confirm
  if (isAffirmativeMessage(trimmed)) {
    log.info("[SLOT_TEXT] affirmative in slot_confirmation → slot_confirm");
    await handleSlotConfirmationButton(phone, "slot_confirm", conversation, session);
    return;
  }

  // 2) Negative or correction → treat as slot_change (show field selector)
  if (isNegativeMessage(trimmed) || isCorrectionMessage(trimmed)) {
    log.info("[SLOT_TEXT] negative/correction in slot_confirmation → slot_change");
    await handleSlotConfirmationButton(phone, "slot_change", conversation, session);
    return;
  }

  // 3) Detect slot corrections from core() roleLock or simple patterns
  let rawSlots: Record<string, any> = {};
  let rawConfidence: Record<string, number> = {};
  rawSlots = parseSessionSlots(session?.slots ?? null) as Record<string, any>;
  rawConfidence = parseConfidenceJson(session?.confidence ?? null);

  let updatedSlots = false;

  // 3a) Core roleLock extraction
  if (leadCore.roleLock?.destination && leadCore.roleLock.destination !== (rawSlots.destination ?? '')) {
    rawSlots.destination = leadCore.roleLock.destination;
    rawConfidence.destination = 1.0;
    updatedSlots = true;
  }
  if (leadCore.roleLock?.origin && leadCore.roleLock.origin !== (rawSlots.origin ?? '')) {
    rawSlots.origin = leadCore.roleLock.origin;
    rawConfidence.origin = 1.0;
    updatedSlots = true;
  }

  // 3b) Simple regex patterns for corrections like "al centro", "desde el hotel"
  if (!updatedSlots) {
    const SIMPLE_DEST_RE = /^(?:a[sls]?\s+|para\s+|hasta\s+|hacia\s+)(.+)$/i;
    const destMatch = trimmed.match(SIMPLE_DEST_RE);
    if (destMatch && destMatch[1].trim() !== (rawSlots.destination ?? '')) {
      rawSlots.destination = destMatch[1].trim();
      rawConfidence.destination = 1.0;
      updatedSlots = true;
    }
  }
  if (!updatedSlots) {
    const SIMPLE_ORIGIN_RE = /^(?:desde\s+|de[l]?\s+|saliendo\s+(?:de\s+)?)(.+)$/i;
    const originMatch = trimmed.match(SIMPLE_ORIGIN_RE);
    if (originMatch && originMatch[1].trim() !== (rawSlots.origin ?? '')) {
      rawSlots.origin = originMatch[1].trim();
      rawConfidence.origin = 1.0;
      updatedSlots = true;
    }
  }

  const fallbackMsg = "¿Querés confirmar o cambiar los datos? Usá los botones de abajo 👇";

  if (updatedSlots) {
    await upsertChatSession(phone, rawSlots, rawConfidence, "slot_confirmation", undefined);

    const updatedExtractionCtx = buildExtractionContext(
      { origin: rawSlots.origin, destination: rawSlots.destination } as any,
      undefined,
      { state: "slot_confirmation", overallConfidence: 1.0, clarifyField: null, action: "clarify", askForConfirmation: true } as any,
      undefined,
      { origin: rawSlots.origin ?? null, destination: rawSlots.destination ?? null },
      { origin: "locked", destination: "locked" },
      {},
    );

    if (!updatedExtractionCtx) {
      await sendWhatsAppMessage(phone, fallbackMsg);
      await insertMessage(conversation.id, "assistant", fallbackMsg);
      return;
    }
    const confirm = buildSlotConfirmationMessage(updatedExtractionCtx, detectLangWithFallback(text, session?.lang));
    await sendInteractiveButtons(phone, confirm.message!, confirm.buttons!);
    await insertMessage(conversation.id, "assistant", confirm.message!);
    return;
  }

  // Send fallback: remind user to use buttons
  await sendWhatsAppMessage(phone, fallbackMsg);
  await insertMessage(conversation.id, "assistant", fallbackMsg);
}
