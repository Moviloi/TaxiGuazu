import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/database", () => ({
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getChatSession: vi.fn().mockResolvedValue(null),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/extraction/extract-slots", () => ({
  extractSlots: vi.fn(),
}));

vi.mock("@/lib/services/extraction/regex-extractor", () => ({
  parseRouteFromText: vi.fn().mockReturnValue({ origin: null, destination: null }),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildGenericClarify: vi.fn(),
  buildCancellationMessage: vi.fn(),
}));

vi.mock("@/lib/ai/guard", () => ({
  assertCoreRouterPolicy: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/ai/patterns", () => ({
  isAffirmativeMessage: vi.fn().mockReturnValue(false),
  isNegativeMessage: vi.fn().mockReturnValue(false),
  isCorrectionMessage: vi.fn().mockReturnValue(false),
  AFFIRMATION_RE: /^(sí|si|sim|yes|ok|dale)$/i,
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn().mockResolvedValue("idle"),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/extraction/confidence", () => ({
  calculateSlotConfidence: vi.fn(),
}));

vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({
  resolvePricingForSlots: vi.fn(),
}));

vi.mock("@/lib/services/workflow/slot-workflow", () => ({
  evaluateWorkflowTransition: vi.fn(),
}));

vi.mock("@/lib/services/memory/context-memory", () => ({
  loadContext: vi.fn().mockResolvedValue({}),
  mergeContext: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/services/workflow/load-previous-slots", () => ({
  loadPreviousSlots: vi.fn().mockResolvedValue({}),
  loadPreviousSlotStates: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/workflow/evaluate-completeness", () => ({
  evaluateCompleteness: vi.fn(),
}));

vi.mock("@/lib/services/i18n/detect-lang", () => ({
  detectLeadLang: vi.fn().mockReturnValue("es"),
}));

vi.mock("@/lib/services/extraction/format-confidence-note", () => ({
  formatConfidenceNote: vi.fn(),
}));

import { runExtractionPipeline } from "@/lib/services/extraction/extraction-runner";
import type { CoreDecision } from "@/lib/ai/types";

function makeCoreDecision(overrides?: Partial<CoreDecision>): CoreDecision {
  return {
    intent: "PRE_BOOKING",
    facts: [],
    confidence: 0.8,
    slotStability: { origin: "locked", destination: "locked" },
    roleLock: { origin: "Aeropuerto IGR", destination: "Centro" },
    ...overrides,
  };
}

