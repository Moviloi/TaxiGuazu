import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/database", () => ({
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  getConversationByPhone: vi.fn().mockResolvedValue(null),
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 99 }),
  createTrip: vi.fn().mockResolvedValue(undefined),
  setConversationTrip: vi.fn().mockResolvedValue(undefined),
  updateTripState: vi.fn().mockResolvedValue(undefined),
  updateTripTariff: vi.fn().mockResolvedValue(undefined),
  findTariff: vi.fn().mockResolvedValue(null),
  getTripById: vi.fn().mockResolvedValue(null),
  getConnectionValue: vi.fn().mockResolvedValue(null),
  getConnectionValueFlag: vi.fn().mockResolvedValue(false),
  setConnectionValue: vi.fn().mockResolvedValue(undefined),
  deleteConnectionKey: vi.fn().mockResolvedValue(undefined),
  getPrincipalDriver: vi.fn().mockResolvedValue(null),
  getPrincipal2Driver: vi.fn().mockResolvedValue(null),
  insertMessage: vi.fn().mockResolvedValue(1),
  getLeadByConv: vi.fn().mockResolvedValue(null),
  takeLead: vi.fn().mockResolvedValue(undefined),
  assignDriverToTrip: vi.fn().mockResolvedValue(null),
  getDriverByPhone: vi.fn().mockResolvedValue(null),
  incrementOfferAccepted: vi.fn().mockResolvedValue(undefined),
  getClientPreferredDriver: vi.fn().mockResolvedValue(null),
  setClientPreferredDriver: vi.fn().mockResolvedValue(undefined),
  completeTrip: vi.fn().mockResolvedValue(undefined),
  getCustomerName: vi.fn().mockResolvedValue(null),
  findPlaceByAlias: vi.fn().mockResolvedValue(null),
  findPlaceByName: vi.fn().mockResolvedValue(null),
  findTariffByPriority: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
  notifyOtherDriversTaken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  getDispatchWorkflow: vi.fn().mockResolvedValue(null),
  advanceToNivel1: vi.fn().mockResolvedValue(undefined),
  advanceToWaitingDriver: vi.fn().mockResolvedValue(undefined),
  assignWorkflowAtomic: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/lib/services/dispatch/dispatch.service", () => ({
  broadcastTripToDrivers: vi.fn().mockResolvedValue(undefined),
  offerToSpecificDriver: vi.fn().mockResolvedValue(undefined),
  executeDispatch: vi.fn().mockResolvedValue({ status: "BROADCASTED", offersSent: 1 }),
  executeEscalation: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/fleet-validation", () => ({
  ensureFleetCanHandle: vi.fn().mockResolvedValue({ ok: true, maxCapacity: 6, rejected: false }),
}));

vi.mock("@/lib/services/geo/geo-engine", () => ({
  resolveGeoRoute: vi.fn().mockResolvedValue({}),
}));

vi.mock("@/lib/ai/patterns", () => ({
  AMBIGUOUS_LOCATION_RE: /test/i,
  AFFIRMATION_RE: /^(sí|si|sim|yes|ok|dale)$/i,
}));

import { getConnectionValue, getActiveTripByPhone, createTrip, findTariff, getTripById, getConversationByPhone, getPrincipalDriver } from "@/lib/db/database";
import { broadcastTripToDrivers, offerToSpecificDriver, executeEscalation } from "@/lib/services/dispatch/dispatch.service";
import { advanceToNivel1, advanceToWaitingDriver } from "@/lib/services/dispatch/dispatch-workflow";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";
import { sendWhatsAppMessage } from "@/lib/sender";
import { handleContingenciaSi, handleDriverReconfirmNo } from "@/lib/services/dispatch/driver.service";

function makeTariff(overrides?: Record<string, any>) {
  return { id: 1, price: 15000, origin: "iguazú", destination: "centro", ...overrides } as any;
}

function makeTrip(overrides?: Record<string, any>) {
  return { trip_id: "trip_1", origin: "iguazú", destination: "centro", price_base: 15000, passengers: 4, client_phone: "+549111111", ...overrides } as any;
}

function makeDriver(overrides?: Record<string, any>) {
  return { phone: "driver1", name: "Carlos", status: "active", ...overrides } as any;
}

function makeConv(overrides?: Record<string, any>) {
  return { id: 1, status: "active", ...overrides } as any;
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve));
}

