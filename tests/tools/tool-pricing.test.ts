// Tests de contrato para PricingTool

import { describe, it, expect, vi, beforeEach } from "vitest";
import { PricingToolInputSchema, PricingToolOutputSchema, pricingTool } from "@/lib/services/pricing/tool-pricing";
import { resolvePricingForSlots } from "@/lib/services/pricing/resolve-pricing-for-slots";

// Mockeamos SOLO la capa DB (tarifas + lugares) — ambos tracks v2/v3 la usan.
const mockFindTariffByPriority = vi.fn();
const mockGetPlaceZone = vi.fn();
const mockQueryOne = vi.fn();
const mockResolveLocation = vi.fn();

vi.mock("@/lib/db/database", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    getPlaceZone: (...args: any[]) => mockGetPlaceZone(...args),
    // queryOne se usa para consultas de promociones/ajustes (commercial-pricing-engine)
    // Como no estamos probando reglas comerciales, retornamos null siempre
    queryOne: (...args: any[]) => mockQueryOne(...args),
  };
});

// findTariffByPriority was moved to pricing domain (Hardening P1)
vi.mock("@/lib/services/pricing/tariff-repository", () => ({
  findTariffByPriority: (...args: any[]) => mockFindTariffByPriority(...args),
}));

vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: (...args: any[]) => mockResolveLocation(...args),
}));

describe("PricingTool — contract validation", () => {
  it("rejects missing origin", () => {
    expect(() => PricingToolInputSchema.parse({ destination: "centro", passengers: 2 })).toThrow();
  });

  it("rejects passengers=0", () => {
    expect(() => PricingToolInputSchema.parse({ origin: "aeropuerto", destination: "centro", passengers: 0 })).toThrow();
  });

  it("rejects passengers>6", () => {
    expect(() => PricingToolInputSchema.parse({ origin: "aeropuerto", destination: "centro", passengers: 7 })).toThrow();
  });

  it("accepts valid input", () => {
    const input = PricingToolInputSchema.parse({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });
    expect(input.passengers).toBe(2);
  });

  it("output schema validates pricing result", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 60000,
      basePrice: 50000,
      currency: "ARS",
      tariffId: 42,
      level: "place_place",
      origin: { canonicalName: "Aeropuerto IGR", place_id: "place_1", canonical_name: "Aeropuerto IGR", zone_id: "Z1" },
      destination: { canonicalName: "Centro", place_id: "place_2", canonical_name: "Centro", zone_id: "Z2" },
      final_price: 60000,
      base_price: 50000,
      tariff_id: 42,
      source: "standard",
      explanation: [],
    });
    expect(output.finalPrice).toBe(60000);
    expect(output.currency).toBe("ARS");
  });

  it("output schema validates result with adjustments", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 54000,
      basePrice: 60000,
      currency: "ARS",
      tariffId: 42,
      level: "place_place",
      origin: { canonicalName: "Aeropuerto IGR", place_id: "place_1", canonical_name: "Aeropuerto IGR", zone_id: "Z1" },
      destination: { canonicalName: "Centro", place_id: "place_2", canonical_name: "Centro", zone_id: "Z2" },
      adjustments: [{ type: "promotion", amount: -6000, description: "10% descuento" }],
      final_price: 54000,
      base_price: 60000,
      tariff_id: 42,
      source: "standard",
      explanation: [],
    });
    expect(output.adjustments).toHaveLength(1);
  });

  it("output schema validates not_found pricing", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 0,
      basePrice: 0,
      currency: "ARS",
      tariffId: null,
      level: "not_found",
      origin: { canonicalName: "", place_id: "", canonical_name: "", zone_id: "" },
      destination: { canonicalName: "", place_id: "", canonical_name: "", zone_id: "" },
      final_price: 0,
      base_price: 0,
      tariff_id: null,
      source: "standard",
      explanation: [],
    });
    expect(output.finalPrice).toBe(0);
    expect(output.tariffId).toBeNull();
  });
});

// Tests de equivalencia: tool-pricing usa resolvePricingForSlots internamente.
// Mockeamos SOLO DB (tarifas + geo). Ambos tracks v2/v3 reciben los mismos datos.
// Verificamos que tool-pricing.calculatePrice y resolvePricingForSlots devuelven
// el mismo resultado subyacente.

