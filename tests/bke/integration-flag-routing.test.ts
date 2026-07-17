// Tests — BKE Integration: Feature Flag Routing
// PR-5E: Verifica que el routing por feature flags funciona correctamente.
//
// Cubre:
// - routing correcto cuando BKE está habilitado
// - fallback al comportamiento anterior cuando BKE está deshabilitado
// - compatibilidad de contratos entre BKE y los consumidores

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Entity Domain Routing ──────────────────────────────────────────────

describe("BKE Entity — Routing Integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("extractEntities debe retornar null cuando isBkeEnabled es false", async () => {
    vi.doMock("@/config/feature-flags", () => ({
      isBkeEnabled: vi.fn(() => false),
    }));

    const { extractEntities } = await import("@/lib/bke/domains/entity");
    const result = await extractEntities({ text: "rafain" });

    expect(result).toBeNull();
  });

  it("extractEntities debe procesar cuando isBkeEnabled es true", async () => {
    vi.doMock("@/config/feature-flags", () => ({
      isBkeEnabled: vi.fn(() => true),
    }));

    vi.doMock("@/lib/config/entity-catalog", () => ({
      ENTITY_CATALOG: [
        { key: "rafain", aliases: ["rafain"], domains: ["SHOW_TURISTICO"], ambiguous: false, semanticAssociations: [], patterns: [/rafain/i] },
      ],
      resolveEntityFromCatalog: vi.fn(() => ({ matched: true, domains: ["SHOW_TURISTICO"], ambiguous: false })),
      extractEntitiesFromCatalog: vi.fn(() => ["rafain"]),
    }));

    vi.doMock("@/lib/ai/iguazu-knowledge", () => ({ findKnownPlace: vi.fn(() => undefined) }));
    vi.doMock("@/lib/services/geo/location-resolver", () => ({ resolveLocation: vi.fn(() => ({ confidence: "not_found" })) }));
    vi.doMock("@/lib/utils/logger", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

    const { extractEntities } = await import("@/lib/bke/domains/entity");
    const result = await extractEntities({ text: "rafain" });

    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(1);
  });
});

// ─── Pricing Domain Routing ─────────────────────────────────────────────

describe("BKE Pricing — Routing Integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("estimatePrice debe retornar null cuando isBkeEnabled es false", async () => {
    vi.doMock("@/config/feature-flags", () => ({
      isBkeEnabled: vi.fn(() => false),
    }));

    vi.doMock("@/lib/utils/logger", () => ({
      log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
    }));

    const { estimatePrice } = await import("@/lib/bke/domains/pricing");
    const result = await estimatePrice({ origin: "a", destination: "b", passengers: 1 });

    expect(result).toBeNull();
  });

  it("resolvePricingForSlots debe enrutar a BKE cuando BKE_PRICING_ENABLED=true y fallback si BKE no tiene datos", async () => {
    // Primera llamada: BKE retorna null → fallback a lógica existente
    vi.doMock("@/config/feature-flags", () => ({}));

    // Mock process.env
    const originalEnv = process.env.BKE_PRICING_ENABLED;
    process.env.BKE_PRICING_ENABLED = "true";

    vi.doMock("@/lib/bke/domains/pricing", () => ({
      estimatePrice: vi.fn().mockResolvedValue({ data: null, source: "error", confidence: 0 }),
    }));

    vi.doMock("@/lib/services/pricing/pricing-engine", () => ({
      calculatePrice: vi.fn().mockResolvedValue({
        base_price: 10000, markup: 2000, adjustments: [], final_price: 12000,
        tariff_id: 1,
        origin: { place_id: "p1", canonical_name: "O", zone_id: "z1" },
        destination: { place_id: "p2", canonical_name: "D", zone_id: "z2" },
        level: "place_place", source: "standard", explanation: [],
      }),
    }));

    vi.doMock("@/lib/services/pricing/tariff-resolver", () => ({
      resolveTariff: vi.fn().mockResolvedValue({
        matched: true, publicPrice4p: 12000, publicPrice6p: 15000,
        driverPrice4p: 10000, driverPrice6p: 13000,
        price: 12000, piso: 10000, garantizado: 12000,
        tariffId: 1, level: "place_place", resolutionPriority: 1,
        originPlaceId: "p1", destinationPlaceId: "p2",
        originZoneId: "z1", destinationZoneId: "z2",
      }),
    }));

    vi.doMock("@/lib/utils/logger", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

    const { resolvePricingForSlots } = await import("@/lib/services/pricing/resolve-pricing-for-slots");
    const result = await resolvePricingForSlots({ origin: "a", destination: "b", passengers: 1 });

    // BKE retornó null → debe fallback a lógica existente
    expect(result).not.toBeNull();
    expect(result.pricingResult.final_price).toBe(12000);

    process.env.BKE_PRICING_ENABLED = originalEnv;
  });
});

