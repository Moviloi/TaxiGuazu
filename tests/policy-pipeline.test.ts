import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks: inline vi.fn() in each vi.mock() per vitest v4 hoisting rules ──

vi.mock("@/lib/whatsapp/sender", () => ({ sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined), sendInteractiveButtons: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(1),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn(),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/core/pipeline", () => ({ processLead: vi.fn().mockResolvedValue("incomplete") }));
vi.mock("@/lib/services/trip-execution/trip-execution.service", () => ({ executeTrip: vi.fn().mockResolvedValue({ tripId: "trip_1", executed: true }) }));
vi.mock("@/lib/services/trip-execution/now-execution.service", () => ({ executeNowTrip: vi.fn().mockResolvedValue({ tripId: "trip_now_1", dispatched: true }) }));
vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({ resolvePricingForSlots: vi.fn().mockResolvedValue({ pricingResult: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "place_iguazu", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "place_centro", canonical_name: "Centro", operational_zone: "centro" } } }) }));
vi.mock("@/lib/services/admin/admin.service", () => ({ notifyAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn().mockReturnValue({ decision: { decision: "ANSWER", mode: "RESERVA", core: { intent: "COMMERCIAL", facts: [], confidence: 0.6 }, reason: "test" }, policy: { decision: "ANSWER", mode: "RESERVA", policyHint: "COMMERCIAL", requiresConfirmation: false, finalResponse: "$15000", requiresUserInput: false, nextExpectedFields: [], outputSource: "POLICY", needsGeo: false, needsSaveContext: false } }) }));
vi.mock("@/lib/services/i18n/detect-lang", () => ({ detectLeadLang: vi.fn().mockReturnValue("es") }));
vi.mock("@/lib/ai/core", () => ({ core: vi.fn() }));
vi.mock("@/lib/services/memory/context-memory", () => ({ saveContext: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/services/geo/geo-engine", () => ({ resolveGeoRoute: vi.fn().mockResolvedValue({}) }));
vi.mock("@/lib/ai/patterns", () => ({ isAffirmativeMessage: vi.fn(), isNegativeMessage: vi.fn(), AMBIGUOUS_LOCATION_RE: /aeropuerto|aero|terminal/i }));
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

import { isAffirmativeMessage, isNegativeMessage } from "@/lib/ai/patterns";
import { handlePolicyPipeline } from "@/lib/services/workflow/policy-pipeline";
import { getConversationalState, setConversationalState } from "@/lib/db/state-accessors";
import { getChatSession, resetChatSession } from "@/lib/db/database";
import { executeTrip } from "@/lib/services/trip-execution/trip-execution.service";
import { executeNowTrip } from "@/lib/services/trip-execution/now-execution.service";
import { processLead } from "@/lib/core/pipeline";
import type { PolicyPipelineInput } from "@/lib/services/workflow/policy-pipeline";
import { buildExtractionContext } from "@/lib/services/workflow/build-extraction-context";
import type { CoreDecision } from "@/lib/ai/types";

function makeBaseInput(overrides: Partial<PolicyPipelineInput> = {}): PolicyPipelineInput {
  return {
    phone: "+549111111",
    text: "sí",
    conversation: { id: 1 },
    history: [],
    customerName: null,
    leadCore: { intent: "PRE_BOOKING", facts: ["affirmation:true"], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
    extractionCtx: undefined,
    pricing: undefined as any,
    workflowResult: { state: "awaiting_confirmation", clarifyField: null, overallConfidence: 0.9, action: "proceed", askForConfirmation: true },
    confidenceResult: { slots: { origin: { value: "iguazú", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "aeropuerto", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" } }, overall_confidence: 0.9, action: "proceed" },
    prevSlotsEarly: { origin: "iguazú", destination: "aeropuerto" },
    parsedData: { origin: "iguazú", destination: "aeropuerto", passengers: 1 },
    domain: "reservation",
    ...overrides,
  } as PolicyPipelineInput;
}

describe("policy-pipeline — executeTrip guard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Caso 1: commercial + awaiting_confirmation + affirmativo → NO executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "commercial" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("Caso 2: reservation + awaiting_confirmation + affirmativo → executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      leadCore: { intent: "PRE_BOOKING", facts: ["affirmation:true", "date:hoy"], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
      confidenceResult: { slots: { origin: { value: "iguazú", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "aeropuerto", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, scheduled_at: { value: "hoy", score: 1.0, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" } }, overall_confidence: 0.9, action: "proceed" },
    }));

    expect(executeTrip).toHaveBeenCalled();
    expect(setConversationalState).toHaveBeenCalledWith("+549111111", "idle");
  });

  it("Caso 3: commercial + collecting_slots → NO executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "commercial" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("Caso 4: information domain → NO executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "information" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("Caso 5: reservation + non-affirmative → NO executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);

    await handlePolicyPipeline(makeBaseInput({ domain: "reservation" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("Caso 6: commercial + 'sí' → NO trip creado (full flow guard)", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "commercial" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("Caso 7: dispatch domain → NO executeTrip (domain != reservation)", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "dispatch" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  // ── FASE 9.2: F3 — Rechazo en awaiting_confirmation ──

  it("F3: reservation + awaiting_confirmation + 'no' (sin parsedData) → cancela", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "reservation", parsedData: undefined as any }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  it("S5a: reservation + awaiting_confirmation + 'no' + new slot data → NO cancela (corrección)", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "reservation" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  it("F3: reservation + collecting_slots + 'no' → NO cancela", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({ domain: "reservation" }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  // ── FASE 10.4: S3a — Expiración de awaiting_confirmation ──

  it("S3a: awaiting_confirmation reciente + 'sí' → executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      sessionUpdatedAt: Math.floor(Date.now() / 1000),
      leadCore: { intent: "PRE_BOOKING", facts: ["affirmation:true", "date:hoy"], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
      confidenceResult: { slots: { origin: { value: "iguazú", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "aeropuerto", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, scheduled_at: { value: "hoy", score: 1.0, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" } }, overall_confidence: 0.9, action: "proceed" },
    }));

    expect(executeTrip).toHaveBeenCalled();
    expect(setConversationalState).toHaveBeenCalledWith("+549111111", "idle");
  });

  it("S3a: awaiting_confirmation expirado + 'sí' → NO executeTrip, cancela", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      sessionUpdatedAt: Math.floor(Date.now() / 1000) - 7200,
    }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(setConversationalState).toHaveBeenCalledWith("+549111111", "idle");
    expect(resetChatSession).toHaveBeenCalledWith("+549111111");
  });

  it("S3a: collecting_slots + 'sí' — expiration no afecta", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      sessionUpdatedAt: Math.floor(Date.now() / 1000) - 7200,
    }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).toHaveBeenCalled();
  });

  // ── FASE 11.2: E6 — Afirmación con cambios de slots ──

  it("E6: 'sí' sin cambios → executeTrip", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      prevSlotsEarly: { origin: "iguazú", destination: "aeropuerto" },
      parsedData: { origin: "iguazú", destination: "aeropuerto" },
      leadCore: { intent: "PRE_BOOKING", facts: ["affirmation:true", "date:hoy"], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
      confidenceResult: { slots: { origin: { value: "iguazú", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "aeropuerto", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, scheduled_at: { value: "hoy", score: 1.0, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" } }, overall_confidence: 0.9, action: "proceed" },
    }));

    expect(executeTrip).toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  it("E6: 'sí, cambio destino' → NO executeTrip, re-confirma", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      prevSlotsEarly: { origin: "iguazú", destination: "aeropuerto" },
      parsedData: { origin: "iguazú", destination: "puerto" },
    }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Sin tarifa. ¿Querés seguir?");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "Sin tarifa. ¿Querés seguir?");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("E6: 'sí, a las 10' → NO executeTrip, re-confirma con scheduled_at", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      prevSlotsEarly: { origin: "iguazú", destination: "aeropuerto" },
      parsedData: { origin: "iguazú", destination: "aeropuerto", scheduled_at: "10:00" },
    }));

    expect(executeTrip).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Sin tarifa. ¿Querés seguir?");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "Sin tarifa. ¿Querés seguir?");
    expect(processLead).not.toHaveBeenCalled();
  });

  // ── FASE 13: E4 — AHORA → dispatch ──

  it("E4: AHORA + ruta completa → executeNowTrip + dispatch, NO processLead", async () => {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");

    await handlePolicyPipeline(makeBaseInput({
      leadCore: { intent: "NOW", facts: ["now:ahora", "origin:aeropuerto", "destination:centro"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } as CoreDecision,
      extractionCtx: {
        slots: { origin: { value: "Aeropuerto IGR", score: 0.9, reason: "core_role_lock", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "Centro", score: 0.9, reason: "core_role_lock", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 0.6, reason: "previous_turn", status: "CONFIRMED", source: "SYSTEM_INFERRED" } },
        overallConfidence: 0.85,
        conversationalState: "idle",
        clarifyField: null,
        askForConfirmation: false,
      },
      domain: "dispatch",
      workflowResult: undefined as any,
      pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
    }));

    expect(executeNowTrip).toHaveBeenCalledTimes(1);
    expect(executeNowTrip).toHaveBeenCalledWith(expect.objectContaining({
      phone: "+549111111",
      origin: "Aeropuerto IGR",
      destination: "Centro",
    }));
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Buscando chofer disponible para tu viaje.");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "Buscando chofer disponible para tu viaje.");
    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  // ── FASE 26 — Dispatch Gate Hardening ──

  it("F26-A: origin CONFIRMATION_PENDING → NO dispatch (dispatchReady bloquea)", async () => {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { processLead } = await import("@/lib/core/pipeline");

    await handlePolicyPipeline(makeBaseInput({
      leadCore: { intent: "NOW", facts: ["now:ahora", "origin:aeropuerto", "destination:centro"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } as CoreDecision,
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
      domain: "dispatch",
      workflowResult: undefined as any,
      pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
    }));

    const { sendInteractiveButtons } = await import("@/lib/whatsapp/sender");

    expect(executeNowTrip).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith("+549111111", "Buscando chofer disponible para tu viaje.");
    expect(sendInteractiveButtons).toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  it("F26-B: todos CONFIRMED → dispatch permitido (NOW)", async () => {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
    const { insertMessage } = await import("@/lib/db/database");

    await handlePolicyPipeline(makeBaseInput({
      leadCore: { intent: "NOW", facts: ["now:ahora", "origin:aeropuerto", "destination:centro"], confidence: 0.85, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } as CoreDecision,
      extractionCtx: {
        slots: {
          origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          passengers: { value: 2, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
        },
        overallConfidence: 1.0,
        conversationalState: "idle",
        clarifyField: null,
        askForConfirmation: false,
      },
      domain: "dispatch",
      workflowResult: undefined as any,
      pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
    }));

    expect(executeNowTrip).toHaveBeenCalledTimes(1);
    expect(executeNowTrip).toHaveBeenCalledWith(expect.objectContaining({
      phone: "+549111111",
      origin: "Aeropuerto IGR",
      destination: "Centro",
      passengers: 2,
    }));
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Buscando chofer disponible para tu viaje.");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "Buscando chofer disponible para tu viaje.");
    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  it("F26-D: NOW sin hora + slots CONFIRMED → dispatch permitido", async () => {
    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");

    // NOW mode no requiere scheduled_at; solo origin/dest/passengers CONFIRMED
    await handlePolicyPipeline(makeBaseInput({
      leadCore: { intent: "NOW", facts: ["now:ahora", "origin:aeropuerto", "destination:centro"], confidence: 0.9, slotStability: { origin: "locked", destination: "locked" }, roleLock: { origin: "Aeropuerto IGR", destination: "Centro" } } as CoreDecision,
      extractionCtx: {
        slots: {
          origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          destination: { value: "Centro", score: 1.0, reason: "exact_alias_match", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" },
          // NOTA: scheduled_at no está presente — es NOW, no se requiere
        },
        overallConfidence: 1.0,
        conversationalState: "idle",
        clarifyField: null,
        askForConfirmation: false,
      },
      domain: "dispatch",
      workflowResult: undefined as any,
      pricing: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "p1", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "p2", canonical_name: "Centro", operational_zone: "centro" } } as any,
    }));

    expect(executeNowTrip).toHaveBeenCalledTimes(1);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+549111111", "Buscando chofer disponible para tu viaje.");
    expect(executeTrip).not.toHaveBeenCalled();
    expect(processLead).not.toHaveBeenCalled();
  });

  // ── FASE 26.1 — Readiness hardening ──

  it("F26.1-T2: build-extraction-context previous_turn → slot tiene status/source", () => {
    const ctx = buildExtractionContext(
      undefined,
      undefined,
      undefined,
      undefined,
      { origin: null, destination: null },
      { origin: "open", destination: "open" },
      { origin: "mi casa", destination: "el centro" },
    );
    expect(ctx).toBeDefined();
    expect(ctx!.slots.origin).toBeDefined();
    expect(ctx!.slots.origin!.value).toBe("mi casa");
    expect(ctx!.slots.origin!.score).toBe(0.8);
    expect(ctx!.slots.origin!.reason).toBe("previous_turn");
    expect((ctx!.slots.origin as any).status).toBe("INFERRED");
    expect((ctx!.slots.origin as any).source).toBe("SYSTEM_INFERRED");
    expect((ctx!.slots.destination as any).status).toBe("INFERRED");
    expect((ctx!.slots.destination as any).source).toBe("SYSTEM_INFERRED");
  });

  it("F26.1-T1: FUTURE sin scheduled_at + slots CONFIRMED → NO dispatch (missing_time)", async () => {
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(getChatSession).mockResolvedValue({
      slots: JSON.stringify({ origin: "iguazú", destination: "aeropuerto" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    await handlePolicyPipeline(makeBaseInput({
      domain: "reservation",
      leadCore: { intent: "PRE_BOOKING", facts: ["affirmation:true", "date:hoy"], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
      // scheduled_at está AUSENTE en confidenceResult — isDispatchReady debe bloquear
      confidenceResult: { slots: { origin: { value: "iguazú", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, destination: { value: "aeropuerto", score: 0.9, reason: "test", status: "CONFIRMED", source: "SYSTEM_INFERRED" }, passengers: { value: 1, score: 1.0, reason: "direct_extraction", status: "CONFIRMED", source: "SYSTEM_INFERRED" } }, overall_confidence: 0.9, action: "proceed" },
    }));

    const { resetChatSession } = await import("@/lib/db/database");

    expect(executeTrip).not.toHaveBeenCalled();
    expect(resetChatSession).toHaveBeenCalled();
  });
});
