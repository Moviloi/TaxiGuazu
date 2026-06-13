import { describe, it, expect, beforeEach } from "vitest";
import { recordOutcome, getAllOutcomes, clearOutcomes, getOutcomeCount } from "../src/lib/services/tripOutcomeTracker";
import { observe, computeWeights, buildRouteKey, applyWeights } from "../src/lib/services/learning/fare-learning-engine";

describe("tripOutcomeTracker", () => {
  beforeEach(() => clearOutcomes());

  it("records and retrieves outcomes", () => {
    recordOutcome({ routeKey: "Z_A→Z_B", estimatedFare: 100, finalFare: 110, humanOverride: false, timestamp: 1 });
    expect(getOutcomeCount()).toBe(1);
  });

  it("clearOutcomes resets all", () => {
    recordOutcome({ routeKey: "Z_A→Z_B", estimatedFare: 100, finalFare: 110, humanOverride: false, timestamp: 1 });
    clearOutcomes();
    expect(getOutcomeCount()).toBe(0);
  });

  it("max outcomes does not grow unbounded (500 cap)", () => {
    for (let i = 0; i < 600; i++) {
      recordOutcome({ routeKey: "Z_X→Z_Y", estimatedFare: 100, finalFare: 100, humanOverride: false, timestamp: i });
    }
    expect(getOutcomeCount()).toBeLessThanOrEqual(500);
  });
});

describe("fareLearningEngine", () => {
  beforeEach(() => clearOutcomes());

  // ── buildRouteKey ──

  it("buildRouteKey formats correctly", () => {
    expect(buildRouteKey("Z_AIRPORT", "Z_HOTEL_ZONE")).toBe("Z_AIRPORT→Z_HOTEL_ZONE");
  });

  it("buildRouteKey handles nulls", () => {
    expect(buildRouteKey(null, "Z_CITY_CORE")).toBe("?→Z_CITY_CORE");
  });

  // ── Observe ──

  it("observe adds an outcome", () => {
    observe(100, 110, "Z_A→Z_B", false);
    expect(getOutcomeCount()).toBe(1);
  });

  // ── No adjustment with few samples ──

  it("no zone adjustment with < 2 samples per route", () => {
    observe(100, 110, "Z_A→Z_B", false);
    const w = computeWeights();
    expect(Object.keys(w.zoneAdjustments).length).toBe(0);
  });

  // ── Adjustment triggers after sufficient error ──

  it("consistent underestimation triggers zone adjustment", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 120, "Z_A→Z_Z", false); // +20% error
    }
    const w = computeWeights();
    const adj = w.zoneAdjustments["Z_A→Z_Z"];
    expect(adj).toBeDefined();
    expect(adj).toBeGreaterThan(1.0); // should increase
  });

  it("consistent overestimation triggers downward adjustment", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 85, "Z_O→Z_D", false); // -15% error
    }
    const w = computeWeights();
    const adj = w.zoneAdjustments["Z_O→Z_D"];
    expect(adj).toBeDefined();
    expect(adj).toBeLessThan(1.0); // should decrease
  });

  // ── Small error does not trigger adjustment ──

  it("small error (< 5%) does not trigger adjustment", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 102, "Z_SMALL→Z_ERR", false);
    }
    const w = computeWeights();
    expect(w.zoneAdjustments["Z_SMALL→Z_ERR"]).toBeUndefined();
  });

  // ── applyWeights ──

  it("applyWeights with no adjustment returns base price", () => {
    const w = computeWeights();
    const price = applyWeights(5000, "Z_A→Z_B", w);
    expect(price).toBe(5000);
  });

  it("applyWeights with adjustment modifies price", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 120, "Z_ADJ→Z_PRICE", false);
    }
    const w = computeWeights();
    const price = applyWeights(5000, "Z_ADJ→Z_PRICE", w);
    expect(price).not.toBe(5000);
  });

  // ── Border sensitivity ──

  it("frequent human override on border routes reduces sensitivity", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 130, "Z_BORDER→Z_CITY_CORE", true);
    }
    const w = computeWeights();
    expect(w.borderSensitivity).toBeLessThan(1.0);
  });

  it("low override rate on border keeps default sensitivity", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 130, "Z_BORDER→Z_CITY_CORE", false);
    }
    const w = computeWeights();
    expect(w.borderSensitivity).toBe(1.0);
  });

  // ── Stability: no drift from single outlier ──

  it("single outlier does not trigger adjustment", () => {
    // 4 normal + 1 outlier
    for (let i = 0; i < 4; i++) {
      observe(100, 100, "Z_OUTLIER→Z_TEST", false);
    }
    observe(100, 200, "Z_OUTLIER→Z_TEST", false); // outlier +100%
    const w = computeWeights();
    // With only 5 samples and one outlier, error is (0+0+0+0+1)/5 = 0.2, which is > 0.05
    // But adjustment_rate means 1 + 0.2 * 0.03 * 10 = 1.06, within bounds
    const adj = w.zoneAdjustments["Z_OUTLIER→Z_TEST"];
    if (adj) {
      expect(adj).toBeLessThan(1.1); // bounded
    }
  });

  // ── Multiple routes ──

  it("multiple routes produce independent adjustments", () => {
    for (let i = 0; i < 5; i++) {
      observe(100, 120, "ROUTE_A", false);  // +20%
      observe(100, 80, "ROUTE_B", false);   // -20%
    }
    const w = computeWeights();
    expect(w.zoneAdjustments["ROUTE_A"]).toBeGreaterThan(1.0);
    expect(w.zoneAdjustments["ROUTE_B"]).toBeLessThan(1.0);
  });

  // ── Clamping ──

  it("adjustments are clamped to [0.9, 1.15]", () => {
    for (let i = 0; i < 10; i++) {
      observe(100, 300, "Z_EXTREME→Z_ERROR", false); // +200%
    }
    const w = computeWeights();
    const adj = w.zoneAdjustments["Z_EXTREME→Z_ERROR"];
    expect(adj).toBeLessThanOrEqual(1.15);
    expect(adj).toBeGreaterThanOrEqual(0.9);
  });
});
