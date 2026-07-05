// SLOT CONFIRMATION — capa UX de confirmación/corrección de slots.
// Se activa cuando existen slots CONFIRMATION_PENDING.
// Depende de display-name.ts para nombres amigables.

import type { ExtractionContext, Lang } from "./types";
import { log } from "@/lib/utils/logger";
import { t } from "@/lib/services/i18n/t";

export type SuggestionType = "airport" | "time" | "border";

export interface SlotConfirmationUI {
  showConfirmation: boolean;
  pendingSlots: string[];
  message?: string;
  buttons?: { id: string; title: string }[];
  // AIT-063: marca qué slots pendientes son sugerencias del sistema
  // (inferidas por OI layer), no confundir con slots ambiguos genéricos.
  // Ej: [{ slotKey: "airport_code", type: "airport" }]
  suggestions?: { slotKey: string; type: SuggestionType }[];
}

// AIT-063: determina si un slot es una sugerencia del sistema y de qué tipo.
// Usa el reason y score del slot para distinguir entre inferencia y ambigüedad.
// Llamada desde buildSlotConfirmationMessage y handleSlotConfirmationButton.
export function getSuggestionType(
  slotKey: string,
  slot: { value?: unknown; score?: number; reason?: string; status?: string } | null | undefined,
): SuggestionType | null {
  if (!slot || typeof slot !== "object") return null;

  // AIT-062: border crossing inferido
  if ((slotKey === "origin" || slotKey === "destination") && slot.reason === "inferred_border_crossing") {
    return "border";
  }

  // AIT-061: horario inferido por opening hours
  if (slotKey === "scheduled_at" && slot.reason === "inferred_opening_hours") {
    return "time";
  }

  // AIT-060: airport_code inferido por OI layer (no explícito del usuario)
  if (slotKey === "airport_code" && (slot.score ?? 0) > 0 && slot.reason !== "explicit" && slot.reason !== "user_confirmed") {
    return "airport";
  }

  return null;
}

export function shouldRequestConfirmation(extractionCtx?: ExtractionContext): boolean {
  if (!extractionCtx?.slots) return false;
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const airportCode = extractionCtx.slots.airport_code;
  const originNeedsConfirm = origin?.value != null && (
    origin.status === "CONFIRMATION_PENDING" || origin.status === "INFERRED"
  );
  const destNeedsConfirm = dest?.value != null && (
    dest.status === "CONFIRMATION_PENDING" || dest.status === "INFERRED"
  );
  // AIT-060: airport_code inferido necesita confirmación
  const airportNeedsConfirm = airportCode?.value != null && (
    airportCode.status === "CONFIRMATION_PENDING" || airportCode.status === "INFERRED"
  );
  return originNeedsConfirm || destNeedsConfirm || airportNeedsConfirm;
}

export function buildSlotConfirmationMessage(
  extractionCtx: ExtractionContext,
  lang: Lang,
): SlotConfirmationUI {
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const passengers = extractionCtx.slots.passengers;
  const airportCode = extractionCtx.slots.airport_code;
  const scheduledAt = extractionCtx.slots.scheduled_at;

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

  // AIT-060: Incluir airport_code si está presente (inferido por OI layer)
  if (airportCode?.value != null) {
    const display = `🛩️ ${airportCode.value}`;
    lines.push(
      "",
      t("confirm.airport", lang),
      airportCode.status === "CONFIRMATION_PENDING" || airportCode.status === "INFERRED"
        ? `⚠️ ${display}`
        : display,
    );
  }

  // AIT-061/AIT-063: Incluir scheduled_at si está presente (inferido por horario de atracción)
  if (scheduledAt?.value != null) {
    const display = `🕐 ${scheduledAt.value}`;
    lines.push(
      "",
      t("confirm.time", lang),
      scheduledAt.status === "CONFIRMATION_PENDING" || scheduledAt.status === "INFERRED"
        ? `⚠️ ${display}`
        : display,
    );
    // Si es sugerencia por horario de atracción, agregar texto suggest
    if (scheduledAt.reason === "inferred_opening_hours") {
      lines.push(
        "",
        t("time.suggest", lang, {
          time: String(scheduledAt.value),
          reason: t("time.reasonOpeningHours", lang),
        }),
      );
    }
  }

  lines.push("", t("confirm.ask", lang));

  log.info("[SLOT_CONFIRMATION_UI]", {
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? ["destination"] : []),
      ...(passengers?.status === "CONFIRMATION_PENDING" || passengers?.status === "INFERRED" ? ["passengers"] : []),
      ...(airportCode?.status === "CONFIRMATION_PENDING" || airportCode?.status === "INFERRED" ? ["airport_code"] : []),
      ...(scheduledAt?.status === "CONFIRMATION_PENDING" || scheduledAt?.status === "INFERRED" ? ["scheduled_at"] : []),
    ],
    confidence: extractionCtx.overallConfidence,
    availableActions: ["confirm", "change"],
    nextStep: "user_decision",
    originDisplay,
    destDisplay,
    passengersDisplay: passengers?.value ?? null,
    airportCodeDisplay: airportCode?.value ?? null,
  });

  // AIT-063: detectar sugerencias del sistema usando función compartida
  const suggestions: { slotKey: string; type: SuggestionType }[] = [];
  for (const [key, slot] of Object.entries(extractionCtx.slots)) {
    if (slot?.value != null && (slot.status === "CONFIRMATION_PENDING" || slot.status === "INFERRED")) {
      const st = getSuggestionType(key, slot);
      if (st) suggestions.push({ slotKey: key, type: st });
    }
  }

  return {
    showConfirmation: true,
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? ["destination"] : []),
      ...(passengers?.status === "CONFIRMATION_PENDING" || passengers?.status === "INFERRED" ? ["passengers"] : []),
      ...(airportCode?.status === "CONFIRMATION_PENDING" || airportCode?.status === "INFERRED" ? ["airport_code"] : []),
      ...(scheduledAt?.status === "CONFIRMATION_PENDING" || scheduledAt?.status === "INFERRED" ? ["scheduled_at"] : []),
    ],
    message: lines.join("\n"),
    buttons: [
      { id: "slot_confirm", title: t("confirm.buttonConfirm", lang) },
      { id: "slot_change", title: t("confirm.buttonChange", lang) },
    ],
    suggestions: suggestions.length > 0 ? suggestions : undefined,
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

