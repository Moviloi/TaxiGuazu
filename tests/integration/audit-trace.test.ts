// AUDIT TRACE — FASE AUDITORIA 0
// Ejecuta la matriz de mensajes contra el pipeline y registra logs estructurados.
import { describe, it, expect, vi, beforeEach } from "vitest";
import { core } from "@/lib/ai/core";
import { mapIntentToDomain } from "@/lib/ai/domain";
import { temporalFromFacts, operationalModeFromIntent, type TemporalMode, type OperationalMode } from "@/lib/ai/types";

// ── Mocks mínimos para policy-pipeline ──
vi.mock("@/lib/sender", () => ({ sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn().mockResolvedValue(null),
  insertMessage: vi.fn().mockResolvedValue(1),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  getConversationByPhone: vi.fn().mockResolvedValue(null),
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  clearConversationHistory: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn().mockResolvedValue("idle"),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/pipeline", () => ({ processLead: vi.fn().mockResolvedValue("incomplete") }));
vi.mock("@/lib/services/trip-execution/trip-execution.service", () => ({ executeTrip: vi.fn().mockResolvedValue({ tripId: "trip_1", executed: true }) }));
vi.mock("@/lib/services/trip-execution/now-execution.service", () => ({ executeNowTrip: vi.fn().mockResolvedValue({ tripId: "trip_now_1", dispatched: true }) }));
vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({ resolvePricingForSlots: vi.fn().mockResolvedValue({ pricingResult: { final_price: 15000, tariff_id: 1, base_price: 12000, markup: 3000, adjustments: [], level: "standard", source: "standard", explanation: [], origin: { place_id: "place_iguazu", canonical_name: "IGR", operational_zone: "iguazu" }, destination: { place_id: "place_centro", canonical_name: "Centro", operational_zone: "centro" } } }) }));
vi.mock("@/lib/services/admin/admin.service", () => ({ notifyAdmin: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn().mockReturnValue({ decision: { decision: "ANSWER", mode: "RESERVA", core: { intent: "COMMERCIAL", facts: [], confidence: 0.6 }, reason: "test" }, policy: { decision: "ANSWER", mode: "RESERVA", policyHint: "COMMERCIAL", requiresConfirmation: false, finalResponse: "$15000", requiresUserInput: false, nextExpectedFields: [], outputSource: "POLICY", needsGeo: false, needsSaveContext: false } }) }));
vi.mock("@/lib/services/i18n/detect-lang", () => ({ detectLeadLang: vi.fn().mockReturnValue("es") }));
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
  buildGlobalErrorMessage: vi.fn().mockReturnValue("Error interno."),
  buildSlotClarify: vi.fn().mockReturnValue("¿Podés darme más detalles?"),
}));
vi.mock("@/lib/ai/policy-reserva", () => ({
  policyReserva: vi.fn(),
  buildConfirmationMessage: vi.fn().mockReturnValue("Reconfirmá tu viaje."),
  buildNoTariffConfirmation: vi.fn().mockReturnValue("Sin tarifa. ¿Querés seguir?"),
}));
vi.mock("@/lib/services/workflow/slot-workflow", () => ({
  evaluateWorkflowTransition: vi.fn().mockResolvedValue({ state: "collecting_slots", action: "clarify", clarifyField: null, askForConfirmation: false }),
}));
vi.mock("@/lib/services/memory/predictive-routing", () => ({
  buildPredictedContext: vi.fn().mockReturnValue({
    intentPrediction: { intent: "CONSULTA", confidence: 0.5 },
    entityPrediction: { candidates: [] },
  }),
}));

interface TraceRow {
  input: string;
  facts: string[];
  intent: string;
  temporal: string;
  extraction: string;
  confidence: string;
  mode: string;
  policy: string;
  dispatch: string;
  response: string;
}

const rows: TraceRow[] = [];

function runCore(msg: string): string {
  const result = core(msg);
  const nowFacts = result.facts.filter(f => f.startsWith("now:") || f.startsWith("urgency:"));
  const futureFacts = result.facts.filter(f => f.startsWith("date:") || f.startsWith("time:"));
  const temporal = nowFacts.length > 0 ? "NOW"
    : futureFacts.length > 0 ? "FUTURO"
    : "UNKNOWN";
  const domain = mapIntentToDomain(result.intent);
  return JSON.stringify({
    facts: result.facts,
    intent: result.intent,
    confidence: result.confidence,
    slotStability: result.slotStability,
    roleLock: result.roleLock,
    temporal,
    domain,
  });
}

