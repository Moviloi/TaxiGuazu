import { describe, it, expect } from "vitest";
import { buildSlotConfirmationMessage, getSuggestionType } from "@/lib/ai/slot-confirmation";
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

function slot(value: string, status: string, reason = "extracted") {
  return { value, score: 0.6, reason, status };
}

describe("AIT-063 — getSuggestionType unit", () => {
  it("border: origin con reason inferred_border_crossing", () => {
    expect(getSuggestionType("origin", { value: "Aduana Argentina", score: 0.8, reason: "inferred_border_crossing", status: "CONFIRMATION_PENDING" })).toBe("border");
    expect(getSuggestionType("destination", { value: "Aduana Brasil", score: 0.8, reason: "inferred_border_crossing", status: "CONFIRMATION_PENDING" })).toBe("border");
  });

  it("time: scheduled_at con reason inferred_opening_hours", () => {
    expect(getSuggestionType("scheduled_at", { value: "08:00", score: 0.8, reason: "inferred_opening_hours", status: "CONFIRMATION_PENDING" })).toBe("time");
  });

  it("airport: airport_code inferido por score > 0", () => {
    expect(getSuggestionType("airport_code", { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" })).toBe("airport");
  });

  it("airport: airport_code explícito NO es sugerencia", () => {
    expect(getSuggestionType("airport_code", { value: "IGR", score: 1.0, reason: "explicit", status: "CONFIRMED" })).toBeNull();
    expect(getSuggestionType("airport_code", { value: "IGR", score: 1.0, reason: "user_confirmed", status: "CONFIRMED" })).toBeNull();
  });

  it("null: origin con reason ambiguous_term", () => {
    expect(getSuggestionType("origin", { value: "centro", score: 0.6, reason: "ambiguous_term", status: "CONFIRMATION_PENDING" })).toBeNull();
  });

  it("null: destination con reason unknown_location", () => {
    expect(getSuggestionType("destination", { value: "???", score: 0.2, reason: "unknown_location", status: "CONFIRMATION_PENDING" })).toBeNull();
  });

  it("null: slot null o undefined", () => {
    expect(getSuggestionType("origin", null)).toBeNull();
    expect(getSuggestionType("origin", undefined)).toBeNull();
  });
});

describe("AIT-063 — no-regresión: suggestionType NO afecta slots ambiguos normales", () => {

  it("T1: origin + destination ambiguos NORMALES → suggestions es undefined", () => {
    const extractionCtx = ctx({
      origin: slot("centro", "CONFIRMATION_PENDING", "ambiguous_term"),
      destination: slot("hotel", "CONFIRMATION_PENDING", "ambiguous_term"),
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toBeUndefined();
    expect(ui.pendingSlots).toContain("origin");
    expect(ui.pendingSlots).toContain("destination");
    expect(ui.buttons).toHaveLength(2);
  });

  it("T2: destination reason unknown_location → suggestions es undefined", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED", "user_confirmed"),
      destination: slot("???", "CONFIRMATION_PENDING", "unknown_location"),
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toBeUndefined();
    expect(ui.message).toContain("⚠️");
    expect(ui.buttons).toHaveLength(2);
  });

  it("T3: solo passengers INFERRED → suggestions es undefined", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      passengers: { value: 2, score: 0.6, reason: "ambiguous_term", status: "INFERRED" },
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toBeUndefined();
  });

  it("T4: airport_code inferido → suggestions tiene airport", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      airport_code: { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" },
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toEqual([
      { slotKey: "airport_code", type: "airport" },
    ]);
    expect(ui.pendingSlots).toContain("airport_code");
  });

  it("T5: border crossing inferido → suggestions tiene border", () => {
    const extractionCtx = ctx({
      origin: slot("Aduana Argentina", "CONFIRMATION_PENDING", "inferred_border_crossing"),
      destination: slot("Centro", "CONFIRMED"),
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toEqual([
      { slotKey: "origin", type: "border" },
    ]);
  });

  it("T6: scheduled_at inferido por opening hours → suggestions tiene time + mensaje suggest", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Cataratas", "CONFIRMED"),
      scheduled_at: { value: "08:00", score: 0.8, reason: "inferred_opening_hours", status: "CONFIRMATION_PENDING" },
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toEqual([
      { slotKey: "scheduled_at", type: "time" },
    ]);
    expect(ui.message).toContain("🕐");
    expect(ui.message).toContain("¿Salimos a las");
    expect(ui.pendingSlots).toContain("scheduled_at");
  });
});
