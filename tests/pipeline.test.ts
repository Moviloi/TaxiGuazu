import { describe, it, expect, vi } from "vitest";
import { processLead } from "../src/lib/core/pipeline";
import type { DecisionInput } from "../src/lib/core/types";
import type { ExecutionContext, ExecutionDeps } from "../src/lib/services/executionEngine";

function makeDecisionInput(overrides: Partial<DecisionInput> = {}): DecisionInput {
  return {
    text: "IGR a Amerian",
    slots: { origin: "IGR", destination: "Amerian" },
    confidence: 0.9,
    lang: "es",
    ...overrides,
  };
}

function makeExecCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    phone: "+54911111111",
    conversationId: 1,
    text: "IGR a Amerian",
    history: [],
    extractionCtx: undefined,
    lang: "es",
    intent: "MOVE",
    ...overrides,
  };
}

function makeDeps(): ExecutionDeps & { send: any; persist: any; handler: any } {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    persist: vi.fn().mockResolvedValue(1),
    handler: vi.fn().mockReturnValue({ policy: { finalResponse: "ok", outputSource: "POLICY" } }),
    geo: {
      resolveGeoRoute: vi.fn().mockReturnValue({}),
      resolveZones: vi.fn().mockReturnValue({}),
      expandZones: vi.fn().mockReturnValue({}),
      computeProximityScore: vi.fn().mockReturnValue({}),
    },
    fare: {
      calculateFare: vi.fn().mockReturnValue({ category: "standard", finalPrice: 10000, confidence: 1 }),
    },
    memory: {
      saveContext: vi.fn().mockResolvedValue(undefined),
    },
    guard: vi.fn(),
  };
}

describe("processLead", () => {
  it("returns 'completed' for BOOKING_SUMMARY decision (all fields present)", async () => {
    const result = await processLead(
      makeDecisionInput({ confidence: 0.9, slots: { origin: "IGR", destination: "Amerian", scheduled_at: "2026-06-08T10:00:00.000Z" } }),
      makeExecCtx(),
      makeDeps(),
    );
    expect(result).toBe("completed");
  });

  it("returns 'incomplete' for CONFIRM_INTERPRETATION decision (no datetime)", async () => {
    const result = await processLead(
      makeDecisionInput({ confidence: 0.6, slots: { origin: "IGR", destination: "Amerian" } }),
      makeExecCtx(),
      makeDeps(),
    );
    expect(result).toBe("incomplete");
  });

  it("returns 'incomplete' for CLARIFY decision (low confidence)", async () => {
    const result = await processLead(
      makeDecisionInput({ confidence: 0.3, slots: { origin: "IGR", destination: "Centro" } }),
      makeExecCtx(),
      makeDeps(),
    );
    expect(result).toBe("incomplete");
  });

  it("returns 'incomplete' for INFO_PRICE decision", async () => {
    const result = await processLead(
      makeDecisionInput({
        text: "cuánto cuesta",
        slots: { origin: "IGR", destination: "Centro" },
        tariffMatch: { matched: true, price: 15000 },
        confidence: 0.9,
      }),
      makeExecCtx({ intent: "INFO" }),
      makeDeps(),
    );
    expect(result).toBe("incomplete");
  });

  it("returns 'incomplete' for ASK_DESTINATION decision (missing destination)", async () => {
    const result = await processLead(
      makeDecisionInput({
        text: "del aeropuerto",
        slots: { origin: "Aeropuerto IGR" },
        confidence: 0,
      }),
      makeExecCtx({ intent: "AMBIGUOUS" }),
      makeDeps(),
    );
    expect(result).toBe("incomplete");
  });

  it("returns 'incomplete' for CONFIRM_ROUTE decision", async () => {
    const result = await processLead(
      makeDecisionInput({
        text: "sí",
        slots: {},
        confidence: 0,
        tariffMatch: undefined,
      }),
      makeExecCtx({ intent: "CONFIRM" }),
      makeDeps(),
    );
    expect(result).toBe("incomplete");
  });

  it("handles errors gracefully when handler crashes", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockImplementation(() => { throw new Error("handler crash"); });
    const result = await processLead(
      makeDecisionInput({
        text: "sí",
        slots: {},
        confidence: 0,
        tariffMatch: undefined,
      }),
      makeExecCtx({ text: "sí", intent: "CONFIRM" }),
      deps,
    );
    expect(result).toBe("error");
  });
});
