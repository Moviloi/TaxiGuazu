import { describe, it, expect } from "vitest";
import type { CoreDecision, FinalDecision, PolicyOutput } from "@/lib/ai/types";
import { assertOutputSource, assertPipelineComplete } from "@/lib/ai/guard";

function makeCoreDecision(overrides?: Partial<CoreDecision>): CoreDecision {
  return {
    intent: "PRE_BOOKING", facts: ["action:quiero"], confidence: 0.9,
    slotStability: { origin: "open", destination: "open" },
    roleLock: { origin: null, destination: null }, ...overrides,
  };
}

function makeFinalDecision(overrides?: Partial<FinalDecision>): FinalDecision {
  return { decision: "EXECUTE", mode: "RESERVA", core: makeCoreDecision(), reason: "test", ...overrides };
}

function makePolicyOutput(overrides?: Partial<PolicyOutput>): PolicyOutput {
  return {
    decision: "EXECUTE", mode: "RESERVA", policyHint: "test", requiresConfirmation: false,
    finalResponse: "OK", requiresUserInput: false, nextExpectedFields: [],
    outputSource: "POLICY", needsGeo: false, needsSaveContext: false, ...overrides,
  };
}

describe("assertOutputSource", () => {
  it("permite outputSource POLICY", () => {
    expect(assertOutputSource("POLICY")).toBe(true);
  });

  it("bloquea outputSource que no es POLICY", () => {
    expect(() => assertOutputSource("DIRECT")).toThrow();
  });
});

describe("assertPipelineComplete", () => {
  it("permite pipeline completo", () => {
    const result = assertPipelineComplete(makeCoreDecision(), makeFinalDecision(), makePolicyOutput());
    expect(result).toBe(true);
  });

  it("bloquea pipeline incompleto (core nulo)", () => {
    const result = assertPipelineComplete(null, makeFinalDecision(), makePolicyOutput());
    expect(result).not.toBe(true);
  });
});
