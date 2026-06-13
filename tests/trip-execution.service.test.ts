import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/database", () => ({
  createTrip: vi.fn().mockResolvedValue(undefined),
  setConversationTrip: vi.fn().mockResolvedValue(undefined),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  updateTripTariff: vi.fn().mockResolvedValue(undefined),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  setChatSessionWorkflowState: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  setPendingOpportunity: vi.fn().mockResolvedValue(undefined),
  createTransaction: vi.fn().mockResolvedValue({ commit: vi.fn(), rollback: vi.fn() } as any),
}));

vi.mock("@/lib/services/dispatch/fleet-validation", () => ({
  ensureFleetCanHandle: vi.fn().mockResolvedValue({ ok: true }),
}));

vi.mock("@/lib/services/learning/fare-learning-engine", () => ({
  buildRouteKey: vi.fn().mockReturnValue("route_key"),
  observe: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/geo/geo-engine", () => ({
  classifyTripLeg: vi.fn().mockReturnValue({ type: "standard", hotelZone: null }),
}));

vi.mock("@/lib/services/learning/opportunity-engine", () => ({
  opportunityEngine: { evaluate: vi.fn().mockResolvedValue([]) },
}));

vi.mock("@/lib/services/learning/learning-pipeline.service", () => ({
  evaluateLearningPipeline: vi.fn().mockResolvedValue({ blocked: false, rankedOpportunities: [] }),
}));

vi.mock("@/lib/services/learning/event-tracking", () => ({
  logOpportunityShown: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/core/pipeline", () => ({
  processLead: vi.fn().mockResolvedValue("completed"),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildOpportunityOfferMessage: vi.fn().mockReturnValue("Oferta especial"),
}));

vi.mock("@/lib/whatsapp/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch.service", () => ({
  executeDispatch: vi.fn().mockResolvedValue({ status: "BROADCASTED", offersSent: 3 }),
}));

vi.mock("@/lib/utils/logger", () => ({
  log: { info: vi.fn(), error: vi.fn(), warn: vi.fn() },
}));

import { executeTrip } from "@/lib/services/trip-execution/trip-execution.service";
import type { TripExecutionInput } from "@/lib/services/trip-execution/trip-execution.service";
import type { ExecutionDeps } from "@/lib/core/pipeline";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";
import { processLead } from "@/lib/core/pipeline";
import { resetChatSession, getActiveTripByPhone, createTrip, createTransaction } from "@/lib/db/database";
import { evaluateLearningPipeline } from "@/lib/services/learning/learning-pipeline.service";
import { opportunityEngine } from "@/lib/services/learning/opportunity-engine";

function makeInput(overrides: Partial<TripExecutionInput> = {}): TripExecutionInput {
  return {
    conversationId: 1,
    phone: "+54911",
    origin: "Puerto Iguazú",
    destination: "Cataratas",
    passengers: 2,
    pricingResult: {
      final_price: 50000,
      base_price: 40000,
      tariff_id: 1,
      markup: 0,
      adjustments: [],
      level: "standard",
      source: "standard",
      explanation: [],
      origin: { place_id: "pi", canonical_name: "Puerto Iguazú", operational_zone: null },
      destination: { place_id: "cat", canonical_name: "Cataratas", operational_zone: null },
    },
    rawSlots: { urgency: "ahora", passengers: 2 },
    session: null,
    lang: "es",
    text: "confirmo el viaje",
    history: [{ role: "user" as const, content: "hola" }],
    customerName: null,
    ...overrides,
  };
}

function makeDeps(): ExecutionDeps {
  return {
    send: vi.fn(),
    persist: vi.fn(),
    handler: vi.fn(),
    geo: { resolveGeoRoute: vi.fn() },
    memory: { saveContext: vi.fn() },
    adminNotify: vi.fn(),
  };
}

describe("executeTrip", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getActiveTripByPhone).mockResolvedValue({
      trip_id: "trip_created", status: "PENDING_DRIVER", client_phone: "+54911",
    } as any);
  });

  it("fleet check fails → returns not executed", async () => {
    vi.mocked(ensureFleetCanHandle).mockResolvedValueOnce({ ok: false, reason: "no_capacity", maxCapacity: 0, rejected: [] } as any);

    const result = await executeTrip(makeInput(), makeDeps());

    expect(result).toEqual({ tripId: null, executed: false });
    expect(resetChatSession).toHaveBeenCalledWith("+54911");
  });

  it("pipeline not completed → returns not executed", async () => {
    vi.mocked(processLead).mockResolvedValueOnce("incomplete");

    const result = await executeTrip(makeInput(), makeDeps());

    expect(result).toEqual({ tripId: null, executed: false });
    expect(resetChatSession).toHaveBeenCalledWith("+54911");
  });

  it("trip creation returns null → returns not executed", async () => {
    vi.mocked(getActiveTripByPhone).mockResolvedValue(null);

    const result = await executeTrip(makeInput(), makeDeps());

    expect(result).toEqual({ tripId: null, executed: false });
  });

  it("learning pipeline blocks → returns executed:false with tripId", async () => {
    vi.mocked(evaluateLearningPipeline).mockResolvedValueOnce({ blocked: true, rankedOpportunities: [] });

    const result = await executeTrip(makeInput(), makeDeps());

    expect(result.executed).toBe(false);
    expect(result.tripId).toBeTruthy();
    expect(resetChatSession).toHaveBeenCalled();
  });

  it("transaction error → rollback and return", async () => {
    const mockRollback = vi.fn();
    const mockCommit = vi.fn().mockRejectedValue(new Error("commit failed"));
    vi.mocked(createTransaction).mockResolvedValueOnce({ commit: mockCommit, rollback: mockRollback } as any);
    vi.mocked(opportunityEngine.evaluate).mockResolvedValueOnce([{
      ruleId: 1, type: "promotion", label: "P", description: "Promo",
      originalPrice: 50000, offeredPrice: 45000, savings: 5000, priority: 1, logId: 1,
    }]);
    vi.mocked(evaluateLearningPipeline).mockResolvedValueOnce({
      blocked: false,
      rankedOpportunities: [{
        ruleId: 1, type: "promotion", label: "P", description: "Promo",
        originalPrice: 50000, offeredPrice: 45000, savings: 5000, priority: 1, logId: 1,
        economicScore: 0, utilityScore: 0,
      }],
    });

    const result = await executeTrip(makeInput(), makeDeps());

    expect(mockRollback).toHaveBeenCalled();
    expect(result.executed).toBe(false);
  });

  it("full success → returns executed:true", async () => {
    const result = await executeTrip(makeInput(), makeDeps());

    expect(result.executed).toBe(true);
    expect(result.tripId).toBeTruthy();
    expect(result.dispatchResult).toEqual({ status: "BROADCASTED", offersSent: 3 });
    expect(createTrip).toHaveBeenCalled();
  });
});
