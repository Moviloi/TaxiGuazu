import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCreateTrip = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockGetActiveTripByPhone = vi.hoisted(() => vi.fn());
const mockUpdateTripTariff = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockSetConversationalState = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const mockEnsureFleetCanHandle = vi.hoisted(() => vi.fn());
const mockExecuteDispatch = vi.hoisted(() => vi.fn());

vi.mock("@/lib/db/domains/trips", () => ({
  createTrip: mockCreateTrip,
  getActiveTripByPhone: mockGetActiveTripByPhone,
  updateTripTariff: mockUpdateTripTariff,
}));

vi.mock("@/lib/db/state-accessors", () => ({
  setConversationalState: mockSetConversationalState,
}));

vi.mock("@/lib/services/dispatch/fleet-validation", () => ({
  ensureFleetCanHandle: mockEnsureFleetCanHandle,
}));

vi.mock("@/lib/services/dispatch/dispatch.service", () => ({
  executeDispatch: mockExecuteDispatch,
}));

import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import type { NowTripInput } from "@/lib/services/trip-execution/now-execution.service";

function makeBaseInput(overrides: Partial<NowTripInput> = {}): NowTripInput {
  return {
    phone: "+549111111",
    conversationId: 1,
    origin: "Aeropuerto IGR",
    destination: "Centro",
    passengers: 1,
    pricing: {
      final_price: 15000,
      base_price: 12000,
      markup: 3000,
      adjustments: [],
      tariff_id: 1,
      origin: { place_id: "place_iguazu", canonical_name: "IGR", operational_zone: "iguazu" },
      destination: { place_id: "place_centro", canonical_name: "Centro", operational_zone: "centro" },
      level: "standard",
      source: "standard",
      explanation: [],
    },
    customerName: null,
    lang: "es",
    text: "del aeropuerto al centro ahora",
    ...overrides,
  };
}

describe("executeNowTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockEnsureFleetCanHandle.mockResolvedValue({ ok: true, maxCapacity: 10, rejected: false });
    mockExecuteDispatch.mockResolvedValue({ status: "BROADCASTED", offersSent: 5 });
    mockGetActiveTripByPhone.mockResolvedValue(null);
  });

  it("Caso 1: NOW completo origin+destination → createTrip, executeDispatch, waiting_driver", async () => {
    const fakeTrip = {
      trip_id: "trip_now_123",
      client_phone: "+549111111",
      origin: "Aeropuerto IGR",
      destination: "Centro",
      price_base: 15000,
      passengers: 1,
      status: "PENDING_DRIVER",
      scheduled_at: null,
      tariff_id: null,
    };
    mockGetActiveTripByPhone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeTrip);

    const result = await executeNowTrip(makeBaseInput());

    expect(mockCreateTrip).toHaveBeenCalledTimes(1);
    expect(mockCreateTrip).toHaveBeenCalledWith(
      expect.stringMatching(/^trip_now_\d+$/),
      "+549111111",
      "Aeropuerto IGR",
      "Centro",
      15000,
      1,
      undefined,
      undefined,
      "PENDING_DRIVER",
    );
    expect(mockExecuteDispatch).toHaveBeenCalledTimes(1);
    expect(mockExecuteDispatch).toHaveBeenCalledWith({
      conversationId: 1,
      phone: "+549111111",
      trip: fakeTrip,
      urgency: "ahora",
      passengers: 1,
    });
    expect(mockSetConversationalState).toHaveBeenCalledWith("+549111111", "idle");
    expect(result.dispatched).toBe(true);
    expect(result.tripId).toBeTruthy();
  });

  it("Caso 2: NOW sin destino → no ejecuta nada (defensa en executeNowTrip)", async () => {
    const result = await executeNowTrip(makeBaseInput({ destination: "" }));

    expect(mockCreateTrip).not.toHaveBeenCalled();
    expect(mockExecuteDispatch).not.toHaveBeenCalled();
    expect(mockSetConversationalState).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe("incomplete_route");
  });

  it("Caso 3: Fleet unavailable → no trip, no dispatch, conversational_state idle", async () => {
    mockEnsureFleetCanHandle.mockResolvedValue({ ok: false, maxCapacity: 4, rejected: true, reason: "no_capacity" });

    const result = await executeNowTrip(makeBaseInput());

    expect(mockCreateTrip).not.toHaveBeenCalled();
    expect(mockExecuteDispatch).not.toHaveBeenCalled();
    expect(mockSetConversationalState).toHaveBeenCalledWith("+549111111", "idle");
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe("fleet_unavailable");
  });

  it("Caso 4: EMERGENCY con datos completos → executeNowTrip ejecuta (protegido por caller)", async () => {
    // executeNowTrip no recibe intent — es puramente de datos.
    // La protección EMERGENCY/no-dispatch está en policy-pipeline.ts.
    const fakeTrip = {
      trip_id: "trip_now_123",
      client_phone: "+549111111",
      origin: "Aeropuerto IGR",
      destination: "Centro",
      price_base: 15000,
      passengers: 1,
      status: "PENDING_DRIVER",
      scheduled_at: null,
      tariff_id: null,
    };
    mockGetActiveTripByPhone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeTrip);

    const result = await executeNowTrip(makeBaseInput({ text: "ayuda" }));

    expect(mockCreateTrip).toHaveBeenCalledTimes(1);
    expect(mockExecuteDispatch).toHaveBeenCalledTimes(1);
    expect(result.dispatched).toBe(true);
  });

  it("Caso 5: RESCHEDULE con datos completos → executeNowTrip ejecuta (protegido por caller)", async () => {
    // Ídem Caso 4: executeNowTrip no filtra por intent.
    const fakeTrip = {
      trip_id: "trip_now_123",
      client_phone: "+549111111",
      origin: "Aeropuerto IGR",
      destination: "Centro",
      price_base: 15000,
      passengers: 1,
      status: "PENDING_DRIVER",
      scheduled_at: null,
      tariff_id: null,
    };
    mockGetActiveTripByPhone
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce(fakeTrip);

    const result = await executeNowTrip(makeBaseInput());

    expect(mockCreateTrip).toHaveBeenCalledTimes(1);
    expect(mockExecuteDispatch).toHaveBeenCalledTimes(1);
    expect(result.dispatched).toBe(true);
  });

  it("Caso 6: Active trip existente → no crear duplicado", async () => {
    mockGetActiveTripByPhone.mockResolvedValue({
      trip_id: "trip_existing",
      client_phone: "+549111111",
      origin: "Hotel",
      destination: "Centro",
      status: "PENDING_DRIVER",
    });

    const result = await executeNowTrip(makeBaseInput());

    expect(mockCreateTrip).not.toHaveBeenCalled();
    expect(mockExecuteDispatch).not.toHaveBeenCalled();
    expect(result.dispatched).toBe(false);
    expect(result.reason).toBe("active_trip_exists");
  });
});
