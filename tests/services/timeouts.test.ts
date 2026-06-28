import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Prevent dolarapi and cleanup from running uncontrolled by making their
// guard keys return "today" by default. Only the dedicated tests override these.
const today = new Date().toISOString().split("T")[0];

vi.mock("@/lib/db/database", () => ({
  getExpiredByState: vi.fn().mockResolvedValue([]),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  getDriverByPhone: vi.fn().mockResolvedValue(null),
  getTripsByScheduledAtWindow: vi.fn().mockResolvedValue([]),
  getTripsPendingCloseOut: vi.fn().mockResolvedValue([]),
  updateTripState: vi.fn().mockResolvedValue(undefined),
  getExpiredTrips: vi.fn().mockResolvedValue([]),
  getConnectionValue: vi.fn().mockImplementation((key: string) => {
    if (key === "dolar_last_fetch_date" || key === "last_session_cleanup_date") {
      return Promise.resolve(today);
    }
    return Promise.resolve(null);
  }),
  getConnectionValueFlag: vi.fn().mockResolvedValue(false),
  setConnectionFlag: vi.fn().mockResolvedValue(undefined),
  setConnectionValue: vi.fn().mockResolvedValue(undefined),
  getTripsWithMissingCommission: vi.fn().mockResolvedValue([]),
  getStaleWorkflows: vi.fn().mockResolvedValue([]),
  insertHousekeepingLog: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  getExpiredByState: vi.fn().mockResolvedValue([]),
  closeWorkflow: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch.service", () => ({
  executeEscalation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/trip-execution/survey.service", () => ({
  sendPendingSurveys: vi.fn().mockResolvedValue(undefined),
}));

import { checkTimeouts } from "@/lib/timeouts";
import { sendPendingSurveys } from "@/lib/services/trip-execution/survey.service";
import { executeEscalation } from "@/lib/services/dispatch/dispatch.service";
import { getExpiredByState } from "@/lib/services/dispatch/dispatch-workflow";
import {
  getTripsByScheduledAtWindow, getDriverByPhone, setConnectionFlag,
  getConnectionValueFlag, getTripsPendingCloseOut, getTripsWithMissingCommission,
  getConnectionValue, setConnectionValue, getExpiredTrips, getStaleWorkflows,
  insertHousekeepingLog,
} from "@/lib/db/database";
import { sendInteractiveButtons, sendWhatsAppMessage } from "@/lib/sender";
import { notifyAdmin } from "@/lib/services/admin/admin.service";

function makeTrip(overrides: Record<string, any> = {}) {
  return {
    trip_id: "t1", client_phone: "+54911", origin: "PI", destination: "CAT",
    price_base: 50000, status: "PENDING_DRIVER", assigned_driver_phone: null,
    commission_amount: null, scheduled_at: Math.floor(Date.now() / 1000) + 40000,
    passengers: 2, created_at: null, updated_at: null, confirmed_at: null,
    contact_shared_at: null, commission_paid: null, comision_declarada: null,
    driver_payout: null, flight_number: null, hotel_destination: null,
    survey_sent: null, post_trip_response: null, piso_base: null,
    garantizado_base: null, tariff_id: null, trip_phase: null,
    closure_reason: null,
    ...overrides,
  };
}

function makeDriver(overrides: Record<string, any> = {}): Record<string, any> {
  return {
    driver_id: "d1", phone: "d1", name: "Driver", is_principal: 0,
    group_id: null, active: 1, created_at: null, car_type: null,
    car_capacity: null, color: null, plate: null, country: null,
    idiom: null, min_payout: null, is_low_cost: null, shift: null,
    payment_method: null, rating: null, rating_count: null,
    offers_received: null, offers_accepted: null, acceptance_score: null,
    tier: null, languages: null, is_guide: null, car_model: null,
    car_year: null, status: "active", approved_at: null, approved_by: null,
    ...overrides,
  };
}

