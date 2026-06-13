import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mock all external dependencies ──
vi.mock("@/lib/db/database", () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
  getConversationById: vi.fn(),
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
  getChatSession: vi.fn().mockResolvedValue(null),
  clearPendingOpportunity: vi.fn().mockResolvedValue(undefined),
  updateOpportunityLogResponse: vi.fn().mockResolvedValue(undefined),
  getDbInstance: vi.fn().mockReturnValue({ execute: vi.fn().mockResolvedValue({ rows: [] }) }),
}));

vi.mock("@/lib/whatsapp/sender", () => ({
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
  enrichF4Signals: vi.fn().mockReturnValue({}),
}));

vi.mock("@/lib/services/extraction/comprehension", () => ({
  buildF4Signals: vi.fn().mockReturnValue({}),
  computeComprehensionScore: vi.fn().mockReturnValue(1.0),
  getF4State: vi.fn().mockReturnValue("NORMAL"),
  getF4RecoveryMessage: vi.fn().mockReturnValue(""),
}));

vi.mock("@/lib/services/learning/event-tracking", () => ({
  logIntentDetected: vi.fn(),
  logEntityDetected: vi.fn(),
  logUserResponse: vi.fn(),
  logEscalation: vi.fn(),
}));

vi.mock("@/lib/services/learning/learning-utils", () => ({
  recordF4Outcome: vi.fn(),
  getF4ThresholdAdjustment: vi.fn().mockResolvedValue(0),
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

vi.mock("@/lib/utils/conversation-workflow", () => ({
  resetToIdle: vi.fn().mockResolvedValue(undefined),
  getWorkflow: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/memory/context-memory", () => ({
  loadContext: vi.fn().mockResolvedValue({}),
  mergeContext: vi.fn().mockResolvedValue(undefined),
  saveContext: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/core/pipeline", () => ({
  processLead: vi.fn().mockResolvedValue("completed"),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildSlotClarify: vi.fn().mockReturnValue("¿A dónde querés ir?"),
  formatOpportunityResponse: vi.fn(),
  buildOpportunityAcceptedMessage: vi.fn().mockReturnValue("¡Genial!"),
  buildOpportunityDeclinedMessage: vi.fn().mockReturnValue("Entendido"),
  buildOpportunityNoPricingMessage: vi.fn(),
  buildGlobalErrorMessage: vi.fn().mockReturnValue("Error interno"),
  buildF4EscalationMessage: vi.fn().mockReturnValue("Te transferiré con un operador"),
}));

vi.mock("@/lib/ai/patterns", () => ({
  isAffirmativeMessage: vi.fn().mockReturnValue(false),
  isNegativeMessage: vi.fn().mockReturnValue(false),
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

import { handleLeadMessage } from "../src/lib/services/lead.service";

describe("handleLeadMessage characterization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("A) handles a normal message without crashing", async () => {
    await handleLeadMessage("+54911111111", "Hola, quiero ir al centro");
  });

  it("B) handles .id command", async () => {
    await handleLeadMessage("+54911111111", ".id");
  });

  it("C) handles .limpiar command", async () => {
    await handleLeadMessage("+54911111111", ".limpiar");
  });

  it("D) handles 'sigo yo' command", async () => {
    await handleLeadMessage("+54911111111", "sigo yo");
  });

  it("E) handles 'seguí vos' command", async () => {
    await handleLeadMessage("+54911111111", "seguí vos");
  });

  it("F) handles HABLAR_HUMANO path", async () => {
    await handleLeadMessage("+54911111111", "quiero hablar con un humano");
  });

  it("G) handles opportunity expired flow", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    vi.mocked(getChatSession).mockResolvedValueOnce({
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 0, label: "test" }),
    } as any);
    await handleLeadMessage("+54911111111", "Hola");
  });

  it("H) handles opportunity accepted flow", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    const { isAffirmativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(getChatSession).mockResolvedValueOnce({
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 9999999999, label: "test" }),
    } as any);
    vi.mocked(isAffirmativeMessage).mockReturnValueOnce(true);
    await handleLeadMessage("+54911111111", "sí");
  });

  it("I) handles opportunity declined flow", async () => {
    const { getChatSession } = await import("@/lib/db/database");
    const { isNegativeMessage } = await import("@/lib/ai/patterns");
    vi.mocked(getChatSession).mockResolvedValueOnce({
      pending_opportunity: JSON.stringify({ logId: 1, expires_at: 9999999999, label: "test" }),
    } as any);
    vi.mocked(isNegativeMessage).mockReturnValueOnce(true);
    await handleLeadMessage("+54911111111", "no");
  });

  it("J) handles driver activation (.activar)", async () => {
    await handleLeadMessage("+54911111111", ".activar");
  });

  it("K) handles driver registration (.registrar)", async () => {
    await handleLeadMessage("+54911111111", ".registrar");
  });

  it("L) handles error recovery (exception does not propagate)", async () => {
    const { getOrCreateConversation } = await import("@/lib/db/database");
    vi.mocked(getOrCreateConversation).mockRejectedValueOnce(new Error("DB error"));
    await expect(handleLeadMessage("+54911111111", "Hola")).resolves.not.toThrow();
  });
});
