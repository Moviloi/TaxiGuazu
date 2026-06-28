import { describe, it, expect } from "vitest";
import { resolveGeoRoute } from "@/lib/services/geo/geo-engine";

describe("geoEngine", () => {
  it("IGR → Centro → MEDIUM (airport to city)", () => {
    const r = resolveGeoRoute({ origin: "IGR", destination: "Centro" });
    expect(r.originZone).toBe("Z_AIRPORT");
    expect(r.destinationZone).toBe("Z_CITY_CORE");
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Aeropuerto → Selva Iryapú → MEDIUM", () => {
    const r = resolveGeoRoute({ origin: "Aeropuerto IGR", destination: "Selva Iryapú" });
    expect(r.originZone).toBe("Z_AIRPORT");
    expect(r.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Aduana → cualquier → LONG", () => {
    const r = resolveGeoRoute({ origin: "Aduana", destination: "Centro" });
    expect(r.originZone).toBe("Z_BORDER");
    expect(r.destinationZone).toBe("Z_CITY_CORE");
    expect(r.routeType).toBe("LONG");
  });

  it("Mabu → Amerian → SHORT (same zone)", () => {
    const r = resolveGeoRoute({ origin: "Mabu", destination: "Amerian" });
    expect(r.originZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(r.routeType).toBe("SHORT");
  });

  it("Aduana → Cataratas → LONG con penalización", () => {
    const r = resolveGeoRoute({ origin: "Aduana", destination: "Cataratas" });
    expect(r.originZone).toBe("Z_BORDER");
    expect(r.destinationZone).toBe("Z_LANDMARK");
    expect(r.routeType).toBe("LONG");
    expect(r.proximityScore).toBeLessThan(0.4);
  });

  it("null slots → null zones + MEDIUM", () => {
    const r = resolveGeoRoute({ origin: null, destination: null });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
    expect(r.proximityScore).toBe(0.3);
  });

  it("empty slots → null zones", () => {
    const r = resolveGeoRoute({});
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
  });
});
