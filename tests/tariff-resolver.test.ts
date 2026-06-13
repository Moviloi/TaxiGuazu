import { describe, it, expect, vi, beforeEach } from "vitest";
import { resolveTariff, resolveTariffByPlaceIds } from "../src/lib/services/pricing/tariff-resolver";

const mockDb = { execute: vi.fn() };

vi.mock("../src/lib/db/core/connection", () => ({
  getDb: () => mockDb,
  ensureSchema: vi.fn(),
}));

vi.mock("../src/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn(),
  resolveLocationToPlaceId: vi.fn(),
}));

const { resolveLocation } = await import("../src/lib/services/geo/location-resolver");

function mockResolveLocation(result: Partial<ReturnType<typeof resolveLocation extends (...args: any[]) => infer R ? R : never>>) {
  (resolveLocation as any).mockResolvedValue(result);
}

describe("tariff-resolver", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("resolveTariff — place→place exact match (level 1)", async () => {
    mockResolveLocation({ place_id: "puerto_iguazú", canonical_name: "Puerto Iguazú", operational_zone: "Z_PI_CENTER", confidence: "exact" });
    mockResolveLocation({ place_id: "cataratas_argentinas", canonical_name: "Cataratas Argentinas", operational_zone: "Z_PI_CATARATAS", confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 1, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 60000, price_6p: 84000,
      base_price_4p: 50000, base_price_6p: 67000,
      origin_place_id: "puerto_iguazú", destination_place_id: "cataratas_argentinas",
      origin_zone_id: null, destination_zone_id: null, active: 1,
    }]});

    const result = await resolveTariff("Puerto Iguazú", "Cataratas Argentinas", 1);
    expect(result.matched).toBe(true);
    expect(result.level).toBe("place_place");
    expect(result.price).toBe(60000);
    expect(result.piso).toBe(50000);
  });

  it("resolveTariff — place→zone match (level 2)", async () => {
    mockResolveLocation({ place_id: "hotel_amerian", canonical_name: "Hotel Amerian", operational_zone: "Z_PI_HOTEL_CORE", confidence: "exact" });
    mockResolveLocation({ place_id: "aeropuerto_igr", canonical_name: "Aeropuerto IGR", operational_zone: "Z_PI_AIRPORT", confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 10, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 32000, price_6p: 44000,
      base_price_4p: 25000, base_price_6p: 35000,
      origin_place_id: "hotel_amerian", destination_place_id: null,
      origin_zone_id: null, destination_zone_id: "Z_PI_AIRPORT", active: 1,
    }]});

    const result = await resolveTariff("Hotel Amerian", "Aeropuerto IGR", 4);
    expect(result.matched).toBe(true);
    expect(result.level).toBe("place_zone");
    expect(result.price).toBe(32000);
  });

  it("resolveTariff — zone→zone match (level 4, inheritance)", async () => {
    mockResolveLocation({ place_id: "nuevo_hotel_test", canonical_name: "Nuevo Hotel Test", operational_zone: "Z_PI_HOTEL_600", confidence: "exact" });
    mockResolveLocation({ place_id: "aeropuerto_igr", canonical_name: "Aeropuerto IGR", operational_zone: "Z_PI_AIRPORT", confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 100, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 32000, price_6p: 44000,
      base_price_4p: 25000, base_price_6p: 35000,
      origin_place_id: null, destination_place_id: null,
      origin_zone_id: "Z_PI_HOTEL_600", destination_zone_id: "Z_PI_AIRPORT", active: 1,
    }]});

    const result = await resolveTariff("Nuevo Hotel Test", "Aeropuerto IGR", 4);
    expect(result.matched).toBe(true);
    expect(result.level).toBe("zone_zone");
    expect(result.price).toBe(32000);
  });

  it("resolveTariff — not found when no match at any level", async () => {
    mockResolveLocation({ place_id: "place_a", canonical_name: "Place A", operational_zone: null, confidence: "exact" });
    mockResolveLocation({ place_id: "place_b", canonical_name: "Place B", operational_zone: null, confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });

    const result = await resolveTariff("unknown_origin", "unknown_dest", 1);
    expect(result.matched).toBe(false);
    expect(result.level).toBe("not_found");
  });

  it("resolveTariff — falls back to zone→zone when origin has zone but no place→zone", async () => {
    mockResolveLocation({ place_id: "hotel_origin", canonical_name: "Hotel Origin", operational_zone: "Z_PI_HOTEL_CORE", confidence: "exact" });
    mockResolveLocation({ place_id: "airport_dest", canonical_name: "Airport Dest", operational_zone: "Z_PI_AIRPORT", confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [] });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 200, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 35000, price_6p: 49000,
      base_price_4p: 28000, base_price_6p: 39000,
      origin_place_id: null, destination_place_id: null,
      origin_zone_id: "Z_PI_HOTEL_CORE", destination_zone_id: "Z_PI_AIRPORT", active: 1,
    }]});

    const result = await resolveTariff("Hotel Origin", "Airport Dest", 6);
    expect(result.matched).toBe(true);
    expect(result.level).toBe("zone_zone");
    expect(result.price).toBe(49000);
  });

  it("resolveTariffByPlaceIds — direct place IDs", async () => {
    mockDb.execute.mockResolvedValueOnce({ rows: [{ operational_zone: null }] });
    mockDb.execute.mockResolvedValueOnce({ rows: [{ operational_zone: null }] });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 1, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 10000, price_6p: 14000,
      base_price_4p: 8000, base_price_6p: 10000,
      origin_place_id: "place_a", destination_place_id: "place_b",
      origin_zone_id: null, destination_zone_id: null, active: 1,
    }]});

    const result = await resolveTariffByPlaceIds("place_a", "place_b", 1);
    expect(result.matched).toBe(true);
    expect(result.level).toBe("place_place");
    expect(result.price).toBe(10000);
  });

  it("resolveTariff — empty origin or destination returns not_found", async () => {
    mockResolveLocation({ place_id: null, canonical_name: null, operational_zone: null, confidence: "not_found" });
    mockResolveLocation({ place_id: null, canonical_name: null, operational_zone: null, confidence: "not_found" });

    const result = await resolveTariff("", "", 1);
    expect(result.matched).toBe(false);
    expect(result.level).toBe("not_found");
  });

  it("resolveTariff — pax > 4 uses price_6p", async () => {
    mockResolveLocation({ place_id: "p1", canonical_name: "Place 1", operational_zone: null, confidence: "exact" });
    mockResolveLocation({ place_id: "p2", canonical_name: "Place 2", operational_zone: null, confidence: "exact" });
    mockDb.execute.mockResolvedValueOnce({ rows: [{
      id: 1, origin: "", destination: "", modality: null,
      crosses_border: 0, wait_included: 0,
      price_4p: 10000, price_6p: 14000,
      base_price_4p: 8000, base_price_6p: 10000,
      origin_place_id: "p1", destination_place_id: "p2",
      origin_zone_id: null, destination_zone_id: null, active: 1,
    }]});

    const result = await resolveTariff("place1", "place2", 5);
    expect(result.matched).toBe(true);
    expect(result.price).toBe(14000);
    expect(result.piso).toBe(10000);
  });
});
