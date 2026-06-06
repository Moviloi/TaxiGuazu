import { describe, it, expect } from "vitest";
import { expandZone, expandZones } from "../src/lib/services/zoneExpansionEngine";
import { computeProximityScore } from "../src/lib/services/proximityScorer";
import { resolveZones } from "../src/lib/services/zoneEngine";

describe("zoneExpansionEngine", () => {
  // ── Expansión radial ──

  it("Z_CITY_CORE expansion: core=1.0, boundary=0.7, transition=0.4", () => {
    const e = expandZone("Z_CITY_CORE");
    expect(e?.probs.core).toBe(1.0);
    expect(e?.probs.boundary).toBe(0.7);
    expect(e?.probs.transition).toBe(0.4);
  });

  it("Z_AIRPORT expansion: core=1.0, boundary=0.6, transition=0.3", () => {
    const e = expandZone("Z_AIRPORT");
    expect(e?.probs.core).toBe(1.0);
    expect(e?.probs.boundary).toBe(0.6);
    expect(e?.probs.transition).toBe(0.3);
  });

  it("Z_BORDER expansion: core=1.0, boundary=0.5, transition=0.2 (hard edge)", () => {
    const e = expandZone("Z_BORDER");
    expect(e?.probs.boundary).toBe(0.5);
    expect(e?.probs.transition).toBe(0.2);
  });

  it("null zone → null expansion", () => {
    expect(expandZone(null)).toBeNull();
  });

  it("expandZones returns both origin and destination expansions", () => {
    const r = expandZones("Z_AIRPORT", "Z_CITY_CORE");
    expect(r.origin?.zone).toBe("Z_AIRPORT");
    expect(r.destination?.zone).toBe("Z_CITY_CORE");
  });

  // ── Subzones (hotels as micro-zones) ──

  it("Amerian subzone attached to Z_HOTEL_ZONE expansion", () => {
    const e = expandZone("Z_HOTEL_ZONE", { name: "Amerian", weight: 1.0, confidence: 0.95 });
    expect(e?.subzone?.name).toBe("Amerian");
    expect(e?.subzone?.weight).toBe(1.0);
  });

  it("subzone is null when not a hotel zone", () => {
    const e = expandZone("Z_AIRPORT", null);
    expect(e?.subzone).toBeNull();
  });

  // ── Proximity scoring ──

  it("Z_CITY_CORE → Z_HOTEL_ZONE: high proximity (adjacent, corridor)", () => {
    const origin = expandZone("Z_CITY_CORE");
    const dest = expandZone("Z_HOTEL_ZONE");
    const ps = computeProximityScore(origin, dest);
    expect(ps.score).toBeGreaterThanOrEqual(0.6);
    expect(ps.factors.corridorAlignment).toBeGreaterThan(0);
  });

  it("Z_BORDER → Z_LANDMARK: low proximity (aduana penalty)", () => {
    const origin = expandZone("Z_BORDER");
    const dest = expandZone("Z_LANDMARK");
    const ps = computeProximityScore(origin, dest);
    expect(ps.score).toBeLessThan(0.5);
    expect(ps.factors.aduanaPenalty).toBeGreaterThan(0);
  });

  it("Z_AIRPORT → Z_CITY_CORE: corridor bonus applied", () => {
    const origin = expandZone("Z_AIRPORT");
    const dest = expandZone("Z_CITY_CORE");
    const ps = computeProximityScore(origin, dest);
    expect(ps.factors.corridorAlignment).toBe(0.15);
    expect(ps.score).toBeGreaterThanOrEqual(0.4);
  });

  it("null origin → default 0.3 score", () => {
    const ps = computeProximityScore(null, expandZone("Z_CITY_CORE"));
    expect(ps.score).toBe(0.3);
  });

  // ── Zone resolver (subzone integration) ──

  it("resolveZones with hotel node returns subzone", () => {
    const r = resolveZones({ origin: "IGR", destination: "Amerian" });
    expect(r.originZone).toBe("Z_AIRPORT");
    expect(r.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationSubzone?.name).toBe("Amerian");
    expect(r.originSubzone).toBeNull();
  });

  it("resolveZones with non-hotel nodes returns null subzones", () => {
    const r = resolveZones({ origin: "IGR", destination: "Centro" });
    expect(r.destinationSubzone).toBeNull();
    expect(r.originSubzone).toBeNull();
  });

  // ── Coherencia ida/vuelta ──

  it("Z_CITY_CORE → Z_AIRPORT same proximity as reverse", () => {
    const forward = computeProximityScore(expandZone("Z_CITY_CORE"), expandZone("Z_AIRPORT"));
    const reverse = computeProximityScore(expandZone("Z_AIRPORT"), expandZone("Z_CITY_CORE"));
    expect(forward.score).toBe(reverse.score);
  });

  it("Z_HOTEL_ZONE → Z_BORDER proximity same as Z_BORDER → Z_HOTEL_ZONE", () => {
    const forward = computeProximityScore(expandZone("Z_HOTEL_ZONE"), expandZone("Z_BORDER"));
    const reverse = computeProximityScore(expandZone("Z_BORDER"), expandZone("Z_HOTEL_ZONE"));
    expect(forward.score).toBe(reverse.score);
  });

  // ── Estabilidad probabilística ──

  it("same zone expanded twice yields identical probs", () => {
    const a = expandZone("Z_CITY_CORE");
    const b = expandZone("Z_CITY_CORE");
    expect(a?.probs.core).toBe(b?.probs.core);
    expect(a?.probs.boundary).toBe(b?.probs.boundary);
    expect(a?.probs.transition).toBe(b?.probs.transition);
  });
});
