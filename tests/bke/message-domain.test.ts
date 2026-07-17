// Tests — BKE Message Domain
// PR-5E: Cobertura unitaria para resolveMessage, resolveMessageSync.
//
// Cubre:
// - todos los 15 tipos de mensaje
// - casos normales con parámetros
// - casos límite (sin parámetros, clave inválida)
// - compatibilidad de contratos

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/feature-flags", () => ({
  isBkeEnabled: vi.fn(() => true),
}));

// Mock response-builder
vi.mock("@/lib/ai/response-builder", () => ({
  buildGreeting: vi.fn((lang, name) => name ? `¡Hola ${name}!` : "¡Hola!"),
  buildGenericClarify: vi.fn((field, lang) => field ? `¿Cuál es el ${field}?` : "¿Qué necesitás?"),
  buildEscalationMessage: vi.fn((lang) => "Te conecto con un operador."),
  buildPriceInfo: vi.fn((origin, dest, price, lang) => `Viaje de ${origin} a ${dest}: $${price}`),
  buildInformationalResponse: vi.fn((intent, lang) => `Información sobre ${intent}`),
  buildCommercialResponse: vi.fn((lang) => "¿Te interesa una oferta?"),
  buildCancellationMessage: vi.fn((lang) => "Viaje cancelado."),
  buildGenericSafeFallback: vi.fn((lang) => "No pude procesar eso."),
  buildGlobalErrorMessage: vi.fn((lang) => "Error global."),
  buildNowDispatchResponse: vi.fn((lang) => "Buscando chofer..."),
  buildLocationConfirmationResponse: vi.fn(),
  buildFleetCapacityMessage: vi.fn((max, lang) => max ? `Capacidad máxima: ${max}` : "Flota no disponible."),
  buildFleetTariffMessage: vi.fn((lang) => "Sin tarifa disponible."),
}));

vi.mock("@/lib/ai/disambiguation-templates", () => ({
  selectDisambiguationTemplate: vi.fn((ctx, tone, lang) => `¿Cuál ${ctx}?`),
  buildConfirmationQuestion: vi.fn((origin, dest, lang) => `¿Confirmás viaje de ${origin} a ${dest}?`),
}));

