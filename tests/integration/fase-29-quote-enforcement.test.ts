import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sender", () => ({ sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined), sendInteractiveButtons: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(1),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  findPlaceByAlias: vi.fn().mockResolvedValue(null),
  findPlaceByName: vi.fn().mockResolvedValue(null),
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
vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({ resolvePricingForSlots: vi.fn().mockResolvedValue({ pricingResult: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "place_iguazu", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "place_centro", canonical_name: "Centro", operational_zone: "centro" } } }) }));
vi.mock("@/lib/services/admin/admin.service", () => ({ notifyAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn().mockReturnValue({ decision: { decision: "ANSWER", mode: "RESERVA", core: { intent: "COMMERCIAL", facts: [], confidence: 0.6 }, reason: "test" }, policy: { decision: "ANSWER", mode: "RESERVA", policyHint: "COMMERCIAL", requiresConfirmation: false, finalResponse: "$15000", requiresUserInput: false, nextExpectedFields: [], outputSource: "POLICY", needsGeo: false, needsSaveContext: false } }) }));
vi.mock("@/lib/services/i18n/detect-lang", () => ({ detectLeadLang: vi.fn().mockReturnValue("es"), resolveLang: vi.fn().mockReturnValue("es") }));
vi.mock("@/lib/ai/core", () => ({ core: vi.fn() }));
vi.mock("@/lib/services/memory/context-memory", () => ({ saveContext: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/services/geo/geo-engine", () => ({ resolveGeoRoute: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/ai/patterns", () => ({ isAffirmativeMessage: vi.fn(), isNegativeMessage: vi.fn(), AMBIGUOUS_LOCATION_RE: /aeropuerto|aero|terminal/i, AFFIRMATION_RE: /^(sí|si|sim|yes|ok|dale)$/i }));
vi.mock("@/lib/services/learning/opportunity-engine", () => ({
  evaluateOpportunities: vi.fn().mockResolvedValue([]),
  isOpportunityQuery: vi.fn().mockReturnValue(false),
}));
vi.mock("@/lib/ai/response-builder", () => ({
  buildOpportunityNoPricingMessage: vi.fn().mockReturnValue(""),
  formatOpportunityResponse: vi.fn().mockReturnValue(""),
  buildCancellationMessage: vi.fn().mockReturnValue("No hay problema."),
  buildNowDispatchResponse: vi.fn().mockReturnValue("Buscando chofer disponible para tu viaje."),
}));
vi.mock("@/lib/ai/policy-reserva", () => ({
  policyReserva: vi.fn(),
  buildConfirmationMessage: vi.fn().mockReturnValue("Reconfirmá tu viaje."),
  buildNoTariffConfirmation: vi.fn().mockReturnValue("Sin tarifa. ¿Querés seguir?"),
}));
vi.mock("@/lib/ai/llm-response", () => ({ generateLLMResponse: vi.fn().mockResolvedValue(null), validateLLMResponse: vi.fn().mockReturnValue({ valid: false }) }));

import { handlePolicyPipeline, type PolicyPipelineInput } from "@/lib/services/workflow/policy-pipeline";
import { getConversationalState } from "@/lib/db/state-accessors";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { processLead } from "@/lib/pipeline";

function makeBaseInput(overrides: Partial<PolicyPipelineInput> = {}): PolicyPipelineInput {
  return {
    phone: "+549111111",
    text: "sí",
    leadCore: { intent: "COMMERCIAL", facts: [], confidence: 0.6, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: null, destination: null } },
    extractionCtx: undefined,
    conversation: { id: 1, status: "active" } as any,
    history: [],
    customerName: null,
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

describe("FASE 29 — Quote enforcement", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getConversationalState).mockResolvedValue("idle");
  });

  describe("T1: slots CONFIRMED → muestra precio", () => {
    it("envía processLead con tariff intacto cuando quoteReady.allowed", { timeout: 15000 }, async () => {
      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "iguazú", destination: "centro" } } ,
        extractionCtx: {
          slots: {
            origin: { value: "iguazú", score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
            destination: { value: "centro", score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
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

      expect(processLead).toHaveBeenCalled();
      const execCtx = vi.mocked(processLead).mock.calls[0][0] as any;
      expect(execCtx.extractionCtx.tariff.matched).toBe(true);
      expect(execCtx.extractionCtx.tariff.price).toBe(15000);
    });
  });

  describe("T2: origin CONFIRMATION_PENDING → NO muestra precio (slot confirmation intercepta)", () => {
    it("envía slot confirmation UI antes de llegar a quote", async () => {
      const { sendInteractiveButtons } = await import("@/lib/sender");

      await handlePolicyPipeline(makeBaseInput({
        domain: "dispatch",
        leadCore: { intent: "NOW", facts: ["now:ahora"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } ,
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 0.6, reason: "ambiguous_term", status: "CONFIRMATION_PENDING", source: "SYSTEM_INFERRED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
            passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          },
          overallConfidence: 0.85,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
        },
        workflowResult: undefined as any,
        pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
      }));
      await flush();

      expect(sendInteractiveButtons).toHaveBeenCalled();
      expect(executeNowTrip).not.toHaveBeenCalled();
      expect(processLead).not.toHaveBeenCalled();
    });
  });

  describe("T3: ruta completa sin pasajeros → NO muestra precio", () => {
    it("no expone precio cuando quoteReady bloqueado por missing_passengers", async () => {
      await handlePolicyPipeline(makeBaseInput({
        domain: "reservation",
        leadCore: { intent: "PRE_BOOKING", facts: ["date:hoy"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "iguazú", destination: "centro" } } ,
        extractionCtx: {
          slots: {
            origin: { value: "iguazú", score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
            destination: { value: "centro", score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
          },
          overallConfidence: 1.0,
          conversationalState: "collecting_slots",
          clarifyField: null,
          askForConfirmation: false,
          tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" },
        },
        pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
      }));
      await flush();

      expect(processLead).toHaveBeenCalled();
      const execCtx = vi.mocked(processLead).mock.calls[0][0] as any;
      expect(execCtx.extractionCtx.tariff.price).toBeUndefined();
      expect(execCtx.extractionCtx.tariff.matched).toBe(false);
    });
  });

  describe("T4: NOW + slots CONFIRMED → muestra precio y puede dispatch", () => {
    it("ejecuta dispatch NOW cuando canDispatch es true y quoteReady también", async () => {
      const { sendWhatsAppMessage } = await import("@/lib/sender");

      await handlePolicyPipeline(makeBaseInput({
        domain: "dispatch",
        leadCore: { intent: "NOW", facts: ["now:ahora"], confidence: 0.9, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } ,
        extractionCtx: {
          slots: {
            origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "USER_CONFIRMED" },
            passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "USER_CONFIRMED" },
          },
          overallConfidence: 1.0,
          conversationalState: "idle",
          clarifyField: null,
          askForConfirmation: false,
        },
        workflowResult: undefined as any,
        pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
      }));
      await flush();

      expect(executeNowTrip).toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Buscando chofer disponible para tu viaje.");
      expect(processLead).not.toHaveBeenCalled();
    });
  });
});
