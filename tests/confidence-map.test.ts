import { describe, it, expect } from "vitest";
import { buildConfidenceMap } from "@/lib/services/extraction/confidence-map";
import type { CoreDecision } from "@/lib/ai/types";
import type { ExtractionResult, TripExtraction } from "@/lib/ai/extraction-schema";

function makeCore(overrides: Partial<CoreDecision> = {}): CoreDecision {
  return {
    intent: "CONSULTA",
    facts: [],
    confidence: 0.5,
    slotStability: { origin: "open", destination: "open" },
    roleLock: { origin: null, destination: null },
    ...overrides,
  };
}

function makeExtractionResult(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    slots: {},
    overall_confidence: 0,
    action: "clarify",
    ...overrides,
  };
}

describe("ConfidenceMap", () => {
  it("intent confidence comes from CoreDecision.confidence", () => {
    const core = makeCore({ confidence: 0.85, intent: "NOW" });
    const er = makeExtractionResult();
    const cm = buildConfidenceMap(core, er);
    expect(cm.intent).toBe(0.85);
  });

  it("origin/destination/passengers come from extraction slot scores", () => {
    const core = makeCore();
    const er = makeExtractionResult({
      slots: {
        origin: { value: "Centro", score: 0.6, reason: "ambiguous_term" },
        destination: { value: "Aeropuerto", score: 1.0, reason: "exact_alias_match" },
        passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      },
    });
    const cm = buildConfidenceMap(core, er);
    expect(cm.origin).toBe(0.6);
    expect(cm.destination).toBe(1.0);
    expect(cm.passengers).toBe(1.0);
  });

  it("date maps from scheduled_at slot score", () => {
    const core = makeCore();
    const er = makeExtractionResult({
      slots: {
        scheduled_at: { value: "2026-07-15", score: 1.0, reason: "valid_iso_date" },
      },
    });
    const cm = buildConfidenceMap(core, er);
    expect(cm.date).toBe(1.0);
  });

  it("date is 0 when scheduled_at is missing", () => {
    const cm = buildConfidenceMap(makeCore(), makeExtractionResult());
    expect(cm.date).toBe(0);
  });

  it("time is 0.6 when CORE detects time fact", () => {
    const core = makeCore({ facts: ["time:14:30"] });
    const cm = buildConfidenceMap(core, makeExtractionResult());
    expect(cm.time).toBe(0.6);
  });

  it("time is 0 when CORE does not detect time fact", () => {
    const cm = buildConfidenceMap(makeCore(), makeExtractionResult());
    expect(cm.time).toBe(0);
  });

  describe("mode confidence", () => {
    it("is 0.85 when urgency=ahora and no schedule", () => {
      const core = makeCore({ facts: ["now:ahora"] });
      const er = makeExtractionResult();
      const extractionData: TripExtraction = { urgency: "ahora" };
      const cm = buildConfidenceMap(core, er, extractionData);
      expect(cm.mode).toBe(0.85);
    });

    it("is 0.85 when CORE detects now fact and no schedule", () => {
      const core = makeCore({ facts: ["now:urgente"] });
      const cm = buildConfidenceMap(core, makeExtractionResult());
      expect(cm.mode).toBe(0.85);
    });

    it("is 0.80 when scheduled_at present and no urgency", () => {
      const core = makeCore();
      const er = makeExtractionResult();
      const extractionData: TripExtraction = { scheduled_at: "2026-07-15" };
      const cm = buildConfidenceMap(core, er, extractionData);
      expect(cm.mode).toBe(0.80);
    });

    it("is 0.50 when both now signal and schedule present", () => {
      const core = makeCore({ facts: ["now:ahora"] });
      const er = makeExtractionResult();
      const extractionData: TripExtraction = { urgency: "ahora", scheduled_at: "2026-07-15" };
      const cm = buildConfidenceMap(core, er, extractionData);
      expect(cm.mode).toBe(0.5);
    });

    it("is 0.30 when neither urgency nor schedule present", () => {
      const cm = buildConfidenceMap(makeCore(), makeExtractionResult());
      expect(cm.mode).toBe(0.30);
    });
  });

  it("luggage is 0 (prepared for future use)", () => {
    const cm = buildConfidenceMap(makeCore(), makeExtractionResult());
    expect(cm.luggage).toBe(0);
  });

  it("defaults missing slots to 0", () => {
    const cm = buildConfidenceMap(makeCore(), makeExtractionResult());
    expect(cm.origin).toBe(0);
    expect(cm.destination).toBe(0);
    expect(cm.passengers).toBe(0);
  });

  it("survives empty facts array", () => {
    const cm = buildConfidenceMap(makeCore({ facts: [] }), makeExtractionResult());
    expect(cm.intent).toBe(0.5);
    expect(cm.time).toBe(0);
    expect(cm.mode).toBe(0.30);
  });
});
