import { describe, it, expect } from "vitest";
import { applyCommercialRules, type CommercialInput, type CommercialLookups } from "../src/lib/services/commercial-pricing-engine";

const baseInput: CommercialInput = {
  base_price: 10000,
  preliminary_price: 12000,
  tariff_id: 1,
  origin_place_id: "place_1",
  destination_place_id: "place_2",
  origin_zone_id: "Z_PI_ZONA_1",
  destination_zone_id: "Z_PI_ZONA_2",
  passenger_count: 2,
  modality: "standard",
};

function noLookups(): CommercialLookups {
  return {
    findPromotion: async () => null,
    findProviderAdjustment: async () => null,
    findPackage: async () => null,
  };
}

describe("commercial-pricing-engine", () => {
  // ── Standard price (no adjustments) ──

  it("returns standard price when no adjustments apply", async () => {
    const result = await applyCommercialRules(baseInput, noLookups());
    expect(result.base_price).toBe(10000);
    expect(result.markup).toBe(2000);
    expect(result.final_price).toBe(12000);
    expect(result.adjustments).toHaveLength(0);
    expect(result.source).toBe("standard");
  });

  // ── Promotion ──

  it("applies promotion adjustment", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findPromotion: async (_, source) => source === "promotion" ? {
        id: 1, source: "promotion",
        name: "Semana Turismo", description: "-10%",
        adjustment_pct: 10,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        min_passengers: null, max_passengers: null,
        valid_from: null, valid_until: null,
        active: 1, max_uses: null, current_uses: null, created_at: null,
      } : null,
    });
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].type).toBe("promotion");
    expect(result.adjustments[0].amount).toBe(-1200);
    expect(result.final_price).toBe(10800);
    expect(result.source).toBe("promotion");
  });

  // ── Provider adjustment ──

  it("applies provider adjustment", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findProviderAdjustment: async () => ({
        id: 1, provider_id: "driver_1", tariff_id: 1,
        adjustment_type: "percent", adjustment_value: 15,
        valid_from: null, valid_until: null, active: 1, created_at: null,
      }),
    });
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].type).toBe("provider_adjustment");
    expect(result.adjustments[0].amount).toBe(-1800);
    expect(result.final_price).toBe(10200);
    expect(result.source).toBe("provider_adjustment");
  });

  // ── Package ──

  it("applies package adjustment when cheaper than standard", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findPackage: async () => ({
        id: 1, name: "Ida+Vuelta Aeropuerto", description: null,
        package_type: "round_trip", price: 11000, included_services: null,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        valid_from: null, valid_until: null, active: 1, created_at: null,
      }),
    });
    expect(result.adjustments).toHaveLength(1);
    expect(result.adjustments[0].type).toBe("package");
    expect(result.final_price).toBe(11000);
    expect(result.source).toBe("package");
  });

  it("ignores package when more expensive than standard", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findPackage: async () => ({
        id: 1, name: "Premium", description: null,
        package_type: "multi_stop", price: 15000, included_services: null,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        valid_from: null, valid_until: null, active: 1, created_at: null,
      }),
    });
    expect(result.adjustments).toHaveLength(0);
    expect(result.final_price).toBe(12000);
    expect(result.source).toBe("standard");
  });

  // ── TG campaign ──

  it("applies tg_campaign adjustment", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findPromotion: async (_, source) => source === "tg_campaign" ? {
        id: 2, source: "tg_campaign",
        name: "Campaña Verano", description: "-5% TG",
        adjustment_pct: 5,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        min_passengers: null, max_passengers: null,
        valid_from: null, valid_until: null,
        active: 1, max_uses: null, current_uses: null, created_at: null,
      } : null,
    });
    const tgAdj = result.adjustments.find(a => a.type === "tg_campaign");
    expect(tgAdj).toBeDefined();
    expect(tgAdj!.amount).toBe(-600);
    expect(result.final_price).toBe(11400);
  });

  // ── Multiple adjustments ──

  it("applies multiple adjustments cumulatively", async () => {
    const result = await applyCommercialRules(baseInput, {
      findPromotion: async (_, source) => source === "promotion" ? {
        id: 1, source: "promotion",
        name: "Promo", description: "-10%",
        adjustment_pct: 10,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        min_passengers: null, max_passengers: null,
        valid_from: null, valid_until: null,
        active: 1, max_uses: null, current_uses: null, created_at: null,
      } : null,
      findProviderAdjustment: async () => ({
        id: 1, provider_id: "d1", tariff_id: 1,
        adjustment_type: "percent", adjustment_value: 5,
        valid_from: null, valid_until: null, active: 1, created_at: null,
      }),
      findPackage: async () => null,
    });
    expect(result.adjustments.length).toBeGreaterThanOrEqual(2);
    expect(result.final_price).toBeLessThan(12000);
    expect(result.base_price).toBe(10000);
  });

  // ── Markup cap (adjustments never reduce base_price) ──

  it("caps total adjustment at markup", async () => {
    const result = await applyCommercialRules({
      ...baseInput,
      base_price: 10000,
      preliminary_price: 10500,
    }, {
      ...noLookups(),
      findPromotion: async (_, source) => source === "promotion" ? {
        id: 1, source: "promotion",
        name: "Mega Promo", description: "-50%",
        adjustment_pct: 50,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        min_passengers: null, max_passengers: null,
        valid_from: null, valid_until: null,
        active: 1, max_uses: null, current_uses: null, created_at: null,
      } : null,
      findProviderAdjustment: async () => ({
        id: 1, provider_id: "d1", tariff_id: 1,
        adjustment_type: "percent", adjustment_value: 20,
        valid_from: null, valid_until: null, active: 1, created_at: null,
      }),
      findPackage: async () => null,
    });
    // Markup is 500, so adjustments cannot go below 10000
    expect(result.final_price).toBe(10000);
    expect(result.final_price).toBeGreaterThanOrEqual(result.base_price);
  });

  // ── Edge: zero base_price ──

  it("handles zero base_price gracefully", async () => {
    const result = await applyCommercialRules({
      ...baseInput, base_price: 0, preliminary_price: 0, tariff_id: null,
    }, noLookups());
    expect(result.final_price).toBe(0);
    expect(result.markup).toBe(0);
    expect(result.source).toBe("standard");
  });

  // ── Explanation ──

  it("returns explanation for standard price", async () => {
    const result = await applyCommercialRules(baseInput, noLookups());
    expect(result.explanation).toBeInstanceOf(Array);
  });

  it("returns explanation with promotion details", async () => {
    const result = await applyCommercialRules(baseInput, {
      ...noLookups(),
      findPromotion: async (_, source) => source === "promotion" ? {
        id: 1, source: "promotion",
        name: "Semana Turismo", description: "-10%",
        adjustment_pct: 10,
        origin_place_id: null, destination_place_id: null,
        origin_zone_id: null, destination_zone_id: null,
        min_passengers: null, max_passengers: null,
        valid_from: null, valid_until: null,
        active: 1, max_uses: null, current_uses: null, created_at: null,
      } : null,
    });
    expect(result.explanation.length).toBeGreaterThan(0);
  });
});
