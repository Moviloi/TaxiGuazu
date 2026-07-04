// AIT-033 Equivalence Tests — baseline BEFORE extracting policy values to JSON.
// These tests capture exact current behavior by testing the PUBLIC API.
// After extraction, they must pass identically — same inputs, same outputs.

import { describe, it, expect } from "vitest";
import { policyReserva, buildConfirmationMessage, buildAdminNotifyBody } from "@/lib/ai/policy-reserva";
import { policyAhora } from "@/lib/ai/policy-ahora";
import type { FinalDecision, ExtractionContext, HandlerContext } from "@/lib/ai/types";

// ── Shared helpers ────────────────────────────────────────────────

function makeDecision(overrides: Partial<{
  decision: "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";
  mode: "AHORA" | "RESERVA";
  intent: string;
  facts: string[];
  confidence: number;
}> = {}): FinalDecision {
  return {
    decision: overrides.decision ?? "EXECUTE",
    mode: overrides.mode ?? "RESERVA",
    core: {
      intent: (overrides.intent as any) ?? "BOOKING",
      facts: overrides.facts ?? ["action:quiero"],
      confidence: overrides.confidence ?? 0.9,
      slotStability: { origin: "open", destination: "open" },
      roleLock: { origin: null, destination: null },
    },
    reason: "test",
  };
}

// ── Test 1 & 2: policyReserva policyHint strings ─────────────────

describe("AIT-033 EQ — policyReserva policyHint", () => {
  it("Test 1: EXECUTE → hint exacto", () => {
    const decision = makeDecision({ decision: "EXECUTE", intent: "BOOKING" });
    const result = policyReserva(decision);
    expect(result.policyHint).toBe("RESERVA: ejecutar acción con confirmación obligatoria.");
  });

  it("Test 2: SAFE_FALLBACK → hint exacto", () => {
    const decision = makeDecision({ decision: "SAFE_FALLBACK", intent: "AMBIGUOUS", confidence: 0.3 });
    const result = policyReserva(decision);
    expect(result.policyHint).toBe("RESERVA: requerir confirmación antes de actuar.");
  });
});

// ── Test 3 & 4: policyAhora policyHint strings ───────────────────

describe("AIT-033 EQ — policyAhora policyHint", () => {
  it("Test 3: ANSWER → hint exacto", () => {
    const decision = makeDecision({ decision: "ANSWER", mode: "AHORA", intent: "INFORMATIONAL", facts: ["info:precio"] });
    const result = policyAhora(decision);
    expect(result.policyHint).toBe("AHORA: responder directo sin seguimiento conversacional.");
  });

  it("Test 4: SAFE_FALLBACK → hint exacto", () => {
    const decision = makeDecision({ decision: "SAFE_FALLBACK", mode: "AHORA", intent: "AMBIGUOUS", confidence: 0.3 });
    const result = policyAhora(decision);
    expect(result.policyHint).toBe("AHORA: respuesta segura genérica sin inferencias.");
  });
});

// ── Test 5: paxScore threshold (0.7) ─────────────────────────────

function makeExtractionForStableAck(paxScore: number): ExtractionContext {
  return {
    slots: {
      origin: { value: "Cataratas", score: 0.9, reason: "detected" },
      destination: { value: "Terminal", score: 0.9, reason: "detected" },
      passengers: { value: 2, score: paxScore, reason: "detected" },
    },
    overallConfidence: 0.8,
    conversationalState: "idle",
    clarifyField: null,
    askForConfirmation: false,
    roleLock: { origin: "Cataratas", destination: "Terminal" },
    slotStability: { origin: "locked", destination: "locked" },
  };
}

describe("AIT-033 EQ — paxScore threshold", () => {
  it("Test 5a: paxScore 0.65 (< 0.7) → nextField = passengers", () => {
    const decision = makeDecision({ decision: "EXECUTE", intent: "BOOKING" });
    const result = policyReserva(decision, { extraction: makeExtractionForStableAck(0.65), lang: "es" });
    expect(result.nextExpectedFields).toContain("passengers");
  });

  it("Test 5b: paxScore 0.75 (≥ 0.7) → nextField = scheduled_at", () => {
    const decision = makeDecision({ decision: "EXECUTE", intent: "BOOKING" });
    const result = policyReserva(decision, { extraction: makeExtractionForStableAck(0.75), lang: "es" });
    expect(result.nextExpectedFields).toContain("scheduled_at");
  });
});

