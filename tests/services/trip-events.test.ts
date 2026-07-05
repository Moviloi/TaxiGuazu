import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks ──

const mockExecute = vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 });
const mockGetDb = vi.fn(() => ({ execute: mockExecute }));
const mockEnsureSchema = vi.fn().mockResolvedValue(undefined);
const mockQueryOne = vi.fn();

vi.mock("@/lib/db/core/connection", () => ({
  getDb: mockGetDb,
  ensureSchema: mockEnsureSchema,
}));

vi.mock("@/lib/db/core/helpers", () => ({
  query: vi.fn().mockResolvedValue([]),
  queryOne: mockQueryOne,
}));

const { insertTripEvent, createTrip, assignDriverToTrip, updateTripState, completeTrip } = await import("@/lib/db/domains/trips");
import type { TripEventType } from "@/lib/db/types";

// ── Helpers ──

function lastCallSql(): { sql: string; args: unknown[] } {
  const calls = mockExecute.mock.calls;
  return calls[calls.length - 1][0] as { sql: string; args: unknown[] };
}

describe("insertTripEvent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("inserts a TripCreated event with default actor", async () => {
    await insertTripEvent("trip_001", "TripCreated");

    expect(mockEnsureSchema).toHaveBeenCalledOnce();
    expect(mockGetDb).toHaveBeenCalledOnce();

    const { sql, args } = lastCallSql();
    expect(sql).toContain("INSERT INTO trip_events");
    expect(args[0]).toBe("trip_001");
    expect(args[1]).toBe("TripCreated");
    expect(args[2]).toBeNull(); // payload
    expect(args[3]).toBe("system"); // actor
  });

  it("inserts a TripDriverAssigned event with payload and custom actor", async () => {
    await insertTripEvent(
      "trip_002",
      "TripDriverAssigned",
      JSON.stringify({ driver_phone: "+549111111" }),
      "driver_service",
    );

    const { sql, args } = lastCallSql();
    expect(sql).toContain("INSERT INTO trip_events");
    expect(args[0]).toBe("trip_002");
    expect(args[1]).toBe("TripDriverAssigned");
    expect(args[2]).toBe('{"driver_phone":"+549111111"}');
    expect(args[3]).toBe("driver_service");
  });

  it("inserts a TripCancelled event with null payload", async () => {
    await insertTripEvent("trip_003", "TripCancelled", null);

    const { sql, args } = lastCallSql();
    expect(sql).toContain("INSERT INTO trip_events");
    expect(args[0]).toBe("trip_003");
    expect(args[1]).toBe("TripCancelled");
    expect(args[2]).toBeNull();
    expect(args[3]).toBe("system");
  });

  it("accepts a custom executor (transaction)", async () => {
    const mockTxExecute = vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 });
    const mockTx = { execute: mockTxExecute };

    await insertTripEvent("trip_004", "TripReconfirmed", undefined, "system", mockTx);

    // Should NOT call getDb — should use the executor
    expect(mockGetDb).not.toHaveBeenCalled();
    expect(mockTxExecute).toHaveBeenCalledOnce();
    const { sql, args } = mockTxExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(sql).toContain("INSERT INTO trip_events");
    expect(args[0]).toBe("trip_004");
    expect(args[1]).toBe("TripReconfirmed");
  });

  it("accepts all 5 TripEventType values", async () => {
    const types: TripEventType[] = [
      "TripCreated",
      "TripDriverAssigned",
      "TripReconfirmed",
      "TripCompleted",
      "TripCancelled",
    ];

    for (const eventType of types) {
      await insertTripEvent("trip_all", eventType);
    }

    expect(mockExecute).toHaveBeenCalledTimes(5);
    const insertedTypes = mockExecute.mock.calls.map(
      (c: [{ sql: string; args: unknown[] }]) => c[0].args[1],
    );
    expect(insertedTypes).toEqual(types);
  });
});