// ─── Message Domain Routing ─────────────────────────────────────────────

describe("BKE Message — Routing Integration", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("resolveMessage debe retornar null cuando isBkeEnabled es false", async () => {
    vi.doMock("@/config/feature-flags", () => ({
      isBkeEnabled: vi.fn(() => false),
    }));

    vi.doMock("@/lib/ai/response-builder", () => ({
      buildGreeting: vi.fn(),
      buildGenericClarify: vi.fn(),
      buildEscalationMessage: vi.fn(),
      buildPriceInfo: vi.fn(),
      buildInformationalResponse: vi.fn(),
      buildCommercialResponse: vi.fn(),
      buildCancellationMessage: vi.fn(),
      buildGenericSafeFallback: vi.fn(),
      buildGlobalErrorMessage: vi.fn(),
      buildNowDispatchResponse: vi.fn(),
      buildLocationConfirmationResponse: vi.fn(),
      buildFleetCapacityMessage: vi.fn(),
      buildFleetTariffMessage: vi.fn(),
    }));

    vi.doMock("@/lib/ai/disambiguation-templates", () => ({
      selectDisambiguationTemplate: vi.fn(),
      buildConfirmationQuestion: vi.fn(),
    }));

    vi.doMock("@/lib/utils/logger", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

    const { resolveMessage } = await import("@/lib/bke/domains/message");
    const result = await resolveMessage({ key: "greeting", lang: "es" });

    expect(result).toBeNull();
  });

  it("resolveMessage en BKE debe funcionar independientemente del flag de handler", async () => {
    // Verificar que el módulo message existe y resolveMessageSync funciona
    vi.doMock("@/config/feature-flags", () => ({
      isBkeEnabled: vi.fn(() => true),
    }));

    vi.doMock("@/lib/ai/response-builder", () => ({
      buildGreeting: vi.fn((lang, name) => name ? `¡Hola ${name}!` : "¡Hola!"),
      buildGenericClarify: vi.fn(),
      buildEscalationMessage: vi.fn(),
      buildPriceInfo: vi.fn(),
      buildInformationalResponse: vi.fn(),
      buildCommercialResponse: vi.fn(),
      buildCancellationMessage: vi.fn(),
      buildGenericSafeFallback: vi.fn(),
      buildGlobalErrorMessage: vi.fn(),
      buildNowDispatchResponse: vi.fn(),
      buildLocationConfirmationResponse: vi.fn(),
      buildFleetCapacityMessage: vi.fn(),
      buildFleetTariffMessage: vi.fn(),
    }));

    vi.doMock("@/lib/ai/disambiguation-templates", () => ({
      selectDisambiguationTemplate: vi.fn(),
      buildConfirmationQuestion: vi.fn(),
    }));

    vi.doMock("@/lib/utils/logger", () => ({ log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() } }));

    const { resolveMessageSync } = await import("@/lib/bke/domains/message");
    const msg = resolveMessageSync("greeting", "es", { name: "Test" });

    expect(msg).not.toBeNull();
    expect(msg!.resolved).toContain("Test");
  });
});

// ─── Compatibilidad de Contratos ────────────────────────────────────────

describe("BKE — Compatibilidad de Contratos", () => {
  it("Los dominios BKE deben exportar las funciones esperadas en index", () => {
    // Verificar que el archivo index.ts exporta las funciones correctas
    // Esto es un test de estructura del código, no una importación dinámica
    const fs = require("fs");
    const path = require("path");
    const indexPath = path.resolve(__dirname, "../../src/lib/bke/index.ts");
    const content = fs.readFileSync(indexPath, "utf-8");

    // Entity domain
    expect(content).toContain("extractEntities");
    expect(content).toContain("resolveEntity");
    expect(content).toContain("getEntityCatalog");

    // Pricing domain
    expect(content).toContain("estimatePrice");
    expect(content).toContain("getTariffInfo");
    expect(content).toContain("calculateTripPrice");

    // Message domain
    expect(content).toContain("resolveMessage");
    expect(content).toContain("resolveMessageSync");
    expect(content).toContain("getAvailableMessageKeys");
    expect(content).toContain("isValidMessageKey");
  });
});