// ── Test 6: capacity threshold (4/6 passengers) ──────────────────

describe("AIT-033 EQ — capacity threshold", () => {
  function makeExtractionForCapacity(pax: number): ExtractionContext {
    return {
      slots: {
        origin: { value: "Cataratas", score: 0.9, reason: "detected" },
        destination: { value: "Terminal", score: 0.9, reason: "detected" },
        passengers: { value: pax, score: 0.9, reason: "detected" },
      },
      overallConfidence: 0.8,
      conversationalState: "idle",
      clarifyField: null,
      askForConfirmation: true,
      tariff: {
        matched: true,
        price: 15000,
        canonicalOrigin: "Cataratas",
        canonicalDestination: "Terminal",
        displayOrigin: "Cataratas",
        displayDestination: "Terminal",
      },
      roleLock: { origin: "Cataratas", destination: "Terminal" },
    };
  }

  it("Test 6a: 4 pasajeros → 'hasta 4 pasajeros'", () => {
    const msg = buildConfirmationMessage(makeExtractionForCapacity(4), "es");
    expect(msg).toContain("hasta 4 pasajeros");
  });

  it("Test 6b: 5 pasajeros → 'hasta 6 pasajeros'", () => {
    const msg = buildConfirmationMessage(makeExtractionForCapacity(5), "es");
    expect(msg).toContain("hasta 6 pasajeros");
  });
});

// ── Test 7: adminNotify truncation (200 chars) ───────────────────

describe("AIT-033 EQ — adminNotify truncation", () => {
  it("Test 7: mensaje > 200 chars se trunca a 200", () => {
    const longMsg = "a".repeat(250);
    const result = buildAdminNotifyBody("EMERGENCY", "+549111111", longMsg);
    // Extract the quoted portion after "Mensaje: \""
    const match = result.match(/Mensaje: "(.+?)"/);
    expect(match).not.toBeNull();
    expect(match![1].length).toBe(200);
  });
});

// ── Test 8: FRUSTRATION_RE match/no-match ────────────────────────

// The regex extracted from comprehension-runner.ts L17 (16 alternativas)
const FRUSTRATION_RE_BASELINE = /\b(ya\s+(te\s+)?dije|ya\s+respond[ií]|no\s+entend[ée]s|ya\s+lo\s+dije|te\s+lo\s+dije|obvio|evidente|ya\s+contest[ée]|repito|otra\s+vez|no\s+me\s+escuch[áa]s|no\s+le[ée]s|le[ée]\s+bien|ya\s+esta\s+respondid[ao]|ya\s+te\s+lo\s+dije|ya\s+te\s+contest[ée])\b/i;

describe("AIT-033 EQ — FRUSTRATION_RE pattern", () => {
  it("Test 8a: 'ya te dije' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("ya te dije")).toBe(true);
  });

  it("Test 8b: 'no entendés' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("no entendés")).toBe(true);
  });

  it("Test 8c: 'otra vez' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("otra vez")).toBe(true);
  });

  it("Test 8d: 'obvio' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("obvio")).toBe(true);
  });

  it("Test 8e: 'gracias' (neutral) → match false", () => {
    expect(FRUSTRATION_RE_BASELINE.test("gracias")).toBe(false);
  });

  it("Test 8f: 'quiero un taxi' (neutral) → match false", () => {
    expect(FRUSTRATION_RE_BASELINE.test("quiero un taxi")).toBe(false);
  });

  it("Test 8g: 'ya te lo dije' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("ya te lo dije")).toBe(true);
  });

  it("Test 8h: 'ya te conteste' → match true", () => {
    expect(FRUSTRATION_RE_BASELINE.test("ya te conteste")).toBe(true);
  });
});