describe("createTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // syncTripPhaseFromLegacyStatus necesita un row existente
    mockQueryOne.mockResolvedValue({ trip_phase: null, closure_reason: null });
  });

  it("inserts TripCreated event alongside the trip INSERT", async () => {
    await createTrip(
      "trip_test_001",
      "+549111111",
      "Origen",
      "Destino",
      5000,
      2,
      undefined,
      undefined,
      "consulta",
    );

    // Debe haber llamado a execute al menos 3 veces:
    // 1. INSERT INTO trips
    // 2. INSERT INTO trip_events (TripCreated)
    // 3. UPDATE trips SET trip_phase (desde syncTripPhaseFromLegacyStatus)
    expect(mockExecute).toHaveBeenCalledTimes(3);

    // Verificar que la 2da llamada fue el evento TripCreated
    const eventCall = mockExecute.mock.calls[1][0] as { sql: string; args: unknown[] };
    expect(eventCall.sql).toContain("INSERT INTO trip_events");
    expect(eventCall.args[1]).toBe("TripCreated");
    expect(eventCall.args[0]).toBe("trip_test_001");

    // Verificar que el payload contiene los datos de creación
    const payload = JSON.parse(eventCall.args[2] as string);
    expect(payload.origin).toBe("Origen");
    expect(payload.destination).toBe("Destino");
    expect(payload.price).toBe(5000);
    expect(payload.passengers).toBe(2);
  });

  it("inserts event with same executor as trip INSERT", async () => {
    const mockTxExecute = vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 });
    const mockTx = { execute: mockTxExecute };

    await createTrip(
      "trip_test_002",
      "+549222222",
      "A", "B", 3000, 1, undefined, undefined, "consulta",
      mockTx,  // <-- executor explícito (transacción)
    );

    // getDb se llama solo por syncTripPhaseFromLegacyStatus (UPDATE legacy)
    // El INSERT trips + INSERT event van por mockTx
    expect(mockGetDb).toHaveBeenCalledTimes(1);

    // mockTxExecute: 1 para INSERT trips + 1 para INSERT event (TripCreated)
    expect(mockTxExecute).toHaveBeenCalledTimes(2);
    const tripCall = mockTxExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(tripCall.sql).toContain("INSERT INTO trips");
    const eventCall = mockTxExecute.mock.calls[1][0] as { sql: string; args: unknown[] };
    expect(eventCall.sql).toContain("INSERT INTO trip_events");
    expect(eventCall.args[1]).toBe("TripCreated");
  });

  it("does not change return type (void)", async () => {
    const result = await createTrip("trip_test_003", "+549333333", "X", "Y");
    expect(result).toBeUndefined();
  });
});

