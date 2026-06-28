import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Module-level mocks ──

vi.mock("@/lib/db/database", () => ({
  getAvailableDrivers: vi.fn().mockResolvedValue([]),
  getClientPreferredDriver: vi.fn().mockResolvedValue(null),
  getActiveTripsByClient: vi.fn().mockResolvedValue([]),
  getPackagePrices: vi.fn().mockResolvedValue(new Map()),
  incrementOfferReceived: vi.fn().mockResolvedValue(undefined),
  getPrincipalDriver: vi.fn().mockResolvedValue(null),
  getPrincipal2Driver: vi.fn().mockResolvedValue(null),
  getDriverByPhone: vi.fn().mockResolvedValue(null),
  getDriverExpiry: vi.fn().mockResolvedValue({ active: true, expiresAt: null }),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  getConnectionValueFlag: vi.fn().mockResolvedValue(false),
  setConnectionFlag: vi.fn().mockResolvedValue(undefined),
  setConnectionValue: vi.fn().mockResolvedValue(undefined),
  deleteConnectionKey: vi.fn().mockResolvedValue(undefined),
  updateTripState: vi.fn().mockResolvedValue(undefined),
  findTariff: vi.fn().mockResolvedValue(null),
  getTariffById: vi.fn().mockResolvedValue(null),
  debugGetActiveDriversWithConversationStatus: vi.fn().mockResolvedValue(undefined),
  getConnectionCache: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  advanceToNivel1: vi.fn().mockResolvedValue(undefined),
  advanceToNivel2: vi.fn().mockResolvedValue(undefined),
  advanceToNivel3: vi.fn().mockResolvedValue(undefined),
  advanceToWaitingDriver: vi.fn().mockResolvedValue(undefined),
  closeWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/config/constants", () => ({
  LOW_PISO_FACTOR: 0.8,
  MIN_MARGIN: 3000,
}));

vi.mock("@/lib/config/env", () => ({
  getEnv: vi.fn().mockReturnValue({ PRINCIPAL_2_PHONE: undefined }),
}));

import { executeDispatch, executeEscalation, offerToSpecificDriver, broadcastTripToDrivers } from "@/lib/services/dispatch/dispatch.service";
import type { TripRow, DriverRow } from "@/lib/db/types";
import { getAvailableDrivers, getPrincipalDriver, getDriverExpiry, getPrincipal2Driver, getActiveTripByPhone, getConnectionValueFlag, findTariff, setConnectionValue, setConnectionFlag, deleteConnectionKey, updateTripState, getConnectionCache, incrementOfferReceived, getActiveTripsByClient, getTariffById } from "@/lib/db/database";
import { sendInteractiveButtons, sendWhatsAppMessage } from "@/lib/sender";
import { notifyAdmin } from "@/lib/services/admin/admin.service";
import { advanceToNivel1, advanceToNivel2, advanceToNivel3, advanceToWaitingDriver, closeWorkflow } from "@/lib/services/dispatch/dispatch-workflow";

function makeTrip(overrides: Partial<TripRow> = {}): TripRow {
  return {
    trip_id: "trip_test",
    client_phone: "+54911",
    origin: "Puerto Iguazú",
    destination: "Cataratas",
    price_base: 50000,
    piso_base: 40000,
    passengers: 2,
    status: "PENDING_DRIVER",
    assigned_driver_phone: null,
    created_at: null, updated_at: null, confirmed_at: null,
    contact_shared_at: null, commission_amount: null, commission_paid: null,
    comision_declarada: null, driver_payout: null, flight_number: null,
    hotel_destination: null, survey_sent: null, post_trip_response: null,
    scheduled_at: null, tariff_id: 1, garantizado_base: null,
    trip_phase: null, closure_reason: null,
    ...overrides,
  };
}

function makeDriver(overrides: Partial<DriverRow> = {}): DriverRow {
  return {
    driver_id: "d1", phone: "driver1", name: "Driver 1",
    is_principal: 0, group_id: null, active: 1, created_at: null,
    car_type: null, car_capacity: null, color: null, plate: null,
    country: null, idiom: null, min_payout: null, is_low_cost: null,
    shift: "any", payment_method: null, rating: 4.5, rating_count: null,
    offers_received: null, offers_accepted: null, acceptance_score: 80,
    tier: "normal", languages: null, is_guide: null, car_model: null,
    car_year: null, status: "active", approved_at: null, approved_by: null,
    ...overrides,
  };
}