function setupMockTariff(price4p: number = 60000): void {
  mockFindTariffByPriority.mockResolvedValue({
    id: 42,
    origin: "Aeropuerto IGR",
    destination: "Centro",
    modality: "transfer",
    crosses_border: 0,
    wait_included: 0,
    public_price_4p: price4p,
    public_price_6p: Math.round(price4p * 1.5),
    driver_price_4p: Math.round(price4p * 0.7),
    driver_price_6p: Math.round(price4p * 0.65),
    origin_place_id: "place_1",
    destination_place_id: "place_2",
    origin_zone_id: "Z1",
    destination_zone_id: "Z2",
    resolution_priority: 1,
    active: 1,
  });
  mockGetPlaceZone.mockResolvedValue({ zone_id: "Z1" });
  mockQueryOne.mockResolvedValue(null); // sin promociones/ajustes activos
  mockResolveLocation.mockResolvedValue({ place_id: "place_1", canonical_name: "Aeropuerto IGR", zone_id: "Z1", confidence: "alias" });
}

describe("PricingTool — equivalence with resolve-pricing-for-slots (real implementations)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("both return same finalPrice for matched tariff", async () => {
    setupMockTariff(60000);

    const toolResult = await pricingTool.calculatePrice({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });
    const directResult = await resolvePricingForSlots({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });

    expect(toolResult.finalPrice).toBe(directResult.pricingResult.final_price);
    expect(toolResult.tariffId).toBe(directResult.pricingResult.tariff_id);
    expect(toolResult.level).toBe(directResult.pricingResult.level);
  });

  it("both return same result for higher passenger count (6p pricing)", async () => {
    setupMockTariff(60000);

    const toolResult = await pricingTool.calculatePrice({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 6 });
    const directResult = await resolvePricingForSlots({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 6 });

    // tool-pricing y resolvePricingForSlots convergen en finalPrice
    expect(toolResult.finalPrice).toBe(directResult.pricingResult.final_price);
    // Ambos tracks ven que 6p > 4, precio debería ser mayor que con 2p
    expect(directResult.pricingResult.final_price).toBeGreaterThan(60000);
  });

  it("both return tariffId=null when no tariff matches", async () => {
    mockFindTariffByPriority.mockResolvedValue({
      matched: false, level: "not_found", price: 0, piso: 0, garantizado: 0,
      tariffId: null, publicPrice4p: null, publicPrice6p: null,
      driverPrice4p: null, driverPrice6p: null, resolutionPriority: 0,
      originPlaceId: null, destPlaceId: null, originZoneId: null, destZoneId: null,
    });
    mockResolveLocation.mockResolvedValue({ place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" });
    mockGetPlaceZone.mockResolvedValue(null);
    mockQueryOne.mockResolvedValue(null);

    const toolResult = await pricingTool.calculatePrice({ origin: "xyz", destination: "abc", passengers: 2 });
    const directResult = await resolvePricingForSlots({ origin: "xyz", destination: "abc", passengers: 2 });

    expect(toolResult.tariffId).toBe(directResult.pricingResult.tariff_id);
    expect(toolResult.tariffId).toBeNull();
    expect(directResult.divergence).toBeNull();
  });
});

// Tests de runtime guarantee: los campos que PricingToolOutput declara no-opcionales
// (origin, destination, source, explanation) están SIEMPRE poblados en runtime.
// Llamamos pricing real (solo DB mockeada) en 3 escenarios distintos.
function mockTariffNotFound(): void {
  mockFindTariffByPriority.mockResolvedValue({
    matched: false, level: "not_found", price: 0, piso: 0, garantizado: 0,
    tariffId: null, publicPrice4p: null, publicPrice6p: null,
    driverPrice4p: null, driverPrice6p: null, resolutionPriority: 0,
    originPlaceId: null, destPlaceId: null, originZoneId: null, destZoneId: null,
  });
  mockResolveLocation.mockResolvedValue({ place_id: null, canonical_name: null, zone_id: null, confidence: "not_found" });
  mockGetPlaceZone.mockResolvedValue(null);
  mockQueryOne.mockResolvedValue(null);
}

