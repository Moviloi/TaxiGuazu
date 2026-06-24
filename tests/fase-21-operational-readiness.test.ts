import { describe, it, expect } from "vitest";
import { canQuote, canPrepareQuote, canDispatch } from "@/lib/ai/operational-readiness";
import type { ExtractionContext, TemporalMode } from "@/lib/ai/types";

function makeCtx(overrides: Partial<{
  originStatus: string | null;
  destStatus: string | null;
  originValue: string | null;
  destValue: string | null;
  passengersValue: string | null;
  passengersStatus: string | null;
  scheduledAtValue: string | null;
}> = {}): ExtractionContext {
  const originStatus = "originStatus" in overrides ? overrides.originStatus : "CONFIRMED";
  const destStatus = "destStatus" in overrides ? overrides.destStatus : "CONFIRMED";
  const originValue = "originValue" in overrides ? overrides.originValue : "Aeropuerto IGR";
  const destValue = "destValue" in overrides ? overrides.destValue : "Centro";
  const passengersValue = "passengersValue" in overrides ? overrides.passengersValue : "2";
  const passengersStatus = "passengersStatus" in overrides ? overrides.passengersStatus : "CONFIRMED";
  const scheduledAtValue = "scheduledAtValue" in overrides ? overrides.scheduledAtValue : "2026-06-25T10:00";

  const slots: ExtractionContext["slots"] = {};
  if (originValue != null) {
    slots.origin = { value: originValue, score: 1.0, reason: "exact_alias_match", status: originStatus ?? undefined };
  }
  if (destValue != null) {
    slots.destination = { value: destValue, score: 1.0, reason: "exact_alias_match", status: destStatus ?? undefined };
  }
  if (passengersValue != null) {
    slots.passengers = { value: passengersValue, score: 1.0, reason: "exact_match", status: passengersStatus ?? undefined };
  }
  if (scheduledAtValue != null) {
    slots.scheduled_at = { value: scheduledAtValue, score: 1.0, reason: "parsed" };
  }

  return {
    slots,
    overallConfidence: 0.85,
    conversationalState: "collecting_slots",
    clarifyField: null,
    askForConfirmation: false,
  };
}