describe("assignDriverToTrip", () => {
  // Nota: NO usamos vi.clearAllMocks() aquí porque limpia las
  // configuraciones de mockResolvedValue de mockExecute, causando
  // que las promesas nunca resuelvan. En su lugar, cada test
  // resetea manualmente los call counts con mockClear().

  const mockTripRow = {
    trip_id: "trip_drv_001",
    price_base: 8234,
    garantizado_base: null,
    tariff_id: null,
    assigned_driver_phone: null,
    status: "cotizado",
    trip_phase: null,
    closure_reason: null,
  };

  /** Helper: prepara queryOne para devolver valores en secuencia */
  function prepareQueryOne(...values: unknown[]) {
    const remaining = [...values];
    mockQueryOne.mockImplementation(() => Promise.resolve(remaining.shift()));
  }

  it("inserts TripDriverAssigned event alongside the UPDATE", async () => {
    mockExecute.mockClear();
    mockGetDb.mockClear();
    mockEnsureSchema.mockClear();
    // queryOne se llama 2 veces: getTripById → syncTripPhaseFromLegacyStatus
    // (getDriverDiscountForTariff se saltea porque tariff_id es null)
    prepareQueryOne(
      mockTripRow,
      { trip_phase: null, closure_reason: null },
    );

    await assignDriverToTrip("trip_drv_001", "+54937561234");

    // execute: 1 UPDATE trips + 2 INSERT trip_events + 3 UPDATE trip_phase
    expect(mockExecute).toHaveBeenCalledTimes(3);
    const allCalls = mockExecute.mock.calls.map(
      (c: [{ sql: string }]) => c[0].sql.substring(0, 60),
    );
    expect(allCalls[0]).toContain("UPDATE trips SET");
    expect(allCalls[1]).toContain("INSERT INTO trip_events");
    expect(allCalls[2]).toContain("UPDATE trips SET trip_phase");

    // Verificar payload del evento (2da llamada)
    const eventCall = mockExecute.mock.calls[1][0] as { sql: string; args: unknown[] };
    const payload = JSON.parse(eventCall.args[2] as string);
    expect(payload.driver_phone).toBe("+54937561234");
    expect(payload.commission).toBe(1235);
    expect(payload.payout).toBe(6999);
    expect(payload.price).toBe(8234);
  });

  it("inserts event with same executor as the trip UPDATE", async () => {
    mockExecute.mockClear();
    mockGetDb.mockClear();
    mockEnsureSchema.mockClear();
    prepareQueryOne(
      mockTripRow,
      { trip_phase: null, closure_reason: null },
    );

    const mockTxExecute = vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 });
    const mockTx = { execute: mockTxExecute };

    await assignDriverToTrip("trip_drv_002", "+54937565678", mockTx);

    // getDb se llama solo por syncTripPhaseFromLegacyStatus (UPDATE legacy)
    expect(mockGetDb).toHaveBeenCalledTimes(1);

    // mockTxExecute: 1 UPDATE + 1 INSERT event
    expect(mockTxExecute).toHaveBeenCalledTimes(2);
    const updateCall = mockTxExecute.mock.calls[0][0] as { sql: string; args: unknown[] };
    expect(updateCall.sql).toContain("UPDATE trips");
    const eventCall = mockTxExecute.mock.calls[1][0] as { sql: string; args: unknown[] };
    expect(eventCall.sql).toContain("INSERT INTO trip_events");
    expect(eventCall.args[1]).toBe("TripDriverAssigned");
  });

  it("does not change return value (commission, payout)", async () => {
    mockExecute.mockClear();
    mockGetDb.mockClear();
    mockEnsureSchema.mockClear();
    prepareQueryOne(
      mockTripRow,
      { trip_phase: null, closure_reason: null },
    );

    const result = await assignDriverToTrip("trip_drv_001", "+54937561234");
    expect(result).toEqual({ commission: 1235, payout: 6999 });
  });

  it("returns null when trip not found", async () => {
    mockExecute.mockClear();
    mockGetDb.mockClear();
    mockEnsureSchema.mockClear();
    prepareQueryOne(null); // getTripById returns null

    const result = await assignDriverToTrip("non_existent", "+54937560000");
    expect(result).toBeNull();
    expect(mockExecute).not.toHaveBeenCalled(); // no se toca la DB
  });
});

