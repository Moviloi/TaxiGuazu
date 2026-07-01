// SLOT CONFIRMATION — capa UX de confirmación/corrección de slots.
// Se activa cuando existen slots CONFIRMATION_PENDING.
// Depende de display-name.ts para nombres amigables.

import type { ExtractionContext, Lang } from "./types";
import { log } from "@/lib/utils/logger";

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
  _lang: Lang,
): SlotConfirmationUI {
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const passengers = extractionCtx.slots.passengers;

  const originDisplay = extractionCtx.tariff?.displayOrigin
    ?? (origin?.value != null ? String(origin.value) : "?");
  const destDisplay = extractionCtx.tariff?.displayDestination
    ?? (dest?.value != null ? String(dest.value) : "?");

  const lines: string[] = [
    "Solo para confirmar los datos del viaje:",
    "",
    "📍 *Origen:*",
    origin?.status === "CONFIRMATION_PENDING" || origin?.status === "INFERRED" ? `⚠️ ${originDisplay}` : originDisplay,
    "",
    "📍 *Destino:*",
    dest?.status === "CONFIRMATION_PENDING" || dest?.status === "INFERRED" ? `⚠️ ${destDisplay}` : destDisplay,
  ];

  // P0.10.2: Incluir passengers si está presente
  if (passengers?.value != null) {
    lines.push(
      "",
      "👥 *Pasajeros:*",
      passengers.status === "CONFIRMATION_PENDING" || passengers.status === "INFERRED"
        ? `⚠️ ${passengers.value}`
        : String(passengers.value),
    );
  }

  lines.push("", "¿Está correcto?");

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
      { id: "slot_confirm", title: "✅ Confirmar" },
      { id: "slot_change", title: "✏️ Cambiar" },
    ],
  };
}

export function buildFieldSelector(_lang: Lang): { text: string; prompt: string } {
  return {
    text: "¿Qué querés cambiar? Escribí el origen y destino correctos.",
    prompt: "El usuario debe escribir los datos a corregir en texto libre.",
  };
}

export function buildPlaceOptions(
  canonicalNames: string[],
  slotKey: string,
  lang?: string,
): string {
  if (canonicalNames.length === 0) {
    return "Escribí el lugar exacto.";
  }
  // UX sin números — pregunta contextual
  const label = slotKey === "origin" ? "origen" : "destino";
  const examples = canonicalNames.slice(0, 3).join(", ");
  if (lang === "en") {
    return `Please write the exact ${label} (e.g., ${examples}).`;
  }
  if (lang === "pt") {
    return `Por favor, escreva o ${label} exato (ex: ${examples}).`;
  }
  return `Escribí el ${label} exacto (ej: ${examples}).`;
}

