import { describe, it, expect } from "vitest";
import { mapIntentToDomain } from "@/lib/ai/domain";
import type { Intent, ConversationDomain } from "@/lib/ai/types";
import { getProfile, buildComprehensionSignals, computeComprehensionScore } from "@/lib/services/extraction/comprehension";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { buildInformationalResponse, buildCommercialResponse } from "@/lib/ai/response-builder";
import type { SlotStabilityMap } from "@/lib/ai/types";
import type { ChatSessionRow } from "@/lib/db/types";

function session(overrides?: Partial<ChatSessionRow>): ChatSessionRow {
  return {
    phone: "549111111",
    slots: null,
    confidence: null,
    extraction_count: 0,
    last_extracted_at: null,
    clarify_field: null,
    pending_opportunity: null,
    comprehension_state: null,
    comprehension_score: null,
    escalation_reason: null,
    updated_at: 1000,
    conversational_state: null,
    dispatch_state: null,
    trip_state: null,
    ...overrides,
  };
}

describe("mapIntentToDomain", () => {
  const cases: [Intent, ConversationDomain][] = [
    ["GREETING", "information"],
    ["CONSULTA", "information"],
    ["INFORMATIONAL", "information"],
    ["AMBIGUOUS", "information"],
    ["COMMERCIAL", "commercial"],
    ["PRE_BOOKING", "reservation"],
    ["BOOKING", "reservation"],
    ["RESCHEDULE", "reservation"],
    ["POST_SERVICE", "reservation"],
    ["NOW", "dispatch"],
    ["EMERGENCY", "dispatch"],
  ];

  it.each(cases)("%s → %s", (intent, expected) => {
    expect(mapIntentToDomain(intent)).toBe(expected);
  });
});

describe("getProfile", () => {
  it("information: no required slots, low slot/extraction weight", () => {
    const p = getProfile("information");
    expect(p.requiredSlots).toEqual([]);
    expect(p.slotWeight).toBe(0.05);
    expect(p.extractionWeight).toBe(0.05);
  });

  it("commercial: origin+destination, medium slot weight", () => {
    const p = getProfile("commercial");
    expect(p.requiredSlots).toEqual(["origin", "destination"]);
    expect(p.slotWeight).toBe(0.15);
    expect(p.extractionWeight).toBe(0.15);
  });

  it("reservation: origin+destination+passengers, default weights", () => {
    const p = getProfile("reservation");
    expect(p.requiredSlots).toEqual(["origin", "destination", "passengers"]);
    expect(p.slotWeight).toBe(0.20);
    expect(p.extractionWeight).toBe(0.15);
  });

  it("dispatch: high extraction weight", () => {
    const p = getProfile("dispatch");
    expect(p.requiredSlots).toEqual(["origin", "destination", "time"]);
    expect(p.slotWeight).toBe(0.10);
    expect(p.extractionWeight).toBe(0.25);
  });

  it("defaults to reservation when undefined", () => {
    const p = getProfile();
    expect(p.requiredSlots).toEqual(["origin", "destination", "passengers"]);
  });
});

describe("buildComprehensionSignals — domain-aware", () => {
  const stab: SlotStabilityMap = { origin: "open", destination: "open" };

  it("information: slotCompleteness 1.0 even without slots", () => {
    const signals = buildComprehensionSignals({
      text: "qué servicios tienen",
      coreIntent: "INFORMATIONAL",
      slotStability: stab,
      session: session(),
      domain: "information",
    });
    expect(signals.slotCompleteness).toBe(1.0);
  });

  it("information: extractionConfidence 1.0 without extraction", () => {
    const signals = buildComprehensionSignals({
      text: "consulta",
      coreIntent: "CONSULTA",
      slotStability: stab,
      session: session(),
      domain: "information",
    });
    expect(signals.extractionConfidence).toBe(1.0);
  });

  it("reservation: slotCompleteness 0.2 without slots (unchanged legacy)", () => {
    const signals = buildComprehensionSignals({
      text: "reservá",
      coreIntent: "BOOKING",
      slotStability: stab,
      session: session(),
      domain: "reservation",
    });
    expect(signals.slotCompleteness).toBe(0.2);
  });

  it("reservation without domain param: slotCompleteness 0.2 (fallback)", () => {
    const signals = buildComprehensionSignals({
      text: "reservá",
      coreIntent: "BOOKING",
      slotStability: stab,
      session: session(),
    });
    expect(signals.slotCompleteness).toBe(0.2);
  });
});

