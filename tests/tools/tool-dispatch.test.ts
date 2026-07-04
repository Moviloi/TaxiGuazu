// Tests de contrato para DispatchTool
// Tests de equivalencia: dispatchTool.dispatchTrip vs executeDispatch (solo mock DB)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { DispatchToolInputSchema, DispatchToolOutputSchema, dispatchTool } from "@/lib/services/dispatch/tool-dispatch";
import { executeDispatch } from "@/lib/services/dispatch/dispatch.service";
import type { TripRow } from "@/lib/db/types";

// ── Mock SOLO la capa DB (drivers, disponibilidad, notificaciones) ──
// No mockeamos dispatchTool ni executeDispatch — testeamos ambos lados reales.

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
  findPlaceByAlias: vi.fn().mockResolvedValue(null),
  findPlaceByName: vi.fn().mockResolvedValue(null),
  queryOne: vi.fn().mockResolvedValue({ country: "BR" }),
  findTariffByPriority: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocationToPlaceId: vi.fn().mockResolvedValue("place_foz"),
  resolveLocation: vi.fn().mockResolvedValue({ place_id: "p_test", canonical_name: "test", zone_id: "z_test", confidence: "not_found" }),
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

// ── Helpers para construir TripRow (mismo molde que dispatch.service.test.ts) ──

import { getPrincipalDriver, getDriverExpiry, getPrincipal2Driver } from "@/lib/db/database";

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

// ── Contract validation (schema puro, no necesita mocks) ──

describe("DispatchTool — contract validation", () => {
  const validTrip = {
    trip_id: "trip_123",
    client_phone: "+549111111",
    origin: "Aeropuerto IGR",
    destination: "Centro",
    price_base: 60000,
    passengers: 2,
    scheduled_at: Math.floor(Date.now() / 1000),
  };

  it("rejects missing trip", () => {
    expect(() => DispatchToolInputSchema.parse({ conversationId: 1, phone: "+549111111" })).toThrow();
  });

  it("rejects negative passengers", () => {
    expect(() => DispatchToolInputSchema.parse({
      trip: validTrip, conversationId: 1, phone: "+549111111", passengers: -1,
    })).toThrow();
  });

  it("accepts valid input with defaults", () => {
    const input = DispatchToolInputSchema.parse({ trip: validTrip, conversationId: 1, phone: "+549111111" });
    expect(input.urgency).toBe("normal");
    expect(input.passengers).toBe(1); // default
  });

  it("output schema validates OFFERED", () => {
    const output = DispatchToolOutputSchema.parse({ status: "OFFERED", offersSent: 1 });
    expect(output.status).toBe("OFFERED");
  });

  it("output schema validates BROADCASTED", () => {
    const output = DispatchToolOutputSchema.parse({ status: "BROADCASTED", offersSent: 5 });
    expect(output.offersSent).toBe(5);
  });

  it("output schema validates NO_DRIVERS", () => {
    const output = DispatchToolOutputSchema.parse({ status: "NO_DRIVERS", offersSent: 0 });
    expect(output.status).toBe("NO_DRIVERS");
  });
});

// ── Equivalence: dispatchTool vs executeDispatch (ambos reales, solo DB mockeada) ──