describe("PricingTool — runtime guarantee (4 fields siempre poblados)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("[escenario 1] match exacto — origin, destination, source, explanation vienen poblados", async () => {
    setupMockTariff(60000);
    const result = await pricingTool.calculatePrice({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });

    // origin — 4 subcampos siempre presentes
    expect(result.origin).toBeDefined();
    expect(result.origin.canonicalName).toBe("Aeropuerto IGR");
    expect(result.origin.place_id).toBe("place_1");
    expect(result.origin.canonical_name).toBe("Aeropuerto IGR");
    expect(result.origin.zone_id).toBe("Z1");
    // Lo mismo para destination (mock resuelve "Aeropuerto IGR" para ambos)
    expect(result.destination).toBeDefined();
    expect(result.destination.canonicalName).toBe("Aeropuerto IGR");
    expect(result.destination.place_id).toBe("place_1");
    expect(result.destination.canonical_name).toBe("Aeropuerto IGR");
    expect(result.destination.zone_id).toBe("Z1");
    // source con valor concreto
    expect(result.source).toBe("standard");
    // explanation: array con al menos el origen y destino
    expect(Array.isArray(result.explanation)).toBe(true);
    expect(result.explanation.length).toBeGreaterThanOrEqual(2);
  });

  it("[escenario 2] sin match — origin/destination tienen defaults (no undefined), source y explanation poblados", async () => {
    mockTariffNotFound();
    const result = await pricingTool.calculatePrice({ origin: "xyz", destination: "abc", passengers: 2 });

    expect(result.origin).toBeDefined();
    expect(result.origin.canonicalName).toBe("");
    expect(result.origin.place_id).toBe("");
    expect(result.origin.canonical_name).toBe("");
    expect(result.origin.zone_id).toBe("");
    expect(result.destination).toBeDefined();
    expect(result.destination.canonicalName).toBe("");
    expect(result.destination.place_id).toBe("");
    expect(result.destination.canonical_name).toBe("");
    expect(result.destination.zone_id).toBe("");
    // source siempre tiene un valor (default "standard")
    expect(result.source).toBe("standard");
    // explanation siempre es array (puede estar vacío o tener entries)
    expect(Array.isArray(result.explanation)).toBe(true);
  });

  it("[escenario 3] con ajuste comercial — promotion detectada, source cambia a 'promotion', adjustments poblado", async () => {
    setupMockTariff(60000);
    // Simular promoción activa en el primer queryOne, el resto null
    mockQueryOne
      .mockResolvedValueOnce({
        id: 99,
        source: "tg_campaign",
        name: "Test Desc 10%",
        description: "10% de descuento en test",
        adjustment_pct: 10,
        origin_place_id: "place_1",
        destination_place_id: "place_2",
        origin_zone_id: "Z1",
        destination_zone_id: "Z2",
        min_passengers: 1,
        max_passengers: 6,
        valid_from: 1000000,
        valid_until: 9999999999,
        active: 1,
        max_uses: 100,
        current_uses: 0,
        created_at: 1000000,
      })
      .mockResolvedValue(null); // resto de queries (provider_adjustment, package) retornan null

    const result = await pricingTool.calculatePrice({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });

    // origin/destination siempre poblados
    expect(result.origin).toBeDefined();
    expect(result.origin.canonicalName).toBe("Aeropuerto IGR");
    expect(result.destination).toBeDefined();
    expect(result.destination.canonicalName).toBe("Aeropuerto IGR");
    // source cambió por la promoción
    expect(result.source).toBe("promotion");
    // explanation siempre presente
    expect(Array.isArray(result.explanation)).toBe(true);
    expect(result.explanation.length).toBeGreaterThanOrEqual(1);
    // adjustments tiene al menos la promoción
    expect(result.adjustments).toBeDefined();
    expect(result.adjustments!.length).toBeGreaterThanOrEqual(1);
    expect(result.adjustments![0].type).toBe("promotion");
    expect(result.adjustments![0].description).toContain("10");
  });
});
