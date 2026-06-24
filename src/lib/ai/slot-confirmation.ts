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
  const originPending = origin?.status === "CONFIRMATION_PENDING" && origin?.value != null;
  const destPending = dest?.status === "CONFIRMATION_PENDING" && dest?.value != null;
  return originPending || destPending;
}

export function buildSlotConfirmationMessage(
  extractionCtx: ExtractionContext,
  _lang: Lang,
): SlotConfirmationUI {
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;

  const originDisplay = extractionCtx.tariff?.displayOrigin
    ?? (origin?.value != null ? String(origin.value) : "?");
  const destDisplay = extractionCtx.tariff?.displayDestination
    ?? (dest?.value != null ? String(dest.value) : "?");

  const lines: string[] = [
    "Solo para confirmar los datos del viaje:",
    "",
    "📍 *Origen:*",
    origin?.status === "CONFIRMATION_PENDING" ? `⚠️ ${originDisplay}` : originDisplay,
    "",
    "📍 *Destino:*",
    dest?.status === "CONFIRMATION_PENDING" ? `⚠️ ${destDisplay}` : destDisplay,
    "",
    "¿Está correcto?",
  ];

  log.info("[SLOT_CONFIRMATION_UI]", {
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" ? ["destination"] : []),
    ],
    confidence: extractionCtx.overallConfidence,
    availableActions: ["confirm", "change"],
    nextStep: "user_decision",
    originDisplay,
    destDisplay,
  });

  return {
    showConfirmation: true,
    pendingSlots: [
      ...(origin?.status === "CONFIRMATION_PENDING" ? ["origin"] : []),
      ...(dest?.status === "CONFIRMATION_PENDING" ? ["destination"] : []),
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
    text: "¿Qué dato querés cambiar?\n\n1. Origen\n2. Destino\n3. Pasajeros\n4. Fecha/Hora",
    prompt: "Respondé con el número o nombre del campo que querés corregir.",
  };
}

export function buildPlaceOptions(
  canonicalNames: string[],
  slotKey: string,
  _lang: Lang,
): string {
  if (canonicalNames.length === 0) {
    return "No encontré opciones. Escribí el lugar exacto.";
  }
  const header = slotKey === "origin" ? "Elegí el origen:" : "Elegí el destino:";
  const options = canonicalNames.map((name, i) => `${i + 1}. ${name}`);
  return [header, ...options, `${canonicalNames.length + 1}. Otro lugar`].join("\n");
}

export function applyConfirmation(
  slots: Record<string, { value: unknown; score: number; reason: string; source?: string; status?: string }>,
): Record<string, { value: unknown; score: number; reason: string; source?: string; status?: string }> {
  const result = { ...slots };
  for (const [k, v] of Object.entries(result)) {
    if (v?.status === "CONFIRMATION_PENDING") {
      result[k] = {
        ...v,
        score: 1.0,
        reason: "user_confirmed",
        source: "USER_CONFIRMED",
        status: "CONFIRMED",
      };
    }
  }
  log.info("[USER_SLOT_CONFIRM]", {
    action: "confirm",
    confirmedSlots: Object.entries(slots)
      .filter(([, v]) => (v as any)?.status === "CONFIRMATION_PENDING")
      .map(([k]) => k),
    correctedSlots: [],
  });
  return result;
}
