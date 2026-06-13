import { describe, it, expect } from "vitest";
import {
  buildComprehensionSignals,
  computeComprehensionScore,
  getComprehensionState,
  getRecoveryMessage,
} from "@/lib/services/extraction/comprehension";
import type { ChatSessionRow } from "@/lib/db/types";
import type { ComprehensionState } from "@/lib/services/extraction/comprehension";

function session(overrides?: Partial<ChatSessionRow>): ChatSessionRow {
  return {
    phone: "5491123456789",
    slots: null,
    confidence: null,
    confirmed_fields: null,
    source_message_ids: null,
    extraction_count: 0,
    last_extracted_at: null,
    workflow_state: "idle",
    clarify_field: null,
    pending_opportunity: null,
    f4_state: null,
    comprehension_score: null,
    escalation_reason: null,
    updated_at: 1000,
    ...overrides,
  };
}

describe("Comprehension Engine", () => {
  describe("buildComprehensionSignals", () => {
    it("BOOKING intent with known entity → high intent + entity confidence", () => {
      const s = session({ slots: JSON.stringify({ origin: "Hotel Rafain", destination: "Aeropuerto" }) });
      const signals = buildComprehensionSignals({
        text: "quiero ir al rafain cena show",
        coreIntent: "BOOKING",
        slotStability: { origin: "open", destination: "open" },
        session: s,
      });
      expect(signals.intentConfidence).toBe(0.9);
      expect(signals.entityConfidence).toBe(0.9);
    });

    it("AMBIGUOUS intent with no entity → low intent + low entity", () => {
      const s = session({ slots: null });
      const signals = buildComprehensionSignals({
        text: "hola",
        coreIntent: "AMBIGUOUS",
        slotStability: { origin: "open", destination: "open" },
        session: s,
      });
      expect(signals.intentConfidence).toBe(0.3);
      expect(signals.entityConfidence).toBe(0.3);
    });

    it("no slots → low slotCompleteness", () => {
      const s = session({ slots: null });
      const signals = buildComprehensionSignals({ text: "hola", coreIntent: "GREETING", slotStability: { origin: "open", destination: "open" }, session: s });
      expect(signals.slotCompleteness).toBe(0.2);
    });

    it("both slots filled → slotCompleteness 1.0", () => {
      const s = session({ slots: JSON.stringify({ origin: "A", destination: "B" }) });
      const signals = buildComprehensionSignals({ text: "viaje", coreIntent: "BOOKING", slotStability: { origin: "open", destination: "open" }, session: s });
      expect(signals.slotCompleteness).toBe(1.0);
    });

    it("partial slots → slotCompleteness 0.6", () => {
      const s = session({ slots: JSON.stringify({ origin: "A" }) });
      const signals = buildComprehensionSignals({ text: "viaje", coreIntent: "BOOKING", slotStability: { origin: "open", destination: "open" }, session: s });
      expect(signals.slotCompleteness).toBe(0.6);
    });

    it("conversationStability: all locked → 1.0", () => {
      const signals = buildComprehensionSignals({
        text: "viaje", coreIntent: "BOOKING", slotStability: { origin: "locked", destination: "locked" }, session: session({ slots: "{}" }),
      });
      expect(signals.conversationStability).toBe(1.0);
    });

    it("conversationStability: open slots → lower stability", () => {
      const signals = buildComprehensionSignals({
        text: "viaje", coreIntent: "BOOKING", slotStability: { origin: "open", destination: "open" }, session: session({ slots: "{}" }),
      });
      expect(signals.conversationStability).toBe(0.5);
    });
  });

  describe("computeComprehensionScore", () => {
    it("perfect signals → score 1.0", () => {
      const score = computeComprehensionScore({ intentConfidence: 1, entityConfidence: 1, slotCompleteness: 1, extractionConfidence: 1, conversationStability: 1 });
      expect(score).toBe(1.0);
    });

    it("worst signals → score 0.28", () => {
      const score = computeComprehensionScore({ intentConfidence: 0.3, entityConfidence: 0.3, slotCompleteness: 0.2, extractionConfidence: 0.5, conversationStability: 0.0 });
      expect(score).toBeCloseTo(0.28, 2);
    });

    it("BOOKING + entity + both slots → FULL_CONTROL territory", () => {
      const score = computeComprehensionScore({ intentConfidence: 0.9, entityConfidence: 0.9, slotCompleteness: 1.0, extractionConfidence: 0.8, conversationStability: 0.7 });
      expect(score).toBeGreaterThanOrEqual(0.85);
    });

    it("GREETING + no entity + no slots → CLARIFICATION territory", () => {
      const score = computeComprehensionScore({ intentConfidence: 0.6, entityConfidence: 0.3, slotCompleteness: 0.2, extractionConfidence: 0.5, conversationStability: 0.7 });
      expect(score).toBeGreaterThanOrEqual(0.40);
      expect(score).toBeLessThan(0.65);
    });
  });

  describe("getComprehensionState", () => {
    const cases: [number, ComprehensionState][] = [
      [0.95, "FULL_CONTROL"],
      [0.85, "FULL_CONTROL"],
      [0.84, "CLARIFICATION"],
      [0.70, "CLARIFICATION"],
      [0.65, "CLARIFICATION"],
      [0.64, "RECOVERY"],
      [0.50, "RECOVERY"],
      [0.40, "RECOVERY"],
      [0.39, "ESCALATION"],
      [0.00, "ESCALATION"],
    ];
    it.each(cases)("score %f → %s", (score, expected) => {
      expect(getComprehensionState(score)).toBe(expected);
    });
  });

  describe("getRecoveryMessage", () => {
    it("CLARIFICATION with missing origin → asks origin", () => {
      const s = session({ slots: JSON.stringify({ destination: "X" }) });
      const msg = getRecoveryMessage("CLARIFICATION", s);
      expect(msg).toBeTruthy();
      expect(msg.toLowerCase()).toContain("salís");
    });

    it("CLARIFICATION with missing destination → asks destination", () => {
      const s = session({ slots: JSON.stringify({ origin: "X" }) });
      const msg = getRecoveryMessage("CLARIFICATION", s);
      expect(msg).toBeTruthy();
      expect(msg.toLowerCase()).toContain("ir");
    });

    it("CLARIFICATION with no slots → generic", () => {
      const s = session({ slots: null });
      const msg = getRecoveryMessage("CLARIFICATION", s);
      expect(msg).toBeTruthy();
    });

    it("RECOVERY → generic confirmation message", () => {
      const s = session({ slots: JSON.stringify({ origin: "A", destination: "B" }) });
      const msg = getRecoveryMessage("RECOVERY", s);
      expect(msg).toBeTruthy();
      expect(msg.toLowerCase()).toContain("confirmar");
    });

    it("ESCALATION → still returns RECOVERY message (fallback)", () => {
      const s = session();
      const msg = getRecoveryMessage("ESCALATION", s);
      expect(msg).toBeTruthy();
    });
  });

  describe("Integration scenarios", () => {
    it("FULL_CONTROL: BOOKING + rafain entity + both slots + high extraction confidence", () => {
      const s = session({ slots: JSON.stringify({ origin: "Hotel Rafain", destination: "Aeropuerto Iguazú" }), confidence: JSON.stringify({ origin: 0.9, destination: 0.8 }) });
      const signals = buildComprehensionSignals({ text: "necesito ir a rafain", coreIntent: "BOOKING", slotStability: { origin: "locked", destination: "locked" }, session: s });
      const score = computeComprehensionScore(signals);
      expect(getComprehensionState(score)).toBe("FULL_CONTROL");
    });

    it("CLARIFICATION: PRE_BOOKING + rafain entity + one slot filled", () => {
      const s = session({ slots: JSON.stringify({ origin: "Hotel Rafain" }) });
      const signals = buildComprehensionSignals({ text: "rafain", coreIntent: "PRE_BOOKING", slotStability: { origin: "locked", destination: "open" }, session: s });
      const score = computeComprehensionScore(signals);
      expect(getComprehensionState(score)).toBe("CLARIFICATION");
    });

    it("RECOVERY: AMBIGUOUS + no entity + no slots", () => {
      const s = session({ slots: null });
      const signals = buildComprehensionSignals({ text: "hola", coreIntent: "GREETING", slotStability: { origin: "open", destination: "open" }, session: s });
      const score = computeComprehensionScore(signals);
      expect(getComprehensionState(score)).toBe("RECOVERY");
    });

    it("ESCALATION: AMBIGUOUS + no entity + no slots + unstable", () => {
      const s = session({ slots: null });
      const signals = buildComprehensionSignals({ text: "no sé", coreIntent: "AMBIGUOUS", slotStability: { origin: "ambiguous", destination: "open" }, session: s });
      const score = computeComprehensionScore(signals);
      expect(getComprehensionState(score)).toBe("ESCALATION");
    });

    it("CLARIFICATION when missing slots → message mentions missing field", () => {
      const s = session({ slots: JSON.stringify({ origin: "Hotel" }) });
      const msg = getRecoveryMessage("CLARIFICATION", s);
      expect(msg).toBeTruthy();
      expect(msg).toContain("ir");
    });
  });
});