describe("updateTripState — event logger", () => {
  /** Helper: prepara queryOne para devolver valores en secuencia */
  function prepareQueryOne(...values: unknown[]) {
    const remaining = [...values];
    mockQueryOne.mockImplementation(() => Promise.resolve(remaining.shift()));
  }

  describe("PASO A: reconfirmado_24hs → TripReconfirmed", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("inserts TripReconfirmed with null payload when status is reconfirmado_24hs", async () => {
      prepareQueryOne(
        { trip_phase: null, closure_reason: null },  // syncTripPhaseFromLegacyStatus
      );

      await updateTripState("trip_rec_01", "reconfirmado_24hs");

      // execute: 1 UPDATE status + 2 UPDATE trip_phase (sync) + 3 INSERT event
      expect(mockExecute).toHaveBeenCalledTimes(3);

      const eventCall = mockExecute.mock.calls[2][0] as { sql: string; args: unknown[] };
      expect(eventCall.sql).toContain("INSERT INTO trip_events");
      expect(eventCall.args[0]).toBe("trip_rec_01");
      expect(eventCall.args[1]).toBe("TripReconfirmed");
      expect(eventCall.args[2]).toBeNull(); // payload null
      expect(eventCall.args[3]).toBe("system");
    });

    it("does not insert event for status without mapping", async () => {
      prepareQueryOne(
        { trip_phase: null, closure_reason: null },
      );

      await updateTripState("trip_noev_01", "asignado_chofer");

      // Solo 2 execute: 1 UPDATE status + 2 UPDATE trip_phase (sin evento)
      expect(mockExecute).toHaveBeenCalledTimes(2);
      const calls = mockExecute.mock.calls.map(
        (c: [{ sql: string }]) => c[0].sql.substring(0, 40),
      );
      expect(calls[0]).toContain("UPDATE trips SET status");
      expect(calls[1]).toContain("UPDATE trips SET trip_phase");
    });
  });

  describe("PASO B: cancelado → TripCancelled", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("inserts TripCancelled with null payload when status is cancelado", async () => {
      prepareQueryOne(
        { trip_phase: null, closure_reason: null },
      );

      await updateTripState("trip_can_01", "cancelado");

      expect(mockExecute).toHaveBeenCalledTimes(3);
      const eventCall = mockExecute.mock.calls[2][0] as { sql: string; args: unknown[] };
      expect(eventCall.sql).toContain("INSERT INTO trip_events");
      expect(eventCall.args[0]).toBe("trip_can_01");
      expect(eventCall.args[1]).toBe("TripCancelled");
      expect(eventCall.args[2]).toBeNull();
      expect(eventCall.args[3]).toBe("system");
    });

    it("generates 2 independent TripCancelled for dual-trip scenario (dispatch.service.ts pattern)", async () => {
      // Simula el patrón de dispatch.service.ts líneas 180-181:
      // dos llamadas a updateTripState con distintos trip_id
      prepareQueryOne(
        { trip_phase: null, closure_reason: null },  // 1er updateTripState
        { trip_phase: null, closure_reason: null },  // 2do updateTripState
      );

      await updateTripState("trip_A", "cancelado");
      await updateTripState("trip_B", "cancelado");

      // Total 6 execute: (1 UPDATE status + 2 sync + 3 event) × 2
      expect(mockExecute).toHaveBeenCalledTimes(6);

      // Verificar que cada trip_id tiene su propio TripCancelled
      const eventCalls = mockExecute.mock.calls
        .filter((c: [{ sql: string }]) => c[0].sql.includes("INSERT INTO trip_events"))
        .map((c: [{ sql: string; args: unknown[] }]) => ({ tripId: c[0].args[0], type: c[0].args[1] }));

      expect(eventCalls).toHaveLength(2);
      expect(eventCalls[0]).toEqual({ tripId: "trip_A", type: "TripCancelled" });
      expect(eventCalls[1]).toEqual({ tripId: "trip_B", type: "TripCancelled" });
    });
  });

  describe("PASO C: completado → TripCompleted", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it("inserts TripCompleted with null payload when status is completado", async () => {
      prepareQueryOne(
        { trip_phase: "ASSIGNED", closure_reason: null },
      );

      await updateTripState("trip_cpl_01", "completado");

      expect(mockExecute).toHaveBeenCalledTimes(3);
      const eventCall = mockExecute.mock.calls[2][0] as { sql: string; args: unknown[] };
      expect(eventCall.sql).toContain("INSERT INTO trip_events");
      expect(eventCall.args[0]).toBe("trip_cpl_01");
      expect(eventCall.args[1]).toBe("TripCompleted");
      expect(eventCall.args[2]).toBeNull();
      expect(eventCall.args[3]).toBe("system");
    });

    it("generates TripCompleted from all 3 real callers without leaking state", async () => {
      // Simula los 3 callers reales invocando updateTripState("completado"):
      //   1. handleContingenciaSi()   — driver.service.ts:507
      //   2. checkSessionCleanup()    — timeouts.ts:251
      //   3. handleConversationSetup() — conversation-setup.ts:37
      prepareQueryOne(
        { trip_phase: "ASSIGNED", closure_reason: null },
        { trip_phase: "ASSIGNED", closure_reason: null },
        { trip_phase: "ASSIGNED", closure_reason: null },
      );

      await updateTripState("contingencia_si_trip", "completado");
      await updateTripState("cleanup_trip", "completado");
      await updateTripState("conv_setup_trip", "completado");

      // Total 9 execute: (1 UPDATE status + 2 sync + 3 event) × 3
      expect(mockExecute).toHaveBeenCalledTimes(9);

      const eventCalls = mockExecute.mock.calls
        .filter((c: [{ sql: string }]) => c[0].sql.includes("INSERT INTO trip_events"))
        .map((c: [{ sql: string; args: unknown[] }]) => ({ tripId: c[0].args[0], type: c[0].args[1] }));

      expect(eventCalls).toHaveLength(3);
      expect(eventCalls[0]).toEqual({ tripId: "contingencia_si_trip", type: "TripCompleted" });
      expect(eventCalls[1]).toEqual({ tripId: "cleanup_trip", type: "TripCompleted" });
      expect(eventCalls[2]).toEqual({ tripId: "conv_setup_trip", type: "TripCompleted" });
    });
  });

  describe("PASO D: completeTrip() with payload", () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    const mockCompletedTripRow = {
      trip_id: "trip_cpl_done_01",
      price_base: 8234,
      commission_amount: 1235,
      driver_payout: 6999,
      trip_phase: null,
      closure_reason: null,
    };

    it("inserts TripCompleted with payload commission/payout/price", async () => {
      // queryOne returns: trip row (getTripById), then phase row (sync)
      prepareQueryOne(
        mockCompletedTripRow,
        { trip_phase: "ASSIGNED", closure_reason: null },
      );

      await completeTrip("trip_cpl_done_01");

      // execute: 1 UPDATE status + 2 INSERT event + 3 UPDATE trip_phase (sync)
      expect(mockExecute).toHaveBeenCalledTimes(3);

      const eventCall = mockExecute.mock.calls[1][0] as { sql: string; args: unknown[] };
      expect(eventCall.sql).toContain("INSERT INTO trip_events");
      expect(eventCall.args[0]).toBe("trip_cpl_done_01");
      expect(eventCall.args[1]).toBe("TripCompleted");

      const payload = JSON.parse(eventCall.args[2] as string);
      expect(payload.commission).toBe(1235);
      expect(payload.payout).toBe(6999);
      expect(payload.price).toBe(8234);
      expect(eventCall.args[3]).toBe("system");
    });

    it("does not change return type (void)", async () => {
      prepareQueryOne(
        mockCompletedTripRow,
        { trip_phase: "ASSIGNED", closure_reason: null },
      );

      const result = await completeTrip("trip_cpl_done_01");
      expect(result).toBeUndefined();
    });

    it("accepts executor and routes writes through it", async () => {
      prepareQueryOne(
        mockCompletedTripRow,
        { trip_phase: "ASSIGNED", closure_reason: null },
      );

      const mockTxExecute = vi.fn().mockResolvedValue({ lastInsertRowid: 1, rowsAffected: 1 });
      const mockTx = { execute: mockTxExecute };

      await completeTrip("trip_cpl_done_02", mockTx);

      // queryOne y syncTripPhase siguen por getDb()
      expect(mockGetDb).toHaveBeenCalled();
      // UPDATE + INSERT van por mockTx
      expect(mockTxExecute).toHaveBeenCalledTimes(2);
      expect(mockTxExecute.mock.calls[0][0].sql).toContain("UPDATE trips SET status");
      expect(mockTxExecute.mock.calls[1][0].sql).toContain("INSERT INTO trip_events");
    });
  });
});
