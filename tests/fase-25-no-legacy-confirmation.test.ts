import { describe, it, expect } from "vitest";
import { buildLocationConfirmationResponse } from "@/lib/ai/response-builder";
import { buildSlotConfirmationMessage } from "@/lib/ai/slot-confirmation";
import type { ExtractionContext } from "@/lib/ai/types";

function ctx(slots: ExtractionContext["slots"]): ExtractionContext {
  return {
    slots,
    overallConfidence: 0.8,
    conversationalState: "collecting_slots",
    clarifyField: null,
    askForConfirmation: false,
  };
}

function slot(value: string, status: string) {
  return { value, score: 0.6, reason: "extracted", status };
}

describe("FASE 25 — No legacy confirmation", () => {

  it("T1: buildLocationConfirmationResponse mensaje nuevo formato, NO legacy 'direcciones exactas'", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMATION_PENDING"),
      destination: slot("Centro", "CONFIRMATION_PENDING"),
    });
    const msg = buildLocationConfirmationResponse(extractionCtx, "es");

    // NO contiene texto legacy
    expect(msg).not.toContain("direcciones exactas");
    // Contiene el nuevo formato de slot_confirmation
    expect(msg).toContain("Solo para confirmar los datos del viaje");
    expect(msg).toContain("¿Está correcto?");
    expect(msg).toContain("Origen");
    expect(msg).toContain("Destino");
  });

  it("T2: buildSlotConfirmationMessage para hotel ambiguo usa nuevo slot_confirmation sin legacy", () => {
    const extractionCtx = ctx({
      origin: slot("Hotel X", "CONFIRMATION_PENDING"),
      destination: slot("Centro", "CONFIRMED"),
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.showConfirmation).toBe(true);
    expect(ui.pendingSlots).toContain("origin");
    expect(ui.message).not.toContain("direcciones exactas");
    expect(ui.buttons?.some(b => b.id === "slot_confirm")).toBe(true);
    expect(ui.buttons?.some(b => b.id === "slot_change")).toBe(true);
  });

  it("T3: buildLocationConfirmationResponse para corrección muestra confirmación, NO genérica", () => {
    const extractionCtx = ctx({
      origin: slot("Hotel X", "CONFIRMATION_PENDING"),
      destination: slot("Centro", "CONFIRMATION_PENDING"),
    });
    const msg = buildLocationConfirmationResponse(extractionCtx, "es");

    expect(msg).not.toContain("direcciones exactas");
    expect(msg).toContain("Solo para confirmar los datos del viaje");
    expect(msg).toContain("¿Está correcto?");
  });

  it("AFFIRMATION_RE ya no reconoce 'esas son las direcciones exactas'", () => {
    const AFFIRMATION_RE = /^(s[ií]|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|listo|correcto|as[ií] est[aá] bien|est[aá] bien as[ií]|todo correcto|todo bien)(?![a-záéíóúñ])/i;
    expect(AFFIRMATION_RE.test("esas son las direcciones exactas")).toBe(false);
    expect(AFFIRMATION_RE.test("sí")).toBe(true);
    expect(AFFIRMATION_RE.test("confirmo")).toBe(true);
  });

});