describe("computeComprehensionScore — domain-aware weights", () => {
  it("information with no slots → score unaffected by missing slots", () => {
    const score = computeComprehensionScore({
      intentConfidence: 0.5,
      entityConfidence: 0.3,
      slotCompleteness: 0.2,
      extractionConfidence: 0.5,
      conversationStability: 0.7,
    }, "information");
    // slot weight 0.05 instead of 0.20, extraction weight 0.05 instead of 0.15
    // remaining 0.90 scaled from base 0.65
    const expected = (0.5 * 0.30 + 0.3 * 0.25 + 0.7 * 0.10) * (0.90 / 0.65) + (0.2 * 0.05) + (0.5 * 0.05);
    expect(score).toBeCloseTo(expected, 4);
  });

  it("reservation (no domain) → standard weights preserved", () => {
    const score = computeComprehensionScore({
      intentConfidence: 0.5,
      entityConfidence: 0.3,
      slotCompleteness: 0.2,
      extractionConfidence: 0.5,
      conversationStability: 0.7,
    });
    const expected = 0.5 * 0.30 + 0.3 * 0.25 + 0.2 * 0.20 + 0.5 * 0.15 + 0.7 * 0.10;
    expect(score).toBeCloseTo(expected, 4);
  });
});

describe("evaluateCompleteness — domain-aware", () => {
  it("information: always COMPLETE even with null slots", () => {
    expect(evaluateCompleteness(null, "information")).toEqual({ status: "COMPLETE" });
  });

  it("information: always COMPLETE with empty slots", () => {
    expect(evaluateCompleteness({}, "information")).toEqual({ status: "COMPLETE" });
  });

  it("reservation: ASK_ORIGIN when origin is null (unchanged)", () => {
    const result = evaluateCompleteness({ origin: null, destination: "B" }, "reservation");
    expect(result.status).toBe("ASK");
    expect(result.field).toBe("origin");
  });

  it("reservation: COMPLETE with both slots (unchanged)", () => {
    expect(evaluateCompleteness({ origin: "A", destination: "B" }, "reservation").status).toBe("COMPLETE");
  });

  it("no domain: default behavior preserved (backward compat)", () => {
    expect(evaluateCompleteness(null)).toEqual({ status: "ASK", field: "origin" });
  });
});

describe("buildInformationalResponse", () => {
  it("GREETING → greeting message", () => {
    const msg = buildInformationalResponse("GREETING", "es");
    expect(msg).toContain("Hola");
  });

  it("CONSULTA → generic info message", () => {
    const msg = buildInformationalResponse("CONSULTA", "es");
    expect(msg).toContain("Iguazú");
  });

  it("INFORMATIONAL → generic info message", () => {
    const msg = buildInformationalResponse("INFORMATIONAL", "es");
    expect(msg).toContain("Iguazú");
  });

  it("supports lang parameter", () => {
    const en = buildInformationalResponse("CONSULTA", "en");
    expect(en).toContain("Iguazú");
  });
});

describe("buildCommercialResponse", () => {
  it("returns route+pax request", () => {
    const msg = buildCommercialResponse("COMMERCIAL", "es");
    expect(msg).toContain("recorrido");
  });

  it("supports lang parameter", () => {
    const en = buildCommercialResponse("COMMERCIAL", "en");
    expect(en).toContain("route");
  });
});

describe("Intent-to-domain coherence", () => {
  it("CONSULTA → information → no slot penalty", () => {
    const domain = mapIntentToDomain("CONSULTA");
    expect(domain).toBe("information");
    const profile = getProfile(domain);
    expect(profile.requiredSlots).toEqual([]);
  });

  it("COMMERCIAL → commercial → origin+destination required", () => {
    const domain = mapIntentToDomain("COMMERCIAL");
    expect(domain).toBe("commercial");
    const profile = getProfile(domain);
    expect(profile.requiredSlots).toEqual(["origin", "destination"]);
  });

  it("BOOKING → reservation → full slots required", () => {
    const domain = mapIntentToDomain("BOOKING");
    expect(domain).toBe("reservation");
    const profile = getProfile(domain);
    expect(profile.requiredSlots).toEqual(["origin", "destination", "passengers"]);
  });

  it("NOW → dispatch → time-sensitive", () => {
    const domain = mapIntentToDomain("NOW");
    expect(domain).toBe("dispatch");
    const profile = getProfile(domain);
    expect(profile.requiredSlots).toContain("time");
    expect(profile.extractionWeight).toBe(0.25);
  });

  it("PRE_BOOKING → reservation (same as BOOKING)", () => {
    expect(mapIntentToDomain("PRE_BOOKING")).toBe("reservation");
  });

  it("EMERGENCY → dispatch", () => {
    expect(mapIntentToDomain("EMERGENCY")).toBe("dispatch");
  });
});