describe("DispatchTool — equivalence with executeDispatch (real implementations, DB mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("1: scheduled trip + active principal → OFFERED status + offersSent=1", async () => {
    // Arrange: principal activo para viaje programado
    vi.mocked(getPrincipalDriver).mockResolvedValue({
      driver_id: "d1", phone: "principal1", name: "Principal 1",
      is_principal: 1, group_id: null, active: 1, created_at: null,
      car_type: null, car_capacity: null, color: null, plate: null,
      country: null, idiom: null, min_payout: null, is_low_cost: null,
      shift: "any", payment_method: null, rating: 4.5, rating_count: null,
      offers_received: null, offers_accepted: null, acceptance_score: 80,
      tier: "normal", languages: null, is_guide: null, car_model: null,
      car_year: null, status: "active", approved_at: null, approved_by: null,
    });
    vi.mocked(getDriverExpiry).mockResolvedValue({ active: true, expiresAt: null });

    const scheduledAt = Math.floor(Date.now() / 1000) + 86400;

    // Via tool
    const toolResult = await dispatchTool.dispatchTrip({
      trip: {
        trip_id: "trip_test", client_phone: "+54911",
        origin: "Puerto Iguazú", destination: "Cataratas",
        price_base: 50000, passengers: 2, scheduled_at: scheduledAt,
      },
      conversationId: 1, phone: "+54911",
      urgency: "normal", passengers: 2,
    });

    // Via direct call a executeDispatch
    const directResult = await executeDispatch({
      conversationId: 1, phone: "+54911",
      trip: makeTrip({ scheduled_at: scheduledAt }),
      urgency: "normal", passengers: 2,
    });

    // Aserciones explícitas:
    expect(toolResult.status).toBe("OFFERED");
    expect(toolResult.offersSent).toBe(1);
    expect(toolResult.status).toBe(directResult.status);
    expect(toolResult.offersSent).toBe(directResult.offersSent);
  });

  it("2: scheduled trip + no active principals → BROADCASTED status + offersSent=0", async () => {
    // Arrange: principal inactivo, principal2 no existe
    vi.mocked(getPrincipalDriver).mockResolvedValue({
      driver_id: "d1", phone: "principal1", name: "Principal 1",
      is_principal: 1, group_id: null, active: 1, created_at: null,
      car_type: null, car_capacity: null, color: null, plate: null,
      country: null, idiom: null, min_payout: null, is_low_cost: null,
      shift: "any", payment_method: null, rating: 4.5, rating_count: null,
      offers_received: null, offers_accepted: null, acceptance_score: 80,
      tier: "normal", languages: null, is_guide: null, car_model: null,
      car_year: null, status: "active", approved_at: null, approved_by: null,
    });
    // Principal tiene expiry inactivo
    vi.mocked(getDriverExpiry).mockResolvedValue({ active: false, expiresAt: null });
    // Principal2 no existe (mock default retorna null)

    const scheduledAt = Math.floor(Date.now() / 1000) + 86400;

    // Via tool
    const toolResult = await dispatchTool.dispatchTrip({
      trip: {
        trip_id: "trip_test", client_phone: "+54911",
        origin: "Puerto Iguazú", destination: "Cataratas",
        price_base: 50000, passengers: 2, scheduled_at: scheduledAt,
      },
      conversationId: 1, phone: "+54911",
      urgency: "normal", passengers: 2,
    });

    // Via direct call
    const directResult = await executeDispatch({
      conversationId: 1, phone: "+54911",
      trip: makeTrip({ scheduled_at: scheduledAt }),
      urgency: "normal", passengers: 2,
    });

    // Aserciones explícitas:
    expect(toolResult.status).toBe("BROADCASTED");
    expect(toolResult.offersSent).toBe(0);
    expect(toolResult.status).toBe(directResult.status);
    expect(toolResult.offersSent).toBe(directResult.offersSent);
  });

  it("3: non-scheduled trip → BROADCASTED status + offersSent=0", async () => {
    // Arrange: viaje sin scheduled_at (no se intentan principals)
    // Los mocks default ya retornan getPrincipalDriver=null

    // Via tool (sin scheduled_at)
    const toolResult = await dispatchTool.dispatchTrip({
      trip: {
        trip_id: "trip_test", client_phone: "+54911",
        origin: "Puerto Iguazú", destination: "Cataratas",
        price_base: 50000, passengers: 2, scheduled_at: null,
      },
      conversationId: 1, phone: "+54911",
      urgency: "normal", passengers: 2,
    });

    // Via direct call
    const directResult = await executeDispatch({
      conversationId: 1, phone: "+54911",
      trip: makeTrip({ scheduled_at: null }),
      urgency: "normal", passengers: 2,
    });

    // Aserciones explícitas:
    expect(toolResult.status).toBe("BROADCASTED");
    expect(toolResult.offersSent).toBe(0);
    expect(toolResult.status).toBe(directResult.status);
    expect(toolResult.offersSent).toBe(directResult.offersSent);
  });
});
