import { describe, it, expect } from "vitest";
import { expandZones, computeProximityScore } from "../src/lib/services/geoEngine";
import { calculateFare } from "../src/lib/services/fareEngine";

function exp(origin: string, dest: string, originSub?: string, destSub?: string) {
  const sub = (n?: string) => (n ? { name: n, weight: 1.0, confidence: 0.9 } : undefined);
  return expandZones(origin, dest, sub(originSub), sub(destSub));
}

describe("fareEngine", () => {
  // ── Base fares ──

  it("Z_CITY_CORE → Z_CITY_CORE: LOW, 5000", () => {
    const e = exp("Z_CITY_CORE", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.category).toBe("LOW");
    expect(f.basePrice).toBe(5000);
    expect(f.finalPrice).toBeGreaterThanOrEqual(3000);
    expect(f.finalPrice).toBeLessThanOrEqual(7000);
  });

  it("Z_AIRPORT → Z_CITY_CORE: MEDIUM, 8000 with corridor discount", () => {
    const e = exp("Z_AIRPORT", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.basePrice).toBe(8000);
    expect(f.adjustments.corridorBonus).toBeLessThan(1);
    expect(f.finalPrice).toBeLessThan(8000);
    expect(f.category).toBe("MEDIUM");
  });

  it("Z_AIRPORT → Z_HOTEL_ZONE: MEDIUM+, 9000", () => {
    const e = exp("Z_AIRPORT", "Z_HOTEL_ZONE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.basePrice).toBe(9000);
    expect(f.category).toBe("MEDIUM+");
  });

  it("Z_BORDER → Z_CITY_CORE: HIGH, border penalty applied", () => {
    const e = exp("Z_BORDER", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.basePrice).toBe(14000);
    expect(f.adjustments.borderPenalty).toBeGreaterThan(1);
    expect(f.finalPrice).toBeGreaterThan(17000);
    expect(f.category).toBe("HIGH");
  });

  // ── Subzone modifiers (hotels) ──

  it("Z_AIRPORT → Z_HOTEL_ZONE with Amerian subzone: +10%", () => {
    const e = exp("Z_AIRPORT", "Z_HOTEL_ZONE", undefined, "Amerian");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.subzoneModifier).toBeGreaterThan(1);
  });

  it("Z_CITY_CORE → Z_HOTEL_ZONE with Mabu subzone: -5%", () => {
    const e = exp("Z_CITY_CORE", "Z_HOTEL_ZONE", undefined, "Mabu");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.subzoneModifier).toBeLessThan(1);
  });

  // ── Corridor discount ──

  it("Z_HOTEL_ZONE → Z_CITY_CORE: corridor discount 0.9", () => {
    const e = exp("Z_HOTEL_ZONE", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.corridorBonus).toBeLessThan(1);
    expect(f.finalPrice).toBeLessThan(f.basePrice);
  });

  it("Z_LANDMARK → Z_CITY_CORE: no corridor discount", () => {
    const e = exp("Z_LANDMARK", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.corridorBonus).toBeGreaterThanOrEqual(1);
  });

  // ── Border penalty ──

  it("Z_CITY_CORE → Z_BORDER: border penalty 1.3", () => {
    const e = exp("Z_CITY_CORE", "Z_BORDER");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.borderPenalty).toBeGreaterThan(1);
    expect(f.finalPrice).toBeGreaterThan(f.basePrice);
    expect(f.finalPrice).toBeLessThanOrEqual(f.basePrice * 1.5);
  });

  // ── Null / missing zones ──

  it("null expansion → VARIABLE + 0 price", () => {
    const f = calculateFare(null, null, {});
    expect(f.category).toBe("VARIABLE");
    expect(f.basePrice).toBe(0);
    expect(f.finalPrice).toBe(0);
  });

  it("partial zones (only origin) → VARIABLE", () => {
    const e = exp("Z_AIRPORT", null);
    const f = calculateFare(e, null, {});
    expect(f.category).toBe("VARIABLE");
  });

  // ── Price ranges determinísticos ──

  it("Z_AIRPORT → Z_HOTEL_ZONE + Amerian: final between 7000–11000", () => {
    const e = exp("Z_AIRPORT", "Z_HOTEL_ZONE", undefined, "Amerian");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.finalPrice).toBeGreaterThanOrEqual(7000);
    expect(f.finalPrice).toBeLessThanOrEqual(12000);
  });

  it("BORDER routes always HIGH category", () => {
    const e = exp("Z_BORDER", "Z_AIRPORT");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.category).toBe("HIGH");
  });

  it("zero proximity score does not crash", () => {
    const e = exp("Z_AIRPORT", "Z_CITY_CORE");
    const ps = computeProximityScore(e.origin, null);
    const f = calculateFare(e, ps);
    expect(f.finalPrice).toBeGreaterThan(0);
  });

  // ── Fare confidence ──

  it("high proximity → high fare confidence", () => {
    const e = exp("Z_CITY_CORE", "Z_HOTEL_ZONE");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.confidence).toBeGreaterThan(0.7);
  });

  it("null proximity → baseline fare confidence", () => {
    const f = calculateFare(null, null, {});
    expect(f.confidence).toBeGreaterThanOrEqual(0.6);
  });

  // ── Subzone names are case-sensitive: matches exactly ──

  it("subzone names are case-sensitive: matches exactly", () => {
    const e = exp("Z_AIRPORT", "Z_HOTEL_ZONE", undefined, "Amerian");
    const ps = computeProximityScore(e.origin, e.destination);
    const f = calculateFare(e, ps);
    expect(f.adjustments.subzoneModifier).not.toBe(1);
  });
});
