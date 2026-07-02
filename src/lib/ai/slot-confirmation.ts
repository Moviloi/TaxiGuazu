// SLOT CONFIRMATION — capa UX de confirmación/corrección de slots.
// Se activa cuando existen slots CONFIRMATION_PENDING.
// Depende de display-name.ts para nombres amigables.

import type { ExtractionContext, Lang } from "./types";
import { log } from "@/lib/utils/logger";
import { t } from "@/lib/services/i18n/t";

export interface SlotConfirmationUI {
  showConfirmation: boolean;
  pendingSlots: string[];
  message?: string;
  buttons?: { id: string; title: string }[];
}

export function shouldRequestConfirmation(extractionCtx?: ExtractionContext): boolean {
  if (!extractionCtx?.slots) return false;
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const originNeedsConfirm = origin?.value != null && (
    origin.status === "CONFIRMATION_PENDING" || origin.status === "INFERRED"
  );
  const destNeedsConfirm = dest?.value != null && (
    dest.status === "CONFIRMATION_PENDING" || dest.status === "INFERRED"
  );
  return originNeedsConfirm || destNeedsConfirm;
}

export function buildSlotConfirmationMessage(
  extractionCtx: ExtractionContext,
  lang: Lang,
): SlotConfirmationUI {
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const passengers = extractionCtx.slots.passengers;

  const originDisplay = extractionCtx.tariff?.displayOrigin
    ?? (origin?.value != null ? String(origin.value) : "?");
  const destDisplay = extractionCtx.tariff?.displayDestination
    ?? (dest?.value != null ? String(dest.value) : "?");

  const lines: string[] = [
    t("confirm.summary", lang),
    "",
    t("confirm.origin", lang),
    origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? `⚠️ ${originDisplay}` : originDisplay,
    "",
    t("confirm.destination", lang),
    dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? `⚠️ ${destDisplay}` : destDisplay,
  ];

  // P0.10.2: Incluir passengers si está presente
  if (passengers?.value != null) {
    lines.push(
      "",
      t("confirm.passengers", lang),
      passengers.status === "CONFIRMATION_PENDING" || passengers.status === "INFERRED"
        ? `⚠️ ${passengers.value}`
        : String(passengers.value),
    );
  }

  lines.push("", t("confirm.ask", lang));

  log.info("[SLOT_CONFIRMATION_UI]", {
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? ["destination"] : []),
      ...(passengers?.status === "CONFIRMATION_PENDING" || passengers?.status === "INFERRED" ? ["passengers"] : []),
    ],
    confidence: extractionCtx.overallConfidence,
    availableActions: ["confirm", "change"],
    nextStep: "user_decision",
    originDisplay,
    destDisplay,
    passengersDisplay: passengers?.value ?? null,
  });

  return {
    showConfirmation: true,
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? ["destination"] : []),
      ...(passengers?.status === "CONFIRMATION_PENDING" || passengers?.status === "INFERRED" ? ["passengers"] : []),
    ],
    message: lines.join("\n"),
    buttons: [
      { id: "slot_confirm", title: t("confirm.buttonConfirm", lang) },
      { id: "slot_change", title: t("confirm.buttonChange", lang) },
    ],
  };
}

export function buildFieldSelector(lang: Lang): { text: string; prompt: string } {
  return {
    text: t("disamb.fieldSelector", lang),
    prompt: t("confirm.fieldSelectorPrompt", lang),
  };
}

export function buildPlaceOptions(
  canonicalNames: string[],
  slotKey: string,
  lang: Lang = "es",
): string {
  if (canonicalNames.length === 0) {
    return t("disamb.writeExact", lang);
  }
  const label = slotKey === "origin"
    ? t("confirm.labelOrigin", lang)
    : t("confirm.labelDestination", lang);
  const examples = canonicalNames.slice(0, 3).join(", ");
  return t("disamb.writeExactWith", lang, { label, examples });
}

