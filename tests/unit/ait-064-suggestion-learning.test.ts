import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSlotConfirmationMessage, getSuggestionType } from "@/lib/ai/slot-confirmation";
import type { ExtractionContext } from "@/lib/ai/types";
import {
  MIN_EVENTS_THRESHOLD,
  ENABLE_THRESHOLD,
  DISABLE_THRESHOLD,
  SUGGESTION_TYPES,
} from "@/lib/services/learning/suggestion-recalculator";

// ─── Helpers ───

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

// ======================================================================
// PUNTO 2: Default enabled — sin ninguna key en learning_weights,
// las 3 inferencias siguen funcionando exactamente como en AIT-060/061/062.
// ======================================================================

describe("AIT-064 — Punto 2: default enabled (sin registro en learning_weights)", () => {

  it("buildSlotConfirmationMessage con enabledSuggestionTypes=Set(['airport','time','border']) → todas las sugerencias aparecen", () => {
    const extractionCtx = ctx({
      origin: slot("Aduana Argentina", "CONFIRMATION_PENDING", "inferred_border_crossing"),
      destination: slot("Centro", "CONFIRMED"),
      airport_code: { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" },
      scheduled_at: { value: "08:00", score: 0.8, reason: "inferred_opening_hours", status: "CONFIRMATION_PENDING" },
    });

    // Simula el estado real: todas las sugerencias habilitadas
    const allTypes = new Set(["airport", "time", "border"]);
    const ui = buildSlotConfirmationMessage(extractionCtx, "es", allTypes);

    expect(ui.suggestions).toBeDefined();
    expect(ui.suggestions).toContainEqual({ slotKey: "origin", type: "border" });
    expect(ui.suggestions).toContainEqual({ slotKey: "airport_code", type: "airport" });
    expect(ui.suggestions).toContainEqual({ slotKey: "scheduled_at", type: "time" });
    expect(ui.suggestions).toHaveLength(3);
  });

  it("buildSlotConfirmationMessage sin enabledSuggestionTypes (undefined) → comportamiento idéntico a pre-AIT-064", () => {
    const extractionCtx = ctx({
      origin: slot("Aduana Argentina", "CONFIRMATION_PENDING", "inferred_border_crossing"),
      destination: slot("Centro", "CONFIRMED"),
      airport_code: { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" },
      scheduled_at: { value: "08:00", score: 0.8, reason: "inferred_opening_hours", status: "CONFIRMATION_PENDING" },
    });

    // Sin parámetro = undefined = todas habilitadas (backward compat)
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toBeDefined();
    expect(ui.suggestions).toHaveLength(3);
  });

  it("buildSlotConfirmationMessage con set vacío → no hay sugerencias aunque los slots las califiquen", () => {
    const extractionCtx = ctx({
      origin: slot("Aduana Argentina", "CONFIRMATION_PENDING", "inferred_border_crossing"),
      destination: slot("Centro", "CONFIRMED"),
    });

    const empty = new Set<string>();
    const ui = buildSlotConfirmationMessage(extractionCtx, "es", empty);

    // border suggestion exists but disabled → not in suggestions
    expect(ui.suggestions).toBeUndefined();
    // pendingSlots sigue apareciendo porque es sobre slots, no sugerencias
    expect(ui.pendingSlots).toContain("origin");
  });
});

// ======================================================================
// PUNTO 1: Test crítico — con <30 eventos, el cron NUNCA llama a setSuggestionEnabled
// ======================================================================

describe("AIT-064 — Punto 1: cron no modifica estado con < 30 eventos", () => {

  it("recalculateSuggestions con 0 eventos → action=no_change_insufficient_data para todos los tipos", async () => {
    // Mock getSuggestionAcceptanceRates para que devuelva vacío (0 eventos)
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");

    // Mock isSuggestionEnabled para que devuelva true (default)
    const db = await import("@/lib/db/database");
    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(true);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue([]);

    const results = await recalculateSuggestions();

    // Verificar: todas las acciones son "no_change_insufficient_data"
    for (const r of results) {
      expect(r.action).toBe("no_change_insufficient_data");
      expect(r.newEnabled).toBe(r.previousEnabled); // nunca cambia
    }

    // Verificar: setSuggestionEnabled NO fue llamado
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("recalculateSuggestions con 29 eventos y 100% aceptación → sigue siendo insufficient_data, no cambia", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    // 29 eventos, 100% aceptados → pero < 30, no debe cambiar
    const rates = [{
      type: "airport",
      total: 29,
      accepted: 29,
      acceptanceRate: 100.0,
    }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(false);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();

    const airport = results.find(r => r.type === "airport");
    expect(airport).toBeDefined();
    expect(airport!.action).toBe("no_change_insufficient_data");
    expect(airport!.newEnabled).toBe(airport!.previousEnabled); // false → false, no cambió

    // Ni siquiera con 100% acceptance rate y 29 eventos se debe activar
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("recalculateSuggestions con 29 eventos y 0% aceptación → sigue siendo insufficient_data, no cambia", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [{
      type: "border",
      total: 29,
      accepted: 0,
      acceptanceRate: 0.0,
    }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(true);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();

    const border = results.find(r => r.type === "border");
    expect(border).toBeDefined();
    expect(border!.action).toBe("no_change_insufficient_data");
    expect(border!.newEnabled).toBe(border!.previousEnabled); // true → true, no cambió
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("recalculateSuggestions mezcla tipos: uno con datos suficientes sí cambia, otro con <30 no", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [
      { type: "airport", total: 50, accepted: 40, acceptanceRate: 80.0 },  // >= 30, >= 60%
      { type: "border", total: 5, accepted: 0, acceptanceRate: 0.0 },       // < 30
    ];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled")
      .mockImplementation(async (type: string) => {
        // airport empieza deshabilitado, border empieza habilitado
        if (type === "airport") return false;
        return true;
      });
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();

    const airport = results.find(r => r.type === "airport");
    const border = results.find(r => r.type === "border");
    const time = results.find(r => r.type === "time");

    // airport: 80% >= 60%, estaba disabled → enabled
    expect(airport!.action).toBe("enabled");
    expect(airport!.newEnabled).toBe(true);
    expect(setEnabledSpy).toHaveBeenCalledWith("airport", true);

    // border: 5 < 30 → no change
    expect(border!.action).toBe("no_change_insufficient_data");
    expect(border!.newEnabled).toBe(true); // se mantuvo como estaba

    // time: sin datos → no change
    expect(time!.action).toBe("no_change_insufficient_data");

    // setEnabled solo se llamó UNA vez (para airport)
    expect(setEnabledSpy).toHaveBeenCalledTimes(1);

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });
});

// ======================================================================
// Histéresis completa
// ======================================================================

describe("AIT-064 — histéresis del cron", () => {

  it("tasa >= 60% y deshabilitado → habilita", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [{ type: "airport", total: 30, accepted: 18, acceptanceRate: 60.0 }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(false);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();
    const airport = results.find(r => r.type === "airport");

    expect(airport!.action).toBe("enabled");
    expect(setEnabledSpy).toHaveBeenCalledWith("airport", true);

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("tasa < 50% y habilitado → deshabilita", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [{ type: "time", total: 30, accepted: 14, acceptanceRate: 46.7 }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(true);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();
    const time = results.find(r => r.type === "time");

    expect(time!.action).toBe("disabled");
    expect(setEnabledSpy).toHaveBeenCalledWith("time", false);

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("tasa en zona gris (50-60%) → no cambia", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    // 55% está en la zona gris
    const rates = [{ type: "border", total: 30, accepted: 16, acceptanceRate: 55.0 }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(false);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();
    const border = results.find(r => r.type === "border");

    expect(border!.action).toBe("no_change_grey_zone");
    expect(border!.newEnabled).toBe(false); // se mantuvo deshabilitado
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("tasa >= 60% pero ya habilitado → no cambia (already correct)", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [{ type: "airport", total: 30, accepted: 30, acceptanceRate: 100.0 }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(true);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();
    const airport = results.find(r => r.type === "airport");

    expect(airport!.action).toBe("no_change_already_correct");
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });

  it("tasa < 50% pero ya deshabilitado → no cambia (already correct)", async () => {
    const { recalculateSuggestions } = await import("@/lib/services/learning/suggestion-recalculator");
    const db = await import("@/lib/db/database");

    const rates = [{ type: "time", total: 30, accepted: 9, acceptanceRate: 30.0 }];

    const isEnabledSpy = vi.spyOn(db, "isSuggestionEnabled").mockResolvedValue(false);
    const setEnabledSpy = vi.spyOn(db, "setSuggestionEnabled").mockResolvedValue(undefined);
    const getRatesSpy = vi.spyOn(db, "getSuggestionAcceptanceRates").mockResolvedValue(rates);

    const results = await recalculateSuggestions();
    const time = results.find(r => r.type === "time");

    expect(time!.action).toBe("no_change_already_correct");
    expect(setEnabledSpy).not.toHaveBeenCalled();

    isEnabledSpy.mockRestore();
    setEnabledSpy.mockRestore();
    getRatesSpy.mockRestore();
  });
});

// ======================================================================
// Constantes del diseño (protección contra cambios accidentales)
// ======================================================================

describe("AIT-064 — constantes de diseño", () => {
  it("MIN_EVENTS_THRESHOLD debe ser 30 (Ley de Grandes Números)", () => {
    expect(MIN_EVENTS_THRESHOLD).toBe(30);
  });

  it("ENABLE_THRESHOLD debe ser 60 (evidencia clara de mejora)", () => {
    expect(ENABLE_THRESHOLD).toBe(60);
  });

  it("DISABLE_THRESHOLD debe ser 50 (solo cuando es claramente perjudicial)", () => {
    expect(DISABLE_THRESHOLD).toBe(50);
  });

  it("SUGGESTION_TYPES debe ser airport, time, border", () => {
    expect(SUGGESTION_TYPES).toEqual(["airport", "time", "border"]);
  });
});

// ======================================================================
// Integración con buildSlotConfirmationMessage — AIT-063 no se rompe
// ======================================================================

describe("AIT-064 — no-regresión: buildSlotConfirmationMessage sin enabledSuggestionTypes", () => {
  it("T1: origin + destination ambiguos NORMALES → suggestions es undefined (mismo que AIT-063)", () => {
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

  it("T2: airport_code inferido sin filtro → suggestions tiene airport (mismo que AIT-063)", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      airport_code: { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" },
    });
    const ui = buildSlotConfirmationMessage(extractionCtx, "es");

    expect(ui.suggestions).toEqual([
      { slotKey: "airport_code", type: "airport" },
    ]);
  });

  it("T3: airport_code inferido + filtro sin 'airport' → NO aparece en suggestions", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      airport_code: { value: "IGR", score: 0.7, reason: "inferred", status: "CONFIRMATION_PENDING" },
    });
    const filtered = new Set(["time", "border"]);
    const ui = buildSlotConfirmationMessage(extractionCtx, "es", filtered);

    expect(ui.suggestions).toBeUndefined();
  });

  it("T4: scheduled_at inferido + filtro 'time' → aparece en suggestions", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Cataratas", "CONFIRMED"),
      scheduled_at: { value: "08:00", score: 0.8, reason: "inferred_opening_hours", status: "CONFIRMATION_PENDING" },
    });
    const filtered = new Set(["time"]);
    const ui = buildSlotConfirmationMessage(extractionCtx, "es", filtered);

    expect(ui.suggestions).toEqual([
      { slotKey: "scheduled_at", type: "time" },
    ]);
    expect(ui.message).toContain("🕐");
    expect(ui.message).toContain("¿Salimos a las");
  });
});

// ======================================================================
// isSuggestionEnabled comportamiento con DB
// ======================================================================

describe("AIT-064 — isSuggestionEnabled con learning_weights real", () => {
  it("sin registro en learning_weights → isSuggestionEnabled devuelve true", async () => {
    // Usamos la DB real (vacía o con datos, sin registro suggestion_enabled:*)
    const { isSuggestionEnabled: check } = await import("@/lib/db/database");

    // Estos tipos nunca fueron seteados → deben devolver true
    const airport = await check("airport");
    const time = await check("time");
    const border = await check("border");

    expect(airport).toBe(true);
    expect(time).toBe(true);
    expect(border).toBe(true);
  });
});
