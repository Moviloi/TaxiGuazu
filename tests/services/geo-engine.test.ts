import { describe, it, expect } from "vitest";
import { resolveGeoRoute } from "@/lib/services/geo/location-resolver";

describe("geoEngine", () => {
  // Zone resolution removed from geo-engine (superseded by location-resolver.ts → DB places/aliases).
  // All routes now return null zones + MEDIUM routeType + default proximity 0.3.
  // Proximity scoring reactivates once zone IDs from DB are passed in.

  it("IGR → Centro → MEDIUM (airport to city)", () => {
    const r = resolveGeoRoute({ origin: "IGR", destination: "Centro" });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Aeropuerto → Selva Iryapú → MEDIUM", () => {
    const r = resolveGeoRoute({ origin: "Aeropuerto IGR", destination: "Selva Iryapú" });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Aduana → cualquier → MEDIUM (zones resolved by DB)", () => {
    const r = resolveGeoRoute({ origin: "Aduana", destination: "Centro" });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Mabu → Amerian → MEDIUM (same zone, zones resolved by DB)", () => {
    const r = resolveGeoRoute({ origin: "Mabu", destination: "Amerian" });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
  });

  it("Aduana → Cataratas → MEDIUM (zones resolved by DB)", () => {
    const r = resolveGeoRoute({ origin: "Aduana", destination: "Cataratas" });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
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
