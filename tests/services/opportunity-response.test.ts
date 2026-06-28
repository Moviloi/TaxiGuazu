import { describe, it, expect, vi, beforeEach } from "vitest";

const mockSendWhatsApp = vi.fn().mockResolvedValue(undefined);
const mockInsertMessage = vi.fn().mockResolvedValue(1);
const mockUpdateOpportunityLogResponse = vi.fn().mockResolvedValue(undefined);
const mockClearPendingOpportunity = vi.fn().mockResolvedValue(undefined);
const mockSetTripState = vi.fn().mockResolvedValue(undefined);
const mockResetToIdle = vi.fn().mockResolvedValue(undefined);
const mockGetChatSession = vi.fn();
const mockResetChatSession = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/sender", () => ({ sendWhatsAppMessage: (...args: any[]) => mockSendWhatsApp(...args) }));
vi.mock("@/lib/db/database", () => ({
  getChatSession: (...args: any[]) => mockGetChatSession(...args),
  insertMessage: (...args: any[]) => mockInsertMessage(...args),
  updateOpportunityLogResponse: (...args: any[]) => mockUpdateOpportunityLogResponse(...args),
  clearPendingOpportunity: (...args: any[]) => mockClearPendingOpportunity(...args),
  resetChatSession: (...args: any[]) => mockResetChatSession(...args),
}));
vi.mock("@/lib/db/state-accessors", () => ({
  setTripState: (...args: any[]) => mockSetTripState(...args),
}));
vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  resetToIdle: (...args: any[]) => mockResetToIdle(...args),
}));

vi.mock("@/lib/ai/patterns", () => ({
  isAffirmativeMessage: vi.fn(),
  isNegativeMessage: vi.fn(),
}));
vi.mock("@/lib/ai/response-builder", () => ({
  buildOpportunityAcceptedMessage: vi.fn().mockReturnValue("¡Genial! Te esperamos."),
  buildOpportunityDeclinedMessage: vi.fn().mockReturnValue("No hay problema, gracias por avisarnos."),
}));
vi.mock("@/lib/services/learning/event-tracking", () => ({
  logUserResponse: vi.fn(),
}));

import { handleOpportunityResponse } from "@/lib/services/workflow/opportunity-response";
import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";

function makeSession(overrides: Record<string, any> = {}) {
  return {
    conversational_state: null,
    dispatch_state: null,
    trip_state: null,
    pending_opportunity: null,
    ...overrides,
  };
}

const validPending = JSON.stringify({ label: "vuelo_gratis", expires_at: Date.now() / 1000 + 86400, logId: 42 });

beforeEach(() => {
  vi.clearAllMocks();
});

describe("handleOpportunityResponse", () => {
  it("returns false when trip_state is not 'opportunity'", async () => {
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: null }));
    const result = await handleOpportunityResponse("+549111", "mensaje", 1, null);
    expect(result).toBe(false);
    expect(mockClearPendingOpportunity).not.toHaveBeenCalled();
  });

  it("returns false when session has no pending_opportunity", async () => {
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: null }));
    const result = await handleOpportunityResponse("+549111", "mensaje", 1, null);
    expect(result).toBe(false);
  });

  it("processes affirmative response and clears trip_state", async () => {
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);
    vi.mocked(isNegativeMessage).mockReturnValue(false);
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: validPending }));

    const result = await handleOpportunityResponse("+549111", "sí", 1, null);

    expect(result).toBe(true);
    expect(mockSetTripState).toHaveBeenCalledWith("+549111", null);
    expect(mockClearPendingOpportunity).toHaveBeenCalledWith("+549111");
    expect(mockResetToIdle).toHaveBeenCalledWith(1);
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
    expect(mockSendWhatsApp).toHaveBeenCalledWith("+549111", "¡Genial! Te esperamos.");
    expect(mockInsertMessage).toHaveBeenCalledWith(1, "assistant", "¡Genial! Te esperamos.");
  });

  it("processes negative response and clears trip_state", async () => {
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: validPending }));

    const result = await handleOpportunityResponse("+549111", "no gracias", 1, null);

    expect(result).toBe(true);
    expect(mockSetTripState).toHaveBeenCalledWith("+549111", null);
    expect(mockClearPendingOpportunity).toHaveBeenCalledWith("+549111");
    expect(mockResetToIdle).toHaveBeenCalledWith(1);
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
    expect(mockSendWhatsApp).toHaveBeenCalledWith("+549111", "No hay problema, gracias por avisarnos.");
  });

  it("handles unrelated message: clears trip_state and pending_opportunity", async () => {
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(false);
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: validPending }));

    const result = await handleOpportunityResponse("+549111", "cómo está el clima", 1, null);

    expect(result).toBe(false);
    expect(mockSetTripState).toHaveBeenCalledWith("+549111", null);
    expect(mockClearPendingOpportunity).toHaveBeenCalledWith("+549111");
    expect(mockResetToIdle).toHaveBeenCalledWith(1);
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
  });

  it("handles expired opportunity: clears trip_state", async () => {
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(false);
    const expired = JSON.stringify({ label: "vuelo_gratis", expires_at: Date.now() / 1000 - 3600, logId: 42 });
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: expired }));

    const result = await handleOpportunityResponse("+549111", "sí", 1, null);

    expect(result).toBe(false);
    expect(mockSetTripState).toHaveBeenCalledWith("+549111", null);
    expect(mockClearPendingOpportunity).toHaveBeenCalledWith("+549111");
    expect(mockResetToIdle).toHaveBeenCalledWith(1);
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
  });

  it("handles invalid JSON in pending_opportunity: clears trip_state", async () => {
    mockGetChatSession.mockResolvedValue(makeSession({ trip_state: "opportunity", pending_opportunity: "not-json" }));

    const result = await handleOpportunityResponse("+549111", "sí", 1, null);

    expect(result).toBe(false);
    expect(mockSetTripState).toHaveBeenCalledWith("+549111", null);
    expect(mockClearPendingOpportunity).toHaveBeenCalledWith("+549111");
    expect(mockResetToIdle).toHaveBeenCalledWith(1);
    expect(mockResetChatSession).toHaveBeenCalledWith("+549111");
  });
});
