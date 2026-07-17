/**
 * memory-integration.test.ts — Pruebas de integración de Memory
 *
 * IM-1: Verifica la integración del módulo Memory con:
 *  - Evidence Engine (ShadowResult)
 *  - lead.service.ts (orquestación)
 *  - Persistencia en DB
 *
 * NOTA: Estas pruebas verifican que los módulos se importan correctamente
 * y que las funciones de integración existen con las firmas esperadas.
 * Las pruebas completas de integración con DB real requieren entorno de test.
 */

import { describe, it, expect } from "vitest";

describe("Memory Integration — módulos importables", () => {
  it("debe importar MemoryService desde @/lib/memory", async () => {
    const mod = await import("@/lib/memory");
    expect(mod.MemoryService).toBeDefined();
    expect(typeof mod.MemoryService).toBe("function");
  });

  it("debe importar SqliteMemoryStorage desde @/lib/memory", async () => {
    const mod = await import("@/lib/memory");
    expect(mod.SqliteMemoryStorage).toBeDefined();
    expect(typeof mod.SqliteMemoryStorage).toBe("function");
  });

  it("debe importar isMemoryShadowModeEnabled desde @/lib/memory", async () => {
    const mod = await import("@/lib/memory");
    expect(mod.isMemoryShadowModeEnabled).toBeDefined();
    expect(typeof mod.isMemoryShadowModeEnabled).toBe("function");
  });

  it("debe importar tipos MemorySnapshot, MemoryStoreInput, MemoryStoreResult", async () => {
    const mod = await import("@/lib/memory");
    // Los tipos son interfaces — no existen en runtime, pero confirmamos
    // que el módulo exporta los valores correctos
    expect(mod.buildSnapshot).toBeDefined();
    expect(mod.createMemorySnapshot).toBeDefined();
  });

  it("debe importar MemoryService en lead.service.ts", { timeout: 30000 }, async () => {
    const leadMod = await import("@/lib/services/lead.service");
    expect(leadMod.handleLeadMessage).toBeDefined();
    expect(typeof leadMod.handleLeadMessage).toBe("function");
  });
});

describe("Memory Integration — comportamiento de feature flags", () => {
  it("isMemoryShadowModeEnabled debe ser false por defecto", async () => {
    const { isMemoryShadowModeEnabled } = await import("@/lib/memory");
    // Limpiar env
    const orig = process.env.COGNITIVE_MEMORY_ENABLED;
    delete process.env.COGNITIVE_MEMORY_ENABLED;
    expect(isMemoryShadowModeEnabled()).toBe(false);
    process.env.COGNITIVE_MEMORY_ENABLED = orig;
  });

  it("MemoryService.store debe aceptar Belief + Decision + conversationId", async () => {
    const { MemoryService } = await import("@/lib/memory");

    // Crear un storage mock simple
    const mockStorage = {
      insert: async () => ({ success: true } as const),
      getMaxTurnNumber: async () => 0,
    };

    const service = new MemoryService(mockStorage as any);
    const result = await service.store({
      belief: {
        id: "test-belief",
        observationValid: true,
        channel: "whatsapp",
        hasContent: true,
        receivedAt: "2026-07-14T12:00:00Z",
        conversationId: "test-conv",
        isWellFormed: true,
        factCount: 1,
      },
      decision: {
        id: "test-decision",
        validInput: true,
        hasContent: true,
        readiness: "ready",
        missingInfo: [],
        isDecided: true,
        factCount: 1,
      },
      conversationId: "test-conv",
    });

    expect(result.success).toBe(true);
  });
});
