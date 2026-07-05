import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Hoisted mocks (needed for vi.mock factory hoisting) ──

const { mockExecute, mockGetDb, mockEnsureSchema, mockGetActiveTripByPhone, mockGetConversationById, mockQueryOne } = vi.hoisted(() => ({
  mockExecute: vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 }),
  mockGetDb: vi.fn(() => ({ execute: mockExecute })),
  mockEnsureSchema: vi.fn().mockResolvedValue(undefined),
  mockGetActiveTripByPhone: vi.fn(),
  mockGetConversationById: vi.fn(),
  mockQueryOne: vi.fn(),
}));

// ── Mocks (hoisted by vitest) ──

vi.mock("@/lib/db/core/connection", () => ({
  getDb: mockGetDb,
  ensureSchema: mockEnsureSchema,
}));

vi.mock("@/lib/db/core/helpers", () => ({
  queryOne: mockQueryOne,
  query: vi.fn(),
  levenshtein: vi.fn(),
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getDispatchState: vi.fn().mockResolvedValue("idle"),
  setDispatchState: vi.fn().mockResolvedValue(undefined),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
  getConversationalState: vi.fn().mockResolvedValue("idle"),
  setTripState: vi.fn().mockResolvedValue(undefined),
  getComprehensionState: vi.fn().mockResolvedValue(null),
  setComprehensionState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/database", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getConversationById: mockGetConversationById,
    getActiveTripByPhone: mockGetActiveTripByPhone,
    getExpiredByState: vi.fn().mockResolvedValue([]),
    getStaleWorkflowsFromDb: vi.fn().mockResolvedValue([]),
  };
});

vi.mock("@/lib/db/domains/learning", () => ({
  updateChatSessionComprehension: vi.fn().mockResolvedValue(undefined),
}));

import { advanceToNivel1, advanceToNivel2, advanceToNivel3, advanceToWaitingDriver, resetToIdle, assignWorkflowAtomic } from "@/lib/services/dispatch/dispatch-workflow";

function lastDispatchInsertSql(): { sql: string; args: unknown[] } | null {
  const calls = mockExecute.mock.calls;
  for (let i = calls.length - 1; i >= 0; i--) {
    const query = calls[i][0] as { sql: string; args: unknown[] };
    if (query.sql && query.sql.includes("INSERT INTO dispatch_events")) {
      return query;
    }
  }
  return null;
}

// ── Helper: re-import mock for assertions ──
async function mockSetDispatchState() {
  return (await import("@/lib/db/state-accessors")).setDispatchState;
}

// ── Tests: PASO A — DispatchInitiated ──

describe("dispatch event logger — PASO A: DispatchInitiated", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("advanceToNivel1", () => {
    it("writes DispatchInitiated with nivel_1 level", async () => {
      mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_001" });

      await advanceToNivel1(1, "+54911");

      // State transition
      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54911", "nivel_1");

      // Event
      const call = lastDispatchInsertSql();
      expect(call).not.toBeNull();
      expect(call!.args[0]).toBe("trip_001");
      expect(call!.args[1]).toBe("DispatchInitiated");
      expect(call!.args[2]).toBe("nivel_1"); // level = newState
      expect(call!.args[3]).toBe("+54911");  // actor_phone = caller
      expect(mockEnsureSchema).toHaveBeenCalledOnce();
    });

    it("does not write event if no active trip (best-effort)", async () => {
      mockGetActiveTripByPhone.mockResolvedValue(null);

      await advanceToNivel1(1, "+54911");

      // State still transitions
      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54911", "nivel_1");

      // No event written
      expect(lastDispatchInsertSql()).toBeNull();
    });
  });

  describe("advanceToWaitingDriver", () => {
    it("writes DispatchInitiated with waiting_driver level", async () => {
      mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_002" });

      await advanceToWaitingDriver(1, "+54922");

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54922", "waiting_driver");

      const call = lastDispatchInsertSql();
      expect(call).not.toBeNull();
      expect(call!.args[0]).toBe("trip_002");
      expect(call!.args[1]).toBe("DispatchInitiated");
      expect(call!.args[2]).toBe("waiting_driver");
      expect(call!.args[3]).toBe("+54922");
    });
  });

  describe("resetToIdle skips event (newState === 'idle')", () => {
    it("does not write any dispatch_events row on transition to idle", async () => {
      mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_003" });
      mockGetConversationById.mockResolvedValue({ id: 1, phone: "+54911" });

      await resetToIdle(1);

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54911", "idle");

      expect(lastDispatchInsertSql()).toBeNull();
    });
  });
});

