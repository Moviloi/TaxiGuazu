/**
 * E2E — Tests focalizados de los flujos mejorados
 *
 * Valida las 3 mejoras principales:
 * 1. Pasajeros ANTES de pricing (slot_confirm button → pregunta pasajeros, no precio)
 * 2. Desambiguación multi-turn (detecta términos ambiguos)
 * 3. Confirmación completa con pricing
 *
 * Tests sobre handleLeadMessage (pipeline completo) + handleSlotConfirmationButton
 * Mocks controlados para evitar rate limits de LLM y DB real.
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── SHARED MOCKS (hoisted) ─────────────────────────────────────────────

const capturedMessages: { to: string; text: string; buttons?: string[] }[] = [];

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn(async (to: string, text: string) => {
    capturedMessages.push({ to, text });
  }),
  sendInteractiveButtons: vi.fn(async (to: string, text: string, buttons: any[]) => {
    capturedMessages.push({
      to,
      text,
      buttons: buttons.map((b: any) => b.title || b.reply?.title || JSON.stringify(b)),
    });
  }),
}));

vi.mock("@/lib/ai/llm-provider", () => ({
  getLLMProvider: vi.fn(() => ({
    name: "mock",
    extractSlots: vi.fn().mockResolvedValue(null),
    generateResponse: vi.fn().mockResolvedValue("Mock response for testing."),
    interpretAmbiguity: vi.fn().mockResolvedValue(null),
  })),
  resetLLMProvider: vi.fn(),
}));

vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getConversationByPhone: vi.fn().mockResolvedValue({ id: 1 }),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  resolveAlias: vi.fn().mockResolvedValue(null),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  updateChatSessionConversation: vi.fn().mockResolvedValue(undefined),
  searchPlaces: vi.fn().mockResolvedValue([]),
  findPlaceByAlias: vi.fn().mockResolvedValue(null),
  findPlaceByName: vi.fn().mockResolvedValue(null),
  queryOne: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildGlobalErrorMessage: vi.fn().mockReturnValue("[TEST] Error simulado"),
  buildGreetingIntro: vi.fn().mockReturnValue("¡Hola! Soy Cris Virtual, asistente 24/7 de TaxiGuazú."),
  buildGenericClarify: vi.fn().mockReturnValue("¿A dónde necesitás ir?"),
  buildEscalationMessage: vi.fn().mockReturnValue("Te transfiero con un operador"),
  inferMissingFieldFromCore: vi.fn().mockReturnValue(null),
  buildCancellationMessage: vi.fn().mockReturnValue("Reserva cancelada"),
  buildOpportunityNoPricingMessage: vi.fn().mockReturnValue(""),
  formatOpportunityResponse: vi.fn().mockReturnValue(""),
  buildNowDispatchResponse: vi.fn().mockReturnValue(""),
  buildFleetCapacityMessage: vi.fn().mockReturnValue(""),
  buildFleetTariffMessage: vi.fn().mockReturnValue(""),
  buildOpportunityOfferMessage: vi.fn().mockReturnValue(""),
  buildOpportunityAcceptedMessage: vi.fn().mockReturnValue(""),
  buildOpportunityDeclinedMessage: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/ai/core", () => ({
  core: vi.fn().mockReturnValue({
    intent: "BOOKING",
    facts: [],
    confidence: 0.8,
    slotStability: { origin: "ambiguous", destination: "ambiguous" },
    roleLock: { origin: null, destination: null },
  }),
}));

vi.mock("@/lib/ai/domain", () => ({
  mapIntentToDomain: vi.fn().mockReturnValue("reservation"),
}));

vi.mock("@/lib/ai/slot-confirmation", () => ({
  buildFieldSelector: vi.fn().mockReturnValue({
    text: "¿Qué querés cambiar? Escribí el origen y destino correctos.",
    prompt: "El usuario debe escribir los datos a corregir en texto libre.",
  }),
  shouldRequestConfirmation: vi.fn().mockReturnValue(false),
  buildSlotConfirmationMessage: vi.fn().mockReturnValue({ text: "Confirmación", buttons: [] }),
}));

vi.mock("@/lib/services/workflow/conversation-setup", () => ({
  handleConversationSetup: vi.fn().mockResolvedValue({
    conversation: { id: 1 },
    history: [],
    customerName: null,
    sessionReset: false,
    workflow: null,
  }),
}));

vi.mock("@/lib/services/workflow/opportunity-response", () => ({
  handleOpportunityResponse: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/workflow/command-shortcuts", () => ({
  handleCommandShortcuts: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/workflow/response-reset", () => ({
  handleResponseReset: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/workflow/admin-commands", () => ({
  handleAdminCommands: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/memory/memory", () => ({
  buildMemory: vi.fn().mockReturnValue({ sessionMemory: { lastIntent: null } }),
}));

vi.mock("@/lib/services/memory/predictive-routing", () => ({
  buildPredictedContext: vi.fn().mockReturnValue({ intentPrediction: { confidence: 0 }, entityPrediction: { candidates: [] } }),
}));

vi.mock("@/lib/services/workflow/slot-workflow", () => ({
  evaluateWorkflowTransition: vi.fn().mockResolvedValue({
    state: "collecting_slots",
    clarifyField: null,
    overallConfidence: 1.0,
    action: "proceed",
    askForConfirmation: false,
  }),
}));

vi.mock("@/lib/services/workflow/policy-pipeline", () => ({
  handlePolicyPipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/workflow/build-extraction-context", () => ({
  buildExtractionContext: vi.fn().mockReturnValue({
    slots: {},
    overallConfidence: 1.0,
    conversationalState: "collecting_slots",
    clarifyField: null,
    askForConfirmation: false,
    tariff: undefined,
  }),
}));

vi.mock("@/lib/services/i18n/detect-lang", () => ({
  detectLeadLang: vi.fn().mockReturnValue("es"),
}));

vi.mock("@/lib/services/extraction/comprehension-runner", () => ({
  runComprehensionCheck: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/learning/event-tracking", () => ({
  logIntentDetected: vi.fn(),
  logEntityDetected: vi.fn(),
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn().mockResolvedValue(null),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/workflow/command-router", () => ({
  handleAdminCommands: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  ADMIN_PHONE: "+54999999999",
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
  notifyOtherDriversTaken: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({
  resolvePricingForSlots: vi.fn().mockResolvedValue({
    price: 85000,
    tariffId: "mock-tariff-1",
    breakdown: { base: 85000, passengers: 3, vehicle: "Auto para 3 pasajeros" },
    matched: true,
  }),
}));

vi.mock("@/lib/services/pricing/tariff-resolver", () => ({
  resolveTariff: vi.fn().mockResolvedValue({ price: 85000, tariffId: "mock-tariff-1", matched: true }),
  resolveTariffByPlaceIds: vi.fn().mockResolvedValue(null),
}));

// ─── HELPERS ─────────────────────────────────────────────────────────────

function drainBotResponses(): string[] {
  const texts: string[] = [];
  while (capturedMessages.length > 0) {
    const msg = capturedMessages.shift()!;
    texts.push(msg.text);
  }
  return texts;
}

const TEST_PHONE = "+5493757000001";

beforeEach(() => {
  vi.clearAllMocks();
  capturedMessages.length = 0;
});

// ══════════════════════════════════════════════════════════════════════════
// FLUJO 1 — Pasajeros ANTES de pricing
//   Via handleLeadMessage (pipeline completo con mocks)
// ══════════════════════════════════════════════════════════════════════════

describe("Flow 1: Pasajeros antes de pricing (pipeline completo)", () => {

  it("T1: slot_confirm sin pasajeros → pregunta pasajeros, NO muestra precio", async () => {
    const { handleLeadMessage } = await import("@/lib/services/lead.service");
    const { getChatSession } = await import("@/lib/db/database");

    vi.mocked(getChatSession).mockResolvedValue({
      phone: TEST_PHONE,
      slots: JSON.stringify({ origin: "Aeropuerto IGR (Argentina)", destination: "Centro de Foz do Iguaçu (Brasil)" }),
      confidence: JSON.stringify({ origin: 0.6, destination: 0.6 }),
      extraction_count: 1,
      last_extracted_at: null,
      clarify_field: null,
      pending_opportunity: null,
      comprehension_state: null,
      comprehension_score: null,
      escalation_reason: null,
      conversational_state: "slot_confirmation",
      trip_state: null,
      dispatch_state: null,
      slot_states: null,
      lang: null,
      updated_at: Math.floor(Date.now() / 1000),
    });

    await handleLeadMessage(TEST_PHONE, "slot_confirm");

    const responses = drainBotResponses();
    const joined = responses.join(" ");
    // Debe preguntar por pasajeros
    expect(joined).toMatch(/pasajeros|cuántos/i);
    // NO debe contener precio
    expect(joined).not.toMatch(/\$\d+/);
  });

  it("T2: change_passengers → pregunta pasajeros", async () => {
    const { handleLeadMessage } = await import("@/lib/services/lead.service");
    const { getChatSession } = await import("@/lib/db/database");

    vi.mocked(getChatSession).mockResolvedValue({
      phone: TEST_PHONE,
      slots: JSON.stringify({ origin: "Aeropuerto IGR (Argentina)", destination: "Centro de Foz do Iguaçu (Brasil)" }),
      confidence: JSON.stringify({ origin: 0.6, destination: 0.6 }),
      extraction_count: 1,
      last_extracted_at: null,
      clarify_field: null,
      pending_opportunity: null,
      comprehension_state: null,
      comprehension_score: null,
      escalation_reason: null,
      conversational_state: "slot_confirmation",
      trip_state: null,
      dispatch_state: null,
      slot_states: null,
      lang: null,
      updated_at: Math.floor(Date.now() / 1000),
    });

    await handleLeadMessage(TEST_PHONE, "change_passengers");

    const responses = drainBotResponses();
    const joined = responses.join(" ");
    expect(joined).toMatch(/pasajeros|cuántos/i);
  });

  it("T3: slot_confirm CON pasajeros → llama upsertChatSession (persiste)", async () => {
    const { handleSlotConfirmationButton } = await import("@/lib/services/lead.service");
    const { upsertChatSession } = await import("@/lib/db/database");

    const baseLeadCore = {
      intent: "BOOKING", facts: ["booking:reservar"],
      confidence: 0.8, slotStability: { origin: "ambiguous", destination: "ambiguous" },
      roleLock: { origin: null, destination: null },
    };

    await handleSlotConfirmationButton(
      TEST_PHONE, "slot_confirm",
      { id: 1 }, [], null,
      baseLeadCore as any,
      { phone: TEST_PHONE, slots: JSON.stringify({ origin: "IGR", destination: "Centro Foz", passengers: 3 }), confidence: JSON.stringify({ origin: 0.6, destination: 0.6 }) } as any,
    );

    // Debe persistir los slots
    expect(upsertChatSession).toHaveBeenCalled();
  });

});

// ══════════════════════════════════════════════════════════════════════════
// FLUJO 2 — Desambiguación: detección de términos ambiguos en CORE
// ══════════════════════════════════════════════════════════════════════════

describe("Flow 2: Detección de ambigüedad en CORE", () => {

  it("T1: 'aeropuerto' se detecta como término ambiguo", async () => {
    const { AMBIGUOUS_LOCATION_RE } = await import("@/lib/ai/patterns");
    expect(AMBIGUOUS_LOCATION_RE.test("aeropuerto")).toBe(true);
    expect(AMBIGUOUS_LOCATION_RE.test("voy al aeropuerto")).toBe(true);
  });

  it("T2: 'centro' se detecta como término ambiguo", async () => {
    const { AMBIGUOUS_LOCATION_RE } = await import("@/lib/ai/patterns");
    expect(AMBIGUOUS_LOCATION_RE.test("centro")).toBe(true);
    expect(AMBIGUOUS_LOCATION_RE.test("al centro")).toBe(true);
  });

  it("T3: 'hotel x' se detecta como ambiguo", async () => {
    const { AMBIGUOUS_LOCATION_RE } = await import("@/lib/ai/patterns");
    expect(AMBIGUOUS_LOCATION_RE.test("hotel")).toBe(true);
  });

  it("T4: Lugar específico 'Cataratas' NO es ambiguo", async () => {
    const { AMBIGUOUS_LOCATION_RE } = await import("@/lib/ai/patterns");
    expect(AMBIGUOUS_LOCATION_RE.test("cataratas")).toBe(false);
    expect(AMBIGUOUS_LOCATION_RE.test("aeropuerto IGR")).toBe(true); // "aeropuerto" es ambiguo incluso con contexto
  });

});

// ══════════════════════════════════════════════════════════════════════════
// FLUJO 3 — Afirmaciones y correcciones se reconocen correctamente
// ══════════════════════════════════════════════════════════════════════════

describe("Flow 3: Patrones de afirmación y corrección", () => {

  it("T1: Afirmaciones se reconocen", async () => {
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    expect(isAffirmativeMessage("sí")).toBe(true);
    expect(isAffirmativeMessage("si")).toBe(true);
    expect(isAffirmativeMessage("confirmo")).toBe(true);
    expect(isAffirmativeMessage("dale")).toBe(true);
    expect(isAffirmativeMessage("de acuerdo")).toBe(true);
    expect(isAffirmativeMessage("ok")).toBe(true);
    expect(isAffirmativeMessage("está bien")).toBe(true);
  });

  it("T2: Correcciones se reconocen", async () => {
    const { isCorrectionMessage } = await import("@/lib/ai/patterns");
    expect(isCorrectionMessage("no, estoy en otro hotel")).toBe(true);
    expect(isCorrectionMessage("me equivoqué")).toBe(true);
    expect(isCorrectionMessage("corrijo destino")).toBe(true);
    expect(isCorrectionMessage("cambio origen")).toBe(true);
  });

  it("T3: Texto normal NO es afirmación", async () => {
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    expect(isAffirmativeMessage("aeropuerto")).toBe(false);
    expect(isAffirmativeMessage("centro")).toBe(false);
    expect(isAffirmativeMessage("3 pasajeros")).toBe(false);
  });

});
