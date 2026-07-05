import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetConversationById = vi.fn();
const mockGetDispatchState = vi.fn();
const mockSetDispatchState = vi.fn();

vi.mock("@/lib/db/core/connection", () => ({
  getDb: vi.fn(() => ({ execute: vi.fn() })),
  ensureSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/database", () => ({
  getConversationById: mockGetConversationById,
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  getExpiredByState: vi.fn().mockResolvedValue([]),
  getStaleWorkflowsFromDb: vi.fn().mockResolvedValue([]),
  assignWorkflowAtomic: vi.fn().mockResolvedValue(true),
  getDb: vi.fn(() => ({ execute: vi.fn() })),
  ensureSchema: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getDispatchState: mockGetDispatchState,
  setDispatchState: mockSetDispatchState,
}));

function mockConv(phone: string) {
  mockGetConversationById.mockResolvedValue({ id: 1, phone, taken_by_human: null, created_at: 0, last_message_at: 0 });
}

const {
  advanceToNivel1,
  advanceToNivel2,
  advanceToNivel3,
  advanceToWaitingDriver,
  closeWorkflow,
  resetToIdle,
  getDispatchWorkflow,
} = await import("@/lib/services/dispatch/dispatch-workflow");

describe("dispatch-workflow transitions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockConv("+549111");
  });

  it("idle → nivel_1 (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("idle");
    await advanceToNivel1(1, "+549111");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "nivel_1");
  });

  it("nivel_1 → nivel_2 (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("nivel_1");
    await advanceToNivel2(1, "+549111");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "nivel_2");
  });

  it("nivel_2 → nivel_3 (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("nivel_2");
    await advanceToNivel3(1, "+549111");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "nivel_3");
  });

  it("nivel_3 → closed (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("nivel_3");
    await closeWorkflow(1, "DispatchAbandoned");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "closed");
  });

  it("idle → waiting_driver (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("idle");
    await advanceToWaitingDriver(1, "+549111");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "waiting_driver");
  });

  it("waiting_driver → closed (válido)", async () => {
    mockGetDispatchState.mockResolvedValue("waiting_driver");
    await closeWorkflow(1, "DispatchAbandoned");
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "closed");
  });

  it("closed → cualquiera es inválido (no revierte)", async () => {
    mockGetDispatchState.mockResolvedValue("closed");
    await advanceToNivel1(1, "+549111");
    // Se escribe igual (log.warn previo)
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "nivel_1");
  });

  it("resetToIdle escribe idle", async () => {
    mockGetDispatchState.mockResolvedValue("closed");
    await resetToIdle(1);
    expect(mockSetDispatchState).toHaveBeenCalledWith("+549111", "idle");
  });

  it("getDispatchWorkflow retorna null sin conversación", async () => {
    mockGetConversationById.mockResolvedValue(null);
    const result = await getDispatchWorkflow(1);
    expect(result).toBeNull();
  });

  it("getDispatchWorkflow retorna estado idle por defecto", async () => {
    mockGetDispatchState.mockResolvedValue(null);
    const result = await getDispatchWorkflow(1);
    expect(result).toEqual({ conversationId: 1, phone: "+549111", state: "idle" });
  });

  it("closeWorkflow sin conversación no lanza error", async () => {
    mockGetConversationById.mockResolvedValue(null);
    await expect(closeWorkflow(1, "DispatchAbandoned")).resolves.not.toThrow();
  });

  it("resetToIdle sin conversación no lanza error", async () => {
    mockGetConversationById.mockResolvedValue(null);
    await expect(resetToIdle(1)).resolves.not.toThrow();
  });
});
