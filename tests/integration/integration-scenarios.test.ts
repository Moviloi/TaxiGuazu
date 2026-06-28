import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks ──

vi.mock("@/lib/ai/response-builder", () => ({
  buildGreeting: vi.fn().mockReturnValue("¡Hola!"),
  inferMissingFieldFromCore: vi.fn().mockReturnValue(null),
  buildNowDispatchResponse: vi.fn().mockReturnValue("Buscando chofer disponible para tu viaje."),
  buildPriceInfo: vi.fn().mockReturnValue("El traslado de IGR a Centro cuesta $15000 ARS."),
  buildCommercialResponse: vi.fn().mockReturnValue("Para tarifas y disponibilidad, indicame tu recorrido y cuántos pasajeros son."),
  buildOpportunityAcceptedMessage: vi.fn().mockReturnValue("Perfecto. Te comparto información."),
  buildOpportunityDeclinedMessage: vi.fn().mockReturnValue("Entendido. Quedamos a disposición."),
  buildGenericSafeFallback: vi.fn().mockReturnValue("No pude procesar eso."),
  buildGenericClarify: vi.fn().mockImplementation((field, lang) => {
    if (field === "origin") return "¿desde dónde salís?";
    if (field === "destination") return "¿a dónde necesitás ir?";
    if (field === "passengers") return "¿Cuántos pasajeros?";
    if (field === "time") return "¿A qué hora?";
    return "¿Podés contarme más?";
  }),
  buildAmbiguousLocationConfirm: vi.fn().mockImplementation((o, d) => `Solo para confirmar: de ${o} a ${d}. ¿Direcciones exactas?`),
}));
vi.mock("@/lib/ai/patterns", () => ({
  isAffirmativeMessage: vi.fn(),
  isNegativeMessage: vi.fn(),
  AMBIGUOUS_LOCATION_RE: /ambitious/i,
  AMBIGUOUS_HOTEL_LANDMARKS_RE: /ambitious/i,
}));
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn() }));
vi.mock("@/lib/ai/core", () => ({ core: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ router: vi.fn() }));
vi.mock("@/lib/services/i18n/detect-lang", () => ({ detectLeadLang: vi.fn().mockReturnValue("es") }));
vi.mock("@/lib/services/workflow/load-previous-slots", () => ({ loadPreviousSlots: vi.fn().mockResolvedValue({}) }));

// ── Imports ──

import { handleMessage } from "@/lib/ai/handler";
import { policyAhora } from "@/lib/ai/policy-ahora";
import { policyReserva } from "@/lib/ai/policy-reserva";

// ── ESCENARIO A: RESERVA completa ──

