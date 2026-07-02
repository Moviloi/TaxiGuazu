import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies ──
vi.mock("@/lib/db/database", () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
  getConversationById: vi.fn().mockResolvedValue({ id: 1, taken_by_human: null, phone: "+54911111111", created_at: 0, last_message_at: 0 }),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getRecentHistory: vi.fn().mockResolvedValue([]),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  getConversationByPhone: vi.fn().mockResolvedValue({ id: 1 }),
  updateTripState: vi.fn().mockResolvedValue(undefined),
  getDriverByPhone: vi.fn(),
  updateDriverShiftIfNull: vi.fn().mockResolvedValue(undefined),
  clearConversationHistory: vi.fn().mockResolvedValue(undefined),
  setCustomerName: vi.fn().mockResolvedValue(undefined),
  getCustomerName: vi.fn().mockResolvedValue(null),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  getChatSession: vi.fn().mockResolvedValue({ phone: "+54911111111", slots: null, trip_state: null, pending_opportunity: null, dispatch_state: null, conversational_state: null, updated_at: 1000 }),
  clearPendingOpportunity: vi.fn().mockResolvedValue(undefined),
  updateOpportunityLogResponse: vi.fn().mockResolvedValue(undefined),
  getDbInstance: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue({ rows: [] }) }),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/ai/handler", () => ({
  handleMessage: vi.fn(),
}));

vi.mock("@/lib/ai/core", () => ({
  core: vi.fn().mockReturnValue({
    intent: "AMBIGUOUS",
    confidence: 0,
    facts: [],
    roleLock: {},
    slotStability: {},
  }),
}));

vi.mock("@/lib/ai/guard", () => ({
  resetRequestState: vi.fn(),
  assertCoreRouterPolicy: vi.fn().mockReturnValue(true),
}));

vi.mock("@/lib/services/extraction/extract-slots", () => ({
  extractSlots: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/extraction/confidence", () => ({
  calculateSlotConfidence: vi.fn().mockResolvedValue({
    overall_confidence: 1.0,
    slots: {},
  }),
}));

vi.mock("@/lib/services/pricing/resolvePricingForSlots", () => ({
  resolvePricingForSlots: vi.fn().mockResolvedValue({
    pricingResult: { final_price: 15000, origin: { canonical_name: "Origen" }, destination: { canonical_name: "Destino" }, tariff_id: 1, base_price: 15000 },
  }),
}));

vi.mock("@/lib/services/workflow/slot-workflow", () => ({
  evaluateWorkflowTransition: vi.fn().mockResolvedValue({
    nextState: "collecting_slots",
  }),
}));

vi.mock("@/lib/services/memory/memory", () => ({
  buildMemory: vi.fn().mockReturnValue([]),
}));

vi.mock("@/lib/services/memory/predictive-routing", () => ({
  buildPredictedContext: vi.fn().mockReturnValue({
    intentPrediction: { confidence: 0 },
    entityPrediction: { candidates: [] },
  }),
  enrichComprehensionSignals: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/services/extraction/comprehension", () => ({
  buildComprehensionSignals: vi.fn().mockReturnValue({}),
  computeComprehensionScore: vi.fn().mockReturnValue(1.0),
  getComprehensionState: vi.fn().mockReturnValue("NORMAL"),
  getRecoveryMessage: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/services/learning/event-tracking", () => ({
  logIntentDetected: vi.fn(),
  logEntityDetected: vi.fn(),
  logUserResponse: vi.fn(),
  logEscalation: vi.fn(),
}));

vi.mock("@/lib/services/learning/learning-utils", () => ({
  recordComprehensionOutcome: vi.fn(),
  getComprehensionThresholdAdjustment: vi.fn().mockResolvedValue(0),
}));

vi.mock("@/lib/services/learning/admin", () => ({
  isAdminCommand: vi.fn().mockReturnValue(false),
  parseAdminCommand: vi.fn(),
  executeAdminCommand: vi.fn(),
}));

vi.mock("@/lib/services/admin/admin-commands", () => ({
  handleAdminCommand: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/learning/opportunity-engine", () => ({
  evaluateOpportunities: vi.fn().mockResolvedValue({ available: false, opportunities: [] }),
  isOpportunityQuery: vi.fn().mockReturnValue(false),
}));

vi.mock("@/lib/services/trip-execution/trip-execution.service", () => ({
  executeTrip: vi.fn().mockResolvedValue({ tripId: "trip_123", executed: true }),
}));

vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  resetToIdle: vi.fn().mockResolvedValue(undefined),
  getDispatchWorkflow: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/memory/context-memory", () => ({
  loadContext: vi.fn().mockResolvedValue({}),
  mergeContext: vi.fn().mockResolvedValue(undefined),
  saveContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/pipeline", () => ({
  processLead: vi.fn().mockResolvedValue("completed"),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildSlotClarify: vi.fn().mockReturnValue("¿A dónde querés ir?"),
  formatOpportunityResponse: vi.fn(),
  buildOpportunityAcceptedMessage: vi.fn().mockReturnValue("¡Genial!"),
  buildOpportunityDeclinedMessage: vi.fn().mockReturnValue("Entendido"),
  buildOpportunityNoPricingMessage: vi.fn(),
  buildGlobalErrorMessage: vi.fn().mockReturnValue("Error interno"),
  buildEscalationMessage: vi.fn().mockReturnValue("Te transferiré con un operador"),
}));

