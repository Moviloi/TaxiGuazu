import { describe, it, expect } from "vitest";
import { resolveZones } from "../src/lib/services/geoEngine";

describe("zoneEngine", () => {
  it("IGR → Centro Iguazú: Z_AIRPORT → Z_CITY_CORE, MEDIUM", () => {
    const result = resolveZones({ origin: "IGR", destination: "Centro Iguazú" });
    expect(result.originZone).toBe("Z_AIRPORT");
    expect(result.destinationZone).toBe("Z_CITY_CORE");
    expect(result.distanceClass).toBe("MEDIUM");
  });

  it("IGR → Selva Iryapú: Z_AIRPORT → Z_HOTEL_ZONE, MEDIUM", () => {
    const result = resolveZones({ origin: "IGR", destination: "Selva Iryapú" });
    expect(result.originZone).toBe("Z_AIRPORT");
    expect(result.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(result.distanceClass).toBe("MEDIUM");
  });

  it("Foz Centro → Aduana: Z_CITY_CORE → Z_BORDER, SHORT", () => {
    const result = resolveZones({ origin: "Ciudad de Foz", destination: "Aduana" });
    expect(result.originZone).toBe("Z_CITY_CORE");
    expect(result.destinationZone).toBe("Z_BORDER");
    expect(result.distanceClass).toBe("LONG");
  });

  it("Aeropuerto IGR → Amerian: Z_AIRPORT → Z_HOTEL_ZONE, MEDIUM", () => {
    const result = resolveZones({ origin: "Aeropuerto IGR", destination: "Amerian" });
    expect(result.originZone).toBe("Z_AIRPORT");
    expect(result.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(result.distanceClass).toBe("MEDIUM");
  });

  it("Centro → Puerto Iguazú: Z_CITY_CORE → Z_CITY_CORE, SHORT (same zone)", () => {
    const result = resolveZones({ origin: "Centro", destination: "Puerto Iguazú" });
    expect(result.originZone).toBe("Z_CITY_CORE");
    expect(result.destinationZone).toBe("Z_CITY_CORE");
    expect(result.distanceClass).toBe("SHORT");
  });

  it("Cataratas → Aduana: Z_LANDMARK → Z_BORDER, LONG", () => {
    const result = resolveZones({ origin: "Cataratas", destination: "Aduana" });
    expect(result.originZone).toBe("Z_LANDMARK");
    expect(result.destinationZone).toBe("Z_BORDER");
    expect(result.distanceClass).toBe("LONG");
  });

  it("terminals return Z_CITY_CORE", () => {
    const result = resolveZones({ origin: "Terminal", destination: "Terminal de Ómnibus" });
    expect(result.originZone).toBe("Z_CITY_CORE");
    expect(result.destinationZone).toBe("Z_CITY_CORE");
  });

  it("null slots → null zones + MEDIUM fallback", () => {
    const result = resolveZones({ origin: null, destination: null });
    expect(result.originZone).toBeNull();
    expect(result.destinationZone).toBeNull();
    expect(result.distanceClass).toBe("MEDIUM");
  });

  it("unknown location → null zone", () => {
    const result = resolveZones({ origin: "SomeUnknownPlace", destination: "AnotherUnknown" });
    expect(result.originZone).toBeNull();
    expect(result.destinationZone).toBeNull();
    expect(result.distanceClass).toBe("MEDIUM");
  });

  it("Hotel zone to city core → SHORT", () => {
    const result = resolveZones({ origin: "Meliá", destination: "Centro" });
    expect(result.originZone).toBe("Z_HOTEL_ZONE");
    expect(result.destinationZone).toBe("Z_CITY_CORE");
    expect(result.distanceClass).toBe("SHORT");
  });
});
