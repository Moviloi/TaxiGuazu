import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/whatsapp/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/database", () => ({
  insertMessage: vi.fn().mockResolvedValue(undefined),
  updateChatSessionComprehension: vi.fn().mockResolvedValue(undefined),
  insertF4Log: vi.fn().mockResolvedValue(undefined),
  setChatSessionEscalationReason: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/memory/predictive-routing", () => ({
  enrichComprehensionSignals: vi.fn().mockReturnValue({
    intentConfidence: 0.9,
    entityConfidence: 0.9,
    slotCompleteness: 0.2,
    extractionConfidence: 0.5,
    conversationStability: 0.7,
  }),
}));

vi.mock("@/lib/services/extraction/comprehension", () => ({
  buildComprehensionSignals: vi.fn().mockReturnValue({}),
  computeComprehensionScore: vi.fn().mockReturnValue(0.9),
  getComprehensionState: vi.fn(),
  getRecoveryMessage: vi.fn().mockReturnValue("¿A dónde necesitás ir?"),
}));

vi.mock("@/lib/services/learning/event-tracking", () => ({
  logEscalation: vi.fn(),
}));

vi.mock("@/lib/services/learning/learning-utils", () => ({
  recordComprehensionOutcome: vi.fn(),
  getComprehensionThresholdAdjustment: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildEscalationMessage: vi.fn().mockReturnValue("Te transfiero con un operador"),
}));

import { runComprehensionCheck } from "@/lib/services/extraction/comprehension-runner";
import { getComprehensionState } from "@/lib/services/extraction/comprehension";
import type { CoreDecision } from "@/lib/ai/types";
import type { PredictedContext } from "@/lib/services/memory/predictive-routing";

function makeCoreDecision(overrides?: Partial<CoreDecision>): CoreDecision {
  return {
    intent: "BOOKING",
    facts: [],
    confidence: 0.8,
    slotStability: { origin: "open", destination: "open" },
    roleLock: { origin: null, destination: null },
    ...overrides,
  };
}

function makePredictedContext(overrides?: Partial<PredictedContext>): PredictedContext {
  return {
    entityPrediction: { candidates: [], confidence: 0 },
    intentPrediction: { predictedIntent: "BOOKING", confidence: 0.8 },
    entityBias: [],
    ...overrides,
  };
}

describe("runComprehensionCheck", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns false when state is FULL_CONTROL (continue)", async () => {
    vi.mocked(getComprehensionState).mockReturnValue("FULL_CONTROL");

    const result = await runComprehensionCheck({
      phone: "+54911111111",
      text: "Hola, quiero ir al centro",
      conversationId: 1,
      leadCore: makeCoreDecision(),
      predictedContext: makePredictedContext(),
      session: null,
    });

    expect(result).toBe(false);
  });

  it("returns false when state is CLARIFICATION (continue)", async () => {
    vi.mocked(getComprehensionState).mockReturnValue("CLARIFICATION");

    const result = await runComprehensionCheck({
      phone: "+54911111111",
      text: "Quiero ir al centro",
      conversationId: 1,
      leadCore: makeCoreDecision(),
      predictedContext: makePredictedContext(),
      session: null,
    });

    expect(result).toBe(false);
  });

  it("returns true and sends recovery message when state is RECOVERY", async () => {
    vi.mocked(getComprehensionState).mockReturnValue("RECOVERY");

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");

    const result = await runComprehensionCheck({
      phone: "+54911111111",
      text: "No entiendo",
      conversationId: 1,
      leadCore: makeCoreDecision(),
      predictedContext: makePredictedContext(),
      session: null,
    });

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "¿A dónde necesitás ir?");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "¿A dónde necesitás ir?");
  });

  it("returns true and sends escalation message when state is ESCALATION", async () => {
    vi.mocked(getComprehensionState).mockReturnValue("ESCALATION");

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");
    const { notifyAdmin } = await import("@/lib/services/admin/admin.service");

    const result = await runComprehensionCheck({
      phone: "+54911111111",
      text: "asdfgh",
      conversationId: 1,
      leadCore: makeCoreDecision(),
      predictedContext: makePredictedContext(),
      session: null,
    });

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "Te transfiero con un operador");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "Te transfiero con un operador");
    expect(notifyAdmin).toHaveBeenCalled();
  });

  it("logs and persists comprehension data on every call", async () => {
    vi.mocked(getComprehensionState).mockReturnValue("FULL_CONTROL");

    const { updateChatSessionComprehension } = await import("@/lib/db/database");
    const { insertF4Log } = await import("@/lib/db/database");
    const { recordComprehensionOutcome } = await import("@/lib/services/learning/learning-utils");

    await runComprehensionCheck({
      phone: "+54911111111",
      text: "Buen día",
      conversationId: 2,
      leadCore: makeCoreDecision(),
      predictedContext: makePredictedContext(),
      session: null,
    });

    expect(updateChatSessionComprehension).toHaveBeenCalledWith("+54911111111", "FULL_CONTROL", 0.9);
    expect(insertF4Log).toHaveBeenCalledWith("2", 0.9, "FULL_CONTROL", null);
    expect(recordComprehensionOutcome).toHaveBeenCalledWith(false);
  });
});