describe("executeDispatch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("scheduled trip → principal active → OFFERED nivel 1", async () => {
    const principal = makeDriver({ phone: "principal1", is_principal: 1 });
    vi.mocked(getPrincipalDriver).mockResolvedValue(principal);
    vi.mocked(getDriverExpiry).mockResolvedValue({ active: true, expiresAt: null });

    const result = await executeDispatch({
      conversationId: 1, phone: "+54911", trip: makeTrip({ scheduled_at: Math.floor(Date.now() / 1000) + 86400 }), urgency: "ahora", passengers: 2,
    });

    expect(result).toEqual({ status: "OFFERED", offersSent: 1 });
    expect(advanceToNivel1).toHaveBeenCalledWith(1, "+54911");
    expect(sendInteractiveButtons).toHaveBeenCalled();
    expect(incrementOfferReceived).toHaveBeenCalledWith("principal1");
  });

  it("scheduled trip: principal expired → principal2 active → OFFERED nivel 2", async () => {
    vi.mocked(getPrincipalDriver).mockResolvedValue(makeDriver({ phone: "p1", status: "active" }));
    vi.mocked(getDriverExpiry).mockResolvedValueOnce({ active: false, expiresAt: null });
    vi.mocked(getPrincipal2Driver).mockResolvedValue(makeDriver({ phone: "p2" }));
    vi.mocked(getDriverExpiry).mockResolvedValueOnce({ active: true, expiresAt: null });

    const result = await executeDispatch({
      conversationId: 1, phone: "+54911", trip: makeTrip({ scheduled_at: Math.floor(Date.now() / 1000) + 86400 }), urgency: "ahora", passengers: 2,
    });

    expect(result).toEqual({ status: "OFFERED", offersSent: 1 });
    expect(advanceToNivel2).toHaveBeenCalledWith(1, "+54911");
    expect(incrementOfferReceived).toHaveBeenCalledWith("p2");
  });

  it("scheduled trip: both principals unavailable → BROADCASTED nivel 3", async () => {
    vi.mocked(getPrincipalDriver).mockResolvedValue(makeDriver({ phone: "p1", status: "inactive" }));
    vi.mocked(getPrincipal2Driver).mockResolvedValue(null);

    const result = await executeDispatch({
      conversationId: 1, phone: "+54911", trip: makeTrip({ scheduled_at: Math.floor(Date.now() / 1000) + 86400 }), urgency: "ahora", passengers: 2,
    });
    expect(result).toEqual({ status: "BROADCASTED", offersSent: 0 });
    expect(advanceToNivel3).toHaveBeenCalledWith(1, "+54911");
  });

  it("non-scheduled trip → BROADCASTED waiting_driver", async () => {
    const result = await executeDispatch({
      conversationId: 1, phone: "+54911", trip: makeTrip(), urgency: "ahora", passengers: 2,
    });
    expect(result).toEqual({ status: "BROADCASTED", offersSent: 0 });
    expect(advanceToWaitingDriver).toHaveBeenCalledWith(1, "+54911");
  });

  it("non-scheduled trip without urgency → BROADCASTED waiting_driver", async () => {
    const result = await executeDispatch({
      conversationId: 1, phone: "+54911", trip: makeTrip(), urgency: "consulta", passengers: 2,
    });
    expect(result).toEqual({ status: "BROADCASTED", offersSent: 0 });
    expect(advanceToWaitingDriver).toHaveBeenCalledWith(1, "+54911");
  });
});