describe("runExtractionPipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns null and sends clarification when slots are incomplete", async () => {
    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({ origin: "Aeropuerto IGR" } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "ASK", field: "destination" });

    const { buildGenericClarify } = await import("@/lib/ai/response-builder");
    vi.mocked(buildGenericClarify).mockReturnValue("¿A dónde querés ir?");

    const { sendWhatsAppMessage } = await import("@/lib/sender");
    const { insertMessage } = await import("@/lib/db/database");

    const result = await runExtractionPipeline(
      "+54911111111", "Desde aeropuerto", 1, makeCoreDecision(), [], null,
    );

    expect(result).toBeNull();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "¿A dónde querés ir?");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "¿A dónde querés ir?");
  });

  it("performs full extraction with origin+dest, pricing, workflow, and persistence", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({
      origin: "Aeropuerto IGR", destination: "Centro", passengers: 2,
    } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { calculateSlotConfidence } = await import("@/lib/services/extraction/confidence");
    vi.mocked(calculateSlotConfidence).mockResolvedValue({
      overall_confidence: 0.95,
      slots: {
        origin: { value: "Aeropuerto IGR", score: 1.0, reason: "direct_extraction" },
        destination: { value: "Centro", score: 1.0, reason: "direct_extraction" },
        passengers: { value: 2, score: 1.0, reason: "direct_extraction" },
      },
      action: "proceed",
    } as any);

    const { resolvePricingForSlots } = await import("@/lib/services/pricing/resolve-pricing-for-slots");
    vi.mocked(resolvePricingForSlots).mockResolvedValue({
      pricingResult: {
        final_price: 15000, origin: { canonical_name: "Aeropuerto IGR" },
        destination: { canonical_name: "Centro" }, base_price: 15000, tariff_id: 1,
      },
      divergence: null,
    } as any);

    const { evaluateWorkflowTransition } = await import("@/lib/services/workflow/slot-workflow");
    vi.mocked(evaluateWorkflowTransition).mockResolvedValue({
      state: "awaiting_confirmation", clarifyField: null,
      overallConfidence: 0.95, action: "proceed", askForConfirmation: true,
    } as any);

    const { formatConfidenceNote } = await import("@/lib/services/extraction/format-confidence-note");
    vi.mocked(formatConfidenceNote).mockReturnValue("Nota de confianza generada");

    const { upsertChatSession } = await import("@/lib/db/database");

    const result = await runExtractionPipeline(
      "+54911111111", "Quiero ir del aeropuerto al centro, somos 2",
      1, makeCoreDecision(), [], null,
    );

    expect(result).not.toBeNull();
    expect(result!.extractionNote).toBe("Nota de confianza generada");
    expect(result!.confidenceResult?.overall_confidence).toBe(0.95);
    expect(result!.pricing?.final_price).toBe(15000);
    expect(result!.workflowResult?.state).toBe("awaiting_confirmation");
    expect(upsertChatSession).toHaveBeenCalled();
  });

  it("triggers regex fallback when extractionNote is not generated", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue(null as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { parseRouteFromText } = await import("@/lib/services/extraction/regex-extractor");
    vi.mocked(parseRouteFromText).mockReturnValue({
      origin: "Aeropuerto IGR", destination: "Centro",
    });

    const { resolvePricingForSlots } = await import("@/lib/services/pricing/resolve-pricing-for-slots");
    vi.mocked(resolvePricingForSlots).mockResolvedValue({
      pricingResult: {
        final_price: 15000, origin: { canonical_name: "Aeropuerto IGR" },
        destination: { canonical_name: "Centro" }, base_price: 15000, tariff_id: 1,
      },
      divergence: null,
    } as any);

    const { evaluateWorkflowTransition } = await import("@/lib/services/workflow/slot-workflow");
    vi.mocked(evaluateWorkflowTransition).mockResolvedValue({
      state: "collecting_slots", clarifyField: null,
      overallConfidence: 1.0, action: "proceed", askForConfirmation: false,
    } as any);

    const result = await runExtractionPipeline(
      "+54911111111", "Del aeropuerto al centro",
      1, makeCoreDecision(), [], null,
    );

    expect(result).not.toBeNull();
    expect(result!.extractionNote).toBeDefined();
    expect(result!.pricing?.final_price).toBe(15000);
  });

  it("returns partial result when extraction succeeds but pricing has no tariff", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({
      origin: "Aeropuerto IGR", destination: "Centro", passengers: 1,
    } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { calculateSlotConfidence } = await import("@/lib/services/extraction/confidence");
    vi.mocked(calculateSlotConfidence).mockResolvedValue({
      overall_confidence: 0.7,
      slots: {
        origin: { value: "Aeropuerto IGR", score: 0.9, reason: "direct_extraction" },
        destination: { value: "Centro", score: 0.8, reason: "direct_extraction" },
      },
      action: "clarify",
      clarify_field: "passengers",
    } as any);

    const { resolvePricingForSlots } = await import("@/lib/services/pricing/resolve-pricing-for-slots");
    vi.mocked(resolvePricingForSlots).mockResolvedValue({
      pricingResult: {
        final_price: 0, origin: { canonical_name: "Aeropuerto IGR" },
        destination: { canonical_name: "Centro" }, base_price: 0, tariff_id: 0,
      },
      divergence: null,
    } as any);

    const { evaluateWorkflowTransition } = await import("@/lib/services/workflow/slot-workflow");
    vi.mocked(evaluateWorkflowTransition).mockResolvedValue({
      state: "collecting_slots", clarifyField: "passengers",
      overallConfidence: 0.7, action: "clarify", askForConfirmation: false,
    } as any);

    const { formatConfidenceNote } = await import("@/lib/services/extraction/format-confidence-note");
    vi.mocked(formatConfidenceNote).mockReturnValue("Confianza baja");

    const result = await runExtractionPipeline(
      "+54911111111", "Del aeropuerto al centro",
      1, makeCoreDecision(), [], null,
    );

    expect(result).not.toBeNull();
    expect(result!.confidenceResult?.action).toBe("clarify");
  });

  // ── FASE 8.2: awaiting_confirmation + affirmation ──

  it("Caso 1: awaiting_confirmation + 'sí' — salta completeness, no bloquea", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");

    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue(null as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");

    const result = await runExtractionPipeline(
      "+54911111111", "sí", 1, makeCoreDecision(), [], null,
    );

    // No bloquea a pesar de raw=null porque el guard salta completeness
    expect(result).not.toBeNull();
    // evaluateCompleteness NO fue llamada
    expect(evaluateCompleteness).not.toHaveBeenCalled();
  });

  it("Caso 2: awaiting_confirmation + 'no' (raw vacío) — cancela confirmación", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");

    const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue(null as any);

    const { buildCancellationMessage } = await import("@/lib/ai/response-builder");
    vi.mocked(buildCancellationMessage).mockReturnValue("No hay problema. Se canceló.");

    const { sendWhatsAppMessage } = await import("@/lib/sender");
    const { resetChatSession, insertMessage } = await import("@/lib/db/database");
    const { setConversationalState } = await import("@/lib/db/state-accessors");
    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");

    const result = await runExtractionPipeline(
      "+54911111111", "no", 1, makeCoreDecision(), [], null,
    );

    expect(evaluateCompleteness).not.toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "No hay problema. Se canceló.");
    expect(insertMessage).toHaveBeenCalledWith(1, "assistant", "No hay problema. Se canceló.");
    expect(setConversationalState).toHaveBeenCalledWith("+54911111111", "idle");
    expect(resetChatSession).toHaveBeenCalledWith("+54911111111");
    expect(result).toBeNull();
  });

  it("S5a: awaiting_confirmation + 'no, a las 10' — NO cancela (corrección de scheduled_at)", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");

    const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({ scheduled_at: "10:00" } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { sendWhatsAppMessage } = await import("@/lib/sender");
    const { resetChatSession } = await import("@/lib/db/database");
    const { setConversationalState } = await import("@/lib/db/state-accessors");

    const result = await runExtractionPipeline(
      "+54911111111", "no, a las 10", 1, makeCoreDecision(), [], null,
    );

    expect(evaluateCompleteness).toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith("+54911111111", expect.stringContaining("canceló"));
    expect(setConversationalState).not.toHaveBeenCalledWith("+54911111111", "idle");
    expect(resetChatSession).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("S5a: awaiting_confirmation + 'no, desde el hotel' — NO cancela (corrección de origin)", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("awaiting_confirmation");

    const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({ origin: "hotel" } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { sendWhatsAppMessage } = await import("@/lib/sender");
    const { resetChatSession } = await import("@/lib/db/database");
    const { setConversationalState } = await import("@/lib/db/state-accessors");

    const result = await runExtractionPipeline(
      "+54911111111", "no, desde el hotel", 1, makeCoreDecision(), [], null,
    );

    expect(evaluateCompleteness).toHaveBeenCalled();
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith("+54911111111", expect.stringContaining("canceló"));
    expect(setConversationalState).not.toHaveBeenCalledWith("+54911111111", "idle");
    expect(resetChatSession).not.toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("F3: collecting_slots + 'no' — NO cancela (solo awaiting_confirmation)", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");

    const { isAffirmativeMessage, isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isNegativeMessage).mockReturnValue(true);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const result = await runExtractionPipeline(
      "+54911111111", "no", 1, makeCoreDecision(), [], null,
    );

    expect(evaluateCompleteness).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("Caso 3: collecting_slots + 'sí' — completeness evalúa (no salta)", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");

    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const result = await runExtractionPipeline(
      "+54911111111", "sí", 1, makeCoreDecision(), [], null,
    );

    // No es awaiting_confirmation → completeness evalúa
    expect(evaluateCompleteness).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  it("Caso 4: idle + 'sí' — completeness evalúa (no salta)", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { getConversationalState } = await import("@/lib/db/state-accessors");
    vi.mocked(getConversationalState).mockResolvedValue("idle");

    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(true);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const result = await runExtractionPipeline(
      "+54911111111", "sí", 1, makeCoreDecision(), [], null,
    );

    // No es awaiting_confirmation → completeness evalúa
    expect(evaluateCompleteness).toHaveBeenCalled();
    expect(result).not.toBeNull();
  });

  // ── FASE 26 — SlotState Consistency: fallback extraction ──

  it("F26-C: fallback extraction → slots tienen status/source", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue(null);

    const { parseRouteFromText } = await import("@/lib/services/extraction/regex-extractor");
    vi.mocked(parseRouteFromText).mockReturnValue({ origin: "test origin", destination: "test dest" });

    const { resolvePricingForSlots } = await import("@/lib/services/pricing/resolve-pricing-for-slots");
    vi.mocked(resolvePricingForSlots).mockResolvedValue({
      pricingResult: {
        final_price: 15000,
        tariff_id: 1,
        base_price: 12000,
        markup: 3000,
        adjustments: [],
        level: "standard",
        source: "standard",
        explanation: [],
        origin: { place_id: "p1", canonical_name: "TestOrigin", operational_zone: "zone" },
        destination: { place_id: "p2", canonical_name: "TestDest", operational_zone: "zone" },
      },
      divergence: null,
    } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

    const { isAffirmativeMessage, isCorrectionMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    vi.mocked(isCorrectionMessage).mockReturnValue(false);

    const result = await runExtractionPipeline(
      "+549111111", "llevame de test origin a test dest", 1,
      { intent: "PRE_BOOKING", facts: [], confidence: 0.7, slotStability: { origin: "open", destination: "open" }, roleLock: { origin: null, destination: null } } as CoreDecision,
      [], null,
    );

    expect(result).not.toBeNull();
    expect(result!.confidenceResult).toBeDefined();
    expect(result!.pricing).toBeDefined();
    const slots = result!.confidenceResult!.slots;
    expect(slots.origin).toBeDefined();
    expect(slots.origin.value).toBe("TestOrigin");
    expect((slots.origin as any).status).toBe("CONFIRMED");
    expect((slots.origin as any).source).toBe("SYSTEM_INFERRED");
    expect(slots.destination).toBeDefined();
    expect((slots.destination as any).status).toBe("CONFIRMED");
    expect((slots.destination as any).source).toBe("SYSTEM_INFERRED");
    expect(slots.price).toBeDefined();
    expect((slots.price as any).status).toBe("CONFIRMED");
  });
});
