import { describe, it, expect, vi, beforeEach } from "vitest";

const mockExecute = vi.fn();
const mockDb = { execute: mockExecute };

vi.mock("../src/lib/db/core/connection", () => ({
  getDb: () => mockDb,
  ensureSchema: vi.fn(),
}));

vi.mock("../src/lib/db/database", () => ({
  getActiveComplementRules: vi.fn(async () => []),
  insertOpportunityLog: vi.fn(async () => 1),
}));

import {
  isOpportunityQuery,
  evaluateOpportunities,
  type OpportunityInput,
} from "../src/lib/services/learning/opportunity-engine";
import { formatOpportunityResponse } from "../src/lib/ai/response-builder";

const basePricing = {
  final_price: 12000,
  base_price: 10000,
  markup: 2000,
  adjustments: [],
  tariff_id: 1,
  source: "standard",
  explanation: [],
  origin: { place_id: "place_1", canonical_name: "Puerto Iguazú" },
  destination: { place_id: "place_2", canonical_name: "Cataratas" },
};

const baseTrip = {
  origin: "Puerto Iguazú",
  destination: "Cataratas",
  tariff_id: 1,
  passengers: 2,
};

function makeInput(overrides?: Partial<OpportunityInput>): OpportunityInput {
  return {
    pricingResult: basePricing,
    tripContext: baseTrip,
    userIntent: "tiene descuento?",
    ...overrides,
  };
}

function mockRows(...rows: any[][]) {
  for (const r of rows) {
    mockDb.execute.mockResolvedValueOnce({ rows: r });
  }
}

describe("isOpportunityQuery", () => {
  it("matches 'descuento'", () => {
    expect(isOpportunityQuery("hay descuento?")).toBe(true);
  });
  it("matches 'promo'", () => {
    expect(isOpportunityQuery("tienen promo")).toBe(true);
  });
  it("matches 'beneficio'", () => {
    expect(isOpportunityQuery("tiene algún beneficio")).toBe(true);
  });
  it("matches 'oferta'", () => {
    expect(isOpportunityQuery("alguna oferta?")).toBe(true);
  });
  it("matches 'mejor precio'", () => {
    expect(isOpportunityQuery("mejor precio")).toBe(true);
  });
  it("matches 'más barato'", () => {
    expect(isOpportunityQuery("más barato")).toBe(true);
  });
  it("matches 'rebaja'", () => {
    expect(isOpportunityQuery("rebaja")).toBe(true);
  });
  it("matches 'promoción'", () => {
    expect(isOpportunityQuery("promoción")).toBe(true);
  });
  it("matches 'economico'", () => {
    expect(isOpportunityQuery("más economico")).toBe(true);
  });
  it("rejects generic travel query", () => {
    expect(isOpportunityQuery("quiero un traslado al aeropuerto")).toBe(false);
  });
  it("rejects price-only query", () => {
    expect(isOpportunityQuery("cuanto sale?")).toBe(false);
  });
});

