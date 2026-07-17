import { describe, it, expect, beforeEach, vi } from "vitest";
import { resolveGeoAmbiguity, getDrlMetrics, resetDrlMetrics } from "@/lib/bke/services/geo-resolver";
import type { PlaceCandidate } from "@/lib/db/domains/geo";

// Mock DB domain calls
vi.mock("@/lib/db/domains/geo", () => ({
  searchPlaces: vi.fn(),
  findPlaceByName: vi.fn(),
}));

// Default mock: alias not found, so rules that don't override it fall through
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
    city: country === "Argentina" ? "Puerto Iguazú" : country === "Brasil" ? "Foz do Iguaçu" : "Ciudad del Este",
    country,
    place_type: "city",
    tourist_relevance_score: score,
    display_name: display ?? name,
  };
}

describe("resolveGeoAmbiguity", () => {
  const text = "centro";
  const slotName = "destination" as const;

  beforeEach(() => {
    resetDrlMetrics();
    vi.clearAllMocks();
  });

  // ── R1: Single candidate ──────────────────────────────────────────────

  it("R1: resolves single candidate", async () => {
    const candidates = [makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 90)];
    const result = await resolveGeoAmbiguity(text, candidates, "destination");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p1");
    expect(result!.confidence).toBe("high");
  });

  // ── R2: Contextual inference ──────────────────────────────────────────

  it("R2: resolves by context when other slot resolved to Argentina", async () => {
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await resolveGeoAmbiguity(text, candidates, "destination", "Aeropuerto IGR");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p1");
    expect(result!.confidence).toBe("high");
  });

  it("R2: resolves by context when other slot resolved to Brasil", async () => {
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await resolveGeoAmbiguity(text, candidates, "destination", "Aeropuerto IGU");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p2");
    expect(result!.confidence).toBe("high");
  });

  it("R2: returns null when context doesn't match any candidate", async () => {
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    // Context is Paraguay, but neither candidate matches
    const result = await resolveGeoAmbiguity(text, candidates, "destination", "Ciudad del Este");
    expect(result).toBeNull();
  });

  it("R2: returns null when no resolved other slot", async () => {
    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await resolveGeoAmbiguity(text, candidates, "destination");
    expect(result).toBeNull();
  });

  // ── R3: Risk node ────────────────────────────────────────────────────

  it("R3: resolves risk node (aeropuerto) with context", async () => {
    const candidates = [
      makeCandidate("p1", "Aeropuerto IGR", "Argentina", 95),
      makeCandidate("p2", "Aeropuerto IGU", "Brasil", 95),
    ];
    const result = await resolveGeoAmbiguity("aeropuerto", candidates, "origin", "Centro de Puerto Iguazú");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p1");
    expect(result!.confidence).toBe("high");
  });

  // ── R4: High entity confidence ───────────────────────────────────────

  it("R4: resolves when best candidate dominates in relevance score", async () => {
    const candidates = [
      makeCandidate("p1", "Aeropuerto IGR", "Argentina", 95),
      makeCandidate("p2", "Aeropuerto IGU", "Brasil", 30),
    ];
    const result = await resolveGeoAmbiguity("aeropuerto", candidates, "origin");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p1");
    expect(result!.confidence).toBe("high");
  });

  it("R4: does not resolve when scores are close", async () => {
    const candidates = [
      makeCandidate("p1", "Aeropuerto IGR", "Argentina", 80),
      makeCandidate("p2", "Aeropuerto IGU", "Brasil", 75),
    ];
    const result = await resolveGeoAmbiguity("aeropuerto", candidates, "origin");
    // Without context, and scores are close, should not resolve
    expect(result).toBeNull();
  });

  // ── R5: Alias match ──────────────────────────────────────────────────

  it("R5: resolves by alias match", async () => {
    const { resolveLocation } = await import("@/lib/services/geo/location-resolver");
    vi.mocked(resolveLocation).mockResolvedValue({
      place_id: "p1",
      canonical_name: "Centro de Puerto Iguazú",
      zone_id: null,
      confidence: "alias",
    });

    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 80),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 85),
    ];
    const result = await resolveGeoAmbiguity("centro", candidates, "destination");
    expect(result).not.toBeNull();
    expect(result!.selectedId).toBe("p1");
    expect(result!.confidence).toBe("high");
  });

  // ── Fallthrough (escalation) ─────────────────────────────────────────

  it("returns null when no rule applies (escalation)", async () => {
    const { resolveLocation } = await import("@/lib/services/geo/location-resolver");
    vi.mocked(resolveLocation).mockResolvedValue({
      place_id: null,
      canonical_name: null,
      zone_id: null,
      confidence: "not_found",
    });

    const candidates = [
      makeCandidate("p1", "Centro de Puerto Iguazú", "Argentina", 50),
      makeCandidate("p2", "Centro de Foz do Iguaçu", "Brasil", 45),
      makeCandidate("p3", "Microcentro de Ciudad del Este", "Paraguay", 40),
    ];
    const result = await resolveGeoAmbiguity(text, candidates, "destination");
    expect(result).toBeNull();
  });

  // ── Metrics ──────────────────────────────────────────────────────────

  it("metrics track attempts, resolved, escalated", async () => {
    resetDrlMetrics();

    // One resolution
    const candidates = [makeCandidate("p1", "Solo Place", "Argentina", 50)];
    await resolveGeoAmbiguity(text, candidates, "destination");
    expect(getDrlMetrics().attempts).toBe(1);
    expect(getDrlMetrics().resolved).toBe(1);
    expect(getDrlMetrics().escalated).toBe(0);

    // One escalation
    const candidates3 = [
      makeCandidate("p1", "A", "Argentina", 50),
      makeCandidate("p2", "B", "Brasil", 45),
      makeCandidate("p3", "C", "Paraguay", 40),
    ];
    await resolveGeoAmbiguity(text, candidates3, "destination");
    expect(getDrlMetrics().attempts).toBe(2);
    expect(getDrlMetrics().resolved).toBe(1);
    expect(getDrlMetrics().escalated).toBe(1);
  });

  it("resetDrlMetrics clears counters", () => {
    resetDrlMetrics();
    expect(getDrlMetrics().attempts).toBe(0);
    expect(getDrlMetrics().resolved).toBe(0);
    expect(getDrlMetrics().escalated).toBe(0);
  });
});
