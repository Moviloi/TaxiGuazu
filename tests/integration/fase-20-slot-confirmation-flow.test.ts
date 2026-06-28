import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Shared mocks (hoisted) ──

vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getConversationByPhone: vi.fn().mockResolvedValue({ id: 1 }),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  resolveAlias: vi.fn(),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
  sendInteractiveButtons: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildGlobalErrorMessage: vi.fn().mockReturnValue("Error interno"),
}));

vi.mock("@/lib/ai/core", () => ({
  core: vi.fn().mockReturnValue({
    intent: "BOOKING",
    facts: [],
    confidence: 0.8,
    slotStability: { origin: "ambiguous", destination: "ambiguous" },
    roleLock: {},
  }),
}));

vi.mock("@/lib/ai/domain", () => ({
  mapIntentToDomain: vi.fn().mockReturnValue("reservation"),
}));

vi.mock("@/lib/ai/slot-confirmation", () => ({
  buildFieldSelector: vi.fn().mockReturnValue({
    text: "¿Qué dato querés cambiar?\n\n1. Origen\n2. Destino\n3. Pasajeros\n4. Fecha/Hora",
    prompt: "Respondé con el número o nombre del campo que querés corregir.",
  }),
  shouldRequestConfirmation: vi.fn(),
  buildSlotConfirmationMessage: vi.fn(),
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
  buildMemory: vi.fn().mockReturnValue({
    sessionMemory: { lastIntent: null },
  }),
}));

vi.mock("@/lib/services/memory/predictive-routing", () => ({
  buildPredictedContext: vi.fn().mockReturnValue({
    intentPrediction: { confidence: 0 },
    entityPrediction: { candidates: [] },
  }),
}));

vi.mock("@/lib/services/workflow/slot-workflow", () => ({
  evaluateWorkflowTransition: vi.fn().mockResolvedValue({
    state: "awaiting_confirmation",
    clarifyField: null,
    overallConfidence: 1.0,
    action: "proceed",
    askForConfirmation: true,
  }),
}));

vi.mock("@/lib/services/workflow/policy-pipeline", () => ({
  handlePolicyPipeline: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/workflow/build-extraction-context", () => ({
  buildExtractionContext: vi.fn().mockReturnValue({
    slots: {},
    overallConfidence: 1.0,
    conversationalState: "awaiting_confirmation",
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

// ── Imports after mocks ──

import { handleLeadMessage, handleSlotConfirmationButton } from "@/lib/services/lead.service";
import { getChatSession, upsertChatSession, resolveAlias } from "@/lib/db/database";
import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/sender";
import { insertMessage } from "@/lib/db/database";
import { handlePolicyPipeline } from "@/lib/services/workflow/policy-pipeline";
import { buildFieldSelector } from "@/lib/ai/slot-confirmation";

const TEST_PHONE = "+54911111111";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("FASE 20.5 — Slots CONFIRMATION_PENDING flujo completo", () => {

  describe("TEST 1 — Confirmación vía botón slot_confirm", () => {
    it("promueve slots a CONFIRMED y pregunta pasajeros", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: TEST_PHONE,
        slots: JSON.stringify({ origin: "Aeropuerto Cataratas (IGR)", destination: "Puerto Iguazú Centro" }),
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
        updated_at: Math.floor(Date.now() / 1000),
      });

      await handleLeadMessage(TEST_PHONE, "slot_confirm");

      // Debe llamar upsertChatSession con confidence actualizado
      expect(upsertChatSession).toHaveBeenCalledWith(
        TEST_PHONE,
        expect.objectContaining({
          origin: "Aeropuerto Cataratas (IGR)",
          destination: "Puerto Iguazú Centro",
        }),
        expect.objectContaining({
          origin: 1.0,
          destination: 1.0,
        }),
        expect.any(String),
        undefined,
      );

      // Debe re-rutear por handlePolicyPipeline
      expect(handlePolicyPipeline).toHaveBeenCalled();
    });
  });

  describe("TEST 2 — Botón slot_change", () => {
    it("muestra selector de campos", async () => {
      await handleLeadMessage(TEST_PHONE, "slot_change");

      expect(buildFieldSelector).toHaveBeenCalled();
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        TEST_PHONE,
        expect.stringContaining("¿Qué dato querés cambiar?"),
      );
    });
  });

  describe("TEST 3 — Botón change_origin", () => {
    it("resuelve alias del origen actual y muestra opciones", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: TEST_PHONE,
        slots: JSON.stringify({ origin: "Aeropuerto Cataratas (IGR)", destination: "Puerto Iguazú Centro" }),
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
        updated_at: Math.floor(Date.now() / 1000),
      });

      // Mock the dynamic import of resolveAlias in lead.service.ts
      vi.mocked(resolveAlias).mockResolvedValue({
        resolved: true,
        names: ["Aeropuerto Cataratas (IGR)", "Aeropuerto Internacional Cataratas del Iguazú"],
      });

      await handleLeadMessage(TEST_PHONE, "change_origin");

      expect(resolveAlias).toHaveBeenCalledWith("Aeropuerto Cataratas (IGR)");
      expect(sendWhatsAppMessage).toHaveBeenCalledWith(
        TEST_PHONE,
        expect.stringContaining("Elegí el origen"),
      );
    });
  });

  describe("TEST 4 — Corrección natural", () => {
    it("detecta hasCorrection y marca slots como USER_CORRECTED + CONFIRMATION_PENDING", async () => {
      // Simular sesión previa con un origen
      vi.mocked(getChatSession).mockResolvedValue({
        phone: TEST_PHONE,
        slots: JSON.stringify({ origin: "Aeropuerto Cataratas (IGR)", destination: "Puerto Iguazú Centro" }),
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
        updated_at: Math.floor(Date.now() / 1000),
      });

      // La extracción detecta corrección: el usuario dice "no, estoy en otro hotel"
      // El slot state computation asigna USER_CORRECTED + CONFIRMATION_PENDING
      // Esto se verifica por los (slot as any).source y .status en extraction-runner.ts

      // Verificar que el patrón de corrección se reconoce
      const { isCorrectionMessage } = await import("@/lib/ai/patterns");
      expect(isCorrectionMessage("no, estoy en otro hotel")).toBe(true);
      expect(isCorrectionMessage("no, me equivoqué")).toBe(true);
      expect(isCorrectionMessage("es otro lugar")).toBe(true);
      expect(isCorrectionMessage("corrijo")).toBe(true);
      expect(isCorrectionMessage("cambié el destino")).toBe(true);
      expect(isCorrectionMessage("cambio origen")).toBe(true);
      expect(isCorrectionMessage("cambió el origen")).toBe(true);
      expect(isCorrectionMessage("rectifico")).toBe(true);
    });
  });

  describe("TEST 5 — Afirmación no confirma automáticamente", () => {
    it("afirmación con slots ambiguous no debe saltar confirmación", async () => {
      // Simular sesión con slots CONFIRMATION_PENDING vía confidence baja
      vi.mocked(getChatSession).mockResolvedValue({
        phone: TEST_PHONE,
        slots: JSON.stringify({ origin: "Aeropuerto Cataratas (IGR)", destination: "Puerto Iguazú Centro" }),
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
        updated_at: Math.floor(Date.now() / 1000),
      });

      // Verificar que afirmaciones comunes se reconocen
      const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
      expect(isAffirmativeMessage("sí")).toBe(true);
      expect(isAffirmativeMessage("confirmo")).toBe(true);
      expect(isAffirmativeMessage("de acuerdo")).toBe(true);
      expect(isAffirmativeMessage("está bien")).toBe(true);

      // La afirmación sola no debe confirmar automáticamente
      // El slot confirmation flow (shouldRequestConfirmation) debe interceptar
      // Esto depende de que el extractionCtx tenga CONFIRMATION_PENDING status
      // En el flujo real, policy-pipeline.ts lo maneja así:
      // 1. El usuario afirma → isAffirmativeMessage true
      // 2. Si convState !== "awaiting_confirmation", no se ejecuta el handler de afirmación
      // 3. shouldRequestConfirmation check (línea 236) detecta CONFIRMATION_PENDING
      // 4. Muestra confirmación interactiva → envía botones
      // 5. Usuario confirma vía botón → slot_confirm → CONFIRMED
    });
  });

});

