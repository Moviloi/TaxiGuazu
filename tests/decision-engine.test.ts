import { describe, it, expect } from "vitest";
import { handleMessage } from "../src/lib/ai/handler";
import type { HandlerContext } from "../src/lib/ai/types";

function makeCtx(overrides: Partial<HandlerContext> = {}): HandlerContext {
  return {
    lang: "es",
    ...overrides,
  };
}

// Helper: slot shorthand para tests.
function slot(v: string): { value: string; score: number; reason: string } {
  return { value: v, score: 1, reason: "test" };
}

describe("handler → policy (replaces old resolveDecision)", () => {
  it("COMMERCIAL + tariff matched → price info response", () => {
    const result = handleMessage("cuánto cuesta ir al centro", "RESERVA", makeCtx({
      extraction: {
        slots: { destination: slot("Centro") },
        tariff: { matched: true, price: 12000, canonicalOrigin: "Aeropuerto IGR", canonicalDestination: "Centro" },
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
        overallConfidence: 0.9,
      },
    }));
    expect(result.policy.finalResponse).toContain("$");
    expect(result.policy.finalResponse).toContain("12000");
    expect(result.policy.finalResponse).toContain("Centro");
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("affirmation 'sí' → policy response (not empty)", () => {
    const result = handleMessage("sí", "RESERVA", makeCtx({
      extraction: {
        slots: { origin: slot("IGR"), destination: slot("Centro") },
        conversationalState: "awaiting_confirmation",
        clarifyField: null,
        askForConfirmation: false,
        overallConfidence: 0.9,
      },
    }));
    expect(result.policy.finalResponse).toBeTruthy();
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("short ambiguous text 'del aeropuerto' → SAFE_FALLBACK (core can't parse standalone)", () => {
    const result = handleMessage("del aeropuerto", "RESERVA", makeCtx({ lang: "es" }));
    expect(result.policy.decision).toBe("SAFE_FALLBACK");
    expect(result.policy.finalResponse).toBeTruthy();
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("PT text → SAFE_FALLBACK (core only supports Spanish)", () => {
    const result = handleMessage("para o centro", "RESERVA", makeCtx({ lang: "pt" }));
    expect(result.policy.decision).toBe("SAFE_FALLBACK");
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("low core confidence → SAFE_FALLBACK", () => {
    const result = handleMessage("xyzzy flurbo garblex", "RESERVA", makeCtx());
    expect(result.policy.decision).toBe("SAFE_FALLBACK");
    expect(result.policy.finalResponse).toBeTruthy();
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("stable origin+dest, missing datetime → acknowledge + request time", () => {
    const result = handleMessage("IGR a Amerian", "RESERVA", makeCtx({
      extraction: {
        slots: {
          origin: { value: "IGR", score: 1, reason: "core_role_lock" },
          destination: { value: "Amerian", score: 1, reason: "core_role_lock" },
        },
        conversationalState: "collecting_slots",
        clarifyField: "scheduled_at",
        askForConfirmation: false,
        overallConfidence: 0.9,
      },
    }));
    expect(result.policy.finalResponse).toContain("IGR");
    expect(result.policy.finalResponse).toContain("Amerian");
    expect(result.policy.nextExpectedFields).toContain("scheduled_at");
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("all slots + tariff matched → confirmation message with pricing", () => {
    const result = handleMessage("IGR a Amerian mañana a las 10", "RESERVA", makeCtx({
      extraction: {
        slots: {
          origin: { value: "IGR", score: 1, reason: "locked" },
          destination: { value: "Amerian", score: 1, reason: "locked" },
          passengers: { value: 2, score: 1, reason: "explicit" },
          scheduled_at: { value: "2026-06-13T10:00:00.000Z", score: 1, reason: "explicit" },
        },
        tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Amerian" },
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: true,
        overallConfidence: 0.9,
      },
    }));
    expect(result.policy.finalResponse).toContain("IGR");
    expect(result.policy.finalResponse).toContain("Amerian");
    expect(result.policy.finalResponse).toContain("15000");
    expect(result.policy.finalResponse).toContain("Confirm");
    expect(result.policy.needsGeo).toBe(true);
    expect(result.policy.needsSaveContext).toBe(true);
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("PT text with rich extraction → SAFE_FALLBACK (core doesn't parse Portuguese)", () => {
    const result = handleMessage("IGR para Amerian amanhã às 10", "RESERVA", makeCtx({
      lang: "pt",
      extraction: {
        slots: {
          origin: { value: "IGR", score: 1, reason: "locked" },
          destination: { value: "Amerian", score: 1, reason: "locked" },
          passengers: { value: 1, score: 1, reason: "explicit" },
          scheduled_at: { value: "2026-06-13T10:00:00.000Z", score: 1, reason: "explicit" },
        },
        tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Amerian" },
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: true,
        overallConfidence: 0.9,
      },
    }));
    // Core doesn't parse PT → SAFE_FALLBACK; policy never reaches PT branch.
    expect(result.policy.decision).toBe("SAFE_FALLBACK");
    expect(result.policy.finalResponse).toBeTruthy();
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("EMERGENCY lateral → emergency response + admin notify flag", () => {
    const result = handleMessage("emergencia necesito ayuda urgente", "RESERVA", makeCtx({
      extraction: {
        slots: {},
        overallConfidence: 0.9,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    }));
    expect(result.policy.finalResponse).toBeTruthy();
    expect(result.policy.needsAdminNotify).toBe(true);
    expect(result.policy.adminNotifyBody).toContain("EMERGENCIA");
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("RESCHEDULE lateral → reschedule response + admin notify flag", () => {
    const result = handleMessage("necesito reprogramar mi viaje", "RESERVA", makeCtx({
      extraction: {
        slots: {},
        overallConfidence: 0.9,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    }));
    expect(result.policy.finalResponse).toContain("reprogramar");
    expect(result.policy.needsAdminNotify).toBe(true);
    expect(result.policy.adminNotifyBody).toContain("REPROGRAMACIÓN");
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("POST_SERVICE lateral → post-service response, no admin notify", () => {
    const result = handleMessage("gracias por el viaje", "RESERVA", makeCtx({
      extraction: {
        slots: {},
        overallConfidence: 0.9,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    }));
    expect(result.policy.finalResponse).toMatch(/gracias/i);
    expect(result.policy.needsAdminNotify).toBeFalsy();
    expect(result.policy.outputSource).toBe("POLICY");
  });

  it("tariff unmatched → no-tariff confirmation", () => {
    const result = handleMessage("IGR a Amerian", "RESERVA", makeCtx({
      extraction: {
        slots: {
          origin: slot("IGR"),
          destination: slot("UnknownLocation"),
        },
        conversationalState: "awaiting_confirmation",
        clarifyField: null,
        askForConfirmation: false,
        overallConfidence: 0.8,
      },
    }));
    expect(result.policy.finalResponse).toContain("tarifa");
    expect(result.policy.nextExpectedFields).toContain("affirmation");
    expect(result.policy.outputSource).toBe("POLICY");
  });
});