function runPipeline(msg: string): string {
  const result = core(msg);
  const domain = mapIntentToDomain(result.intent);

  // Build extraction context from roleLock
  const slots: Record<string, { value: string; score: number; reason: string }> = {};
  if (result.roleLock?.origin) {
    slots.origin = { value: result.roleLock.origin, score: 1.0, reason: "core_role_lock" };
  }
  if (result.roleLock?.destination) {
    slots.destination = { value: result.roleLock.destination, score: 1.0, reason: "core_role_lock" };
  }

  const hasScheduledAt = false;
  const hasFutureSignal = hasScheduledAt ||
    result.facts.some(f => f.startsWith("date:") || f.startsWith("time:"));
  const explicitReservation: ReadonlyArray<string> = ["PRE_BOOKING", "RESCHEDULE"];
  const isReservationFlow = hasFutureSignal || explicitReservation.includes(result.intent);
  const mode = isReservationFlow ? "RESERVA" : "AHORA";

  const isLateral = result.intent === "EMERGENCY" || result.intent === "RESCHEDULE";
  const hasOrigin = !!slots.origin;
  const hasDest = !!slots.destination;
  const hasCompleteRoute = hasOrigin && hasDest;
  const hasAmbiguity = result.facts.includes("location_ambiguous:true") ||
    result.facts.some(f => f.startsWith("origin:") && /aeropuerto|aero|terminal/i.test(f.split(":")[1]));

  const shouldDispatch = mode === "AHORA" && !isLateral && hasCompleteRoute && !hasAmbiguity;

  // Determine policy
  let policy = "N/A";
  if (result.intent === "AMBIGUOUS" || result.confidence < 0.4) {
    policy = "SAFE_FALLBACK";
  } else if (domain === "information") {
    policy = "ANSWER (info)";
  } else if (domain === "commercial") {
    policy = "ANSWER (commercial)";
  } else if (mode === "AHORA") {
    policy = "policyAhora";
  } else {
    policy = "policyReserva";
  }

  // Determine response
  let response = "N/A";
  if (result.intent === "GREETING") {
    response = "¡Hola! ¿En qué te ayudo?";
  } else if (result.intent === "AMBIGUOUS") {
    response = "No te entendí. ¿Podés reformularlo?";
  } else if (shouldDispatch) {
    response = "Buscando chofer disponible para tu viaje.";
  } else if (result.facts.includes("location_ambiguous:true")) {
    response = "Clarificación de ubicación ambigua";
  } else if (policy.startsWith("ANSWER")) {
    response = "Respuesta informativa/comercial";
  }

  return JSON.stringify({
    mode,
    hasCompleteRoute,
    hasAmbiguity,
    shouldDispatch,
    policy,
    responsePreview: response,
  });
}

describe("AUDITORIA 0 — Traza del pipeline completo", () => {
  const cases = [
    ".limpiar",
    "hola",
    "cuanto cuesta del aeropuerto al centro",
    "estoy en el aeropuerto quiero ir al centro",
    "estoy en el aeropuerto quiero ir al centro ahora",
    "quiero ir del aeropuerto al centro mañana",
  ];

  cases.forEach((msg) => {
    it(`TRACE: "${msg}"`, () => {
      const coreInfo = JSON.parse(runCore(msg));
      const pipelineInfo = JSON.parse(runPipeline(msg));

      console.log(`\n========== INPUT: "${msg}" ==========`);
      console.log(`CORE_RESULT:`, coreInfo);
      console.log(`PIPELINE:`, pipelineInfo);
      console.log(`========================================\n`);

      // Assert que core no explota
      expect(coreInfo.facts).toBeDefined();
      expect(coreInfo.intent).toBeDefined();
      expect(coreInfo.temporal).toBeDefined();
    });
  });

  it("ARMAR TABLA DE TRAZA", () => {
    const tableData = cases.map((msg) => {
      const coreInfo = JSON.parse(runCore(msg));
      const pipelineInfo = JSON.parse(runPipeline(msg));
      return {
        input: msg,
        facts: coreInfo.facts.join(", "),
        intent: coreInfo.intent,
        temporal: coreInfo.temporal,
        extraction: `origin=${coreInfo.roleLock?.origin ?? "—"}, dest=${coreInfo.roleLock?.destination ?? "—"}`,
        confidence: `${coreInfo.confidence}`,
        mode: pipelineInfo.mode,
        policy: pipelineInfo.policy,
        dispatch: pipelineInfo.shouldDispatch ? "DISPATCH" : "NO_DISPATCH",
        response: pipelineInfo.responsePreview,
      };
    });

    console.log("\n=== TABLA DE TRAZA: PIPELINE COMPLETO ===\n");
    console.table(tableData);
  });

  // ─── FASE 16: TEMPORALITY + OPERATIONAL MODE ───
  describe("FASE 16 — Temporalidad y modo operativo", () => {
    interface TCase { input: string; expectedIntent: string; expectedTemporal: TemporalMode; expectedOpMode: OperationalMode; }

    const temporalCases: TCase[] = [
      { input: "hola", expectedIntent: "GREETING", expectedTemporal: "UNKNOWN", expectedOpMode: "INFO" },
      { input: "cuanto cuesta del aeropuerto al centro", expectedIntent: "COMMERCIAL", expectedTemporal: "UNKNOWN", expectedOpMode: "INFO" },
      { input: "estoy en el aeropuerto quiero ir al centro", expectedIntent: "BOOKING", expectedTemporal: "UNKNOWN", expectedOpMode: "CLARIFY" },
      { input: "quiero ir del aeropuerto al centro ahora", expectedIntent: "NOW", expectedTemporal: "NOW", expectedOpMode: "DISPATCH" },
      { input: "quiero ir del aeropuerto al centro mañana", expectedIntent: "PRE_BOOKING", expectedTemporal: "FUTURE", expectedOpMode: "RESERVATION" },
    ];

    temporalCases.forEach((tc) => {
      it(`T: "${tc.input}" → ${tc.expectedIntent} + ${tc.expectedTemporal} + ${tc.expectedOpMode}`, () => {
        const result = core(tc.input);
        const temporal: TemporalMode = temporalFromFacts(result.facts);
        const opMode: OperationalMode = operationalModeFromIntent(result.intent, temporal);
        expect(result.intent).toBe(tc.expectedIntent);
        expect(temporal).toBe(tc.expectedTemporal);
        expect(opMode).toBe(tc.expectedOpMode);
      });
    });
  });
});