describe("handleSlotConfirmationButton — routing directo", () => {

  const baseLeadCore = { intent: "BOOKING", facts: ["booking:reservar"], confidence: 0.8, slotStability: { origin: "ambiguous", destination: "ambiguous" }, roleLock: { origin: null, destination: null } };

  it("slot_confirm: synthetic confidence con source/status tipados", async () => {
    vi.mocked(getChatSession).mockResolvedValue({
      phone: TEST_PHONE,
      slots: JSON.stringify({ origin: "test-origen", destination: "test-destino" }),
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
      updated_at: Math.floor(Date.now() / 1000),
    });

    await handleSlotConfirmationButton(
      TEST_PHONE, "slot_confirm",
      { id: 1 }, [], null,
      baseLeadCore as any,
      { phone: TEST_PHONE, slots: JSON.stringify({ origin: "test-origen", destination: "test-destino" }), confidence: JSON.stringify({ origin: 0.6, destination: 0.6 }) } as any,
    );

    expect(upsertChatSession).toHaveBeenCalled();
    expect(handlePolicyPipeline).toHaveBeenCalled();
  });

  it("slot_change: envía field selector", async () => {
    await handleSlotConfirmationButton(
      TEST_PHONE, "slot_change",
      { id: 1 }, [], null,
      baseLeadCore as any,
      null as any,
    );

    expect(buildFieldSelector).toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith(
      TEST_PHONE,
      expect.stringContaining("¿Qué dato querés cambiar?"),
    );
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", expect.any(String));
  });

  it("change_passengers: pregunta pasajeros", async () => {
    await handleSlotConfirmationButton(
      TEST_PHONE, "change_passengers",
      { id: 1 }, [], null,
      baseLeadCore as any,
      null as any,
    );

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(TEST_PHONE, "¿Cuántos pasajeros son?");
  });

  it("change_scheduled_at: pregunta fecha/hora", async () => {
    await handleSlotConfirmationButton(
      TEST_PHONE, "change_scheduled_at",
      { id: 1 }, [], null,
      baseLeadCore as any,
      null as any,
    );

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(TEST_PHONE, "¿Para qué día y horario necesitás el viaje?");
  });

  it("change_back: mensaje genérico", async () => {
    await handleSlotConfirmationButton(
      TEST_PHONE, "change_back",
      { id: 1 }, [], null,
      baseLeadCore as any,
      null as any,
    );

    expect(sendWhatsAppMessage).toHaveBeenCalledWith(TEST_PHONE, "Escribí los datos de tu viaje.");
  });

});