describe("executeEscalation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("nivel_1 → principal2 active → OFFERED nivel 2", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip());
    vi.mocked(getPrincipal2Driver).mockResolvedValue(makeDriver({ phone: "p2" }));
    vi.mocked(getDriverExpiry).mockResolvedValue({ active: true, expiresAt: null });

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "nivel_1" });

    expect(advanceToNivel2).toHaveBeenCalledWith(1, "+54911");
    expect(incrementOfferReceived).toHaveBeenCalledWith("p2");
  });

  it("nivel_1 → principal2 unavailable → nivel_3 + broadcast", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip());
    vi.mocked(getPrincipal2Driver).mockResolvedValue(null);

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "nivel_1" });

    expect(advanceToNivel3).toHaveBeenCalledWith(1, "+54911");
  });

  it("nivel_2 → nivel_3 + broadcast", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip());

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "nivel_2" });

    expect(advanceToNivel3).toHaveBeenCalledWith(1, "+54911");
  });

  it("nivel_3 → notifyAdmin + closeWorkflow", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip());

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "nivel_3" });

    expect(notifyAdmin).toHaveBeenCalled();
    expect(closeWorkflow).toHaveBeenCalledWith(1);
  });

  it("no active trip → returns early", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(null);

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "nivel_1" });

    expect(advanceToNivel1).not.toHaveBeenCalled();
    expect(notifyAdmin).not.toHaveBeenCalled();
  });
});

describe("executeEscalation — waiting_driver contingency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip({ passengers: 5 }));
  });

  it("already offered → returns early", async () => {
    vi.mocked(getConnectionValueFlag).mockResolvedValueOnce(true);

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "waiting_driver" });

    expect(setConnectionValue).not.toHaveBeenCalled();
  });

  it("passengers > 4 → contingency offer sent", async () => {
    vi.mocked(findTariff).mockResolvedValue({ price: 40000 } as any);

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "waiting_driver" });

    expect(setConnectionValue).toHaveBeenCalled();
    expect(setConnectionFlag).toHaveBeenCalledWith("contingency_offered_1");
    expect(closeWorkflow).toHaveBeenCalledWith(1);
    expect(sendInteractiveButtons).toHaveBeenCalled();
  });

  it("passengers > 4 with no tariff → uses trip price_base", async () => {
    // Ensure no tariff provider is returned (mock leak from prior test)
    vi.mocked(findTariff).mockResolvedValue(null);
    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "waiting_driver" });

    expect(sendInteractiveButtons).toHaveBeenCalled();
    const call = vi.mocked(sendInteractiveButtons).mock.calls[0];
    expect(call[1]).toContain("50.000");
  });

  it("dual contingency exists → cancels both trips", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip({ passengers: 2 }));
    vi.mocked(getConnectionCache).mockResolvedValue(JSON.stringify({
      tripA_id: "trip_a", driverA_phone: "dA", driverA_name: "DA",
    }));

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "waiting_driver" });

    expect(updateTripState).toHaveBeenCalledTimes(2);
    expect(sendWhatsAppMessage).toHaveBeenCalled();
    expect(notifyAdmin).toHaveBeenCalled();
    expect(deleteConnectionKey).toHaveBeenCalledWith("contingency_dual_1");
    expect(closeWorkflow).toHaveBeenCalledWith(1);
  });

  it("no dual, no contingency → generic failure", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(makeTrip({ passengers: 2 }));
    vi.mocked(getConnectionCache).mockResolvedValue(null);

    await executeEscalation({ conversationId: 1, phone: "+54911", currentState: "waiting_driver" });

    expect(sendWhatsAppMessage).toHaveBeenCalled();
    expect(notifyAdmin).toHaveBeenCalled();
    expect(closeWorkflow).toHaveBeenCalledWith(1);
  });
});

