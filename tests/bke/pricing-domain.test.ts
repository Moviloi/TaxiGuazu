// Tests — BKE Pricing Domain
// PR-5E: Cobertura unitaria para estimatePrice, getTariffInfo, calculateTripPrice.
//
// Cubre:
// - casos normales (pricing exitoso con tarifa)
// - casos límite (sin tarifa, precio cero)
// - errores (excepciones de dependencias)
// - compatibilidad de contratos

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock feature-flags: isBkeEnabled = true por defecto
vi.mock("@/config/feature-flags", () => ({
  isBkeEnabled: vi.fn(() => true),
}));

// Mock pricing-engine
vi.mock("@/lib/services/pricing/pricing-engine", () => ({
  calculatePrice: vi.fn(),
}));

// Mock tariff-resolver
vi.mock("@/lib/services/pricing/tariff-resolver", () => ({
  resolveTariff: vi.fn(),
}));

vi.mock("@/lib/utils/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { estimatePrice, getTariffInfo, calculateTripPrice } from "@/lib/bke/domains/pricing";

describe("BKE Pricing Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── estimatePrice ─────────────────────────────────────────────────────

  describe("estimatePrice", () => {
    it("debe estimar precio exitosamente con pricing engine + tariff", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");
      const { resolveTariff } = await import("@/lib/services/pricing/tariff-resolver");

      vi.mocked(calculatePrice).mockResolvedValueOnce({
        base_price: 15000,
        markup: 3000,
        adjustments: [],
        final_price: 18000,
        tariff_id: 123,
        origin: { place_id: "p1", canonical_name: "Origen", zone_id: "z1" },
        destination: { place_id: "p2", canonical_name: "Destino", zone_id: "z2" },
        level: "place_place",
        source: "standard",
        explanation: ["Ok"],
      });

      vi.mocked(resolveTariff).mockResolvedValueOnce({
        matched: true,
        publicPrice4p: 20000,
        publicPrice6p: 25000,
        driverPrice4p: 15000,
        driverPrice6p: 20000,
        price: 18000,
        piso: 15000,
        garantizado: 18000,
        tariffId: 123,
        level: "place_place",
        resolutionPriority: 1,
        originPlaceId: "p1",
        destinationPlaceId: "p2",
        originZoneId: "z1",
        destinationZoneId: "z2",
      });

      const result = await estimatePrice({ origin: "origen", destination: "destino", passengers: 2 });

      expect(result).not.toBeNull();
      expect(result!.data).not.toBeNull();
      expect(result!.data!.amount).toBeGreaterThan(0);
      expect(result!.data!.currency).toBe("ARS");
      expect(result!.data!.breakdown).toBeDefined();
      expect(result!.data!.breakdown.base).toBe(15000);
      expect(result!.source).toBeTruthy();
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("debe usar publicPrice4p cuando está disponible", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");
      const { resolveTariff } = await import("@/lib/services/pricing/tariff-resolver");

      vi.mocked(calculatePrice).mockResolvedValueOnce({
        base_price: 15000, markup: 3000, adjustments: [], final_price: 18000,
        tariff_id: 123,
        origin: { place_id: "p1", canonical_name: "O", zone_id: "z1" },
        destination: { place_id: "p2", canonical_name: "D", zone_id: "z2" },
        level: "place_place", source: "standard", explanation: [],
      });

      vi.mocked(resolveTariff).mockResolvedValueOnce({
        matched: true, publicPrice4p: 22000, publicPrice6p: 28000,
        driverPrice4p: 15000, driverPrice6p: 20000,
        price: 18000, piso: 15000, garantizado: 18000,
        tariffId: 123, level: "place_place", resolutionPriority: 1,
        originPlaceId: "p1", destinationPlaceId: "p2",
        originZoneId: "z1", destinationZoneId: "z2",
      });

      const result = await estimatePrice({ origin: "o", destination: "d", passengers: 4 });

      expect(result!.data!.amount).toBe(22000); // publicPrice4p tomó precedencia
    });

    it("debe retornar data null si pricing devuelve precio cero", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");
      const { resolveTariff } = await import("@/lib/services/pricing/tariff-resolver");

      vi.mocked(calculatePrice).mockResolvedValueOnce({
        base_price: 0, markup: 0, adjustments: [], final_price: 0,
        tariff_id: null,
        origin: { place_id: null, canonical_name: null, zone_id: null },
        destination: { place_id: null, canonical_name: null, zone_id: null },
        level: "not_found", source: "standard", explanation: [],
      });

      vi.mocked(resolveTariff).mockResolvedValueOnce({
        matched: false, publicPrice4p: null, publicPrice6p: null,
        driverPrice4p: null, driverPrice6p: null,
        price: 0, piso: 0, garantizado: 0,
        tariffId: null, level: "not_found", resolutionPriority: null,
        originPlaceId: null, destinationPlaceId: null,
        originZoneId: null, destinationZoneId: null,
      });

      const result = await estimatePrice({ origin: "o", destination: "d", passengers: 1 });

      expect(result!.data).toBeNull();
    });

    it("debe retornar null cuando BKE está deshabilitado", async () => {
      const { isBkeEnabled } = await import("@/config/feature-flags");
      vi.mocked(isBkeEnabled).mockReturnValueOnce(false);

      const result = await estimatePrice({ origin: "o", destination: "d", passengers: 1 });

      expect(result).toBeNull();
    });

    it("debe manejar errores de dependencias gracefulmente", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");
      vi.mocked(calculatePrice).mockRejectedValueOnce(new Error("DB timeout"));

      const result = await estimatePrice({ origin: "o", destination: "d", passengers: 1 });

      expect(result).not.toBeNull();
      expect(result!.data).toBeNull();
      expect(result!.source).toBe("error");
    });
  });

  // ─── getTariffInfo ─────────────────────────────────────────────────────

  describe("getTariffInfo", () => {
    it("debe retornar información de tarifa", async () => {
      const { resolveTariff } = await import("@/lib/services/pricing/tariff-resolver");

      vi.mocked(resolveTariff).mockResolvedValueOnce({
        matched: true, publicPrice4p: 20000, publicPrice6p: 25000,
        driverPrice4p: 15000, driverPrice6p: 20000,
        price: 18000, piso: 15000, garantizado: 18000,
        tariffId: 123, level: "place_place", resolutionPriority: 1,
        originPlaceId: "p1", destinationPlaceId: "p2",
        originZoneId: "z1", destinationZoneId: "z2",
      });

      const result = await getTariffInfo("origen", "destino", 2);

      expect(result).not.toBeNull();
      expect(result!.data).not.toBeNull();
      expect(result!.data!.tariffId).toBe(123);
      expect(result!.data!.basePrice).toBe(15000);
      expect(result!.data!.finalPrice).toBe(18000);
      expect(result!.data!.currency).toBe("ARS");
      expect(result!.data!.resolutionLevel).toBe(1);
    });

    it("debe retornar data null si no hay tarifa", async () => {
      const { resolveTariff } = await import("@/lib/services/pricing/tariff-resolver");

      vi.mocked(resolveTariff).mockResolvedValueOnce({
        matched: false, publicPrice4p: null, publicPrice6p: null,
        driverPrice4p: null, driverPrice6p: null,
        price: 0, piso: 0, garantizado: 0,
        tariffId: null, level: "not_found", resolutionPriority: null,
        originPlaceId: null, destinationPlaceId: null,
        originZoneId: null, destinationZoneId: null,
      });

      const result = await getTariffInfo("origen", "destino");

      expect(result!.data).toBeNull();
    });
  });

  // ─── calculateTripPrice ────────────────────────────────────────────────

  describe("calculateTripPrice", () => {
    it("debe calcular precio directo", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");

      vi.mocked(calculatePrice).mockResolvedValueOnce({
        base_price: 15000, markup: 3000, adjustments: [], final_price: 18000,
        tariff_id: 123,
        origin: { place_id: "p1", canonical_name: "O", zone_id: "z1" },
        destination: { place_id: "p2", canonical_name: "D", zone_id: "z2" },
        level: "place_place", source: "standard", explanation: [],
      });

      const result = await calculateTripPrice("a", "b", 2);

      expect(result).not.toBeNull();
      expect(result!.data).toBe(18000);
    });

    it("debe retornar null si final_price es 0", async () => {
      const { calculatePrice } = await import("@/lib/services/pricing/pricing-engine");

      vi.mocked(calculatePrice).mockResolvedValueOnce({
        base_price: 0, markup: 0, adjustments: [], final_price: 0,
        tariff_id: null,
        origin: { place_id: null, canonical_name: null, zone_id: null },
        destination: { place_id: null, canonical_name: null, zone_id: null },
        level: "not_found", source: "standard", explanation: [],
      });

      const result = await calculateTripPrice("a", "b", 2);

      expect(result!.data).toBeNull();
    });
  });
});
