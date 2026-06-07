import { describe, it, expect } from "vitest";
import { evaluateCompleteness, evaluateBookingCompleteness } from "../src/lib/services/completenessEngine";

describe("completenessEngine", () => {
  it("ASK_ORIGIN when origin is null", () => {
    const result = evaluateCompleteness({ origin: null, destination: "Amerian" });
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
    expect(result.message).toBe("¿Desde dónde salís?");
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
    expect(result.message).toBe("¿A dónde necesitás ir?");
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

describe("evaluateBookingCompleteness", () => {
  it("MISSING_ROUTE when slots is null", () => {
    const result = evaluateBookingCompleteness(null);
    expect(result.status).toBe("MISSING_ROUTE");
  });

  it("MISSING_ROUTE when slots is undefined", () => {
    const result = evaluateBookingCompleteness(undefined);
    expect(result.status).toBe("MISSING_ROUTE");
  });

  it("MISSING_ROUTE when origin is missing", () => {
    const result = evaluateBookingCompleteness({ destination: "Centro" });
    expect(result.status).toBe("MISSING_ROUTE");
  });

  it("MISSING_ROUTE when destination is missing", () => {
    const result = evaluateBookingCompleteness({ origin: "Aeropuerto" });
    expect(result.status).toBe("MISSING_ROUTE");
  });

  it("MISSING_DATETIME when origin+dest present but no scheduled_at", () => {
    const result = evaluateBookingCompleteness({ origin: "Aeropuerto", destination: "Centro" });
    expect(result.status).toBe("MISSING_DATETIME");
    expect(result.message).toBe("¿Para qué fecha y hora necesitás el traslado?");
  });

  it("MISSING_DATETIME when scheduled_at is empty string", () => {
    const result = evaluateBookingCompleteness({ origin: "Aeropuerto", destination: "Centro", scheduled_at: "" });
    expect(result.status).toBe("MISSING_DATETIME");
  });

  it("COMPLETE when origin+dest+scheduled_at present (string values)", () => {
    const result = evaluateBookingCompleteness({
      origin: "Aeropuerto",
      destination: "Centro",
      scheduled_at: "2026-06-08T10:00:00.000Z",
    });
    expect(result.status).toBe("COMPLETE");
  });

  it("COMPLETE when origin+dest+scheduled_at present (ConfirmedSlot objects)", () => {
    const result = evaluateBookingCompleteness({
      origin: { value: "Aeropuerto", score: 0.9, reason: "extracted" },
      destination: { value: "Centro", score: 0.85, reason: "extracted" },
      scheduled_at: { value: "2026-06-08T10:00:00.000Z", score: 0.95, reason: "extracted" },
    });
    expect(result.status).toBe("COMPLETE");
  });

  it("MISSING_DATETIME with ConfirmedSlot objects but no scheduled_at", () => {
    const result = evaluateBookingCompleteness({
      origin: { value: "Aeropuerto", score: 0.9, reason: "extracted" },
      destination: { value: "Centro", score: 0.85, reason: "extracted" },
    });
    expect(result.status).toBe("MISSING_DATETIME");
  });

  it("MISSING_DATETIME with ConfirmedSlot object where scheduled_at value is null", () => {
    const result = evaluateBookingCompleteness({
      origin: { value: "Aeropuerto", score: 0.9, reason: "extracted" },
      destination: { value: "Centro", score: 0.85, reason: "extracted" },
      scheduled_at: { value: null, score: 0, reason: "not_found" },
    });
    expect(result.status).toBe("MISSING_DATETIME");
  });
});
