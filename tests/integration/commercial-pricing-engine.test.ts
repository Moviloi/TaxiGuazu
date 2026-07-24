import { describe, it, expect } from "vitest";
import { applyCommercialRules, type CommercialInput, type CommercialLookups } from "@/lib/services/pricing/commercial-pricing-engine";

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

// ── Night surcharge tests ──

import { vi } from "vitest";
import { applyNightSurcharge, isNightWindow } from "@/lib/services/pricing/pricing-engine";
import type { Adjustment } from "@/lib/services/pricing/commercial-pricing-engine";

vi.mock("@/lib/db/database", () => ({
  getZoneSurcharge: vi.fn(),
  queryOne: vi.fn(),
  query: vi.fn(),
  getDb: vi.fn(),
  ensureSchema: vi.fn(),
}));

const { getZoneSurcharge } = await import("@/lib/db/database");

describe("night-surcharge", () => {
  it("applies surcharge when zone is AEROPUERTO_IGR and hour is 23:00", async () => {
    const nightDate = new Date("2026-07-24T02:00:00Z"); // 23:00 UTC-3
    (getZoneSurcharge as any).mockResolvedValueOnce({
      surcharge_pct: 20,
      surcharge_description: "Recargo nocturno Aeropuerto IGR (22:00-06:00)",
    });
    const adjustments: Adjustment[] = [];
    const explanation: string[] = [];

    const result = await applyNightSurcharge(10000, "AEROPUERTO_IGR", null, nightDate, adjustments, explanation);

    expect(result).toBe(12000);
    expect(adjustments).toHaveLength(1);
    expect(adjustments[0].type).toBe("night_surcharge");
    expect(adjustments[0].amount).toBe(2000);
  });

  it("does not apply surcharge during daytime (12:00)", async () => {
    const dayDate = new Date("2026-07-24T15:00:00Z"); // 12:00 UTC-3
    (getZoneSurcharge as any).mockResolvedValueOnce({
      surcharge_pct: 20,
      surcharge_description: "Recargo nocturno Aeropuerto IGR (22:00-06:00)",
    });
    const adjustments: Adjustment[] = [];
    const explanation: string[] = [];

    const result = await applyNightSurcharge(10000, "AEROPUERTO_IGR", null, dayDate, adjustments, explanation);

    expect(result).toBe(10000);
    expect(adjustments).toHaveLength(0);
  });

  it("does not apply surcharge for non-IGR zones at night", async () => {
    const nightDate = new Date("2026-07-24T02:00:00Z"); // 23:00 UTC-3
    (getZoneSurcharge as any).mockResolvedValueOnce(null);
    // Non-IGR zone has no surcharge
    const adjustments: Adjustment[] = [];
    const explanation: string[] = [];

    const result = await applyNightSurcharge(10000, "CENTRO", null, nightDate, adjustments, explanation);

    expect(result).toBe(10000);
    expect(adjustments).toHaveLength(0);
  });

  it("surcharge amount is positive", async () => {
    const nightDate = new Date("2026-07-24T02:00:00Z"); // 23:00 UTC-3
    (getZoneSurcharge as any).mockResolvedValueOnce({
      surcharge_pct: 20,
      surcharge_description: "Recargo nocturno Aeropuerto IGR (22:00-06:00)",
    });
    const adjustments: Adjustment[] = [];
    const explanation: string[] = [];

    await applyNightSurcharge(10000, "AEROPUERTO_IGR", null, nightDate, adjustments, explanation);

    expect(adjustments[0].amount).toBeGreaterThan(0);
  });

  it("applies surcharge when destination is IGR (not only origin)", async () => {
    const nightDate = new Date("2026-07-24T02:00:00Z"); // 23:00 UTC-3
    (getZoneSurcharge as any).mockResolvedValueOnce({
      surcharge_pct: 20,
      surcharge_description: "Recargo nocturno Aeropuerto IGR (22:00-06:00)",
    });
    const adjustments: Adjustment[] = [];
    const explanation: string[] = [];

    const result = await applyNightSurcharge(10000, null, "AEROPUERTO_IGR", nightDate, adjustments, explanation);

    expect(result).toBe(12000);
    expect(adjustments[0].amount).toBe(2000);
  });

  it("isNightWindow returns true at 23:00 UTC-3", () => {
    const nightDate = new Date("2026-07-24T02:00:00Z"); // 23:00 UTC-3
    expect(isNightWindow(nightDate)).toBe(true);
  });

  it("isNightWindow returns true at 05:59 UTC-3", () => {
    const earlyDate = new Date("2026-07-24T08:59:00Z"); // 05:59 UTC-3
    expect(isNightWindow(earlyDate)).toBe(true);
  });

  it("isNightWindow returns false at 06:00 UTC-3", () => {
    const morningDate = new Date("2026-07-24T09:00:00Z"); // 06:00 UTC-3
    expect(isNightWindow(morningDate)).toBe(false);
  });

  it("isNightWindow returns false at 12:00 UTC-3", () => {
    const noonDate = new Date("2026-07-24T15:00:00Z"); // 12:00 UTC-3
    expect(isNightWindow(noonDate)).toBe(false);
  });

  it("isNightWindow returns true at 22:00 UTC-3 exactly", () => {
    const edgeDate = new Date("2026-07-24T01:00:00Z"); // 22:00 UTC-3 (25:00 UTC → 01:00 UTC)
    expect(isNightWindow(edgeDate)).toBe(true);
  });

  it("isNightWindow returns false at 21:59 UTC-3", () => {
    const beforeEdge = new Date("2026-07-24T00:59:00Z"); // 21:59 UTC-3
    expect(isNightWindow(beforeEdge)).toBe(false);
  });
});
