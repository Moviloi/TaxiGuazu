import { describe, it, expect } from "vitest";
import { evaluateCompleteness } from "../src/lib/services/workflow/evaluate-completeness";

describe("completenessEngine", () => {
  it("ASK_ORIGIN when origin is null", () => {
    const result = evaluateCompleteness({ origin: null, destination: "Amerian" });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("ASK_ORIGIN when origin is empty string", () => {
    const result = evaluateCompleteness({ origin: "", destination: "Amerian" });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("ASK_ORIGIN when origin is whitespace only", () => {
    const result = evaluateCompleteness({ origin: "  ", destination: "Amerian" });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("ASK_DESTINATION when destination is null", () => {
    const result = evaluateCompleteness({ origin: "IGR", destination: null });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("destination");
  });

  it("ASK_DESTINATION when destination is empty string", () => {
    const result = evaluateCompleteness({ origin: "IGR", destination: "" });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("destination");
  });

  it("ASK_ORIGIN when slots is null (no extraction)", () => {
    const result = evaluateCompleteness(null);
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("ASK_ORIGIN when slots is undefined", () => {
    const result = evaluateCompleteness(undefined);
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("COMPLETE when both origin and destination are present", () => {
    const result = evaluateCompleteness({ origin: "IGR", destination: "Amerian" });
    expect(result.status).toBe("COMPLETE");
  });

  it("COMPLETE with extra fields present", () => {
    const result = evaluateCompleteness({
      origin: "Aeropuerto",
      destination: "Centro",
      passengers: 2,
      scheduled_at: "2026-06-07",
    });
    expect(result.status).toBe("COMPLETE");
  });
});
