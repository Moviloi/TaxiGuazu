// Tests de contrato para GeoTool
// Validan el schema Zod de entrada/salida, no la implementación interna.

import { describe, it, expect, vi } from "vitest";
import { GeoToolInputSchema, GeoToolOutputSchema, geoTool, type GeoTool } from "@/lib/services/geo/tool-geo";

vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn(),
}));

vi.mock("@/lib/db/domains/geo", () => ({
  searchPlaces: vi.fn(),
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
