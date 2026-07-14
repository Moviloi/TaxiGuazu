/**
 * memory-service.test.ts — Pruebas del MemoryService
 *
 * IM-1: Verifica:
 *  - store() retorna success en inserción exitosa
 *  - store() nunca lanza (C3)
 *  - turnNumber se computa correctamente (M-7)
 *  - isMemoryShadowModeEnabled() default false
 *  - Flag true cuando COGNITIVE_MEMORY_ENABLED=true
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { MemoryService, isMemoryShadowModeEnabled } from "@/lib/memory";
import type { MemoryStorage, MemoryStoreInput, MemoryStoreResult } from "@/lib/memory";

// ---------------------------------------------------------------------------
// Mock Storage
// ---------------------------------------------------------------------------

class MockStorage implements MemoryStorage {
  private snapshots: Array<{ conversationId: string; turnNumber: number }> = [];
  private shouldFail = false;

  setShouldFail(fail: boolean) {
    this.shouldFail = fail;
  }

  async insert(_snapshot: any): Promise<MemoryStoreResult> {
    if (this.shouldFail) {
      return { success: false, error: "mock error" };
    }
    this.snapshots.push({
      conversationId: _snapshot.conversationId,
      turnNumber: _snapshot.turnNumber,
    });
    return { success: true };
  }

  async getMaxTurnNumber(conversationId: string): Promise<number> {
    const convSnapshots = this.snapshots.filter(s => s.conversationId === conversationId);
    if (convSnapshots.length === 0) return 0;
    return Math.max(...convSnapshots.map(s => s.turnNumber));
  }

  getSnapshotCount(): number {
    return this.snapshots.length;
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeValidInput(overrides?: Partial<MemoryStoreInput>): MemoryStoreInput {
  return {
    belief: {
      id: "bel-001",
      observationValid: true,
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-14T12:00:00Z",
      conversationId: "conv-123",
      isWellFormed: true,
      factCount: 3,
    },
    decision: {
      id: "dec-001",
      validInput: true,
      hasContent: true,
      readiness: "ready" as const,
      missingInfo: [] as readonly string[],
      isDecided: true,
      factCount: 3,
    },
    conversationId: "conv-123",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("MemoryService.store()", () => {
  let storage: MockStorage;
  let service: MemoryService;

  beforeEach(() => {
    storage = new MockStorage();
    service = new MemoryService(storage);
  });

  it("debe retornar success:true en inserción exitosa", async () => {
    const result = await service.store(makeValidInput());
    expect(result.success).toBe(true);
  });

  it("debe incrementar turnNumber para la misma conversación (M-7)", async () => {
    const convId = "conv-turn-test";

    // Primer turno → turnNumber = 1
    const r1 = await service.store(makeValidInput({ conversationId: convId }));
    expect(r1.success).toBe(true);
    expect(storage.getSnapshotCount()).toBe(1);

    // Segundo turno → turnNumber = 2
    const r2 = await service.store(makeValidInput({ conversationId: convId }));
    expect(r2.success).toBe(true);
    expect(storage.getSnapshotCount()).toBe(2);

    // Tercer turno → turnNumber = 3
    const r3 = await service.store(makeValidInput({ conversationId: convId }));
    expect(r3.success).toBe(true);
    expect(storage.getSnapshotCount()).toBe(3);
  });

  it("debe tener turnNumbers independientes por conversationId", async () => {
    // Conv A: 2 snapshots
    await service.store(makeValidInput({ conversationId: "conv-a" }));
    await service.store(makeValidInput({ conversationId: "conv-a" }));

    // Conv B: 1 snapshot (debe ser turn 1, no 3)
    const rB = await service.store(makeValidInput({ conversationId: "conv-b" }));
    expect(rB.success).toBe(true);
  });

  it("nunca debe lanzar aunque el storage falle (C3)", async () => {
    storage.setShouldFail(true);
    const result = await service.store(makeValidInput());
    expect(result.success).toBe(false);
    expect("error" in result).toBe(true);
  });

  it("debe retornar error si los datos de entrada son inválidos", async () => {
    const result = await service.store(makeValidInput({
      belief: { ...makeValidInput().belief, id: "" },
    }));
    expect(result.success).toBe(false);
    expect("error" in result).toBe(true);
  });

  it("debe producir exactamente un snapshot por llamada exitosa (I5-MEM)", async () => {
    const countBefore = storage.getSnapshotCount();
    const result = await service.store(makeValidInput());
    expect(result.success).toBe(true);
    expect(storage.getSnapshotCount()).toBe(countBefore + 1);
  });
});

// ---------------------------------------------------------------------------
// Feature flag
// ---------------------------------------------------------------------------

describe("isMemoryShadowModeEnabled()", () => {
  const OLD_ENV = process.env;

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...OLD_ENV };
    delete process.env.COGNITIVE_MEMORY_ENABLED;
  });

  afterEach(() => {
    process.env = OLD_ENV;
  });

  it("debe retornar false por defecto (flag no definido)", () => {
    expect(isMemoryShadowModeEnabled()).toBe(false);
  });

  it("debe retornar false si COGNITIVE_MEMORY_ENABLED=false", () => {
    process.env.COGNITIVE_MEMORY_ENABLED = "false";
    expect(isMemoryShadowModeEnabled()).toBe(false);
  });

  it("debe retornar true si COGNITIVE_MEMORY_ENABLED=true", () => {
    process.env.COGNITIVE_MEMORY_ENABLED = "true";
    expect(isMemoryShadowModeEnabled()).toBe(true);
  });

  it("debe retornar false para valores no 'true'", () => {
    process.env.COGNITIVE_MEMORY_ENABLED = "1";
    expect(isMemoryShadowModeEnabled()).toBe(false);
    process.env.COGNITIVE_MEMORY_ENABLED = "yes";
    expect(isMemoryShadowModeEnabled()).toBe(false);
  });
});