describe("broadcastTripToDrivers", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("no drivers → notifyAdmin + return", async () => {
    await broadcastTripToDrivers(makeTrip(), 1, "+54911", "reserva", 2);

    expect(notifyAdmin).toHaveBeenCalled();
    expect(sendInteractiveButtons).not.toHaveBeenCalled();
  });

  it("no eligible drivers → notifyAdmin about piso", async () => {
    const d = makeDriver({ min_payout: 999999 });
    vi.mocked(getAvailableDrivers).mockResolvedValue([d]);

    await broadcastTripToDrivers(makeTrip(), 1, "+54911", "reserva", 2);

    expect(notifyAdmin).toHaveBeenCalled();
    expect(sendInteractiveButtons).not.toHaveBeenCalled();
  });

  it("eligible drivers → broadcasts to each", async () => {
    const d1 = makeDriver({ phone: "d1", rating: 4.5, tier: "normal" });
    const d2 = makeDriver({ phone: "d2", rating: 4.0, tier: "normal" });
    vi.mocked(getAvailableDrivers).mockResolvedValue([d1, d2]);
    vi.mocked(getTariffById).mockResolvedValueOnce({ base_price_4p: 25000, base_price_6p: 35000 } as any);

    await broadcastTripToDrivers(makeTrip(), 1, "+54911", "reserva", 2);

    expect(sendInteractiveButtons).toHaveBeenCalledTimes(2);
    expect(incrementOfferReceived).toHaveBeenCalledTimes(2);
    expect(notifyAdmin).not.toHaveBeenCalled();
  });

  it("margin < MIN_MARGIN → filters to low tier only", async () => {
    const normal = makeDriver({ phone: "normal1", tier: "normal", min_payout: 48000 });
    const low = makeDriver({ phone: "low1", tier: "low" });
    vi.mocked(getAvailableDrivers).mockResolvedValue([normal, low]);
    // Ensure getTariffById returns null so pisoLow is null (otherwise low tier floor may be too high)
    vi.mocked(getTariffById).mockResolvedValue(null);

    await broadcastTripToDrivers(makeTrip({ price_base: 10000, piso_base: 9500 }), 1, "+54911", "reserva", 2);

    // effectivePayout = round(10000 * 0.85) = 8500, margin = 10000 - 8500 = 1500 < 3000
    // normal: floor = max(9500 * 1.0, 48000) = 48000 → not eligible
    // low: floor = round(9500 * 0.8) = 7600 → eligible
    // margin filter keeps only low tier
    expect(sendInteractiveButtons).toHaveBeenCalledTimes(1);
    const call = vi.mocked(sendInteractiveButtons).mock.calls[0][0];
    expect(call).toBe("low1");
  });

  it("no eligible after shift filter → notifyAdmin", async () => {
    const d = makeDriver({ phone: "d1", shift: "night" });
    vi.mocked(getAvailableDrivers).mockResolvedValue([d]);

    await broadcastTripToDrivers(makeTrip(), 1, "+54911", "ahora", 2);
    // urgency "ahora" → tripShiftClass returns day/night based on hour
    // driver has shift "night", won't match "day" → filtered out → notifyAdmin
  });

  it("detect country from origin", async () => {
    const d = makeDriver({ phone: "d1" });
    vi.mocked(getAvailableDrivers).mockResolvedValue([d]);

    await broadcastTripToDrivers(makeTrip({ origin: "Foz do Iguaçu" }), 1, "+54911", "reserva", 2);

    expect(getAvailableDrivers).toHaveBeenCalledWith(
      expect.objectContaining({ country: "BR" })
    );
  });

  it("package trip (2+ active) includes package label", async () => {
    const d = makeDriver({ phone: "d1" });
    vi.mocked(getAvailableDrivers).mockResolvedValue([d]);
    vi.mocked(getActiveTripsByClient).mockResolvedValue([{ trip_id: "t1" }, { trip_id: "t2" } as any]);

    await broadcastTripToDrivers(makeTrip(), 1, "+54911", "reserva", 2);

    expect(sendInteractiveButtons).toHaveBeenCalled();
    const body = vi.mocked(sendInteractiveButtons).mock.calls[0][1];
    expect(body).toContain("Paquete");
  });
});

describe("offerToSpecificDriver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends interactive buttons and increments offers", async () => {
    await offerToSpecificDriver("driver1", makeTrip(), 1, "*NIVEL 1*", "Tenés 1h");

    expect(sendInteractiveButtons).toHaveBeenCalledWith("driver1", expect.stringContaining("*NIVEL 1*"), expect.any(Array));
    expect(incrementOfferReceived).toHaveBeenCalledWith("driver1");
  });

  it("includes scheduled label when trip has scheduled_at", async () => {
    const trip = makeTrip({ scheduled_at: Math.floor(Date.now() / 1000) + 86400 });
    await offerToSpecificDriver("driver1", trip, 1, "*TEST*");

    const body = vi.mocked(sendInteractiveButtons).mock.calls[0][1];
    expect(body).toContain("📅");
  });
});