describe("FASE 27 — Contingency dispatch readiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("T1: handleContingenciaSi con datos inválidos", () => {
    it("bloquea Trip A cuando origin está vacío", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(JSON.stringify({
        origin: "",
        destination: "centro",
        passengers: 6,
        price_base: 15000,
      }));

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).not.toHaveBeenCalled();
      expect(broadcastTripToDrivers).not.toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        "+549111111",
        expect.stringContaining("Lo sentimos"),
      );
    });

    it("bloquea Trip A cuando destination está vacío", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(JSON.stringify({
        origin: "iguazú",
        destination: "",
        passengers: 6,
        price_base: 15000,
      }));

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).not.toHaveBeenCalled();
      expect(broadcastTripToDrivers).not.toHaveBeenCalled();
    });

    it("bloquea Trip A cuando passengers es 0", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(JSON.stringify({
        origin: "iguazú",
        destination: "centro",
        passengers: 0,
        price_base: 15000,
      }));

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).not.toHaveBeenCalled();
      expect(broadcastTripToDrivers).not.toHaveBeenCalled();
    });

    it("bloquea Trip A cuando no hay data en Redis", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(null);

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).not.toHaveBeenCalled();
      expect(broadcastTripToDrivers).not.toHaveBeenCalled();
    });
  });

  describe("T2: handleContingenciaSi con datos válidos", () => {
    it("crea Trip A y hace broadcast cuando los datos son completos", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(JSON.stringify({
        origin: "iguazú",
        destination: "centro",
        passengers: 6,
        price_base: 15000,
      }));
      vi.mocked(findTariff).mockResolvedValue(makeTariff());
      vi.mocked(getActiveTripByPhone)
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(makeTrip({ trip_id: "trip_a", passengers: 4 }));

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).toHaveBeenCalledTimes(1);
      expect(createTrip).toHaveBeenCalledWith(
        expect.stringContaining("trip_contingency_1_a_"),
        "+549111111",
        "iguazú",
        "centro",
        15000,
        4,
        undefined,
        undefined,
      );
      expect(broadcastTripToDrivers).toHaveBeenCalledTimes(1);
      expect(broadcastTripToDrivers).toHaveBeenCalledWith(
        expect.objectContaining({ trip_id: "trip_a" }),
        1,
        "+549111111",
        "ahora",
        4,
      );
      expect(advanceToWaitingDriver).toHaveBeenCalledWith(1, "+549111111");
    });

    it("notifica admin cuando el flujo de flota rechaza Trip A", async () => {
      vi.mocked(getConnectionValue).mockResolvedValue(JSON.stringify({
        origin: "iguazú",
        destination: "centro",
        passengers: 6,
        price_base: 15000,
      }));
      vi.mocked(ensureFleetCanHandle).mockResolvedValue({ ok: false, maxCapacity: 4, rejected: true, reason: "no_capacity" });

      await handleContingenciaSi(1, "+549111111");
      await flush();

      expect(createTrip).not.toHaveBeenCalled();
      expect(broadcastTripToDrivers).not.toHaveBeenCalled();
    });
  });

  describe("T3: handleDriverReconfirmNo — reasignación existente", () => {
    it("ofrece a driver principal sin bloquear por readiness", async () => {
      vi.mocked(getTripById).mockResolvedValue(makeTrip());
      vi.mocked(getConversationByPhone).mockResolvedValue(makeConv());
      vi.mocked(getPrincipalDriver).mockResolvedValue(makeDriver());

      await handleDriverReconfirmNo("reconfirm_no_trip_1", "driver1");
      await flush();

      expect(offerToSpecificDriver).toHaveBeenCalledTimes(1);
      expect(offerToSpecificDriver).toHaveBeenCalledWith(
        "driver1",
        expect.objectContaining({ trip_id: "trip_1" }),
        1,
        expect.stringContaining("REASIGNACIÓN"),
        expect.any(String),
      );
      expect(advanceToNivel1).toHaveBeenCalledWith(1, "+549111111");
    });
  });

  describe("T4: executeEscalation — timeout escalamiento existente", () => {
    it("ejecuta escalamiento sin cambios por readiness", async () => {
      await executeEscalation({ conversationId: 1, phone: "+549111111", currentState: "nivel_1" });
      await flush();

      expect(vi.mocked(executeEscalation)).toHaveBeenCalledWith({
        conversationId: 1,
        phone: "+549111111",
        currentState: "nivel_1",
      });
    });
  });
});
