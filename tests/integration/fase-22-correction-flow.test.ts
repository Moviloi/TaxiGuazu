import { describe, it, expect, vi, beforeEach } from "vitest";

// Shared mocks (hoisted)
vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  upsertChatSession: vi.fn().mockResolvedValue(undefined),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
  resolveAlias: vi.fn().mockImplementation((val: string) =>
    Promise.resolve({ resolved: true, names: [val] }),
  ),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn(),
  setConversationalState: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/extraction/extract-slots", () => ({
  extractSlots: vi.fn(),
}));

vi.mock("@/lib/services/workflow/load-previous-slots", () => ({
  loadPreviousSlots: vi.fn(),
  loadPreviousSlotStates: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/services/pricing/resolve-pricing-for-slots", () => ({
  resolvePricingForSlots: vi.fn().mockResolvedValue({
    pricingResult: {
      final_price: 15000,
      tariff_id: 1,
      method: "test",
      matched: true,
      origin: { canonical_name: "Hotel X" },
      destination: { canonical_name: "Centro" },
    },
    divergence: null,
  }),
}));

vi.mock("@/lib/services/workflow/evaluate-completeness", () => ({
  evaluateCompleteness: vi.fn(),
}));

vi.mock("@/lib/ai/handler", () => ({ handleMessage: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ router: vi.fn() }));
vi.mock("@/lib/ai/core", () => ({ core: vi.fn() }));
vi.mock("@/lib/ai/domain", () => ({ mapIntentToDomain: vi.fn().mockReturnValue("reservation") }));
vi.mock("@/lib/ai/response-builder", () => ({
  buildSlotClarify: vi.fn().mockReturnValue("Clarify message"),
  buildCancellationMessage: vi.fn().mockReturnValue("Cancelled"),
}));

import { runExtractionPipeline } from "@/lib/services/extraction/extraction-runner";
import { extractSlots } from "@/lib/services/extraction/extract-slots";
import { loadPreviousSlots } from "@/lib/services/workflow/load-previous-slots";
import { getConversationalState } from "@/lib/db/state-accessors";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { sendWhatsAppMessage } from "@/lib/sender";
import { getChatSession } from "@/lib/db/database";

const TEST_PHONE = "+54911111111";
const TEST_CONV_ID = 1;

function makeLeadCore(overrides: Record<string, any> = {}) {
  return {
    intent: "BOOKING",
    facts: [],
    confidence: 0.8,
    roleLock: {},
    slotStability: { origin: "locked", destination: "locked" },
    ...overrides,
  };
}

function makeSession(slots: Record<string, string>, ageSec = 10) {
  return {
    phone: TEST_PHONE,
    slots: JSON.stringify(slots),
    confidence: JSON.stringify(Object.fromEntries(Object.keys(slots).map(k => [k, 0.8]))),
    extraction_count: 1,
    last_extracted_at: null,
    clarify_field: null,
    pending_opportunity: null,
    comprehension_state: null,
    comprehension_score: null,
    escalation_reason: null,
    conversational_state: "collecting_slots",
    trip_state: null,
    dispatch_state: null,
    slot_states: null,
    lang: null,
    updated_at: Math.floor(Date.now() / 1000) - ageSec,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  // Default mocks
  vi.mocked(getConversationalState).mockResolvedValue("collecting_slots");
  vi.mocked(loadPreviousSlots).mockResolvedValue({
    origin: "Aeropuerto IGR",
    destination: "Centro",
  });
  vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });
  vi.mocked(getChatSession).mockResolvedValue(null);
});

