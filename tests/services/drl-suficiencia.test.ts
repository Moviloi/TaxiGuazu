import { describe, it, expect } from "vitest";
import {
  s1SlotsComplete,
  s2SlotPartial,
  s3LocationMention,
  s4RecoveryContext,
} from "@/lib/drl/rules/suficiencia";
import type { SuficienciaInput } from "@/lib/drl/rules/suficiencia";

function makeInput(overrides: Partial<SuficienciaInput>): SuficienciaInput {
  return {
    hasAnySlotResolved: false,
    hasBothSlotsResolved: false,
    resolvedSlotCount: 0,
    hasLocationMention: false,
    hasRoleLockLocation: false,
    hasLocationAmbiguousFact: false,
    hasLocationFact: false,
    comprehensionScore: 0.3,
    evaluationType: "reinterpret",
    ...overrides,
  };
}

describe("suficiencia DRL rules", () => {
  // ── S1: Slots Complete ──────────────────────────────────────────────

  it("S1: passes when both slots are resolved", () => {
    const result = s1SlotsComplete(makeInput({ hasBothSlotsResolved: true, resolvedSlotCount: 2 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(1.0);
    expect(result.ruleName).toBe("s1-slots-complete");
  });

  it("S1: fails when no slots resolved", () => {
    const result = s1SlotsComplete(makeInput({ hasBothSlotsResolved: false }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("S1: fails when only one slot resolved", () => {
    const result = s1SlotsComplete(makeInput({ hasAnySlotResolved: true, hasBothSlotsResolved: false, resolvedSlotCount: 1 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── S2: Slot Partial ────────────────────────────────────────────────

  it("S2: passes when one slot resolved (not both)", () => {
    const result = s2SlotPartial(makeInput({ hasAnySlotResolved: true, hasBothSlotsResolved: false, resolvedSlotCount: 1 }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(0.9);
    expect(result.ruleName).toBe("s2-slot-partial");
  });

  it("S2: fails when no slots resolved", () => {
    const result = s2SlotPartial(makeInput({ hasAnySlotResolved: false }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("S2: fails when both slots resolved (S1 handles that case)", () => {
    const result = s2SlotPartial(makeInput({ hasAnySlotResolved: true, hasBothSlotsResolved: true, resolvedSlotCount: 2 }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── S3: Location Mention ────────────────────────────────────────────

  it("S3: passes when text mentions location and no slots resolved", () => {
    const result = s3LocationMention(makeInput({ hasLocationMention: true, hasAnySlotResolved: false }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(0.7);
    expect(result.ruleName).toBe("s3-location-mention");
  });

  it("S3: fails when no location mention", () => {
    const result = s3LocationMention(makeInput({ hasLocationMention: false }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("S3: fails when slot already resolved (S1/S2 handle those cases)", () => {
    const result = s3LocationMention(makeInput({ hasLocationMention: true, hasAnySlotResolved: true }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  // ── S4: Recovery Context ────────────────────────────────────────────

  it("S4: passes for recovery when roleLock has location", () => {
    const result = s4RecoveryContext(makeInput({
      evaluationType: "recovery",
      hasRoleLockLocation: true,
    }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.ruleName).toBe("s4-recovery-context");
  });

  it("S4: passes for recovery when location fact exists", () => {
    const result = s4RecoveryContext(makeInput({
      evaluationType: "recovery",
      hasLocationFact: true,
    }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("S4: passes for recovery when text mentions location", () => {
    const result = s4RecoveryContext(makeInput({
      evaluationType: "recovery",
      hasLocationMention: true,
    }));
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
  });

  it("S4: fails for recovery when no context available", () => {
    const result = s4RecoveryContext(makeInput({
      evaluationType: "recovery",
      hasRoleLockLocation: false,
      hasLocationFact: false,
      hasLocationMention: false,
    }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });

  it("S4: fails for reinterpret evaluation type (not applicable)", () => {
    const result = s4RecoveryContext(makeInput({
      evaluationType: "reinterpret",
      hasRoleLockLocation: true,
    }));
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
  });
});
