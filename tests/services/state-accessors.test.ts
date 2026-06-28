import { describe, it, expect, vi } from "vitest";

const mockGetChatSession = vi.fn();
const mockUpdateChatSessionConversation = vi.fn().mockResolvedValue(undefined);
const mockGetDb = vi.fn();
const mockUpdateChatSessionComprehension = vi.fn().mockResolvedValue(undefined);

vi.mock("@/lib/db/database", () => ({
  getChatSession: mockGetChatSession,
  updateChatSessionConversation: mockUpdateChatSessionConversation,
  getDb: mockGetDb,
}));

vi.mock("@/lib/db/domains/learning", () => ({
  updateChatSessionComprehension: mockUpdateChatSessionComprehension,
}));

const {
  getConversationalState,
  setConversationalState,
  getDispatchState,
  setDispatchState,
  setTripState,
  getComprehensionState,
  setComprehensionState,
} = await import("@/lib/db/state-accessors");

function mockSession(overrides: Record<string, any> = {}) {
  mockGetChatSession.mockResolvedValue({
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
    ...overrides,
  } as any);
}

describe("getConversationalState", () => {
  it("lee conversational_state", async () => {
    mockSession({ conversational_state: "collecting_slots" });
    expect(await getConversationalState("549111111")).toBe("collecting_slots");
  });

  it("devuelve 'idle' cuando conversational_state es null", async () => {
    mockSession();
    expect(await getConversationalState("549111111")).toBe("idle");
  });

  it("devuelve 'idle' cuando session es null", async () => {
    mockGetChatSession.mockResolvedValue(null);
    expect(await getConversationalState("549111111")).toBe("idle");
  });
});

describe("setConversationalState", () => {
  it("llama updateChatSessionConversation con estado y clarifyField", async () => {
    await setConversationalState("549111111", "awaiting_confirmation", "origin");
    expect(mockUpdateChatSessionConversation).toHaveBeenCalledWith("549111111", "awaiting_confirmation", "origin");
  });
});

describe("getDispatchState", () => {
  it("lee dispatch_state", async () => {
    mockSession({ dispatch_state: "nivel_1" });
    expect(await getDispatchState("549111111")).toBe("nivel_1");
  });

  it("devuelve 'idle' cuando dispatch_state es null", async () => {
    mockSession();
    expect(await getDispatchState("549111111")).toBe("idle");
  });

  it("devuelve 'idle' cuando session es null", async () => {
    mockGetChatSession.mockResolvedValue(null);
    expect(await getDispatchState("549111111")).toBe("idle");
  });
});

describe("setDispatchState", () => {
  it("escribe dispatch_state mediante getDb", async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    mockGetDb.mockReturnValue({ execute: mockExecute });
    await setDispatchState("549111111", "nivel_1");
    expect(mockExecute).toHaveBeenCalledWith({
      sql: "UPDATE chat_sessions SET dispatch_state = ?, updated_at = unixepoch() WHERE phone = ?",
      args: ["nivel_1", "549111111"],
    });
  });
});

describe("setTripState", () => {
  it("escribe trip_state mediante getDb", async () => {
    const mockExecute = vi.fn().mockResolvedValue(undefined);
    mockGetDb.mockReturnValue({ execute: mockExecute });
    await setTripState("549111111", "opportunity");
    expect(mockExecute).toHaveBeenCalledWith({
      sql: "UPDATE chat_sessions SET trip_state = ?, updated_at = unixepoch() WHERE phone = ?",
      args: ["opportunity", "549111111"],
    });
  });

  it("usa tx.execute cuando se proporciona tx", async () => {
    const mockTxExecute = vi.fn().mockResolvedValue(undefined);
    const tx = { execute: mockTxExecute } as any;
    mockGetDb.mockReturnValue({ execute: vi.fn() });
    await setTripState("549111111", "opportunity", tx);
    expect(mockTxExecute).toHaveBeenCalledWith({
      sql: "UPDATE chat_sessions SET trip_state = ?, updated_at = unixepoch() WHERE phone = ?",
      args: ["opportunity", "549111111"],
    });
  });
});

describe("getComprehensionState", () => {
  it("lee comprehension_state", async () => {
    mockSession({ comprehension_state: "CLARIFICATION" });
    expect(await getComprehensionState("549111111")).toBe("CLARIFICATION");
  });

  it("devuelve null cuando comprehension_state es null", async () => {
    mockSession();
    expect(await getComprehensionState("549111111")).toBeNull();
  });
});

describe("setComprehensionState", () => {
  it("llama updateChatSessionComprehension con estado y score", async () => {
    await setComprehensionState("549111111", "CLARIFICATION", 0.85);
    expect(mockUpdateChatSessionComprehension).toHaveBeenCalledWith("549111111", "CLARIFICATION", 0.85);
  });

  it("usa score 0 cuando no se proporciona", async () => {
    await setComprehensionState("549111111", "COMPLETE");
    expect(mockUpdateChatSessionComprehension).toHaveBeenCalledWith("549111111", "COMPLETE", 0);
  });
});

describe("independencia de dominios", () => {
  it("conversational collecting_slots NO afecta dispatch_state", async () => {
    mockSession({ conversational_state: "collecting_slots", dispatch_state: null });
    expect(await getConversationalState("549111111")).toBe("collecting_slots");
    expect(await getDispatchState("549111111")).toBe("idle");
  });

  it("dispatch nivel_1 NO cambia conversational_state", async () => {
    mockSession({ dispatch_state: "nivel_1", conversational_state: null });
    expect(await getDispatchState("549111111")).toBe("nivel_1");
    expect(await getConversationalState("549111111")).toBe("idle");
  });

  it("dominios son independientes: conversational + dispatch", async () => {
    mockSession({
      conversational_state: "collecting_slots",
      dispatch_state: "nivel_1",
    });
    expect(await getConversationalState("549111111")).toBe("collecting_slots");
    expect(await getDispatchState("549111111")).toBe("nivel_1");
  });

  it("Caso A: conversational collecting_slots + dispatch waiting_driver es válido", async () => {
    mockSession({
      conversational_state: "collecting_slots",
      dispatch_state: "waiting_driver",
    });
    expect(await getConversationalState("549111111")).toBe("collecting_slots");
    expect(await getDispatchState("549111111")).toBe("waiting_driver");
  });

  it("Caso C: conversational collecting_slots + dispatch idle es válido", async () => {
    mockSession({
      conversational_state: "collecting_slots",
      dispatch_state: "idle",
    });
    expect(await getConversationalState("549111111")).toBe("collecting_slots");
    expect(await getDispatchState("549111111")).toBe("idle");
  });

  it("Caso D: dispatch closed + conversational idle es válido", async () => {
    mockSession({
      conversational_state: "idle",
      dispatch_state: "closed",
    });
    expect(await getDispatchState("549111111")).toBe("closed");
    await setConversationalState("549111111", "idle");
    mockSession({
      conversational_state: "idle",
      dispatch_state: "closed",
    });
    expect(await getConversationalState("549111111")).toBe("idle");
    expect(await getDispatchState("549111111")).toBe("closed");
  });
});
