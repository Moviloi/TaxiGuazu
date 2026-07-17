import { describe, it, expect } from "vitest";
import {
  geoSingleCandidateRule,
  geoContextualInferenceRule,
  geoHighEntityConfidenceRule,
  geoRiskNodeRule,
  geoAliasExactRule,
} from "@/lib/drl/rules/geo-desambiguacion";
import type { GeoDisambiguationInput } from "@/lib/drl/rules/geo-desambiguacion";

function makeInput(overrides: Partial<GeoDisambiguationInput>): GeoDisambiguationInput {
  return {
    userText: "centro",
    candidateCount: 2,
    hasResolvedOtherSlot: false,
    slotName: "destination",
    candidateScores: [80, 40],
    ...overrides,
  };
}

describe("geo-desambiguacion DRL rules", () => {
  // ── G1: Single candidate ────────────────────────────────────────────

  it("G1: passes when candidateCount is 1", () => {
    const result = geoSingleCandidateRule(makeInput({ candidateCount: 1 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(1.0);
  });

  it("G1: fails when candidateCount > 1", () => {
    const result = geoSingleCandidateRule(makeInput({ candidateCount: 5 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── G2: Contextual inference ────────────────────────────────────────

  it("G2: passes when other slot is resolved and multiple candidates", () => {
    const result = geoContextualInferenceRule(makeInput({ hasResolvedOtherSlot: true, candidateCount: 3 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("G2: fails without context", () => {
    const result = geoContextualInferenceRule(makeInput({ hasResolvedOtherSlot: false }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("G2: fails with single candidate (G1 already handles that case)", () => {
    const result = geoContextualInferenceRule(makeInput({ hasResolvedOtherSlot: true, candidateCount: 1 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── G3: High entity confidence ──────────────────────────────────────

  it("G3: passes when best score dominates", () => {
    const result = geoHighEntityConfidenceRule(makeInput({ candidateScores: [95, 30] }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("G3: fails when scores are close", () => {
    const result = geoHighEntityConfidenceRule(makeInput({ candidateScores: [70, 65] }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("G3: fails when best score is below threshold", () => {
    const result = geoHighEntityConfidenceRule(makeInput({ candidateScores: [40, 10] }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("G3: fails without candidateScores", () => {
    const result = geoHighEntityConfidenceRule(makeInput({ candidateScores: undefined }));
    expect(result.passed).toBe(false);
  });

  // ── G4: Risk node ───────────────────────────────────────────────────

  it("G4: passes with context and multiple candidates", () => {
    const result = geoRiskNodeRule(makeInput({ hasResolvedOtherSlot: true, candidateCount: 3 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("G4: fails without context", () => {
    const result = geoRiskNodeRule(makeInput({ hasResolvedOtherSlot: false, candidateCount: 3 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── G5: Alias exact ─────────────────────────────────────────────────

  it("G5: passes when text is long enough and multiple candidates", () => {
    const result = geoAliasExactRule(makeInput({ userText: "aeropuerto", candidateCount: 3 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("G5: fails when text is too short", () => {
    const result = geoAliasExactRule(makeInput({ userText: "ab", candidateCount: 3 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("G5: fails with single candidate (G1 already handles that case)", () => {
    const result = geoAliasExactRule(makeInput({ userText: "aeropuerto", candidateCount: 1 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── All rules return expected structure ────────────────────────────────

  it("all rules return correct structure", () => {
    const input = makeInput({ candidateCount: 3, hasResolvedOtherSlot: true, candidateScores: [90, 30, 20] });
    const rules = [
      geoSingleCandidateRule,
      geoContextualInferenceRule,
      geoHighEntityConfidenceRule,
      geoRiskNodeRule,
      geoAliasExactRule,
    ];

    for (const rule of rules) {
      const result = rule(input);
      expect(result.ruleFamily).toBe("geo-desambiguacion");
      expect(result.ruleName).toBeTruthy();
      expect(["PROCEED", "ESCALATE"]).toContain(result.decision);
      expect(result.reason).toBeTruthy();
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    }
  });
});
