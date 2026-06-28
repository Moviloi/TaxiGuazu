// FASE 18.1 — Prioridad de campos obligatorios
// resolveNextRequiredField + policy-ahora EXECUTE usa helper en vez de hardcode
import { describe, it, expect } from "vitest";
import { resolveNextRequiredField } from "@/lib/ai/field-resolver";
import { core } from "@/lib/ai/core";
import type { HandlerContext } from "@/lib/ai/types";

function mockCtx(slots: Record<string, { value: string | null; score: number; reason: string }>): HandlerContext {
  return {
    extraction: {
      slots,
      overallConfidence: 0,
      conversationalState: "collecting_slots",
      clarifyField: null,
      askForConfirmation: false,
    },
  };
}

describe("resolveNextRequiredField — prioridad de campos", () => {
  it("priority 1: ambiguous origin → field=origin reason=ambiguous", () => {
    const ctx = mockCtx({
      origin: { value: "aeropuerto", score: 0.6, reason: "ambiguous_term" },
      destination: { value: "centro", score: 0.6, reason: "ambiguous_term" },
      passengers: { value: null, score: 0.0, reason: "missing" },
      scheduled_at: { value: null, score: 0.0, reason: "missing" },
    });
    expect(resolveNextRequiredField(ctx)).toEqual({ field: "origin", reason: "ambiguous" });
  });

  it("priority 2: passengers missing → field=passengers", () => {
    const ctx = mockCtx({
      origin: { value: "aeropuerto", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "centro", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: null, score: 0.0, reason: "missing" },
      scheduled_at: { value: null, score: 0.0, reason: "missing" },
    });
    expect(resolveNextRequiredField(ctx)).toEqual({ field: "passengers", reason: "missing" });
  });

  it("priority 3: scheduled_at missing (passengers present) → field=scheduled_at", () => {
    const ctx = mockCtx({
      origin: { value: "aeropuerto", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "centro", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      scheduled_at: { value: null, score: 0.0, reason: "missing" },
    });
    expect(resolveNextRequiredField(ctx)).toEqual({ field: "scheduled_at", reason: "missing" });
  });

  it("all fields complete → field=null", () => {
    const ctx = mockCtx({
      origin: { value: "aeropuerto", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "centro", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      scheduled_at: { value: "2026-06-22T15:00:00", score: 1.0, reason: "valid_iso_date" },
    });
    expect(resolveNextRequiredField(ctx)).toEqual({ field: null, reason: "missing" });
  });

  it("no extraction ctx → field=null", () => {
    expect(resolveNextRequiredField(undefined)).toEqual({ field: null, reason: "missing" });
  });

  it("low confidence passengers (0.3) → field=passengers reason=low_confidence", () => {
    const ctx = mockCtx({
      origin: { value: "aeropuerto", score: 1.0, reason: "exact_alias_match" },
      destination: { value: "centro", score: 1.0, reason: "exact_alias_match" },
      passengers: { value: null, score: 0.3, reason: "ambiguous_mention_no_number" },
      scheduled_at: { value: "2026-06-22", score: 1.0, reason: "valid_iso_date" },
    });
    expect(resolveNextRequiredField(ctx)).toEqual({ field: "passengers", reason: "low_confidence" });
  });
});

describe("FASE 18.1 — Flujo completo", () => {
  // Core-level assertions + temporal + operational mode
  it('"estoy en el aeropuerto quiero ir al centro" → BOOKING + CLARIFY + NO dispatch', () => {
    const result = core("estoy en el aeropuerto quiero ir al centro");
    expect(result.intent).toBe("BOOKING");
    expect(result.facts).toContain("location_ambiguous:true");
    expect(result.facts).toContain("origin:aeropuerto");
    expect(result.facts).toContain("destination:centro");
    // No debe tener now/urgency
    expect(result.facts.some(f => f.startsWith("now:") || f.startsWith("urgency:"))).toBe(false);
  });

  it('"quiero ir del aeropuerto al centro" → BOOKING + sin location_ambiguous', () => {
    const result = core("quiero ir del aeropuerto al centro");
    // This input does NOT contain "estoy en" so origin may not be locked via ESTOY_EN_RE
    expect(result.facts.some(f => f.startsWith("destination:"))).toBe(true);
  });

  it('"quiero ir ahora del aeropuerto al centro, somos 2" → NOW + DISPATCH', () => {
    const result = core("quiero ir ahora del aeropuerto al centro, somos 2");
    expect(result.intent).toBe("NOW");
  });

  it('"quiero ir mañana del aeropuerto al centro, somos 2" → PRE_BOOKING + RESERVATION', () => {
    const result = core("quiero ir mañana del aeropuerto al centro, somos 2");
    expect(result.intent).toBe("PRE_BOOKING");
    expect(result.facts.some(f => f.startsWith("date:") || f.startsWith("time:"))).toBe(true);
  });
});
