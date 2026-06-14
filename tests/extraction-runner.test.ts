import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/whatsapp/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/database", () => ({
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getChatSession: vi.fn().mockResolvedValue(null),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/extraction/extract-slots", () => ({
  extractSlots: vi.fn(),
}));

vi.mock("@/lib/services/extraction/regex-extractor", () => ({
  parseRouteFromText: vi.fn().mockReturnValue({ origin: null, destination: null }),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildSlotClarify: vi.fn(),
}));

vi.mock("@/lib/ai/guard", () => ({
  assertCoreRouterPolicy: vi.fn(),
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

  it("returns null when guard blocks extraction", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue("BLOCKED_LEGACY_FLOW" as any);

    const result = await runExtractionPipeline(
      "+54911111111", "Hola", 1, makeCoreDecision(), [], null,
    );

    expect(result).toBeNull();
  });

  it("returns null and sends clarification when slots are incomplete", async () => {
    const { assertCoreRouterPolicy } = await import("@/lib/ai/guard");
    vi.mocked(assertCoreRouterPolicy).mockReturnValue(true);

    const { extractSlots } = await import("@/lib/services/extraction/extract-slots");
    vi.mocked(extractSlots).mockResolvedValue({ origin: "Aeropuerto IGR" } as any);

    const { evaluateCompleteness } = await import("@/lib/services/workflow/evaluate-completeness");
    vi.mocked(evaluateCompleteness).mockReturnValue({ status: "ASK", field: "destination" });

    const { buildSlotClarify } = await import("@/lib/ai/response-builder");
    vi.mocked(buildSlotClarify).mockReturnValue("¿A dónde querés ir?");

    const { sendWhatsAppMessage } = await import("@/lib/whatsapp/sender");
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
});
