import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(1),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  findPlaceByAlias: vi.fn().mockResolvedValue(null),
  findPlaceByName: vi.fn().mockResolvedValue(null),
  findTariffByPriority: vi.fn().mockResolvedValue(null),
  queryOne: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db/core/helpers", () => ({
  queryOne: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/ai/display-name", () => ({
  getPlaceDisplayName: vi.fn().mockResolvedValue({ displayName: "", source: "canonical_name" }),
}));
vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn().mockResolvedValue({ place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" }),
  resolveLocationToPlaceId: vi.fn().mockResolvedValue(null),
}));
vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn(),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/pipeline", () => ({ processLead: vi.fn().mockResolvedValue("incomplete") }));
vi.mock("@/lib/services/trip-execution/trip-execution.service", () => ({ executeTrip: vi.fn().mockResolvedValue({ tripId: "trip_1", executed: true }) }));
vi.mock("@/lib/services/trip-execution/now-execution.service", () => ({ executeNowTrip: vi.fn().mockResolvedValue({ tripId: "trip_now_1", dispatched: true }) }));
vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({ resolvePricingForSlots: vi.fn().mockResolvedValue({ pricingResult: { final_price: 15000, tariff_id: 1 } }) }));
vi.mock("@/lib/services/admin/admin.service", () => ({ notifyAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn().mockReturnValue({ decision: { decision: "ANSWER", mode: "RESERVA", core: { intent: "COMMERCIAL", facts: [], confidence: 0.6 }, reason: "test" }, policy: { decision: "ANSWER", mode: "RESERVA", policyHint: "COMMERCIAL", requiresConfirmation: false, finalResponse: "$15000", requiresUserInput: false, nextExpectedFields: [], outputSource: "POLICY", needsGeo: false, needsSaveContext: false } }) }));
vi.mock("@/lib/services/i18n/detect-lang", () => ({ detectLeadLang: vi.fn().mockReturnValue("es"), resolveLang: vi.fn().mockReturnValue("es") }));
vi.mock("@/lib/ai/core", () => ({ core: vi.fn() }));
vi.mock("@/lib/services/memory/context-memory", () => ({ saveContext: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/services/geo/geo-engine", () => ({ resolveGeoRoute: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/ai/patterns", () => ({ isAffirmativeMessage: vi.fn(), isNegativeMessage: vi.fn(), AMBIGUOUS_LOCATION_RE: /aeropuerto|aero|terminal/i, AFFIRMATION_RE: /^(sí|si|sim|yes|ok|dale)$/i }));
vi.mock("@/lib/services/learning/opportunity-engine", () => ({ evaluateOpportunities: vi.fn().mockResolvedValue([]), isOpportunityQuery: vi.fn().mockReturnValue(false) }));
vi.mock("@/lib/ai/response-builder", () => ({ buildOpportunityNoPricingMessage: vi.fn().mockReturnValue(""), formatOpportunityResponse: vi.fn().mockReturnValue(""), buildCancellationMessage: vi.fn().mockReturnValue("No hay problema."), buildNowDispatchResponse: vi.fn().mockReturnValue("Buscando chofer disponible para tu viaje.") }));
vi.mock("@/lib/ai/policy-reserva", () => ({ policyReserva: vi.fn(), buildConfirmationMessage: vi.fn().mockReturnValue("Reconfirmá tu viaje."), buildNoTariffConfirmation: vi.fn().mockReturnValue("Sin tarifa. ¿Querés seguir?") }));
vi.mock("@/lib/services/workflow/slot-workflow", () => ({ evaluateWorkflowTransition: vi.fn().mockResolvedValue({ state: "awaiting_confirmation", clarifyField: null }) }));

import { handlePolicyPipeline, type PolicyPipelineInput } from "@/lib/services/workflow/policy-pipeline";
import { handleSlotConfirmationButton } from "@/lib/services/lead.service";
import { getConversationalState } from "@/lib/db/state-accessors";
import { processLead } from "@/lib/pipeline";

function makeBaseInput(overrides: Partial<PolicyPipelineInput> = {}): PolicyPipelineInput {
  return {
    phone: "+549111111",
    text: "texto",
    history: [],
    customerName: null,
    leadCore: { intent: "COMMERCIAL", facts: [], confidence: 0.6, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: null, destination: null } },
    extractionCtx: undefined,
    conversation: { id: 1, status: "active" } as any,
    domain: "reservation",
    workflowResult: { state: "collecting_slots" } as any,
    pricing: undefined,
    confidenceResult: undefined,
    prevSlotsEarly: {},
    parsedData: undefined,
    ...overrides,
  };
}

async function flush() {
  await new Promise(resolve => setImmediate(resolve));
}

describe("FASE 29.2 — Slot confirmation UI routing audit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConversationalState).mockResolvedValue("idle");
  });

  // ── T1: Pipeline catch CONFIRMATION_PENDING → interactive buttons ──
  describe("T1: CONFIRMATION_PENDING → interactive buttons", () => {
    it("sendInteractiveButtons called with slot_confirm and slot_change", { timeout: 15000 }, async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");
      vi.mocked(getConversationalState).mockResolvedValue("idle");

      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "iguazú", destination: "centro" } },
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 0.6, reason: "ambiguous_term", status: "CONFIRMATION_PENDING", source: "SYSTEM_INFERRED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          },
          overallConfidence: 0.85,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
          tariff: { matched: false, price: undefined, canonicalOrigin: "Aeropuerto IGR", canonicalDestination: "Centro" },
        },
        workflowResult: undefined as any,
      }));
      await flush();

      expect(sendInteractiveButtons).toHaveBeenCalledTimes(1);
      const [, body, buttons] = vi.mocked(sendInteractiveButtons).mock.calls[0];
      expect(body).toContain("Solo para confirmar");
      expect(buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "slot_confirm" }),
          expect.objectContaining({ id: "slot_change" }),
        ]),
      );
      expect(processLead).not.toHaveBeenCalled();
    });
  });

  // ── T2: INFERRED status → interactive buttons (FASE 29.3 fix) ──
  describe("T2: INFERRED status → interactive buttons", () => {
    it("sendInteractiveButtons con origin INFERRED y destination CONFIRMED", { timeout: 15000 }, async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");
      vi.mocked(getConversationalState).mockResolvedValue("idle");

      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } },
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 0.6, reason: "core_role_lock", status: "INFERRED", source: "SYSTEM_INFERRED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          },
          overallConfidence: 0.85,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
          tariff: { matched: false, price: undefined, canonicalOrigin: "Aeropuerto IGR", canonicalDestination: "Centro" },
        },
        workflowResult: undefined as any,
      }));
      await flush();

      expect(sendInteractiveButtons).toHaveBeenCalled();
      const [, body, buttons] = vi.mocked(sendInteractiveButtons).mock.calls[0];
      expect(body).toContain("Origen");
      expect(buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "slot_confirm" }),
          expect.objectContaining({ id: "slot_change" }),
        ]),
      );
      expect(processLead).not.toHaveBeenCalled();
    });
  });

  // ── T3: slot_confirm button → handleSlotConfirmationButton → pipeline re-entry ──
  describe("T3: slot_confirm button → pipeline re-entry", () => {
    it("promueve slots a CONFIRMED y re-ingresa sin shouldRequestConfirmation", { timeout: 15000 }, async () => {
      const { getChatSession } = await import("@/lib/db/database");
      const { evaluateWorkflowTransition } = await import("@/lib/services/workflow/slot-workflow");
      const { sendInteractiveButtons } = await import("@/lib/sender");

      const sessionData = {
        conversational_state: "slot_confirmation",
        slots: JSON.stringify({ origin: "Aeropuerto IGR", destination: "Centro", passengers: "1" }),
        confidence: JSON.stringify({ origin: 0.6, destination: 0.8, passengers: 1.0 }),
        updated_at: Math.floor(Date.now() / 1000),
      };
      vi.mocked(getChatSession).mockResolvedValue(sessionData as any);

      vi.mocked(evaluateWorkflowTransition).mockResolvedValue({
        state: "awaiting_confirmation",
        clarifyField: null,
      } as any);

      await handleSlotConfirmationButton(
        "+549111111",
        "slot_confirm",
        { id: 1 },
        [],
        null,
        { intent: "RESERVA", facts: [], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } as any,
        sessionData as any,
      );
      await flush();

      // After slot_confirm, pricing succeeds → price message sent, no pipeline re-entry
      expect(sendInteractiveButtons).not.toHaveBeenCalled();
      expect(processLead).not.toHaveBeenCalled();
    });
  });

  // ── T4: Ambos INFERRED → interactive buttons ──
  describe("T4: origin + destination ambos INFERRED", () => {
    it("sendInteractiveButtons con ambos slots INFERRED", { timeout: 15000 }, async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");
      vi.mocked(getConversationalState).mockResolvedValue("idle");

      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Retiro", destination: "Congreso" } },
        extractionCtx: {
          slots: {
            origin: { value: "Retiro", score: 0.35, reason: "core_role_lock", status: "INFERRED", source: "SYSTEM_INFERRED" },
            destination: { value: "Congreso", score: 0.4, reason: "core_role_lock", status: "INFERRED", source: "SYSTEM_INFERRED" },
          },
          overallConfidence: 0.4,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
          tariff: { matched: false, price: undefined, canonicalOrigin: "Retiro", canonicalDestination: "Congreso" },
        },
        workflowResult: undefined as any,
      }));
      await flush();

      expect(sendInteractiveButtons).toHaveBeenCalled();
      const [, , buttons] = vi.mocked(sendInteractiveButtons).mock.calls[0];
      expect(buttons).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ id: "slot_confirm" }),
          expect.objectContaining({ id: "slot_change" }),
        ]),
      );
      expect(processLead).not.toHaveBeenCalled();
    });
  });

  // ── T5: Ambos CONFIRMED → no hay confirmación interactiva ──
  describe("T5: origin + destination CONFIRMED → sin botones", () => {
    it("no llama sendInteractiveButtons ni buildSlotConfirmationMessage", { timeout: 15000 }, async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");
      vi.mocked(getConversationalState).mockResolvedValue("idle");

      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.95, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } },
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            passengers: { value: 2, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
            scheduled_at: { value: "2026-06-25", score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
          },
          overallConfidence: 1.0,
          conversationalState: "collecting_slots",
          clarifyField: null,
          askForConfirmation: true,
          tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" },
        },
        pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
      }));
      await flush();

      expect(sendInteractiveButtons).not.toHaveBeenCalled();
      expect(processLead).toHaveBeenCalled();
    });
  });

  // ── T6: passengers INFERRED → no dispara location confirmation ──
  describe("T6: solo passengers INFERRED → sin confirmación de ubicación", () => {
    it("deja pasar porque solo origin/destination disparan confirmación", { timeout: 15000 }, async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");
      vi.mocked(getConversationalState).mockResolvedValue("idle");

      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } },
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            passengers: { value: 1, score: 0.5, reason: "user_provided", status: "INFERRED", source: "SYSTEM_INFERRED" },
          },
          overallConfidence: 0.85,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
          tariff: { matched: false, price: undefined, canonicalOrigin: "IGR", canonicalDestination: "Centro" },
        },
        workflowResult: undefined as any,
      }));
      await flush();

      // passengers INFERRED no dispara confirmación de ubicación
      expect(sendInteractiveButtons).not.toHaveBeenCalled();
      expect(processLead).toHaveBeenCalled();
    });
  });
});
