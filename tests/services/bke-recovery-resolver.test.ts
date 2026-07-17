import { describe, it, expect, beforeEach } from "vitest";
import { resolveRecovery, getRecoveryDrlMetrics, resetRecoveryDrlMetrics } from "@/lib/bke/services/recovery-resolver";
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

describe("resolveRecovery — C6 DRL orchestrator", () => {
  const userText = "quiero ir al centro";
  const lang = "es";

  beforeEach(() => {
    resetRecoveryDrlMetrics();
  });

  // ── R1: Origin resolved ─────────────────────────────────────────────────

  it("R1: returns contextual question when origin is resolved", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeropuerto IGR", status: "CONFIRMED" },
    });
    const result = await resolveRecovery(userText, lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Aeropuerto IGR");
    expect(result!.message).toContain("lugar exacto");
    expect(result!.source).toBe("origin_resolved");
  });

  it("R1: works in English", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "IGR Airport", status: "CONFIRMED" },
    });
    const result = await resolveRecovery(userText, "en", session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("IGR Airport");
    expect(result!.message).toContain("going to");
    expect(result!.source).toBe("origin_resolved");
  });

  it("R1: works in Portuguese", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeroporto IGR", status: "CONFIRMED" },
    });
    const result = await resolveRecovery(userText, "pt", session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Aeroporto IGR");
    expect(result!.message).toContain("indo");
    expect(result!.source).toBe("origin_resolved");
  });

  // ── R2: Destination resolved ────────────────────────────────────────────

  it("R2: returns contextual question when destination is resolved", async () => {
    const session = makeSessionWithSlots({
      destination: { value: "Centro de Puerto Iguazú", status: "CONFIRMED" },
    });
    const result = await resolveRecovery(userText, lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Centro de Puerto Iguazú");
    expect(result!.message).toContain("salís");
    expect(result!.source).toBe("dest_resolved");
  });

  // ── R3: Text mentions location ──────────────────────────────────────────

  it("R3: returns contextual question when text mentions centro", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("voy al centro", lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("centro");
    expect(result!.source).toBe("text_mentions_location");
  });

  it("R3: returns contextual question when text mentions aeropuerto", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("estoy en el aeropuerto", lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("aeropuerto");
    expect(result!.source).toBe("text_mentions_location");
  });

  it("R3: returns contextual question when text mentions hotel", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("voy a un hotel", lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("hotel");
    expect(result!.source).toBe("text_mentions_location");
  });

  it("R3: returns contextual question when text mentions cataratas", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("quiero ir a las cataratas", lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("cataratas");
    expect(result!.source).toBe("text_mentions_location");
  });

  it("R3: returns contextual question when text mentions aduana", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("voy a la aduana", lang, session);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("aduana");
    expect(result!.source).toBe("text_mentions_location");
  });

  // ── Priority: origin > dest > text mention ─────────────────────────────

  it("prioritizes R1 over R3 when origin is resolved and text mentions location", async () => {
    const session = makeSessionWithSlots({
      origin: { value: "Aeropuerto IGR", status: "CONFIRMED" },
    });
    const result = await resolveRecovery("voy al centro", lang, session);
    expect(result).not.toBeNull();
    expect(result!.source).toBe("origin_resolved"); // R1 fires first
  });

  it("prioritizes R2 over R3 when destination is resolved", async () => {
    const session = makeSessionWithSlots({
      destination: { value: "Centro", status: "CONFIRMED" },
    });
    const result = await resolveRecovery("voy al centro", lang, session);
    expect(result).not.toBeNull();
    expect(result!.source).toBe("dest_resolved"); // R2 fires before R3
  });

  // ── Facts integration ───────────────────────────────────────────────────

  it("uses location fact when origin fact is present but session has no slots", async () => {
    const session = makeSessionWithSlots({});
    const facts = ["origin:Aeropuerto IGR"];
    const result = await resolveRecovery(userText, lang, session, facts);
    expect(result).not.toBeNull();
    expect(result!.message).toContain("Aeropuerto IGR");
    expect(result!.source).toBe("origin_resolved");
  });

  // ── Escalation ──────────────────────────────────────────────────────────

  it("returns null when no rule applies (escalation to LLM)", async () => {
    const session = makeSessionWithSlots({});
    const result = await resolveRecovery("no entiendo nada", lang, session);
    expect(result).toBeNull();
  });

  // ── Metrics ─────────────────────────────────────────────────────────────

  it("metrics track attempts, resolved, escalated", async () => {
    await resolveRecovery("voy al centro", lang, makeSessionWithSlots({})); // R3 resolves
    await resolveRecovery("xyz", lang, makeSessionWithSlots({})); // no rule

    const metrics = getRecoveryDrlMetrics();
    expect(metrics.attempts).toBe(2);
    expect(metrics.resolved).toBe(1);
    expect(metrics.escalated).toBe(1);
  });

  it("metrics reset works", () => {
    resetRecoveryDrlMetrics();
    const metrics = getRecoveryDrlMetrics();
    expect(metrics.attempts).toBe(0);
    expect(metrics.resolved).toBe(0);
    expect(metrics.escalated).toBe(0);
  });

  // ── Edge cases ─────────────────────────────────────────────────────────

  it("handles null session gracefully", async () => {
    const result = await resolveRecovery("hola", lang, null);
    expect(result).toBeNull();
  });

  it("handles invalid JSON in session slots gracefully", async () => {
    const session = makeSession({ slots: "not-valid-json" });
    const result = await resolveRecovery("voy al centro", lang, session);
    // Should still match R3 because text mentions "centro"
    expect(result).not.toBeNull();
    expect(result!.source).toBe("text_mentions_location");
  });
});
