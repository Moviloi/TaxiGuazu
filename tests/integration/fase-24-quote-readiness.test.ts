import { describe, it, expect } from "vitest";
import { canPrepareQuote, canQuote, canDispatch } from "@/lib/ai/operational-readiness";
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

function slot(value: string, status?: string) {
  return { value, score: status === "CONFIRMED" ? 1.0 : 0.6, reason: "extracted", status };
}

describe("FASE 24 — Quote Readiness vs Dispatch Readiness", () => {

  it("T1: origin/dest CONFIRMATION_PENDING + passengers missing", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMATION_PENDING"),
      destination: slot("Centro", "CONFIRMATION_PENDING"),
    });
    expect(canPrepareQuote(extractionCtx).allowed).toBe(true);
    expect(canQuote(extractionCtx).allowed).toBe(false);
    expect(canDispatch(extractionCtx, "NOW").allowed).toBe(false);
  });

  it("T2: origin/dest CONFIRMED + passengers missing", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
    });
    expect(canPrepareQuote(extractionCtx).allowed).toBe(true);
    expect(canQuote(extractionCtx).allowed).toBe(false);
    expect(canQuote(extractionCtx).blockedBy).toContain("missing_passengers");
  });

  it("T3: origin/dest/passengers CONFIRMED", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      passengers: slot("2", "CONFIRMED"),
    });
    expect(canQuote(extractionCtx).allowed).toBe(true);
  });

  it("T4: hotel INFERRED", () => {
    const extractionCtx = ctx({
      origin: slot("Hotel X", "INFERRED"),
      destination: slot("Centro", "CONFIRMED"),
      passengers: slot("2", "CONFIRMED"),
    });
    expect(canPrepareQuote(extractionCtx).allowed).toBe(true);
    expect(canQuote(extractionCtx).allowed).toBe(false);
    expect(canQuote(extractionCtx).blockedBy).toContain("origin_pending");
  });

  it("T5: NOW con todo confirmado — quote y dispatch OK", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      passengers: slot("2", "CONFIRMED"),
    });
    expect(canQuote(extractionCtx).allowed).toBe(true);
    expect(canDispatch(extractionCtx, "NOW").allowed).toBe(true);
  });

  it("T6: FUTURE sin scheduled_at — quote OK, dispatch NO", () => {
    const extractionCtx = ctx({
      origin: slot("Aeropuerto IGR", "CONFIRMED"),
      destination: slot("Centro", "CONFIRMED"),
      passengers: slot("2", "CONFIRMED"),
    });
    expect(canQuote(extractionCtx).allowed).toBe(true);
    expect(canDispatch(extractionCtx, "FUTURE").allowed).toBe(false);
    expect(canDispatch(extractionCtx, "FUTURE").blockedBy).toContain("missing_time");
  });

});
