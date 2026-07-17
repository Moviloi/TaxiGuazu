import { describe, it, expect, beforeEach } from "vitest";
import { resolveComprehension, getComprehensionDrlMetrics, resetComprehensionDrlMetrics } from "@/lib/bke/services/comprehension-resolver";
import type { ChatSessionRow } from "@/lib/db/types";

function makeSession(overrides: Partial<ChatSessionRow> = {}): ChatSessionRow {
  return {
    phone: "5491110000000",
    slots: null,
    confidence: null,
    extraction_count: 0,
    last_extracted_at: null,
    clarify_field: null,
    pending_opportunity: null,
    comprehension_state: null,
    comprehension_score: null,
    escalation_reason: null,
    lang: "es",
    updated_at: Date.now(),
    conversational_state: null,
    dispatch_state: null,
    trip_state: null,
    slot_states: null,
    ...overrides,
  };
}

function makeSessionWithSlots(slots: Record<string, { value: string; status: string }>): ChatSessionRow {
  return makeSession({ slots: JSON.stringify(slots) });
}

describe("resolveComprehension — C4 DRL orchestrator", () => {
  const userText = "estoy en el aeropuerto";

  beforeEach(() => {
    resetComprehensionDrlMetrics();
  });

  // ── R1: Both slots ready ────────────────────────────────────────────────

  it("R1: returns confirmation question when both slots are resolved", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeropuerto IGR", status: "CONFIRMED" },
      destination: { value: "Centro de Puerto Iguazú", status: "CONFIRMED" },
    });
    const result = await resolveComprehension(userText, session, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Aeropuerto IGR");
    expect(result!.message).toContain("Centro de Puerto Iguazú");
    expect(result!.source).toBe("both_slots_ready");
  });

  it("R1: works in English when detected", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "IGR Airport", status: "CONFIRMED" },
      destination: { value: "Downtown", status: "CONFIRMED" },
      lang: "en",
    });
    const result = await resolveComprehension(userText, { ...session, lang: "en" }, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("confirm");
    expect(result!.message).toContain("IGR Airport");
  });

  it("R1: works in Portuguese when detected", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeroporto IGR", status: "CONFIRMED" },
      destination: { value: "Centro", status: "CONFIRMED" },
      lang: "pt",
    });
    const result = await resolveComprehension(userText, { ...session, lang: "pt" }, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("confirmar");
  });

  // ── R2: One slot ready ──────────────────────────────────────────────────

  it("R2: asks for destination when only origin is resolved", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeropuerto IGR", status: "CONFIRMED" },
    });
    const result = await resolveComprehension(userText, session, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Aeropuerto IGR");
    expect(result!.message).toContain("dónde");
    expect(result!.source).toBe("one_slot_ready");
  });

  it("R2: asks for origin when only destination is resolved", async () => {
    const session = makeSessionWithSlots({
      destination: { value: "Centro", status: "CONFIRMED" },
    });
    const result = await resolveComprehension(userText, session, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Centro");
    expect(result!.message.toLowerCase()).toContain("desde");
    expect(result!.source).toBe("one_slot_ready");
  });

  // ── R3: Location mentioned in text ──────────────────────────────────────

  it("R3: returns contextual question when text mentions airport", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveComprehension("voy al aeropuerto", session, 0.3);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("lugar");
    expect(result!.source).toBe("location_mentioned");
  });

  it("R3: returns contextual question when text mentions centro", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveComprehension("quiero ir al centro", session, 0.3);
    expect(result).not.toBeNull();
    expect(result!.source).toBe("location_mentioned");
  });

  it("R3: returns null when no location keywords in text and no slots", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveComprehension("hola buenos días", session, 0.3);
    expect(result).toBeNull();
  });

  // ── Escalation ──────────────────────────────────────────────────────────

  it("returns null when no rule applies (escalation to LLM)", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveComprehension("no entiendo nada", session, 0.15);
    expect(result).toBeNull();
  });

  // ── Metrics ─────────────────────────────────────────────────────────────

  it("metrics track attempts, resolved, escalated", async () => {
    // Attempt 1: R1 should resolve (both slots)
    const session1 = makeSessionWithSlots({
      origin: { value: "A", status: "CONFIRMED" },
      destination: { value: "B", status: "CONFIRMED" },
    });
    await resolveComprehension(userText, session1, 0.5);

    // Attempt 2: no rule applies
    const session2 = makeSessionWithSlots({});
    await resolveComprehension("xyz", session2, 0.2);

    const metrics = getComprehensionDrlMetrics();
    expect(metrics.attempts).toBe(2);
    expect(metrics.resolved).toBe(1);
    expect(metrics.escalated).toBe(1);
  });

  it("metrics reset works", () => {
    resetComprehensionDrlMetrics();
    const metrics = getComprehensionDrlMetrics();
    expect(metrics.attempts).toBe(0);
    expect(metrics.resolved).toBe(0);
    expect(metrics.escalated).toBe(0);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it("handles null session gracefully", async () => {
    const result = await resolveComprehension("hola mundo", null, 0.5);
    expect(result).toBeNull();
  });

  it("handles invalid JSON in session slots gracefully", async () => {
    const session = makeSession({ slots: "not-valid-json" });
    const result = await resolveComprehension(userText, session, 0.5);
    // Invalid slots parse as empty, but userText="estoy en el aeropuerto" still matches R3
    expect(result).not.toBeNull();
    expect(result!.source).toBe("location_mentioned");
  });
});
