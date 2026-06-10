import { describe, it, expect } from "vitest";
import { resolveDecision } from "../src/lib/services/semanticCoreEngine";

function makePricing(price = 15000, origin = "Aeropuerto IGR", dest = "Centro") {
  return {
    final_price: price,
    base_price: price,
    markup: 0,
    tariff_id: 1,
    origin: { canonical_name: origin },
    destination: { canonical_name: dest },
  };
}

describe("decisionEngine — INFO_PRICE", () => {
  it("INFO with tariff match → INFO_PRICE ES", () => {
    const d = resolveDecision({
      text: "cuánto cuesta ir al centro",
      slots: { destination: "Centro" },
      pricing: makePricing(12000),
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("INFO_PRICE");
    expect(d.message).toContain("$12000");
    expect(d.message).toContain("Aeropuerto IGR");
    expect(d.message).toContain("Centro");
  });

  it("INFO with tariff match → INFO_PRICE PT", () => {
    const d = resolveDecision({
      text: "me das una tarifa",
      slots: { origin: "Aeropuerto IGR", destination: "Centro" },
      pricing: makePricing(20000),
      confidence: 0,
      lang: "pt",
    });
    expect(d.action).toBe("INFO_PRICE");
    expect(d.message).toContain("R$ 20000");
  });

  it("INFO without tariff match → falls through to booking completeness check", () => {
    const d = resolveDecision({
      text: "cuánto cuesta",
      slots: { origin: "IGR", destination: "Centro" },
      pricing: undefined,
      confidence: 0.8,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_INTERPRETATION");
  });
});

describe("decisionEngine — CONFIRM_ROUTE", () => {
  it("short affirmative → CONFIRM_ROUTE", () => {
    const d = resolveDecision({
      text: "sí",
      slots: {},
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_ROUTE");
  });

  it("'dale' → CONFIRM_ROUTE", () => {
    const d = resolveDecision({
      text: "dale",
      slots: {},
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_ROUTE");
  });
});

describe("decisionEngine — AMBIGUOUS → ASK", () => {
  it("origin present, missing destination → ASK_DESTINATION", () => {
    const d = resolveDecision({
      text: "del aeropuerto",
      slots: { origin: "Aeropuerto IGR" },
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("ASK_DESTINATION");
    expect(d.message).toContain("dónde");
  });

  it("destination present, missing origin → ASK_ORIGIN", () => {
    const d = resolveDecision({
      text: "al centro",
      slots: { destination: "Centro" },
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("ASK_ORIGIN");
    expect(d.message).toContain("dónde");
  });

  it("neither slot → ASK_DESTINATION generic", () => {
    const d = resolveDecision({
      text: "hola",
      slots: {},
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("ASK_DESTINATION");
  });

  it("ASK_DESTINATION in PT", () => {
    const d = resolveDecision({
      text: "do aeroporto",
      slots: { origin: "Aeroporto" },
      pricing: undefined,
      confidence: 0,
      lang: "pt",
    });
    expect(d.action).toBe("ASK_DESTINATION");
    expect(d.message).toContain("Para onde");
  });

  it("ASK_ORIGIN in PT", () => {
    const d = resolveDecision({
      text: "para o centro",
      slots: { destination: "Centro" },
      pricing: undefined,
      confidence: 0,
      lang: "pt",
    });
    expect(d.action).toBe("ASK_ORIGIN");
    expect(d.message).toContain("De onde");
  });
});

describe("decisionEngine — confidence routing (MOVE)", () => {
  it("confidence < 0.4 → CLARIFY", () => {
    const d = resolveDecision({
      text: "voy del aeropuerto al centro",
      slots: { origin: "Aeropuerto IGR", destination: "Centro" },
      pricing: undefined,
      confidence: 0.3,
      lang: "es",
    });
    expect(d.action).toBe("CLARIFY");
    expect(d.message).toContain("No estoy seguro");
  });

  it("confidence between 0.4 and 0.75 → CONFIRM_INTERPRETATION (no datetime)", () => {
    const d = resolveDecision({
      text: "voy del aeropuerto al centro",
      slots: { origin: { value: "Aeropuerto IGR" }, destination: { value: "Centro" } },
      pricing: undefined,
      confidence: 0.6,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_INTERPRETATION");
    expect(d.message).toBe("");
  });

  it("all fields present → BOOKING_SUMMARY", () => {
    const d = resolveDecision({
      text: "voy del aeropuerto al centro mañana a las 10",
      slots: { origin: { value: "Aeropuerto IGR" }, destination: { value: "Centro" }, scheduled_at: { value: "2026-06-08T10:00:00.000Z" } },
      pricing: undefined,
      confidence: 0.6,
      lang: "es",
    });
    expect(d.action).toBe("BOOKING_SUMMARY");
    expect(d.message).toBe("");
  });

  it("confidence ≥ 0.75 → CONFIRM_INTERPRETATION (no datetime)", () => {
    const d = resolveDecision({
      text: "IGR a Amerian",
      slots: { origin: "IGR", destination: "Amerian" },
      pricing: undefined,
      confidence: 0.75,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_INTERPRETATION");
    expect(d.message).toBe("");
  });

  it("confidence at boundary 0.4 → CONFIRM_INTERPRETATION", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      pricing: undefined,
      confidence: 0.4,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_INTERPRETATION");
  });

  it("confidence exactly 0.75 → CONFIRM_INTERPRETATION", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      pricing: undefined,
      confidence: 0.75,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_INTERPRETATION");
  });

  it("confidence at 0 → CLARIFY", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      pricing: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("CLARIFY");
  });
});

describe("decisionEngine — MISSING_ROUTE fallback", () => {
  it("MOVE with empty slots → CLARIFY", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: {},
      pricing: undefined,
      confidence: 0.5,
      lang: "es",
    });
    expect(d.action).toBe("CLARIFY");
    expect(d.message).toContain("decirme");
  });
});
