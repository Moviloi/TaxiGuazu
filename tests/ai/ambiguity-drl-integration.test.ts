import { describe, it, expect, beforeEach, vi } from "vitest";
import { interpretAmbiguity } from "@/lib/ai/ambiguity-interpreter";
import { getDrlMetrics, resetDrlMetrics } from "@/lib/bke/services/geo-resolver";
import type { PlaceCandidate } from "@/lib/db/domains/geo";

// Completely mock LLM provider to verify DRL bypasses it
vi.mock("@/lib/ai/llm-provider", () => ({
  getLLMProvider: vi.fn(() => ({
    name: "mock",
    interpretAmbiguity: vi.fn().mockResolvedValue("1"),
    extractSlots: vi.fn(),
    generateResponse: vi.fn(),
  })),
}));

// Mock DB calls
vi.mock("@/lib/db/domains/geo", () => ({
  searchPlaces: vi.fn(),
  findPlaceByName: vi.fn(),
}));

vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn().mockResolvedValue({
    place_id: null,
    canonical_name: null,
    zone_id: null,
    confidence: "not_found",
  }),
}));

function makeCandidate(
  id: string,
  name: string,
  country: string,
  score: number,
  display?: string,
): PlaceCandidate {
  return {
    place_id: id,
    canonical_name: name,
    zone_id: null,
    city: "",
    country,
    place_type: "city",
    tourist_relevance_score: score,
    display_name: display ?? name,
  };
}

describe("interpretAmbiguity with DRL-first (PR-5B)", () => {
  beforeEach(() => {
    resetDrlMetrics();
    vi.clearAllMocks();
    delete process.env.BKE_GEO_ENABLED;
  });

  // ── Flag disabled: existing LLM behavior ──────────────────────────────

  it("uses LLM path when BKE_GEO_ENABLED is not set", async () => {
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await interpretAmbiguity("centro", candidates, "destination");
    // LLM mock returns "1" → selects candidate p1
    expect(result.selectedId).toBe("p1");
    expect(result.confidence).toBe("high");
    expect(getDrlMetrics().attempts).toBe(0); // DRL not called
  });

  it("uses LLM path when BKE_GEO_ENABLED=false", async () => {
    process.env.BKE_GEO_ENABLED = "false";
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await interpretAmbiguity("centro", candidates, "destination");
    expect(result.selectedId).toBe("p1");
    expect(result.confidence).toBe("high");
    expect(getDrlMetrics().attempts).toBe(0);
  });

  // ── Flag enabled: DRL resolves ────────────────────────────────────────

  it("single candidate short-circuits before DRL (early return)", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const candidates = [makeCandidate("p1", "Solo Place", "Argentina", 50)];
    const result = await interpretAmbiguity("test", candidates, "origin");
    expect(result.selectedId).toBe("p1");
    expect(result.confidence).toBe("high");
    // Single candidate is handled before DRL check (line 79-82)
    expect(getDrlMetrics().attempts).toBe(0);
  });

  it("DRL resolves by contextual inference (bypasses LLM)", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await interpretAmbiguity("centro", candidates, "destination", "Aeropuerto IGR");
    expect(result.selectedId).toBe("p1");
    expect(result.confidence).toBe("high");
    expect(getDrlMetrics().attempts).toBe(1);
    expect(getDrlMetrics().resolved).toBe(1);
  });

  // ── Flag enabled: DRL escalates to LLM ────────────────────────────────

  it("falls through to LLM when DRL cannot resolve", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 50),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 45),
    ];
    // No context, scores are close, no alias match → DRL escalates → LLM resolves
    const result = await interpretAmbiguity("centro", candidates, "destination");
    expect(result.selectedId).toBe("p1"); // LLM mock returns "1"
    expect(result.confidence).toBe("high");
    expect(getDrlMetrics().attempts).toBe(1);
    expect(getDrlMetrics().escalated).toBe(1);
  });

  it("handles empty candidates (no ambiguity)", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const result = await interpretAmbiguity("test", [], "origin");
    expect(result.selectedId).toBeNull();
    expect(result.confidence).toBe("low");
  });

  it("handles single candidate (short-circuit before DRL)", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const candidates = [makeCandidate("p1", "Only Option", "Argentina", 50)];
    const result = await interpretAmbiguity("test", candidates, "origin");
    expect(result.selectedId).toBe("p1");
    expect(result.confidence).toBe("high");
  });

  // ── Contract compatibility ────────────────────────────────────────────

  it("returns same contract shape as LLM path", async () => {
    process.env.BKE_GEO_ENABLED = "true";
    const candidates = [makeCandidate("p1", "Single", "Argentina", 50)];

    const result = await interpretAmbiguity("test", candidates, "origin");
    expect(result).toHaveProperty("selectedId");
    expect(result).toHaveProperty("confidence");
    expect(["high", "low", "failed"]).toContain(result.confidence);
  });

  it("DRL metrics are zero when flag is off", async () => {
    const candidates = [
      makeCandidate("p1", "A", "Argentina", 80),
      makeCandidate("p2", "B", "Brasil", 85),
    ];
    await interpretAmbiguity("test", candidates, "destination");
    expect(getDrlMetrics().attempts).toBe(0);
  });
});
