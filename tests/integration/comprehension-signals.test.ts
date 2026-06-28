import { describe, it, expect } from "vitest";
import { buildComprehensionSignals, computeComprehensionScore } from "@/lib/services/extraction/comprehension";
import type { ConfidenceMap, SlotStabilityMap } from "@/lib/ai/types";
import type { ChatSessionRow } from "@/lib/db/types";

const defaultSlotStability: SlotStabilityMap = { origin: "open", destination: "open" };

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
    slot_states: null,
    ...overrides,
  };
}

function cm(overrides?: Partial<ConfidenceMap>): ConfidenceMap {
  return {
    intent: 0.85,
    origin: 0,
    destination: 0,
    date: 0,
    time: 0,
    passengers: 0,
    mode: 0.3,
    luggage: 0,
    ...overrides,
  };
}

describe("buildComprehensionSignals — intentConfidence priority", () => {
  it("uses ConfidenceMap.intent when available", () => {
    const signals = buildComprehensionSignals({
      text: "hola",
      coreIntent: "GREETING",
      slotStability: defaultSlotStability,
      session: session(),
      confidenceMap: cm({ intent: 0.92 }),
    });
    expect(signals.intentConfidence).toBe(0.92);
  });

  it("uses coreConfidence when ConfidenceMap is absent", () => {
    const signals = buildComprehensionSignals({
      text: "hola",
      coreIntent: "GREETING",
      coreConfidence: 0.4,
      slotStability: defaultSlotStability,
      session: session(),
    });
    expect(signals.intentConfidence).toBe(0.4);
  });

  it("falls back to INTENT_CONFIDENCE_MAP when neither is available", () => {
    const signals = buildComprehensionSignals({
      text: "hola",
      coreIntent: "GREETING",
      slotStability: defaultSlotStability,
      session: session(),
    });
    expect(signals.intentConfidence).toBe(0.6);
  });

  it("falls back to INTENT_CONFIDENCE_MAP for BOOKING", () => {
    const signals = buildComprehensionSignals({
      text: "reservá",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: session(),
    });
    expect(signals.intentConfidence).toBe(0.9);
  });

  it("falls back to 0.3 for unknown intent", () => {
    const signals = buildComprehensionSignals({
      text: "xyz",
      coreIntent: "NONEXISTENT" as any,
      slotStability: defaultSlotStability,
      session: session(),
    });
    expect(signals.intentConfidence).toBe(0.3);
  });

  it("clamps to [0, 1]", () => {
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "GREETING",
      coreConfidence: 1.5,
      slotStability: defaultSlotStability,
      session: session(),
    });
    expect(signals.intentConfidence).toBe(1);
  });
});

describe("buildComprehensionSignals — extractionConfidence", () => {
  it("averages only origin, destination, passengers from session confidence", () => {
    const s = session({
      confidence: JSON.stringify({
        origin: 1.0,
        destination: 0.6,
        passengers: 1.0,
        price: 1.0,
        flight: 0.0,
        intent: 0.5,
        mode: 0.3,
        luggage: 0,
      }),
    });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: s,
    });
    expect(signals.extractionConfidence).toBeCloseTo(0.867, 2);
  });

  it("uses only present mandatory fields (origin + destination)", () => {
    const s = session({
      confidence: JSON.stringify({
        origin: 0.6,
        destination: 0.8,
      }),
    });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: s,
    });
    expect(signals.extractionConfidence).toBe(0.7);
  });

  it("falls back to old extractionConfidence when no mandatory fields exist", () => {
    const s = session({
      confidence: JSON.stringify({
        price: 1.0,
        flight: 0.0,
      }),
    });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: s,
    });
    // fallback to old computeExtractionConfidence parses all and averages
    expect(signals.extractionConfidence).toBe(0.5);
  });

  it("uses old fallback when session confidence is null", () => {
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: session({ confidence: null }),
    });
    // coreDetected = 0 → 0.5
    expect(signals.extractionConfidence).toBe(0.5);
  });

  it("uses old fallback with 2 core-detected slots", () => {
    const s = session({ confidence: null });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      roleLock: { origin: "Centro", destination: "Aeropuerto" },
      session: s,
    });
    // coreDetected = 2 → 0.7
    expect(signals.extractionConfidence).toBe(0.7);
  });

  it("ignores stale keys (flight, customer_name) in mandatory extraction", () => {
    const s = session({
      confidence: JSON.stringify({
        origin: 1.0,
        destination: 1.0,
        passengers: 1.0,
        flight: 0.0,
        customer_name: 0.0,
        price: 0.0,
        scheduled_at: 0.0,
        urgency: 0.0,
      }),
    });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: s,
    });
    // only origin(1.0) + dest(1.0) + passengers(1.0) → avg = 1.0
    expect(signals.extractionConfidence).toBe(1.0);
  });

  it("passes clamp01 test", () => {
    const s = session({
      confidence: JSON.stringify({ origin: -0.5, destination: 2.0 }),
    });
    const signals = buildComprehensionSignals({
      text: "test",
      coreIntent: "BOOKING",
      slotStability: defaultSlotStability,
      session: s,
    });
    expect(signals.extractionConfidence).toBeGreaterThanOrEqual(0);
    expect(signals.extractionConfidence).toBeLessThanOrEqual(1);
  });
});

describe("computeComprehensionScore", () => {
  it("computes weighted average correctly", () => {
    const score = computeComprehensionScore({
      intentConfidence: 1.0,
      entityConfidence: 1.0,
      slotCompleteness: 1.0,
      extractionConfidence: 1.0,
      conversationStability: 1.0,
    });
    expect(score).toBe(1.0);
  });

  it("weights match expected proportions", () => {
    const score = computeComprehensionScore({
      intentConfidence: 1.0,
      entityConfidence: 0,
      slotCompleteness: 0,
      extractionConfidence: 0,
      conversationStability: 0,
    });
    // 1.0 * 0.30 = 0.30
    expect(score).toBe(0.30);
  });
});