// ── Tests: PASO B — DispatchOffered ──

describe("dispatch event logger — PASO B: DispatchOffered", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("advanceToNivel2", () => {
    it("writes DispatchOffered with nivel_2 level", async () => {
      mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_010" });

      await advanceToNivel2(1, "+54910");

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54910", "nivel_2");

      const call = lastDispatchInsertSql();
      expect(call).not.toBeNull();
      expect(call!.args[0]).toBe("trip_010");
      expect(call!.args[1]).toBe("DispatchOffered");
      expect(call!.args[2]).toBe("nivel_2");
      expect(call!.args[3]).toBe("+54910");
      expect(mockEnsureSchema).toHaveBeenCalledOnce();
    });

    it("does not write event if no active trip (best-effort)", async () => {
      mockGetActiveTripByPhone.mockResolvedValue(null);

      await advanceToNivel2(1, "+54910");

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54910", "nivel_2");
      expect(lastDispatchInsertSql()).toBeNull();
    });
  });
});

// ── Tests: PASO C — DispatchBroadcasted ──

describe("dispatch event logger — PASO C: DispatchBroadcasted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("advanceToNivel3", () => {
    it("writes DispatchBroadcasted with nivel_3 level", async () => {
      mockGetActiveTripByPhone.mockResolvedValue({ trip_id: "trip_020" });

      await advanceToNivel3(1, "+54920");

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54920", "nivel_3");

      const call = lastDispatchInsertSql();
      expect(call).not.toBeNull();
      expect(call!.args[0]).toBe("trip_020");
      expect(call!.args[1]).toBe("DispatchBroadcasted");
      expect(call!.args[2]).toBe("nivel_3");
      expect(call!.args[3]).toBe("+54920");
      expect(mockEnsureSchema).toHaveBeenCalledOnce();
    });

    it("does not write event if no active trip (best-effort)", async () => {
      mockGetActiveTripByPhone.mockResolvedValue(null);

      await advanceToNivel3(1, "+54920");

      expect(await mockSetDispatchState()).toHaveBeenCalledWith("+54920", "nivel_3");
      expect(lastDispatchInsertSql()).toBeNull();
    });
  });
});

// ── Tests: PASO E — DispatchAccepted ──
// NOTA: assignWorkflowAtomic() en trips.ts llama a getActiveTripByPhone()
// como función local (no pasa por el mock del facade). Para controlar su
// resultado, mockeamos queryOne() de @/lib/db/core/helpers.

describe("dispatch event logger — PASO E: DispatchAccepted", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("assignWorkflowAtomic", () => {
    it("writes DispatchAccepted with current dispatch level and driver as actor", async () => {
      // queryOne chain: dispatch_state → main trip → legacy cnt → phase cnt → null cnt
      mockQueryOne
        .mockResolvedValueOnce({ dispatch_state: "nivel_2" })
        .mockResolvedValueOnce({ trip_id: "trip_030", client_phone: "+54930" })
        .mockResolvedValueOnce({ cnt: 1 })
        .mockResolvedValueOnce({ cnt: 1 })
        .mockResolvedValueOnce({ cnt: 0 });

      const result = await assignWorkflowAtomic("+54930", "+54988");

      expect(result).toBe(true);

      const call = lastDispatchInsertSql();
      expect(call).not.toBeNull();
      expect(call!.args[0]).toBe("trip_030");
      expect(call!.args[1]).toBe("DispatchAccepted");
      expect(call!.args[2]).toBe("nivel_2");
      expect(call!.args[3]).toBe("+54988"); // driverPhone es el actor
    });

    it("does not write event if no active trip (best-effort)", async () => {
      // main trip query devuelve null → no hay trip activo
      mockQueryOne
        .mockResolvedValueOnce({ dispatch_state: "nivel_2" })
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce({ cnt: 0 })
        .mockResolvedValueOnce({ cnt: 0 })
        .mockResolvedValueOnce({ cnt: 0 });

      const result = await assignWorkflowAtomic("+54931", "+54999");

      // UPDATE succeede pero no hay trip → no se escribe evento
      expect(result).toBe(true);
      expect(lastDispatchInsertSql()).toBeNull();
    });
  });
});
