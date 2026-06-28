import { describe, it, expect } from "vitest";
import { mergeContext, type ConversationContext } from "@/lib/services/memory/context-memory";

describe("contextMemory", () => {
  const empty: ConversationContext = { lastUpdate: 0 };

  // ── Persistencia de slots ──

  it("carries forward previous origin when current has none", () => {
    const prev: ConversationContext = { origin: "IGR", lastUpdate: 100 };
    const current: Record<string, any> = { destination: "Centro" };
    const merged = mergeContext(current, prev, 0.9);
    expect(merged.origin).toBe("IGR");
    expect(merged.destination).toBe("Centro");
  });

  it("carries forward previous destination when current has none", () => {
    const prev: ConversationContext = { destination: "Amerian", lastUpdate: 100 };
    const current: Record<string, any> = { origin: "IGR" };
    const merged = mergeContext(current, prev, 0.9);
    expect(merged.origin).toBe("IGR");
    expect(merged.destination).toBe("Amerian");
  });

  it("does NOT overwrite current origin with previous", () => {
    const prev: ConversationContext = { origin: "OldOrigin", lastUpdate: 100 };
    const current: Record<string, any> = { origin: "IGR", destination: "Centro" };
    const merged = mergeContext(current, prev, 0.9);
    expect(merged.origin).toBe("IGR"); // current wins
  });

  it("carries forward intent when current has none", () => {
    const prev: ConversationContext = { intent: "MOVE", lastUpdate: 100 };
    const current: Record<string, any> = { origin: "IGR", destination: "Centro" };
    const merged = mergeContext(current, prev, 0.9);
    expect(merged.intent).toBe("MOVE");
  });

  it("does NOT overwrite current intent with previous", () => {
    const prev: ConversationContext = { intent: "INFO", lastUpdate: 100 };
    const current: Record<string, any> = { origin: "IGR", destination: "Centro", intent: "MOVE" };
    const merged = mergeContext(current, prev, 0.9);
    expect(merged.intent).toBe("MOVE");
  });

  // ── Confidence ──

  it("injects _confidence when provided", () => {
    const merged = mergeContext({ origin: "IGR" }, empty, 0.85);
    expect(merged._confidence).toBe(0.85);
  });

  it("skips _confidence when confidence not provided", () => {
    const merged = mergeContext({ origin: "IGR" }, empty);
    expect(merged._confidence).toBeUndefined();
  });

  // ── Empty context ──

  it("empty previous context does not affect current", () => {
    const current: Record<string, any> = { origin: "IGR", destination: "Centro" };
    const merged = mergeContext(current, empty, 0.9);
    expect(merged.origin).toBe("IGR");
    expect(merged.destination).toBe("Centro");
    expect(merged._confidence).toBe(0.9);
  });

  // ── Overwrite seguro ──

  it("never deletes confirmed origin from context", () => {
    const prev: ConversationContext = { origin: "IGR", destination: "Centro", lastUpdate: 100 };
    // Current has neither origin nor destination (e.g. INFO query)
    const current: Record<string, any> = { intent: "INFO" };
    const merged = mergeContext(current, prev, 0.5);
    expect(merged.origin).toBe("IGR");
    expect(merged.destination).toBe("Centro");
    expect(merged.intent).toBe("INFO");
  });

  it("preserves previous destination when new extraction drops it", () => {
    const prev: ConversationContext = { destination: "Centro", lastUpdate: 100 };
    const current: Record<string, any> = { origin: "IGR" };
    const merged = mergeContext(current, prev, 0.8);
    expect(merged.destination).toBe("Centro");
  });

  // ── Multi-turn natural ──

  it("simulates turn 1 → turn 2: origin carried forward, destination filled", () => {
    // Turn 1: user says "estoy en IGR"
    const turn1 = mergeContext({ origin: "IGR" }, empty, 0.6);
    const ctxAfterTurn1: ConversationContext = {
      origin: turn1.origin,
      intent: "MOVE",
      lastUpdate: 100,
    };

    // Turn 2: user says "voy al centro" — extraction brings destination
    const turn2 = mergeContext({ destination: "Centro" }, ctxAfterTurn1, 0.8);
    expect(turn2.origin).toBe("IGR"); // carried forward
    expect(turn2.destination).toBe("Centro");
  });

  it("simulates turn 1 → turn 2 → turn 3: full route with confirmation", () => {
    // Turn 1: "estoy en IGR"
    const t1 = mergeContext({ origin: "IGR" }, empty, 0.6);
    const ctx1: ConversationContext = { origin: t1.origin, intent: "MOVE", lastUpdate: 100 };

    // Turn 2: "voy al centro"
    const t2 = mergeContext({ destination: "Centro" }, ctx1, 0.8);
    expect(t2.origin).toBe("IGR");
    expect(t2.destination).toBe("Centro");

    const ctx2: ConversationContext = { origin: t2.origin, destination: t2.destination, intent: "MOVE", lastUpdate: 200 };

    // Turn 3: "sí, confirmo"
    const t3 = mergeContext({ intent: "CONFIRM" }, ctx2, 0.9);
    expect(t3.origin).toBe("IGR");
    expect(t3.destination).toBe("Centro");
    expect(t3.intent).toBe("CONFIRM"); // current wins
  });

  // ── Reset ──

  it("full extraction overwrites previous stale data", () => {
    const prev: ConversationContext = { origin: "OldPlace", lastUpdate: 500 };
    const current: Record<string, any> = { origin: "IGR", destination: "Amerian" };
    const merged = mergeContext(current, prev, 1.0);
    expect(merged.origin).toBe("IGR"); // current wins
    expect(merged.destination).toBe("Amerian");
  });

  it("previous context with empty current returns previous slots", () => {
    const prev: ConversationContext = { origin: "IGR", destination: "Centro", intent: "MOVE", lastUpdate: 200 };
    const merged = mergeContext({}, prev, 0.7);
    expect(merged.origin).toBe("IGR");
    expect(merged.destination).toBe("Centro");
    expect(merged.intent).toBe("MOVE");
    expect(merged._confidence).toBe(0.7);
  });
});