describe("checkTimeouts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("calls sendPendingSurveys first", async () => {
    await checkTimeouts();
    expect(sendPendingSurveys).toHaveBeenCalledOnce();
  });

  it("escalates expired dispatch levels", async () => {
    vi.mocked(getExpiredByState)
      .mockResolvedValueOnce([
        { conversationId: 1, phone: "+54911", state: "nivel_1" as const },
      ])
      .mockResolvedValueOnce([
        { conversationId: 2, phone: "+54922", state: "nivel_2" as const },
      ])
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    await checkTimeouts();

    expect(executeEscalation).toHaveBeenCalledTimes(2);
    expect(executeEscalation).toHaveBeenNthCalledWith(1, { conversationId: 1, phone: "+54911", currentState: "nivel_1" });
    expect(executeEscalation).toHaveBeenNthCalledWith(2, { conversationId: 2, phone: "+54922", currentState: "nivel_2" });
  });

  describe("checkReconfirmacion24hs", () => {
    it("sends reconfirmation buttons when trip has assigned driver", async () => {
      vi.mocked(getTripsByScheduledAtWindow)
        .mockResolvedValueOnce([makeTrip({ assigned_driver_phone: "d1" })])
        .mockResolvedValue([]);
      vi.mocked(getDriverByPhone).mockResolvedValue(makeDriver() as any);

      await checkTimeouts();

      expect(sendInteractiveButtons).toHaveBeenCalledWith("d1", expect.stringContaining("Reconfirmación"), expect.any(Array));
      expect(setConnectionFlag).toHaveBeenCalledWith("last_reconfirm_24hs_t1");
    });

    it("skips if already notified", async () => {
      vi.mocked(getConnectionValueFlag).mockResolvedValueOnce(true);
      vi.mocked(getTripsByScheduledAtWindow)
        .mockResolvedValueOnce([makeTrip({ assigned_driver_phone: "d1" })])
        .mockResolvedValue([]);

      await checkTimeouts();

      expect(sendInteractiveButtons).not.toHaveBeenCalled();
    });
  });

  describe("checkMensajeFelicidad12hs", () => {
    it("sends happiness message for active trips", async () => {
      vi.mocked(getTripsByScheduledAtWindow)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([makeTrip()]);
      vi.mocked(getConnectionValueFlag).mockResolvedValue(false);

      await checkTimeouts();

      expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", expect.stringContaining("Todo listo"));
      expect(setConnectionFlag).toHaveBeenCalledWith("last_feliz_msg_t1");
    });
  });

  describe("checkCierreChofer", () => {
    it("sends closure buttons for pending close-out trips", async () => {
      vi.mocked(getTripsPendingCloseOut).mockResolvedValue([
        makeTrip({ assigned_driver_phone: "d1" }),
      ]);

      await checkTimeouts();

      expect(sendInteractiveButtons).toHaveBeenCalledWith("d1", expect.stringContaining("Cierre de viaje"), expect.any(Array));
      expect(setConnectionFlag).toHaveBeenCalledWith("last_cierre_msg_t1");
    });
  });

  describe("checkDiscrepanciaComision", () => {
    it("notifies admin about missing commission", async () => {
      vi.mocked(getTripsWithMissingCommission).mockResolvedValue([
        { trip_id: "t1", client_phone: "+54911", destination: "CAT", assigned_driver_phone: "d1", price_base: 50000 } as any,
      ]);

      await checkTimeouts();

      expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining("Discrepancia"));
      expect(setConnectionFlag).toHaveBeenCalledWith("last_discre_msg_t1");
    });
  });

  describe("checkDolarApiNotification", () => {
    let mockFetch: ReturnType<typeof vi.fn>;

    beforeEach(() => {
      mockFetch = vi.fn();
      vi.stubGlobal("fetch", mockFetch);
      // Allow dolarapi to run by returning null for the guard key
      vi.mocked(getConnectionValue).mockImplementation((key: string) => {
        if (key === "dolar_last_fetch_date") return Promise.resolve(null);
        if (key === "last_session_cleanup_date") return Promise.resolve(today);
        return Promise.resolve(null);
      });
    });

    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it("fetches dolarapi and notifies admin", async () => {
      mockFetch
        .mockResolvedValueOnce({
          json: () => Promise.resolve([{ nombre: "Blue", compra: 1200, venta: 1250 }]),
        })
        .mockResolvedValueOnce({
          json: () => Promise.resolve({ USDBRL: { bid: "5.5" } }),
        });

      await checkTimeouts();

      expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining("Cotizaciones"));
      // dolar: 1200/1250, real: round(1250/5.5)=227
      expect(notifyAdmin).toHaveBeenCalledWith(expect.stringContaining("$227"));
      expect(setConnectionValue).toHaveBeenCalledWith("dolar_last_fetch_date", expect.any(String));
    });

    it("skips if already fetched today", async () => {
      vi.mocked(getConnectionValue).mockImplementation((key: string) => {
        if (key === "dolar_last_fetch_date") return Promise.resolve(today);
        if (key === "last_session_cleanup_date") return Promise.resolve(today);
        return Promise.resolve(null);
      });

      await checkTimeouts();

      expect(mockFetch).not.toHaveBeenCalled();
    });
  });

  describe("checkSessionCleanup", () => {
    it("archives expired trips and closes stale workflows", async () => {
      vi.mocked(getConnectionValue).mockImplementation((key: string) => {
        if (key === "last_session_cleanup_date") return Promise.resolve(null);
        if (key === "dolar_last_fetch_date") return Promise.resolve(today);
        return Promise.resolve(null);
      });
      vi.mocked(getExpiredTrips).mockResolvedValue([{ trip_id: "expired_1" }, { trip_id: "expired_2" }] as any);
      vi.mocked(getStaleWorkflows).mockResolvedValue([
        { conversation_id: 101 },
      ]);

      await checkTimeouts();

      expect(setConnectionValue).toHaveBeenCalledWith("last_session_cleanup_date", expect.any(String));
    });
  });

});
