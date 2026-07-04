// Tests de contrato para GeoTool
// Validan el schema Zod de entrada/salida, no la implementación interna.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { GeoToolInputSchema, GeoToolOutputSchema, geoTool } from "@/lib/services/geo/tool-geo";
import { resolveLocation } from "@/lib/services/geo/location-resolver";

const mockFindPlaceByAlias = vi.fn();
const mockFindPlaceByName = vi.fn();
const mockSearchPlaces = vi.fn();

vi.mock("@/lib/db/database", () => ({
  findPlaceByAlias: (...args: any[]) => mockFindPlaceByAlias(...args),
  findPlaceByName: (...args: any[]) => mockFindPlaceByName(...args),
}));

vi.mock("@/lib/db/domains/geo", () => ({
  searchPlaces: (...args: any[]) => mockSearchPlaces(...args),
}));

describe("GeoTool — contract validation", () => {
  it("rejects empty text", () => {
    expect(() => GeoToolInputSchema.parse({ text: "" })).toThrow();
  });

  it("accepts valid input with optional lang", () => {
    const input = GeoToolInputSchema.parse({ text: "aeropuerto", lang: "es" });
    expect(input.text).toBe("aeropuerto");
    expect(input.lang).toBe("es");
  });

  it("accepts input without lang", () => {
    const input = GeoToolInputSchema.parse({ text: "argentine customs" });
    expect(input.text).toBe("argentine customs");
    expect(input.lang).toBeUndefined();
  });

  it("output schema validates exact match result", () => {
    const output = GeoToolOutputSchema.parse({
      placeId: "ar_igr_airport",
      canonicalName: "Aeropuerto IGR",
      displayName: "Aeropuerto IGR",
      zoneId: "ZONE_IGR_AIRPORT",
      confidence: "exact",
    });
    expect(output.placeId).toBe("ar_igr_airport");
    expect(output.confidence).toBe("exact");
  });

  it("output schema validates not_found result with candidates", () => {
    const output = GeoToolOutputSchema.parse({
      placeId: null,
      canonicalName: null,
      displayName: "",
      zoneId: null,
      confidence: "not_found",
      candidates: [
        {
          placeId: "ar_igr_airport",
          canonicalName: "Aeropuerto IGR",
          displayName: "Aeropuerto IGR",
          city: "Puerto Iguazú",
          country: "AR",
          placeType: "airport",
          zoneId: "ZONE_IGR_AIRPORT",
        },
      ],
    });
    expect(output.candidates).toHaveLength(1);
  });
});

// Tests de equivalencia: geoTool es un wrapper real de location-resolver.
// Mockeamos SOLO la capa DB con datos realistas. Ambos (tool-geo y location-resolver)
// usan implementaciones REALES. Verificamos que devuelven el mismo resultado.

describe("GeoTool — equivalence with location-resolver (real implementations)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("both return same result for exact alias match", async () => {
    const fakePlace = { place_id: "ar_igr_airport", canonical_name: "Aeropuerto IGR", zone_id: "Z_AIRPORT" };
    mockFindPlaceByAlias.mockResolvedValue(fakePlace);
    mockFindPlaceByName.mockResolvedValue(null);

    const toolResult = await geoTool.resolveLocation({ text: "Aeropuerto IGR" });
    const directResult = await resolveLocation("Aeropuerto IGR");

    expect(toolResult.placeId).toBe(directResult.place_id);
    expect(toolResult.canonicalName).toBe(directResult.canonical_name);
    expect(toolResult.zoneId).toBe(directResult.zone_id);
    expect(toolResult.confidence).toBe(directResult.confidence);
    expect(toolResult.confidence).toBe("alias");
  });

  it("both return same result for not_found input", async () => {
    mockFindPlaceByAlias.mockResolvedValue(null);
    mockFindPlaceByName.mockResolvedValue(null);
    mockSearchPlaces.mockResolvedValue([]);

    const toolResult = await geoTool.resolveLocation({ text: "xyz123" });
    const directResult = await resolveLocation("xyz123");

    expect(toolResult.placeId).toBe(directResult.place_id);
    expect(toolResult.canonicalName).toBe(directResult.canonical_name);
    expect(toolResult.zoneId).toBe(directResult.zone_id);
    expect(toolResult.confidence).toBe(directResult.confidence);
    expect(toolResult.confidence).toBe("not_found");
  });

  it("both return same result for exact name match", async () => {
    const fakePlace = { place_id: "ar_cataratas", canonical_name: "Cataratas Argentinas", zone_id: "Z_PARK" };
    mockFindPlaceByAlias.mockResolvedValue(null);
    mockFindPlaceByName.mockResolvedValue(fakePlace);

    const toolResult = await geoTool.resolveLocation({ text: "Cataratas Argentinas" });
    const directResult = await resolveLocation("Cataratas Argentinas");

    expect(toolResult.placeId).toBe(directResult.place_id);
    expect(toolResult.canonicalName).toBe(directResult.canonical_name);
    expect(toolResult.zoneId).toBe(directResult.zone_id);
    expect(toolResult.confidence).toBe(directResult.confidence);
    expect(toolResult.confidence).toBe("exact");
  });
});