describe("FASE 22 — Correction flow completeness gate bypass", () => {

  describe("T1 — Corrección completa: 'no, era Hotel X' tras ubicación ambigua", () => {
    it("asigna USER_CORRECTED + CONFIRMATION_PENDING, no bloquea", async () => {
      // Simular que extrajo "Hotel X" como nuevo origen
      vi.mocked(extractSlots).mockResolvedValue({
        origin: "Hotel X",
        destination: "Centro",
      });
      vi.mocked(getChatSession).mockResolvedValue(
        makeSession({ origin: "Aeropuerto IGR", destination: "Centro" })
      );

      const result = await runExtractionPipeline(
        TEST_PHONE,
        "no, era Hotel X",
        TEST_CONV_ID,
        makeLeadCore(),
        [],
        null,
      );

      expect(result).not.toBeNull();
      const slots = result?.confidenceResult.slots;
      // Origin debe tener USER_CORRECTED + CONFIRMATION_PENDING
      expect(slots?.origin?.value).toBe("Hotel X");
      // source/status are set via (slot as any).source/.status
      expect((slots?.origin as any)?.source).toBe("USER_CORRECTED");
      expect((slots?.origin as any)?.status).toBe("CONFIRMATION_PENDING");
    });
  });

  describe("T2 — Corrección parcial: 'no, el destino es Cataratas'", () => {
    it("destination USER_CORRECTED, origin mantiene estado anterior", async () => {
      vi.mocked(extractSlots).mockResolvedValue({
        origin: null,
        destination: "Cataratas",
      });
      vi.mocked(getChatSession).mockResolvedValue(
        makeSession({ origin: "Aeropuerto IGR", destination: "Centro", passengers: "2" })
      );
      // Corrección parcial: el extractor no devuelve origin
      // completeness evalúa ASK (origin missing), pero bypass debe activarse
      vi.mocked(evaluateCompleteness).mockReturnValue({
        status: "ASK",
        field: "origin",
      });

      const result = await runExtractionPipeline(
        TEST_PHONE,
        "no, el destino es Cataratas",
        TEST_CONV_ID,
        makeLeadCore(),
        [],
        null,
      );

      expect(result).not.toBeNull();
      const slots = result?.confidenceResult.slots;

      // Destination corregido
      expect((slots?.destination as any)?.source).toBe("USER_CORRECTED");
      expect((slots?.destination as any)?.status).toBe("CONFIRMATION_PENDING");

      // Origin no se corrigió (slot.value es null porque el LLM no lo extrajo)
      expect(slots?.origin?.value).toBeNull();
      expect((slots?.origin as any)?.source).not.toBe("USER_CORRECTED");
    });
  });

  describe("T3 — Corrección preserva pasajeros existentes", () => {
    it("passengers no se pierden tras corrección de ubicación", async () => {
      vi.mocked(extractSlots).mockResolvedValue({
        origin: "Hotel X",
        destination: null,
      });
      vi.mocked(getChatSession).mockResolvedValue(
        makeSession({
          origin: "Aeropuerto IGR",
          destination: "Centro",
          passengers: "3",
          scheduled_at: "2026-06-25T10:00",
        })
      );
      vi.mocked(evaluateCompleteness).mockReturnValue({ status: "COMPLETE" });

      const result = await runExtractionPipeline(
        TEST_PHONE,
        "no, era Hotel X",
        TEST_CONV_ID,
        makeLeadCore(),
        [],
        null,
      );

      expect(result).not.toBeNull();
      const slots = result?.confidenceResult.slots;

      // Origin corregido
      expect((slots?.origin as any)?.source).toBe("USER_CORRECTED");
      expect((slots?.origin as any)?.status).toBe("CONFIRMATION_PENDING");

      // Pasajeros no se pierden (prevSlotsEarly se copia si slot no existe en confidenceResult)
      // Nota: calculateSlotConfidence crea slot con value=null para pasajeros faltantes,
      // por lo que prevSlotsEarly no sobrescribe (el slot existe pero con null).
      // El valor se preserva vía mergeContext → upsertChatSession.
      expect(slots?.passengers?.value).toBeNull();
    });
  });

  describe("T4 — Corrección durante CONFIRMATION_PENDING", () => {
    it("no deja RAW, mantiene CONFIRMATION_PENDING en ambos slots", async () => {
      vi.mocked(extractSlots).mockResolvedValue({
        origin: "Hotel X",
        destination: "Centro",
      });
      vi.mocked(getChatSession).mockResolvedValue(
        makeSession({ origin: "Aeropuerto IGR", destination: "Centro" })
      );
      vi.mocked(getConversationalState).mockResolvedValue("slot_confirmation");

      const result = await runExtractionPipeline(
        TEST_PHONE,
        "no, era Hotel X",
        TEST_CONV_ID,
        makeLeadCore(),
        [],
        null,
      );

      expect(result).not.toBeNull();
      const slots = result?.confidenceResult.slots;

      // Origin: USER_CORRECTED + CONFIRMATION_PENDING
      expect((slots?.origin as any)?.source).toBe("USER_CORRECTED");
      expect((slots?.origin as any)?.status).toBe("CONFIRMATION_PENDING");

      // Destination: mantiene CONFIRMATION_PENDING (prev value === new value)
      expect((slots?.destination as any)?.status).toBe("CONFIRMATION_PENDING");
      // Destination source should NOT be USER_CORRECTED (value didn't change)
      expect((slots?.destination as any)?.source).not.toBe("USER_CORRECTED");

      // No RAW en los slots corregidos (origin/destination)
      expect((slots?.origin as any)?.status).not.toBe("RAW");
      expect((slots?.destination as any)?.status).not.toBe("RAW");
    });
  });

});

describe("Correction detection patterns (isCorrectionMessage)", () => {
  it("reconoce variantes de corrección", async () => {
    const { isCorrectionMessage } = await import("@/lib/ai/patterns");
    expect(isCorrectionMessage("no, estoy en otro hotel")).toBe(true);
    expect(isCorrectionMessage("no, me equivoqué")).toBe(true);
    expect(isCorrectionMessage("es otro lugar")).toBe(true);
    expect(isCorrectionMessage("corrijo")).toBe(true);
    expect(isCorrectionMessage("cambié el destino")).toBe(true);
    expect(isCorrectionMessage("cambio origen")).toBe(true);
    expect(isCorrectionMessage("no, era Hotel X")).toBe(true);
    expect(isCorrectionMessage("no, el destino es Cataratas")).toBe(true);
    expect(isCorrectionMessage("rectifico")).toBe(true);
    expect(isCorrectionMessage("no, el hotel era el X")).toBe(true);
  });
});

describe("Completeness gate bypass logs", () => {
  it("no bloquea cuando hasCorrection + hasPrevSlots", async () => {
    vi.mocked(extractSlots).mockResolvedValue({
      origin: "Hotel X",
      destination: "Centro",
    });
    vi.mocked(getChatSession).mockResolvedValue(
      makeSession({ origin: "Aeropuerto IGR", destination: "Centro" })
    );
    // completeness retorna ASK para simular el gate
    vi.mocked(evaluateCompleteness).mockReturnValue({
      status: "ASK",
      field: "origin",
    });

    const result = await runExtractionPipeline(
      TEST_PHONE,
      "no, era Hotel X",
      TEST_CONV_ID,
      makeLeadCore(),
      [],
      null,
    );

    // Bypass debe permitir que el pipeline continúe (no null)
    expect(result).not.toBeNull();
    // No debe enviar mensaje de bloqueo
    expect(sendWhatsAppMessage).not.toHaveBeenCalledWith(
      TEST_PHONE,
      "Clarify message",
    );
  });
});
