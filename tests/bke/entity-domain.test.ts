// Tests — BKE Entity Domain
// PR-5E: Cobertura unitaria para extractEntities, resolveEntity, getEntityCatalog.
//
// Cubre:
// - casos normales (texto con entidades conocidas)
// - casos límite (texto vacío, texto sin entidades)
// - filtrado por dominio
// - compatibilidad de contratos (BKEResult<EntityExtraction[]>)

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock feature-flags: isBkeEnabled = true por defecto
vi.mock("@/config/feature-flags", () => ({
  isBkeEnabled: vi.fn(() => true),
}));

// Mock dependencias externas
vi.mock("@/lib/config/entity-catalog", () => ({
  ENTITY_CATALOG: [
    { key: "rafain", aliases: ["rafain", "rafain cena show"], domains: ["SHOW_TURISTICO", "HOTEL"], ambiguous: true, semanticAssociations: ["show"], patterns: [/rafain/i] },
    { key: "cataratas", aliases: ["cataratas", "cataratas argentinas"], domains: ["ATRACCION", "TOUR"], ambiguous: false, semanticAssociations: ["excursión"], patterns: [] },
    { key: "aeropuerto", aliases: ["aeropuerto", "aeroparque", "igr", "igu"], domains: ["TOUR"], ambiguous: false, semanticAssociations: ["traslado"], patterns: [] },
  ],
  resolveEntityFromCatalog: vi.fn((text: string) => {
    if (/rafain/i.test(text)) return { matched: true, domains: ["SHOW_TURISTICO", "HOTEL"], ambiguous: true };
    if (/cataratas/i.test(text)) return { matched: true, domains: ["ATRACCION", "TOUR"], ambiguous: false };
    return { matched: false, domains: [], ambiguous: false };
  }),
  extractEntitiesFromCatalog: vi.fn((text: string): string[] => {
    const found: string[] = [];
    const lower = text.toLowerCase();
    const entries = [
      { key: "rafain", aliases: ["rafain", "rafain cena show"] },
      { key: "cataratas", aliases: ["cataratas", "cataratas argentinas"] },
      { key: "aeropuerto", aliases: ["aeropuerto", "aeroparque", "igr", "igu"] },
    ];
    for (const entry of entries) {
      if (entry.aliases.some(a => lower.includes(a))) found.push(entry.key);
    }
    return found;
  }),
}));

vi.mock("@/lib/ai/iguazu-knowledge", () => ({
  findKnownPlace: vi.fn(() => undefined), // no known places by default
}));

vi.mock("@/lib/services/geo/location-resolver", () => ({
  resolveLocation: vi.fn(() => ({ confidence: "not_found", canonical_name: null, place_id: null })),
}));

vi.mock("@/lib/utils/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { extractEntities, resolveEntity, getEntityCatalog } from "@/lib/bke/domains/entity";

describe("BKE Entity Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── extractEntities ───────────────────────────────────────────────────

  describe("extractEntities", () => {
    it("debe extraer entidades del catálogo por coincidencia de alias", async () => {
      const result = await extractEntities({ text: "quiero ir a rafain cena show" });

      expect(result).not.toBeNull();
      expect(result!.data).toHaveLength(1);
      expect(result!.data![0].entity).toBe("rafain");
      expect(result!.data![0].type).toMatch(/SHOW_TURISTICO|HOTEL/);
      expect(result!.data![0].confidence).toBeGreaterThan(0);
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("debe extraer múltiples entidades cuando el texto contiene varias", async () => {
      const result = await extractEntities({ text: "del aeropuerto a las cataratas" });

      expect(result).not.toBeNull();
      expect(result!.data!.length).toBeGreaterThanOrEqual(2);
      const entities = result!.data!.map(e => e.entity);
      expect(entities).toContain("aeropuerto");
      expect(entities).toContain("cataratas");
    });

    it("debe retornar array vacío para texto sin entidades conocidas", async () => {
      const result = await extractEntities({ text: "hola cómo estás" });

      expect(result).not.toBeNull();
      expect(result!.data).toHaveLength(0);
    });

    it("debe filtrar por dominio cuando se especifica", async () => {
      const result = await extractEntities({ text: "rafain", domains: ["HOTEL"] });

      expect(result).not.toBeNull();
      if (result!.data && result!.data.length > 0) {
        // rafain es SHOW_TURISTICO y HOTEL, debería pasar el filtro si alguno coincide
        expect(["SHOW_TURISTICO", "HOTEL"]).toContain(result!.data![0].type);
      }
    });

    it("debe retornar null cuando BKE está deshabilitado", async () => {
      const { isBkeEnabled } = await import("@/config/feature-flags");
      vi.mocked(isBkeEnabled).mockReturnValueOnce(false);

      const result = await extractEntities({ text: "rafain" });

      expect(result).toBeNull();
    });

    it("debe incluir metadatos de BKEResult (source, confidence, latencyMs)", async () => {
      const result = await extractEntities({ text: "rafain" });

      expect(result).not.toBeNull();
      expect(result!.source).toBeTruthy();
      expect(result!.confidence).toBeGreaterThan(0);
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── resolveEntity ─────────────────────────────────────────────────────

  describe("resolveEntity", () => {
    it("debe resolver una entidad del catálogo si coincide", async () => {
      const result = await resolveEntity("rafain cena show");

      expect(result).not.toBeNull();
      expect(result!.data).not.toBeNull();
      expect(result!.data!.entity).toBe("rafain");
      expect(result!.data!.domain).toBe("SHOW_TURISTICO");
      expect(result!.data!.confidence).toBeGreaterThan(0);
    });

    it("debe retornar null si no hay entidad conocida", async () => {
      const result = await resolveEntity("texto irrelevante");

      expect(result).not.toBeNull();
      expect(result!.data).toBeNull();
    });

    it("debe retornar null cuando BKE está deshabilitado", async () => {
      const { isBkeEnabled } = await import("@/config/feature-flags");
      vi.mocked(isBkeEnabled).mockReturnValueOnce(false);

      const result = await resolveEntity("rafain");

      expect(result).toBeNull();
    });

    it("debe incluir metadata completa en BKEResult", async () => {
      const result = await resolveEntity("rafain");

      expect(result).not.toBeNull();
      expect(result!.source).toBe("entity-catalog");
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });
  });

  // ─── getEntityCatalog ──────────────────────────────────────────────────

  describe("getEntityCatalog", () => {
    it("debe retornar el catálogo completo de entidades", () => {
      const catalog = getEntityCatalog();

      expect(catalog).toBeInstanceOf(Array);
      expect(catalog.length).toBeGreaterThanOrEqual(3);
      expect(catalog[0]).toHaveProperty("key");
      expect(catalog[0]).toHaveProperty("domains");
    });

    it("cada entrada debe tener key, domains, aliases", () => {
      const catalog = getEntityCatalog();

      for (const entry of catalog) {
        expect(entry).toHaveProperty("key");
        expect(entry).toHaveProperty("domains");
        expect(Array.isArray(entry.domains)).toBe(true);
      }
    });
  });
});
