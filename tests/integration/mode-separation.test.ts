import { describe, it, expect, vi, beforeEach } from "vitest";

// ── mocks ──
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn().mockResolvedValue(null),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getConversationalState: vi.fn().mockResolvedValue("idle"),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/memory/context-memory", () => ({
  saveContext: vi.fn().mockResolvedValue(undefined),
  loadContext: vi.fn().mockResolvedValue({}),
  mergeContext: vi.fn().mockImplementation((slots) => slots),
}));

vi.mock("@/lib/services/geo/geo-engine", () => ({
  resolveGeoRoute: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({
  resolvePricingForSlots: vi.fn().mockResolvedValue({
    pricingResult: {
      final_price: 15000,
      tariff_id: 1,
      origin: { canonical_name: "Aeropuerto IGR" },
      destination: { canonical_name: "Centro Puerto Iguazú" },
    },
  }),
}));

vi.mock("@/lib/services/learning/opportunity-engine", () => ({
  isOpportunityQuery: vi.fn().mockReturnValue(false),
  evaluateOpportunities: vi.fn(),
}));

vi.mock("@/lib/services/trip-execution/now-execution.service", () => ({
  executeNowTrip: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/trip-execution/trip-execution.service", () => ({
  executeTrip: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/memory/predictive-routing", () => ({
  buildPredictedContext: vi.fn().mockReturnValue({
    intentPrediction: { confidence: 0.8 },
    entityPrediction: { candidates: [] },
  }),
}));

vi.mock("@/lib/services/extraction/comprehension-runner", () => ({
  runComprehensionCheck: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/i18n/detect-lang", () => ({
  detectLeadLang: vi.fn().mockReturnValue("es"),
}));

vi.mock("@/config/constants", () => ({
  CONFIRMATION_TIMEOUT_S: 1800,
  CONFIDENCE_PROCEED: 0.7,
  CONFIDENCE_CLARIFY: 0.3,
}));

// ── imports ──
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import type { ExtractionResult } from "@/lib/ai/extraction-schema";
import type { SlotConversationalContext } from "@/lib/services/workflow/slot-workflow";
import type { PricingResult } from "@/lib/services/pricing/resolve-pricing-for-slots";

// ════════════════════════════════════════════════════════════════════════════════
// T-MODE: mode separation (intent vs temporal)
// ════════════════════════════════════════════════════════════════════════════════

describe("T-MODE: BOOKING intent vs temporal mode separation", () => {
  // Helper to simulate the mode calculation logic from policy-pipeline.ts
  function computeMode(
    intent: string,
    facts: string[],
    hasScheduledAt: boolean,
  ): "AHORA" | "RESERVA" {
    const hasFutureSignal = hasScheduledAt ||
      facts.some(f => f.startsWith("date:") || f.startsWith("time:"));
    const explicitReservation = ["PRE_BOOKING", "RESCHEDULE"];
    const isReservationFlow = hasFutureSignal || explicitReservation.includes(intent);
    return isReservationFlow ? "RESERVA" : "AHORA";
  }

  it("T-MODE-1: BOOKING without date/time → AHORA", () => {
    const mode = computeMode("BOOKING", [
      "action:quiero", "origin:aeropuerto", "destination:centro",
    ], false);
    expect(mode).toBe("AHORA");
  });

  it("T-MODE-2: BOOKING with date → RESERVA", () => {
    const mode = computeMode("BOOKING", [
      "action:quiero", "origin:hotel", "destination:aeropuerto", "date:mañana",
    ], false);
    expect(mode).toBe("RESERVA");
  });

  it("T-MODE-3: BOOKING with time → RESERVA", () => {
    const mode = computeMode("BOOKING", [
      "action:quiero", "origin:hotel", "destination:centro", "time:10:00",
    ], false);
    expect(mode).toBe("RESERVA");
  });

  it("T-MODE-4: BOOKING with scheduled_at → RESERVA", () => {
    const mode = computeMode("BOOKING", [
      "action:quiero", "origin:hotel", "destination:aeropuerto",
    ], true);
    expect(mode).toBe("RESERVA");
  });

  it("T-MODE-5: PRE_BOOKING without date/time → RESERVA", () => {
    const mode = computeMode("PRE_BOOKING", [
      "pre_booking:estoy viendo",
    ], false);
    expect(mode).toBe("RESERVA");
  });

  it("T-MODE-6: RESCHEDULE → RESERVA", () => {
    const mode = computeMode("RESCHEDULE", [
      "reschedule:cambiar fecha",
    ], false);
    expect(mode).toBe("RESERVA");
  });

  it("T-MODE-7: NOW intent → AHORA", () => {
    const mode = computeMode("NOW", [
      "now:ahora", "origin:igr", "destination:centro",
    ], false);
    expect(mode).toBe("AHORA");
  });

  it("T-MODE-8: BOOKING with urgency (ahora) → AHORA", () => {
    const mode = computeMode("BOOKING", [
      "action:quiero", "now:ahora", "origin:igr", "destination:centro",
    ], false);
    // urgency is not a future signal, so AHORA
    expect(mode).toBe("AHORA");
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// T-SHORT: AHORA short-circuit ambiguity guard
// ════════════════════════════════════════════════════════════════════════════════

describe("T-SHORT: AHORA short-circuit ambiguity guard", () => {
  function shouldDispatch(
    mode: "AHORA" | "RESERVA",
    isLateral: boolean,
    hasCompleteRoute: boolean,
    hasAmbiguity: boolean,
  ): boolean {
    return mode === "AHORA" && !isLateral && hasCompleteRoute && !hasAmbiguity;
  }

  it("T-SHORT-1: AHORA + route + ambiguity → NO dispatch", () => {
    expect(shouldDispatch("AHORA", false, true, true)).toBe(false);
  });

  it("T-SHORT-2: AHORA + route + no ambiguity → dispatch", () => {
    expect(shouldDispatch("AHORA", false, true, false)).toBe(true);
  });

  it("T-SHORT-3: RESERVA + route + no ambiguity → NO dispatch", () => {
    expect(shouldDispatch("RESERVA", false, true, false)).toBe(false);
  });

  it("T-SHORT-4: AHORA + incomplete route → NO dispatch", () => {
    expect(shouldDispatch("AHORA", false, false, false)).toBe(false);
  });

  it("T-SHORT-5: AHORA + lateral → NO dispatch", () => {
    expect(shouldDispatch("AHORA", true, true, false)).toBe(false);
  });
});

// ════════════════════════════════════════════════════════════════════════════════
// T-CTX: buildExtractionContext resilience
// ════════════════════════════════════════════════════════════════════════════════

describe("T-CTX: buildExtractionContext", () => {
  const mockPricing: PricingResult = {
    final_price: 15000,
    tariff_id: 1,
    origin: { canonical_name: "Aeropuerto IGR" },
    destination: { canonical_name: "Centro Puerto Iguazú" },
  };

  it("T-CTX-1: workflowResult undefined → context is NOT undefined", () => {
    const ctx = buildExtractionContext(
      undefined,
      {
        slots: {
          origin: { value: "aeropuerto", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "centro", score: 0.6, reason: "ambiguous_term" },
        },
        overall_confidence: 0.4,
        action: "clarify",
        clarify_field: "origin",
      },
      undefined, // workflowResult = undefined
      mockPricing,
      { origin: "aeropuerto", destination: "centro" },
      { origin: "ambiguous", destination: "ambiguous" },
    );
    expect(ctx).toBeDefined();
    expect(ctx!.conversationalState).toBe("collecting_slots");
    expect(ctx!.clarifyField).toBeNull();
  });

  it("T-CTX-2: alias resolved + roleLock → preserves alias name", () => {
    const confidenceResult: ExtractionResult = {
      slots: {
        origin: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
        destination: { value: "Centro de Puerto Iguazú", score: 0.6, reason: "ambiguous_term" },
      },
      overall_confidence: 0.4,
      action: "clarify",
      clarify_field: "origin",
    };

    const workflowResult: SlotConversationalContext = {
      state: "collecting_slots",
      clarifyField: "origin",
      overallConfidence: 0.4,
      action: "clarify",
      askForConfirmation: false,
    };

    const ctx = buildExtractionContext(
      undefined,
      confidenceResult,
      workflowResult,
      mockPricing,
      { origin: "aeropuerto", destination: "centro" }, // roleLock raw values
      { origin: "ambiguous", destination: "ambiguous" },
    );
    expect(ctx).toBeDefined();
    // Should preserve alias-resolved canonical names (score > 0)
    expect(ctx!.slots.origin.value).toBe("Aeropuerto de Iguazú");
    expect(ctx!.slots.origin.score).toBe(0.6);
    expect(ctx!.slots.destination.value).toBe("Centro de Puerto Iguazú");
    expect(ctx!.slots.destination.score).toBe(0.6);
  });

  it("T-CTX-3: roleLock with no existing slot → uses roleLock raw", () => {
    const confidenceResult: ExtractionResult = {
      slots: {
        origin: { value: null, score: 0, reason: "missing" },
        destination: { value: null, score: 0, reason: "missing" },
      },
      overall_confidence: 0,
      action: "fallback_regex",
    };

    const workflowResult: SlotConversationalContext = {
      state: "collecting_slots",
      clarifyField: null,
      overallConfidence: 0,
      action: "fallback_regex",
      askForConfirmation: false,
    };

    const ctx = buildExtractionContext(
      undefined,
      confidenceResult,
      workflowResult,
      mockPricing,
      { origin: "aeropuerto", destination: "centro" },
      { origin: "open", destination: "open" },
    );
    expect(ctx).toBeDefined();
    // Should use roleLock raw values as fallback (score = 0)
    expect(ctx!.slots.origin.value).toBe("aeropuerto");
    expect(ctx!.slots.origin.score).toBe(0.6);
    expect(ctx!.slots.destination.value).toBe("centro");
    expect(ctx!.slots.destination.score).toBe(0.6);
  });

  it("T-CTX-4: no roleLock, no confidence → empty context", () => {
    const workflowResult: SlotConversationalContext = {
      state: "collecting_slots",
      clarifyField: null,
      overallConfidence: 0,
      action: "clarify",
      askForConfirmation: false,
    };

    const ctx = buildExtractionContext(
      undefined,
      undefined,
      workflowResult,
      undefined,
      undefined,
      undefined,
    );
    expect(ctx).toBeDefined();
    expect(ctx!.slots).toEqual({});
    expect(ctx!.overallConfidence).toBe(0);
  });
});
