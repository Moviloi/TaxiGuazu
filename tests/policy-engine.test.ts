import { describe, it, expect } from "vitest";
import { evaluatePolicy } from "../src/lib/services/semanticCoreEngine";

describe("policyEngine", () => {
  it("QUESTION when completeness is ASK", () => {
    const result = evaluatePolicy({
      slots: { origin: null, destination: null },
      completeness: { status: "ASK" },
      intent: "BOOKING",
      confidence: 0,
    });
    expect(result.action).toBe("QUESTION");
    expect(result.message).toBe("¿Desde dónde salís?");
  });

  it("CLARIFY when confidence < 0.4", () => {
    const result = evaluatePolicy({
      slots: { origin: "IGR", destination: "centro" },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.3,
    });
    expect(result.action).toBe("CLARIFY");
    expect(result.message).toBe("No estoy seguro del destino. ¿Podés confirmarlo?");
  });

  it("CLARIFY at confidence 0", () => {
    const result = evaluatePolicy({
      slots: {},
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0,
    });
    expect(result.action).toBe("CLARIFY");
  });

  it("CONFIRM when confidence between 0.4 and 0.75", () => {
    const result = evaluatePolicy({
      slots: { origin: { value: "IGR" }, destination: { value: "Amerian" } },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.6,
    });
    expect(result.action).toBe("CONFIRM");
    expect(result.message).toContain("IGR");
    expect(result.message).toContain("Amerian");
    expect(result.message).toContain("¿Confirmás");
  });

  it("CONFIRM at confidence 0.4", () => {
    const result = evaluatePolicy({
      slots: { origin: { value: "Aeropuerto" }, destination: { value: "Centro" } },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.4,
    });
    expect(result.action).toBe("CONFIRM");
  });

  it("CONFIRM at confidence 0.74", () => {
    const result = evaluatePolicy({
      slots: { origin: { value: "IGR" }, destination: { value: "Puerto Iguazú" } },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.74,
    });
    expect(result.action).toBe("CONFIRM");
  });

  it("FINAL when confidence >= 0.75", () => {
    const result = evaluatePolicy({
      slots: { origin: "IGR", destination: "Amerian" },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.75,
    });
    expect(result.action).toBe("FINAL");
  });

  it("FINAL at confidence 1.0", () => {
    const result = evaluatePolicy({
      slots: { origin: "IGR", destination: "Amerian" },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 1.0,
    });
    expect(result.action).toBe("FINAL");
  });

  it("CONFIRM message includes origin value", () => {
    const result = evaluatePolicy({
      slots: { origin: { value: "Aeropuerto IGR" }, destination: { value: "Hotel Amerian" } },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.5,
    });
    expect(result.message).toContain("Aeropuerto IGR");
    expect(result.message).toContain("Hotel Amerian");
  });

  it("CONFIRM renders .value not [object Object]", () => {
    const result = evaluatePolicy({
      slots: {
        origin: { value: "Aeropuerto", score: 0.9, reason: "test" },
        destination: { value: "Centro", score: 0.9, reason: "test" },
      },
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.57,
    });
    expect(result.action).toBe("CONFIRM");
    expect(result.message).toBe("Perfecto, tengo origen en Aeropuerto y destino en Centro. ¿Confirmás el viaje?");
    expect(result.message).not.toContain("[object Object]");
  });

  it("CONFIRM falls back to '...' when slots missing", () => {
    const result = evaluatePolicy({
      slots: {},
      completeness: { status: "COMPLETE" },
      intent: "BOOKING",
      confidence: 0.5,
    });
    expect(result.action).toBe("CONFIRM");
    expect(result.message).toContain("...");
  });
});
