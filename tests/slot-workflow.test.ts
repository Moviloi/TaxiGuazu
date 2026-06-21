import { describe, it, expect, vi, beforeEach } from "vitest";

const {
  mockGetChatSession,
  mockResetChatSession,
  mockGetConversationalState,
  mockSetConversationalState,
  mockGetActiveTripByPhone,
} = vi.hoisted(() => ({
  mockGetChatSession: vi.fn(),
  mockResetChatSession: vi.fn(),
  mockGetConversationalState: vi.fn(),
  mockSetConversationalState: vi.fn(),
  mockGetActiveTripByPhone: vi.fn(),
}));

vi.mock("@/lib/db/database", () => ({
  getChatSession: mockGetChatSession,
  resetChatSession: mockResetChatSession,
  getActiveTripByPhone: mockGetActiveTripByPhone,
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: mockGetConversationalState,
  setConversationalState: mockSetConversationalState,
}));

vi.mock("@/lib/config/constants", () => ({
  SESSION_INACTIVITY_48H_S: 172800,
}));

import { evaluateWorkflowTransition } from "@/lib/services/workflow/slot-workflow";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";

function makeExtraction(overrides: Partial<ExtractionResult> = {}): ExtractionResult {
  return {
    action: "fallback_regex",
    slots: {},
    overall_confidence: 0.2,
    missing_fields: [],
    clarify_field: null,
    fieldConfidence: {},
    ...overrides,
  } as ExtractionResult;
}

function makeSession(overrides: Record<string, any> = {}) {
  return {
    phone: "+549111",
    slots: null,
    updated_at: Math.floor(Date.now() / 1000),
    ...overrides,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  mockGetChatSession.mockResolvedValue(makeSession());
  mockGetActiveTripByPhone.mockResolvedValue(null);
});

describe("evaluateWorkflowTransition", () => {
  it("idle → collecting_slots (fallback_regex con confianza baja)", async () => {
    mockGetConversationalState.mockResolvedValue("idle");
    const result = await evaluateWorkflowTransition("+549111", makeExtraction());
    expect(result.state).toBe("collecting_slots");
    expect(mockSetConversationalState).toHaveBeenCalledWith("+549111", "collecting_slots", undefined);
  });

  it("collecting_slots → awaiting_confirmation (proceed)", async () => {
    mockGetConversationalState.mockResolvedValue("collecting_slots");
    const result = await evaluateWorkflowTransition("+549111", makeExtraction({ action: "proceed", overall_confidence: 0.9 }));
    expect(result.state).toBe("awaiting_confirmation");
    expect(result.askForConfirmation).toBe(true);
  });

  it("idle → awaiting_confirmation (proceed desde idle)", async () => {
    mockGetConversationalState.mockResolvedValue("idle");
    const result = await evaluateWorkflowTransition("+549111", makeExtraction({ action: "proceed", overall_confidence: 0.9 }));
    expect(result.state).toBe("awaiting_confirmation");
  });

  it("awaiting_confirmation → collecting_slots (clarify)", async () => {
    mockGetConversationalState.mockResolvedValue("awaiting_confirmation");
    const result = await evaluateWorkflowTransition(
      "+549111", makeExtraction({ action: "clarify", clarify_field: "destination", overall_confidence: 0.5 }),
    );
    expect(result.state).toBe("collecting_slots");
    expect(result.clarifyField).toBe("destination");
  });

  it("collecting_slots → collecting_slots (clarify)", async () => {
    mockGetConversationalState.mockResolvedValue("collecting_slots");
    const result = await evaluateWorkflowTransition(
      "+549111", makeExtraction({ action: "clarify", clarify_field: "origin", overall_confidence: 0.5 }),
    );
    expect(result.state).toBe("collecting_slots");
    expect(result.clarifyField).toBe("origin");
  });

  it("awaiting_confirmation → awaiting_confirmation (proceed)", async () => {
    mockGetConversationalState.mockResolvedValue("awaiting_confirmation");
    const result = await evaluateWorkflowTransition("+549111", makeExtraction({ action: "proceed", overall_confidence: 0.9 }));
    expect(result.state).toBe("awaiting_confirmation");
  });

  it("sesión expirada por trip vencido → idle", async () => {
    const past = Math.floor(Date.now() / 1000) - 3600;
    mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_1", scheduled_at: past });
    const result = await evaluateWorkflowTransition("+549111", makeExtraction());
    expect(result.state).toBe("idle");
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
  });

  it("sesión expirada por inactividad >48h → idle", async () => {
    const stale = Math.floor(Date.now() / 1000) - 200000;
    mockGetChatSession.mockResolvedValue(makeSession({ updated_at: stale }));
    const result = await evaluateWorkflowTransition("+549111", makeExtraction());
    expect(result.state).toBe("idle");
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
  });

  it("transición inválida no cambia estado (warn + mantiene)", async () => {
    mockGetConversationalState.mockResolvedValue("awaiting_confirmation");
    const result = await evaluateWorkflowTransition("+549111", makeExtraction({ action: "fallback_regex" }));
    // fallback_regex con currentState !== "idle" mantiene currentState
    expect(result.state).toBe("awaiting_confirmation");
  });
});
