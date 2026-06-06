import { describe, it, expect } from "vitest";
import { resolveGeoRoute, resolveZones, computeProximityScore, expandZones } from "../src/lib/services/geoEngine";

describe("geoEngine", () => {
  // ── resolveGeoRoute (unified entry point) ──

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

  // ── resolveZones (backward compat) ──

  it("resolveZones returns subzone for hotel node", () => {
    const r = resolveZones({ origin: "IGR", destination: "Amerian" });
    expect(r.destinationSubzone?.name).toBe("Amerian");
    expect(r.originSubzone).toBeNull();
  });

  it("resolveZones returns null subzone for non-hotel", () => {
    const r = resolveZones({ origin: "IGR", destination: "Centro" });
    expect(r.destinationSubzone).toBeNull();
  });

  // ── computeProximityScore (backward compat) ──

  it("proximity airport → city core is MEDIUM", () => {
    const e = expandZones("Z_AIRPORT", "Z_CITY_CORE");
    const p = computeProximityScore(e.origin, e.destination);
    expect(p.score).toBeGreaterThanOrEqual(0.4);
    expect(p.factors.corridorAlignment).toBeGreaterThan(0);
  });

  it("proximity border → anything has penalty", () => {
    const e = expandZones("Z_BORDER", "Z_LANDMARK");
    const p = computeProximityScore(e.origin, e.destination);
    expect(p.factors.aduanaPenalty).toBeGreaterThan(0);
    expect(p.score).toBeLessThan(0.5);
  });

  // ── GeoRoute fields ──

  it("geoRoute includes originNode and destinationNode", () => {
    const r = resolveGeoRoute({ origin: "IGR", destination: "Centro" });
    expect(r.originNode).toBe("IGR");
    expect(r.destinationNode).toBe("Centro");
  });

  it("geoRoute proximityScore matches computeProximityScore", () => {
    const r = resolveGeoRoute({ origin: "Aduana", destination: "Cataratas" });
    const e = expandZones("Z_BORDER", "Z_LANDMARK");
    const p = computeProximityScore(e.origin, e.destination);
    expect(r.proximityScore).toBe(p.score);
  });

  // ── Null / partial ──

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