vi.mock("@/lib/utils/logger", () => ({
  log: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { resolveMessage, resolveMessageSync, getAvailableMessageKeys, isValidMessageKey } from "@/lib/bke/domains/message";

describe("BKE Message Domain", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── resolveMessageSync ────────────────────────────────────────────────

  describe("resolveMessageSync", () => {
    it("debe resolver saludo con nombre", () => {
      const result = resolveMessageSync("greeting", "es", { name: "Juan" });

      expect(result).not.toBeNull();
      expect(result!.resolved).toContain("Juan");
      expect(result!.key).toBe("greeting");
      expect(result!.lang).toBe("es");
    });

    it("debe resolver saludo sin nombre", () => {
      const result = resolveMessageSync("greeting", "es");

      expect(result).not.toBeNull();
      expect(result!.resolved).toBe("¡Hola!");
    });

    it("debe resolver clarificación con field", () => {
      const result = resolveMessageSync("clarify", "es", { field: "origin" });

      expect(result!.resolved).toBe("¿Cuál es el origin?");
    });

    it("debe resolver clarificación genérica sin field", () => {
      const result = resolveMessageSync("clarify", "es");

      expect(result!.resolved).toBe("¿Qué necesitás?");
    });

    it("debe resolver escalation", () => {
      const result = resolveMessageSync("escalation", "es");

      expect(result!.resolved).toBe("Te conecto con un operador.");
    });

    it("debe resolver price_info", () => {
      const result = resolveMessageSync("price_info", "es", {
        origin: "Hotel",
        destination: "Aeropuerto",
        price: "5000",
      });

      expect(result!.resolved).toContain("Hotel");
      expect(result!.resolved).toContain("Aeropuerto");
      expect(result!.resolved).toContain("5000");
    });

    it("debe resolver informational", () => {
      const result = resolveMessageSync("informational", "es", { intent: "GREETING" });

      expect(result!.resolved).toContain("GREETING");
    });

    it("debe resolver commercial", () => {
      const result = resolveMessageSync("commercial", "es");

      expect(result!.resolved).toBeTruthy();
    });

    it("debe resolver cancellation", () => {
      const result = resolveMessageSync("cancellation", "es");

      expect(result!.resolved).toBe("Viaje cancelado.");
    });

    it("debe resolver safe_fallback", () => {
      const result = resolveMessageSync("safe_fallback", "es");

      expect(result!.resolved).toBe("No pude procesar eso.");
    });

    it("debe resolver global_error", () => {
      const result = resolveMessageSync("global_error", "es");

      expect(result!.resolved).toBe("Error global.");
    });

    it("debe resolver now_dispatch", () => {
      const result = resolveMessageSync("now_dispatch", "es");

      expect(result!.resolved).toBe("Buscando chofer...");
    });

    it("debe resolver location_confirmation", () => {
      const result = resolveMessageSync("location_confirmation", "es", { location: "Hotel Rafain" });

      expect(result!.resolved).toContain("Hotel Rafain");
    });

    it("debe resolver fleet_capacity", () => {
      const result = resolveMessageSync("fleet_capacity", "es", { passengers: "6" });

      expect(result!.resolved).toContain("6");
    });

    it("debe resolver fleet_tariff", () => {
      const result = resolveMessageSync("fleet_tariff", "es");

      expect(result!.resolved).toBe("Sin tarifa disponible.");
    });

    it("debe resolver disambiguation", () => {
      const result = resolveMessageSync("disambiguation", "es", {
        slotContext: "aeropuerto",
        tone: "formal",
      });

      expect(result!.resolved).toBeTruthy();
    });

    it("debe resolver slot_confirmation", () => {
      const result = resolveMessageSync("slot_confirmation", "es", {
        origin: "Hotel",
        destination: "Aeropuerto",
      });

      expect(result!.resolved).toContain("Hotel");
      expect(result!.resolved).toContain("Aeropuerto");
    });

    it("debe retornar null para clave inválida", () => {
      const result = resolveMessageSync("invalid_key", "es");

      expect(result).toBeNull();
    });

    it("debe preservar lang y params en el resultado", () => {
      const result = resolveMessageSync("greeting", "pt", { name: "João" });

      expect(result!.lang).toBe("pt");
      expect(result!.params).toEqual({ name: "João" });
    });
  });

  // ─── resolveMessage ────────────────────────────────────────────────────

  describe("resolveMessage", () => {
    it("debe retornar BKEResult completo", async () => {
      const result = await resolveMessage({ key: "greeting", lang: "es", context: { name: "Ana" } });

      expect(result).not.toBeNull();
      expect(result!.data).not.toBeNull();
      expect(result!.data!.resolved).toContain("Ana");
      expect(result!.source).toBe("response-builder");
      expect(result!.confidence).toBe(1.0);
      expect(result!.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it("debe retornar null cuando BKE está deshabilitado", async () => {
      const { isBkeEnabled } = await import("@/config/feature-flags");
      vi.mocked(isBkeEnabled).mockReturnValueOnce(false);

      const result = await resolveMessage({ key: "greeting", lang: "es" });

      expect(result).toBeNull();
    });

    it("debe retornar data null para clave inválida", async () => {
      const result = await resolveMessage({ key: "invalid_key", lang: "es" });

      expect(result).not.toBeNull();
      expect(result!.data).toBeNull();
    });
  });

  // ─── getAvailableMessageKeys / isValidMessageKey ────────────────────────

  describe("getAvailableMessageKeys", () => {
    it("debe retornar lista de claves disponibles", () => {
      const keys = getAvailableMessageKeys();

      expect(keys).toBeInstanceOf(Array);
      expect(keys.length).toBeGreaterThan(0);
      expect(keys).toContain("greeting");
      expect(keys).toContain("clarify");
      expect(keys).toContain("price_info");
    });
  });

  describe("isValidMessageKey", () => {
    it("debe retornar true para claves válidas", () => {
      expect(isValidMessageKey("greeting")).toBe(true);
      expect(isValidMessageKey("escalation")).toBe(true);
    });

    it("debe retornar false para claves inválidas", () => {
      expect(isValidMessageKey("invalid")).toBe(false);
      expect(isValidMessageKey("")).toBe(false);
    });
  });
});
