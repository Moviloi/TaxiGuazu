import { describe, it, expect, vi, beforeEach } from "vitest";

import { buildSlotStates } from "@/lib/ai/slot-state";
import { loadPreviousSlotStates } from "@/lib/services/workflow/load-previous-slots";
import { getChatSession } from "@/lib/db/database";

vi.mock("@/lib/db/database", () => ({
  getChatSession: vi.fn(),
}));

describe("FASE 23 — Persistent SlotState", () => {

  describe("buildSlotStates()", () => {

    it("T1: slots extraídos en turno 1 se persisten como INFERRED; al cargarse en turno 2 mantienen INFERRED", () => {
      // Turn 1: LLM extrae origen y destino con score 0.6
      const currentSlots = {
        origin: { value: "Aeropuerto IGR", score: 0.6, reason: "extracted" },
        destination: { value: "Centro", score: 0.6, reason: "extracted" },
      };
      const prevStates = null;
      const hasCorrection = false;
      const hasAffirmation = false;
      const prevValues = {};

      const slotStates = buildSlotStates(currentSlots, prevStates, hasCorrection, hasAffirmation, prevValues);

      expect(slotStates.origin).toEqual({
        value: "Aeropuerto IGR",
        source: "SYSTEM_INFERRED",
        status: "INFERRED",
      });
      expect(slotStates.destination).toEqual({
        value: "Centro",
        source: "SYSTEM_INFERRED",
        status: "INFERRED",
      });
    });

    it("T1b: slot con score >= 1.0 se persiste como CONFIRMED", () => {
      const currentSlots = {
        origin: { value: "Aeropuerto IGR", score: 1.0, reason: "exact_match" },
      };
      const slotStates = buildSlotStates(currentSlots, null, false, false, {});
      expect(slotStates.origin.status).toBe("CONFIRMED");
      expect(slotStates.origin.source).toBe("SYSTEM_INFERRED");
    });

    it("T2: slot CONFIRMED en turno 1, corregido en turno 2 → USER_CORRECTED/CONFIRMATION_PENDING", () => {
      // Previous state: origin was CONFIRMED
      const prevStates = {
        origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
        destination: { value: "Centro", source: "USER_CONFIRMED", status: "CONFIRMED" },
      };
      // Current extraction: LLM devuelve nuevo origen
      const currentSlots = {
        origin: { value: "Hotel X", score: 0.8, reason: "extracted" },
      };
      const hasCorrection = true;
      const hasAffirmation = false;
      // prevSlotValues from DB
      const prevValues = { origin: "Aeropuerto IGR", destination: "Centro" };

      const slotStates = buildSlotStates(currentSlots, prevStates, hasCorrection, hasAffirmation, prevValues);

      // Origin cambió → USER_CORRECTED + CONFIRMATION_PENDING
      expect(slotStates.origin).toEqual({
        value: "Hotel X",
        source: "USER_CORRECTED",
        status: "CONFIRMATION_PENDING",
      });
      // Destination no se re-extrajo → carry over CONFIRMED
      expect(slotStates.destination).toEqual({
        value: "Centro",
        source: "USER_CONFIRMED",
        status: "CONFIRMED",
      });
    });

    it("T3: slot CONFIRMED no re-extraído en turno 2 → se preserva con su estado anterior", () => {
      const prevStates = {
        origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
        destination: { value: "Centro", source: "USER_CONFIRMED", status: "CONFIRMED" },
        passengers: { value: 2, source: "USER_CONFIRMED", status: "CONFIRMED" },
      };
      // Turn 2: solo se extrajo destination (mismo valor)
      const currentSlots = {
        destination: { value: "Centro", score: 0.9, reason: "extracted" },
      };
      const slotStates = buildSlotStates(currentSlots, prevStates, false, false, { origin: "Aeropuerto IGR", destination: "Centro", passengers: "2" });

      // Origin no re-extraído → carry over AS-IS
      expect(slotStates.origin).toEqual({ value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" });
      // Passengers no re-extraído → carry over AS-IS
      expect(slotStates.passengers).toEqual({ value: 2, source: "USER_CONFIRMED", status: "CONFIRMED" });
      // Destination re-extraído con mismo valor → preserve CONFIRMED status
      expect(slotStates.destination).toEqual({ value: "Centro", source: "USER_CONFIRMED", status: "CONFIRMED" });
    });

    it("T3b: slot CONFIRMED re-extraído con distinto valor → nuevo estado INFERRED, no preserva CONFIRMED", () => {
      const prevStates = {
        origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
      };
      const currentSlots = {
        origin: { value: "Aeropuerto Cataratas", score: 0.7, reason: "extracted" },
      };
      const slotStates = buildSlotStates(currentSlots, prevStates, false, false, { origin: "Aeropuerto IGR" });

      // Value cambió → no preserva CONFIRMED
      expect(slotStates.origin.status).toBe("INFERRED");
      expect(slotStates.origin.source).toBe("SYSTEM_INFERRED");
    });

    it("slot con reason=ambiguous_term → CONFIRMATION_PENDING", () => {
      const currentSlots = {
        origin: { value: "zona norte", score: 0.5, reason: "ambiguous_term" },
      };
      const slotStates = buildSlotStates(currentSlots, null, false, false, {});
      expect(slotStates.origin.status).toBe("CONFIRMATION_PENDING");
    });

    it("affirmation no cambia slot que ya estaba CONFIRMED con mismo valor", () => {
      const prevStates = {
        origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
      };
      const currentSlots = {
        origin: { value: "Aeropuerto IGR", score: 1.0, reason: "user_confirmed" },
      };
      const slotStates = buildSlotStates(currentSlots, prevStates, false, true, { origin: "Aeropuerto IGR" });
      expect(slotStates.origin.status).toBe("CONFIRMED");
      expect(slotStates.origin.source).toBe("USER_CONFIRMED");
    });
  });

  describe("loadPreviousSlotStates()", () => {
    beforeEach(() => {
      vi.mocked(getChatSession).mockReset();
    });

    it("T4: sesión sin slot_states → reconstruye desde slots + confidence", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: "test",
        slots: JSON.stringify({ origin: "Aeropuerto IGR", destination: "Centro" }),
        confidence: JSON.stringify({ origin: 1.0, destination: 0.6 }),
        extraction_count: 1,
        last_extracted_at: null,
        clarify_field: null,
        pending_opportunity: null,
        comprehension_state: null,
        comprehension_score: null,
        escalation_reason: null,
        conversational_state: "idle",
        dispatch_state: null,
        trip_state: null,
        slot_states: null,
        updated_at: Math.floor(Date.now() / 1000),
      });

      const result = await loadPreviousSlotStates("test");

      expect(result).not.toBeNull();
      // Origin score 1.0 → CONFIRMED
      expect(result!.origin).toEqual({ value: "Aeropuerto IGR", source: "SYSTEM_INFERRED", status: "CONFIRMED" });
      // Destination score 0.6 → INFERRED
      expect(result!.destination).toEqual({ value: "Centro", source: "SYSTEM_INFERRED", status: "INFERRED" });
    });

    it("sesión con slot_states → usa slot_states directamente", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: "test",
        slots: JSON.stringify({ origin: "old" }),
        confidence: JSON.stringify({ origin: 0.5 }),
        extraction_count: 1,
        last_extracted_at: null,
        clarify_field: null,
        pending_opportunity: null,
        comprehension_state: null,
        comprehension_score: null,
        escalation_reason: null,
        conversational_state: "idle",
        dispatch_state: null,
        trip_state: null,
        slot_states: JSON.stringify({
          origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
        }),
        updated_at: Math.floor(Date.now() / 1000),
      });

      const result = await loadPreviousSlotStates("test");

      expect(result).toEqual({
        origin: { value: "Aeropuerto IGR", source: "USER_CONFIRMED", status: "CONFIRMED" },
      });
    });

    it("sesión sin slots → retorna null", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: "test",
        slots: null,
        confidence: null,
        extraction_count: 0,
        last_extracted_at: null,
        clarify_field: null,
        pending_opportunity: null,
        comprehension_state: null,
        comprehension_score: null,
        escalation_reason: null,
        conversational_state: "idle",
        dispatch_state: null,
        trip_state: null,
        slot_states: null,
        updated_at: Math.floor(Date.now() / 1000),
      });

      const result = await loadPreviousSlotStates("test");
      expect(result).toBeNull();
    });

    it("sesión expirada por timeout → retorna null", async () => {
      vi.mocked(getChatSession).mockResolvedValue({
        phone: "test",
        slots: JSON.stringify({ origin: "Aeropuerto IGR" }),
        confidence: JSON.stringify({ origin: 1.0 }),
        extraction_count: 1,
        last_extracted_at: null,
        clarify_field: null,
        pending_opportunity: null,
        comprehension_state: null,
        comprehension_score: null,
        escalation_reason: null,
        conversational_state: "idle",
        dispatch_state: null,
        trip_state: null,
        slot_states: null,
        updated_at: 100, // very old
      });

      const result = await loadPreviousSlotStates("test");
      expect(result).toBeNull();
    });
  });
});
