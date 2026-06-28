import { describe, it, expect, vi, beforeEach } from "vitest";

const mockDb = { execute: vi.fn() };

vi.mock("@/lib/db/core/connection", () => ({
  getDb: () => mockDb,
  ensureSchema: vi.fn(),
}));

const { calculateSlotConfidence } = await import("@/lib/services/extraction/confidence");

describe("confidence alias resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolves aeropuerto → Aeropuerto IGR and hotel → Puerto Iguazú", async () => {
    mockDb.execute
      // resolveAlias("aeropuerto") — direct query
      .mockResolvedValueOnce({ rows: [{ canonical_name: "Aeropuerto IGR" }] })
      // resolveAlias("hotel") — direct query
      .mockResolvedValueOnce({ rows: [{ canonical_name: "Puerto Iguazú" }] });

    const result = await calculateSlotConfidence(
      {
        origin: "aeropuerto",
        destination: "hotel",
        passengers: 2,
        urgency: "ahora",
      },
      "Necesito un traslado ahora desde aeropuerto a hotel",
    );

    expect(result.slots.origin?.value).toBe("Aeropuerto IGR");
    expect(result.slots.destination?.value).toBe("Puerto Iguazú");
    expect(result.slots.origin?.score).toBe(0.6);
    expect(result.slots.origin?.reason).toBe("ambiguous_term");
    expect(result.slots.destination?.score).toBe(0.6);
    expect(result.slots.destination?.reason).toBe("ambiguous_term");
    expect(result.overall_confidence).toBe(0.73);
    expect(result.action).toBe("proceed");
  });

  it("returns known origin when aeropuerto is extracted with ambiguity", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [{ canonical_name: "Aeropuerto IGR" }] });

    const result = await calculateSlotConfidence(
      {
        origin: "aeropuerto",
        passengers: 1,
        urgency: "ahora",
      },
      "desde aeropuerto",
    );

    expect(result.slots.origin?.value).toBe("Aeropuerto IGR");
    expect(result.slots.origin?.reason).toBe("ambiguous_term");
    expect(result.slots.destination?.value).toBeNull();
    expect(result.slots.destination?.reason).toBe("missing");
    expect(result.action).toBe("clarify");
    expect(result.clarify_field).toBe("origin");
  });
});