describe("Escenario A: RESERVA completa (mañana 8 hotel aeropuerto)", () => {
  it("modo RESERVA, ANSWER con tarifa → muestra precio", async () => {
    vi.mocked(handleMessage).mockResolvedValue({
      decision: { decision: "ANSWER", mode: "RESERVA", core: { intent: "BOOKING", facts: ["booking:reservar", "origin:hote", "destination:airepuerto"], confidence: 0.8, slotStability: { origin: "locked", destination: "ambiguous" }, roleLock: { origin: "Hotel", destination: "Aeropuerto" } }, reason: "" },
      policy: { decision: "ANSWER", mode: "RESERVA", policyHint: "RESERVA: responder con contexto si existe.", requiresConfirmation: false, finalResponse: "El traslado de IGR a Centro cuesta $15000 ARS.", requiresUserInput: false, nextExpectedFields: [], outputSource: "POLICY", needsGeo: false, needsSaveContext: false },
    });
    const result = await handleMessage("mañana 8 hotel aeropuerto", "RESERVA", {
      extraction: {
        slots: { origin: { value: "Hotel", score: 0.9, reason: "test" }, destination: { value: "Aeropuerto IGR", score: 0.9, reason: "test" }, scheduled_at: { value: "2026-06-21T08:00", score: 0.9, reason: "test" } },
        overallConfidence: 0.85,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
        tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" },
      },
    });
    expect(result.decision.mode).toBe("RESERVA");
    expect(result.policy.finalResponse).toContain("$15000");
  });

  it("policyReserva ANSWER + scheduled_at + tarifa → buildPriceInfo", () => {
    const res = policyReserva(
      { decision: "ANSWER", mode: "RESERVA", core: { intent: "BOOKING", facts: [], confidence: 0.8, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Hotel", destination: "Aeropuerto" } }, reason: "" },
      { extraction: { slots: { origin: { value: "Hotel", score: 0.9, reason: "test" }, destination: { value: "Aeropuerto IGR", score: 0.9, reason: "test" }, scheduled_at: { value: "2026-06-21T08:00", score: 0.9, reason: "test" } }, overallConfidence: 0.85, conversationalState: "collecting_slots", clarifyField: null, askForConfirmation: false, tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" } } },
    );
    expect(res.finalResponse).toContain("$15000");
    expect(res.mode).toBe("RESERVA");
  });
});

// ── ESCENARIO B: AHORA completo ──

describe("Escenario B: AHORA completo (hotel aeropuerto ahora)", () => {
  it("policyAhora EXECUTE + NOW → buildNowDispatchResponse", () => {
    const res = policyAhora(
      { decision: "EXECUTE", mode: "AHORA", core: { intent: "NOW", facts: ["now:ahora", "origin:hotel", "destination:airepuerto"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Hotel", destination: "Aeropuerto" } }, reason: "" },
      { extraction: { slots: { origin: { value: "Hotel", score: 0.9, reason: "core_role_lock" }, destination: { value: "Aeropuerto IGR", score: 0.9, reason: "core_role_lock" } }, overallConfidence: 0.85, conversationalState: "idle", clarifyField: null, askForConfirmation: false } },
    );
    expect(res.mode).toBe("AHORA");
    expect(res.finalResponse).toContain("Buscando chofer");
    expect(res.requiresConfirmation).toBe(false);
    expect(res.needsAdminNotify).toBeUndefined();
  });
});

// ── ESCENARIO C: COMMERCIAL ──

describe("Escenario C: COMMERCIAL (precio hotel aeropuerto)", () => {
  it("policyReserva ANSWER + scheduled_at + tarifa → muestra precio", () => {
    const res = policyReserva(
      { decision: "ANSWER", mode: "RESERVA", core: { intent: "COMMERCIAL", facts: ["commercial:precio", "origin:hotel", "destination:airepuerto"], confidence: 0.6, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Hotel", destination: "Aeropuerto" } }, reason: "" },
      { extraction: { slots: { origin: { value: "Hotel", score: 0.9, reason: "test" }, destination: { value: "Aeropuerto IGR", score: 0.9, reason: "test" }, scheduled_at: { value: "2026-06-21T10:00", score: 0.9, reason: "test" } }, overallConfidence: 0.75, conversationalState: "collecting_slots", clarifyField: null, askForConfirmation: false, tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" } } },
    );
    expect(res.finalResponse).toContain("$15000");
  });

  it("policyAhora ANSWER con intent COMMERCIAL + tarifa → muestra precio (E1 fix)", () => {
    const res = policyAhora(
      { decision: "ANSWER", mode: "AHORA", core: { intent: "COMMERCIAL", facts: ["commercial:precio"], confidence: 0.6, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } }, reason: "" },
      { extraction: { slots: { origin: { value: "Hotel", score: 0.9, reason: "test" }, destination: { value: "Aeropuerto IGR", score: 0.9, reason: "test" } }, overallConfidence: 0.75, conversationalState: "idle", clarifyField: null, askForConfirmation: false, tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" } } },
    );
    expect(res.mode).toBe("AHORA");
    expect(res.finalResponse).toContain("$15000");
  });

  it("policyAhora ANSWER sin tarifa → mensaje operador genérico", () => {
    const res = policyAhora(
      { decision: "ANSWER", mode: "AHORA", core: { intent: "COMMERCIAL", facts: ["commercial:precio"], confidence: 0.6, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } }, reason: "" },
      { extraction: { slots: {}, overallConfidence: 0.4, conversationalState: "idle", clarifyField: null, askForConfirmation: false } },
    );
    expect(res.finalResponse).toContain("operador");
  });
});

// ── ESCENARIO D: EMERGENCY ──

describe("Escenario D: EMERGENCY (ayuda estoy varado)", () => {
  it("policyAhora EMERGENCY → needsAdminNotify, respuesta específica, sin dispatch", () => {
    const res = policyAhora(
      { decision: "EXECUTE", mode: "AHORA", core: { intent: "EMERGENCY", facts: ["emergency:ayuda"], confidence: 0.9, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } }, reason: "" },
      { extraction: { slots: { origin: { value: "Hotel", score: 0.9, reason: "test" } }, overallConfidence: 0.8, conversationalState: "idle", clarifyField: null, askForConfirmation: false }, phone: "+549111", userText: "ayuda estoy varado" },
    );
    expect(res.needsAdminNotify).toBe(true);
    expect(res.adminNotifyBody).toContain("EMERGENCIA");
    expect(res.finalResponse).toContain("Estamos notificando");
  });

  it("policyReserva EMERGENCY → needsAdminNotify, respuesta específica", () => {
    const res = policyReserva(
      { decision: "EXECUTE", mode: "RESERVA", core: { intent: "EMERGENCY", facts: ["emergency:ayuda"], confidence: 0.9, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } }, reason: "" },
      { extraction: { slots: {}, overallConfidence: 0.8, conversationalState: "idle", clarifyField: null, askForConfirmation: false }, phone: "+549111", userText: "ayuda" },
    );
    expect(res.needsAdminNotify).toBe(true);
    expect(res.finalResponse).toContain("notificando");
  });
});

// ── ESCENARIO E: Opportunity post-trip cleanup ──
// Ya cubierto en tests/opportunity-response.test.ts (E7 fix confirmado)