describe("FASE 21/24 — canPrepareQuote / canQuote / canDispatch", () => {

  // T1: CONFIRMATION_PENDING location → prepareQuote OK, quote NO, dispatch NO
  describe("T1 — CONFIRMATION_PENDING location", () => {
    it("canPrepareQuote: true (tiene valores)", () => {
      const ctx = makeCtx({ originStatus: "CONFIRMATION_PENDING", destStatus: "CONFIRMATION_PENDING" });
      expect(canPrepareQuote(ctx).allowed).toBe(true);
      expect(canPrepareQuote(ctx).blockedBy).toEqual([]);
    });

    it("canQuote: false (origin/destination pending)", () => {
      const ctx = makeCtx({ originStatus: "CONFIRMATION_PENDING", destStatus: "CONFIRMATION_PENDING" });
      expect(canQuote(ctx).allowed).toBe(false);
      expect(canQuote(ctx).blockedBy).toContain("origin_pending");
      expect(canQuote(ctx).blockedBy).toContain("destination_pending");
    });

    it("canDispatch: false (origin/destination pending)", () => {
      const ctx = makeCtx({ originStatus: "CONFIRMATION_PENDING", destStatus: "CONFIRMATION_PENDING" });
      const result = canDispatch(ctx, "NOW");
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain("origin_pending");
      expect(result.blockedBy).toContain("destination_pending");
    });
  });

  // T2: CONFIRMED location + missing passengers → prepareQuote OK, quote NO, dispatch NO
  describe("T2 — CONFIRMED location + missing passengers", () => {
    it("canPrepareQuote: true (tiene origen/destino)", () => {
      const ctx = makeCtx({ passengersValue: null });
      expect(canPrepareQuote(ctx).allowed).toBe(true);
    });

    it("canQuote: false (missing passengers)", () => {
      const ctx = makeCtx({ passengersValue: null });
      expect(canQuote(ctx).allowed).toBe(false);
      expect(canQuote(ctx).blockedBy).toContain("missing_passengers");
    });

    it("canDispatch: false (missing passengers)", () => {
      const ctx = makeCtx({ passengersValue: null });
      const result = canDispatch(ctx, "NOW");
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain("missing_passengers");
    });
  });

  // T3: todo confirmado → quote OK, dispatch OK
  describe("T3 — Full CONFIRMED + passengers + time", () => {
    it("canPrepareQuote: true", () => {
      const ctx = makeCtx();
      expect(canPrepareQuote(ctx).allowed).toBe(true);
    });

    it("canQuote: true", () => {
      const ctx = makeCtx();
      expect(canQuote(ctx).allowed).toBe(true);
    });

    it("canDispatch: true (todo presente)", () => {
      const ctx = makeCtx();
      const result = canDispatch(ctx, "NOW");
      expect(result.allowed).toBe(true);
      expect(result.blockedBy).toEqual([]);
    });

    it("canDispatch FUTURE: true (con scheduled_at)", () => {
      const ctx = makeCtx({ scheduledAtValue: "2026-06-25T10:00" });
      const result = canDispatch(ctx, "FUTURE");
      expect(result.allowed).toBe(true);
    });
  });

  // T4: hotel INFERRED → prepareQuote OK, quote NO, dispatch NO
  describe("T4 — hotel (zona INFERRED)", () => {
    it("canPrepareQuote: true (tiene valores)", () => {
      const ctx = makeCtx({
        originValue: "Hotel",
        originStatus: "INFERRED",
        destValue: "Centro",
        destStatus: "CONFIRMATION_PENDING",
      });
      expect(canPrepareQuote(ctx).allowed).toBe(true);
    });

    it("canQuote: false (no CONFIRMED)", () => {
      const ctx = makeCtx({
        originValue: "Hotel",
        originStatus: "INFERRED",
        destValue: "Centro",
        destStatus: "CONFIRMATION_PENDING",
      });
      expect(canQuote(ctx).allowed).toBe(false);
      expect(canQuote(ctx).blockedBy).toContain("origin_pending");
      expect(canQuote(ctx).blockedBy).toContain("destination_pending");
    });

    it("canDispatch: false (no CONFIRMED)", () => {
      const ctx = makeCtx({
        originValue: "Hotel",
        originStatus: "INFERRED",
        destValue: "Centro",
        destStatus: "CONFIRMATION_PENDING",
      });
      expect(canDispatch(ctx, "NOW").allowed).toBe(false);
    });
  });

  // T5: NOW con todo confirmado → quote OK, dispatch OK
  describe("T5 — NOW con todo confirmado", () => {
    it("canQuote: true", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      expect(canQuote(ctx).allowed).toBe(true);
    });

    it("canDispatch: true (NOW no requiere horario)", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      expect(canDispatch(ctx, "NOW").allowed).toBe(true);
    });
  });

  // T6: FUTURE sin scheduled_at → quote OK, dispatch NO
  describe("T6 — FUTURE sin horario", () => {
    it("canQuote: true (origin/dest/passengers CONFIRMED)", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      expect(canQuote(ctx).allowed).toBe(true);
    });

    it("canDispatch: false (missing_time)", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      const result = canDispatch(ctx, "FUTURE");
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain("missing_time");
    });
  });

  // Edge cases
  describe("Edge cases", () => {
    it("canQuote: false sin extractionCtx", () => {
      expect(canQuote(undefined).allowed).toBe(false);
    });

    it("canPrepareQuote: false sin extractionCtx", () => {
      expect(canPrepareQuote(undefined).allowed).toBe(false);
    });

    it("canDispatch: false sin extractionCtx", () => {
      expect(canDispatch(undefined).allowed).toBe(false);
    });

    it("canQuote: false sin origin", () => {
      const ctx = makeCtx({ originValue: null });
      expect(canQuote(ctx).allowed).toBe(false);
      expect(canQuote(ctx).blockedBy).toContain("missing_origin");
    });

    it("canDispatch NOW: true sin scheduled_at (NOW no requiere horario)", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      const result = canDispatch(ctx, "NOW");
      expect(result.allowed).toBe(true);
    });

    it("canDispatch UNKNOWN: false sin scheduled_at", () => {
      const ctx = makeCtx({ scheduledAtValue: null });
      const result = canDispatch(ctx, "UNKNOWN");
      expect(result.allowed).toBe(false);
      expect(result.blockedBy).toContain("missing_time");
    });
  });

});