describe("evaluateOpportunities", () => {
  beforeEach(() => {
    mockDb.execute.mockReset();
  });

  it("returns no opportunities when nothing available", async () => {
    mockRows([], [], []);
    const result = await evaluateOpportunities(makeInput());
    expect(result.available).toBe(false);
    expect(result.opportunities).toHaveLength(0);
  });

  it("reports already-applied adjustments from pricing", async () => {
    const input = makeInput({
      pricingResult: {
        ...basePricing,
        adjustments: [
          { type: "promotion", reason: "Semana Turismo -10%", amount: -1200, valid_until: null },
        ],
      },
    });
    mockRows([], [], []);
    const result = await evaluateOpportunities(input);
    expect(result.available).toBe(true);
    expect(result.opportunities).toHaveLength(1);
    expect(result.opportunities[0].already_applied).toBe(true);
    expect(result.opportunities[0].label).toContain("Semana Turismo");
    expect(result.opportunities[0].savings).toBe(1200);
  });

  it("finds unapplied provider adjustment", async () => {
    mockRows([{
      id: 1, provider_id: "driver_1", tariff_id: 1,
      adjustment_type: "percent", adjustment_value: 10,
      valid_from: null, valid_until: null, active: 1, created_at: null,
    }], [], []);
    const result = await evaluateOpportunities(makeInput());
    expect(result.available).toBe(true);
    const adj = result.opportunities.find(o => o.type === "provider_adjustment");
    expect(adj).toBeDefined();
    expect(adj!.already_applied).toBe(false);
    expect(adj!.savings).toBeGreaterThan(0);
  });

  it("does not duplicate already-applied provider adjustment", async () => {
    const input = makeInput({
      pricingResult: {
        ...basePricing,
        adjustments: [
          { type: "provider_adjustment", reason: "Ajuste del proveedor", amount: -1800, valid_until: null },
        ],
      },
    });
    mockRows([{
      id: 1, provider_id: "driver_1", tariff_id: 1,
      adjustment_type: "percent", adjustment_value: 15,
      valid_from: null, valid_until: null, active: 1, created_at: null,
    }], [], []);
    const result = await evaluateOpportunities(input);
    const pa = result.opportunities.filter(o => o.type === "provider_adjustment");
    expect(pa).toHaveLength(1);
    expect(pa[0].already_applied).toBe(true);
  });

  it("finds unapplied promotion", async () => {
    mockRows([], [{
      id: 1, source: "promotion", name: "Verano Sale", description: "-10%",
      adjustment_pct: 10, origin_place_id: null, destination_place_id: null,
      origin_zone_id: null, destination_zone_id: null,
      min_passengers: null, max_passengers: null,
      valid_from: null, valid_until: null, active: 1,
      max_uses: null, current_uses: null, created_at: null,
    }], []);
    const result = await evaluateOpportunities(makeInput());
    const promo = result.opportunities.find(o => o.type === "promotion");
    expect(promo).toBeDefined();
    expect(promo!.already_applied).toBe(false);
    expect(promo!.savings).toBe(1200);
  });

  it("finds unapplied package (cheaper than standard)", async () => {
    mockRows([], [], [{
      id: 1, name: "Ida+Vuelta Aeropuerto", description: null,
      package_type: "round_trip", price: 11000, included_services: null,
      origin_place_id: null, destination_place_id: null,
      valid_from: null, valid_until: null, active: 1, created_at: null,
    }]);
    const result = await evaluateOpportunities(makeInput());
    const pkg = result.opportunities.find(o => o.type === "package");
    expect(pkg).toBeDefined();
    expect(pkg!.already_applied).toBe(false);
    expect(pkg!.savings).toBe(1000);
  });

  it("ignores package when more expensive than standard", async () => {
    mockRows([], [], [{
      id: 1, name: "Premium", description: null,
      package_type: "multi_stop", price: 15000, included_services: null,
      origin_place_id: null, destination_place_id: null,
      valid_from: null, valid_until: null, active: 1, created_at: null,
    }]);
    const result = await evaluateOpportunities(makeInput());
    expect(result.opportunities.filter(o => o.type === "package")).toHaveLength(0);
  });

  it("returns multiple opportunity types", async () => {
    const input = makeInput({
      pricingResult: {
        ...basePricing,
        adjustments: [
          { type: "promotion", reason: "Semana Turismo -10%", amount: -1200, valid_until: null },
        ],
      },
    });
    mockRows([{
      id: 1, provider_id: "driver_1", tariff_id: 1,
      adjustment_type: "percent", adjustment_value: 10,
      valid_from: null, valid_until: null, active: 1, created_at: null,
    }], [], []);
    const result = await evaluateOpportunities(input);
    expect(result.opportunities.length).toBeGreaterThanOrEqual(2);
  });
});

describe("formatOpportunityResponse", () => {
  it("returns no-benefits message when not available", () => {
    const msg = formatOpportunityResponse({ available: false, opportunities: [] }, "es");
    expect(msg).toContain("no hay beneficios");
  });

  it("returns no-benefits message in Portuguese", () => {
    const msg = formatOpportunityResponse({ available: false, opportunities: [] }, "pt");
    expect(msg).toContain("não há benefícios");
  });

  it("shows already-applied opportunities", () => {
    const msg = formatOpportunityResponse({
      available: true,
      opportunities: [
        { type: "promotion", label: "Promo Verano -10%", description: null, savings: 1200, already_applied: true, valid_until: null },
      ],
    }, "es");
    expect(msg).toContain("ya aplicados");
    expect(msg).toContain("Promo Verano");
  });

  it("shows available (unapplied) opportunities", () => {
    const msg = formatOpportunityResponse({
      available: true,
      opportunities: [
        { type: "provider_adjustment", label: "Ajuste del proveedor: 10%", description: null, savings: 1200, already_applied: false, valid_until: null },
      ],
    }, "es");
    expect(msg).toContain("Oportunidades disponibles");
    expect(msg).toContain("ahorro de $");
  });

  it("shows both applied and available in Portuguese", () => {
    const msg = formatOpportunityResponse({
      available: true,
      opportunities: [
        { type: "promotion", label: "Promo Verão", description: null, savings: 1200, already_applied: true, valid_until: null },
        { type: "package", label: "Ida+Volta", description: null, savings: 2000, already_applied: false, valid_until: null },
      ],
    }, "pt");
    expect(msg).toContain("já aplicados");
    expect(msg).toContain("economia de");
    expect(msg).toContain("Promo Verão");
    expect(msg).toContain("Ida+Volta");
  });

  it("includes valid_until date when present", () => {
    const msg = formatOpportunityResponse({
      available: true,
      opportunities: [
        { type: "promotion", label: "Flash Sale", description: null, savings: 500, already_applied: false, valid_until: 1800000000 },
      ],
    }, "es");
    expect(msg).toContain("válido hasta");
  });
});