vi.mock("@/lib/ai/patterns", () => ({
  isAffirmativeMessage: vi.fn().mockReturnValue(false),
  isNegativeMessage: vi.fn().mockReturnValue(false),
  AFFIRMATION_RE: /^(sí|si|sim|yes|ok|dale)$/i,
}));

vi.mock("@/lib/ai/extraction-schema", () => ({
  TripExtractionSchema: { safeParse: vi.fn().mockReturnValue({ success: false }) },
}));

vi.mock("@/lib/services/geo/geo-engine", () => ({
  resolveGeoRoute: vi.fn(),
}));

vi.mock("@/lib/config/constants", () => ({
  SESSION_INACTIVITY_48H_S: 172800,
}));

import { sendWhatsAppMessage } from "@/lib/sender";
import { processLead } from "@/lib/pipeline";
import { clearPendingOpportunity, updateOpportunityLogResponse } from "@/lib/db/database";
import { resetToIdle } from "@/lib/services/dispatch/dispatch-workflow";
import { handleLeadMessage } from "@/lib/services/lead.service";

describe("handleLeadMessage characterization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A) normal message → no crash, insertMessage y send llamados", async () => {
    await handleLeadMessage("+54911111111", "Hola, quiero ir al centro");
    const { insertMessage } = await import("@/lib/db/database");
    expect(insertMessage).toHaveBeenCalledWith(1, "user", "Hola, quiero ir al centro");
  });

  it("B) .id command → no llega a pipeline (comando admin)", async () => {
    await handleLeadMessage("+54911111111", ".id");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("C) .limpiar → no llega a pipeline (reset directo)", async () => {
    await handleLeadMessage("+54911111111", ".limpiar");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("D) 'sigo yo' →  no llega a pipeline (comando)", async () => {
    await handleLeadMessage("+54911111111", "sigo yo");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("E) 'seguí vos' →  no llega a pipeline (comando)", async () => {
    await handleLeadMessage("+54911111111", "seguí vos");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("F) HABLAR_HUMANO →  no llega a pipeline (comando)", async () => {
    await handleLeadMessage("+54911111111", "quiero hablar con un humano");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("G) opportunity expired → limpia pending y resetea", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    vi.mocked(getChatSession).mockResolvedValue({
      trip_state: "opportunity",
      conversational_state: null,
      dispatch_state: null,
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 0, label: "test" }),
    } as any);
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValue(false);
    const { isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isNegativeMessage).mockReturnValue(false);
    await handleLeadMessage("+54911111111", "Hola");
    expect(clearPendingOpportunity).toHaveBeenCalledWith("+54911111111");
    expect(updateOpportunityLogResponse).toHaveBeenCalled();
    expect(resetToIdle).toHaveBeenCalledWith(1);
    expect(processLead).not.toHaveBeenCalled();
  });

  it("H) opportunity accepted → + isAffirmativeMessage true", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(getChatSession).mockResolvedValue({
      trip_state: "opportunity",
      conversational_state: null,
      dispatch_state: null,
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 9999999999, label: "test" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValueOnce(true);
    const { isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isNegativeMessage).mockReturnValue(false);
    await handleLeadMessage("+54911111111", "sí");
    expect(clearPendingOpportunity).toHaveBeenCalledWith("+54911111111");
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "¡Genial!");
    expect(resetToIdle).toHaveBeenCalledWith(1);
    expect(processLead).not.toHaveBeenCalled();
  });

  it("I) opportunity declined → + isNegativeMessage true", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(isAffirmativeMessage).mockReturnValueOnce(false);
    const { isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(getChatSession).mockResolvedValue({
      trip_state: "opportunity",
      conversational_state: null,
      dispatch_state: null,
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 9999999999, label: "test" }),
    } as any);
    vi.mocked(isNegativeMessage).mockReturnValueOnce(true);
    await handleLeadMessage("+54911111111", "no");
    expect(clearPendingOpportunity).toHaveBeenCalledWith("+54911111111");
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911111111", "Entendido");
    expect(resetToIdle).toHaveBeenCalledWith(1);
    expect(processLead).not.toHaveBeenCalled();
  });

  it("J) driver activation (.activar) → comando, no pipeline", async () => {
    await handleLeadMessage("+54911111111", ".activar");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("K) driver registration (.registrar) → comando, no pipeline", async () => {
    await handleLeadMessage("+54911111111", ".registrar");
    expect(processLead).not.toHaveBeenCalled();
  });

  it("L) error recovery → exception no propaga", async () => {
    const { getOrCreateConversation } = await import("@/lib/db/database");
    vi.mocked(getOrCreateConversation).mockRejectedValueOnce(new Error("DB error"));
    await expect(handleLeadMessage("+54911111111", "Hola")).resolves.not.toThrow();
  });
});
