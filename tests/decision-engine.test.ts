import { describe, it, expect } from "vitest";
import { resolveDecision } from "../src/lib/services/semanticCoreEngine";

function makeTariffMatch(price = 15000) {
  return {
    matched: true,
    price,
    canonicalOrigin: "Aeropuerto IGR",
    canonicalDestination: "Centro",
  };
}

describe("decisionEngine — INFO_PRICE", () => {
  it("INFO with tariff match → INFO_PRICE ES", () => {
    const d = resolveDecision({
      text: "cuánto cuesta ir al centro",
      slots: { destination: "Centro" },
      tariffMatch: makeTariffMatch(12000),
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
      tariffMatch: makeTariffMatch(20000),
      confidence: 0,
      lang: "pt",
    });
    expect(d.action).toBe("INFO_PRICE");
    expect(d.message).toContain("R$ 20000");
  });

  it("INFO without tariff match → falls through to confidence routing", () => {
    const d = resolveDecision({
      text: "cuánto cuesta",
      slots: { origin: "IGR", destination: "Centro" },
      tariffMatch: undefined,
      confidence: 0.8,
      lang: "es",
    });
    expect(d.action).toBe("FINAL");
  });
});

describe("decisionEngine — CONFIRM_ROUTE", () => {
  it("short affirmative → CONFIRM_ROUTE", () => {
    const d = resolveDecision({
      text: "sí",
      slots: {},
      tariffMatch: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM_ROUTE");
  });

  it("'dale' → CONFIRM_ROUTE", () => {
    const d = resolveDecision({
      text: "dale",
      slots: {},
      tariffMatch: undefined,
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
      tariffMatch: undefined,
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
      tariffMatch: undefined,
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
      tariffMatch: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("ASK_DESTINATION");
  });

  it("ASK_DESTINATION in PT", () => {
    const d = resolveDecision({
      text: "do aeroporto",
      slots: { origin: "Aeroporto" },
      tariffMatch: undefined,
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
      tariffMatch: undefined,
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
      tariffMatch: undefined,
      confidence: 0.3,
      lang: "es",
    });
    expect(d.action).toBe("CLARIFY");
    expect(d.message).toContain("No estoy seguro");
  });

  it("confidence between 0.4 and 0.75 → CONFIRM", () => {
    const d = resolveDecision({
      text: "voy del aeropuerto al centro",
      slots: { origin: "Aeropuerto IGR", destination: "Centro" },
      tariffMatch: undefined,
      confidence: 0.6,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM");
    expect(d.message).toContain("Aeropuerto IGR");
    expect(d.message).toContain("Centro");
    expect(d.message).toContain("Confirmás");
  });

  it("confidence ≥ 0.75 → FINAL", () => {
    const d = resolveDecision({
      text: "IGR a Amerian",
      slots: { origin: "IGR", destination: "Amerian" },
      tariffMatch: undefined,
      confidence: 0.75,
      lang: "es",
    });
    expect(d.action).toBe("FINAL");
    expect(d.message).toBe("");
  });

  it("confidence at boundary 0.4 → CONFIRM", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      tariffMatch: undefined,
      confidence: 0.4,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM");
  });

  it("confidence exactly 0.75 → FINAL", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      tariffMatch: undefined,
      confidence: 0.75,
      lang: "es",
    });
    expect(d.action).toBe("FINAL");
  });

  it("confidence at 0 → CLARIFY", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: { origin: "IGR", destination: "Centro" },
      tariffMatch: undefined,
      confidence: 0,
      lang: "es",
    });
    expect(d.action).toBe("CLARIFY");
  });
});

describe("decisionEngine — CONFIRM message slots", () => {
  it("CONFIRM message uses slot values or fallback '...'", () => {
    const d = resolveDecision({
      text: "viaje",
      slots: {},
      tariffMatch: undefined,
      confidence: 0.5,
      lang: "es",
    });
    expect(d.action).toBe("CONFIRM");
    expect(d.message).toContain("...");
  });
});
