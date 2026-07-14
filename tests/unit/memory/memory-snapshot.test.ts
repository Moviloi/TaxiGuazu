/**
 * memory-snapshot.test.ts — Pruebas del MemorySnapshot Value Object
 *
 * IM-1: Verifica:
 *  - Construcción válida con 19 campos
 *  - Inmutabilidad (M-5)
 *  - Validación de invariantes
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import { createMemorySnapshot } from "@/lib/memory";
import type { MemorySnapshot } from "@/lib/memory";

function makeValidParams(overrides?: Partial<Parameters<typeof createMemorySnapshot>[0]>) {
  return {
    conversationId: "conv-123",
    memoryId: "mem-456",
    turnNumber: 1,
    storedAt: new Date("2026-07-14T12:00:00Z"),
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
    ...overrides,
  };
}

describe("createMemorySnapshot", () => {
  it("debe construir un snapshot válido con 19 campos", () => {
    const snapshot = createMemorySnapshot(makeValidParams());
    expect(snapshot).not.toBeNull();

    // 4 metadata fields
    expect(snapshot!.conversationId).toBe("conv-123");
    expect(snapshot!.memoryId).toBe("mem-456");
    expect(snapshot!.turnNumber).toBe(1);
    expect(snapshot!.storedAt).toBeInstanceOf(Date);

    // 8 belief fields
    expect(snapshot!.belief.id).toBe("bel-001");
    expect(snapshot!.belief.observationValid).toBe(true);
    expect(snapshot!.belief.channel).toBe("whatsapp");
    expect(snapshot!.belief.hasContent).toBe(true);
    expect(snapshot!.belief.receivedAt).toBe("2026-07-14T12:00:00Z");
    expect(snapshot!.belief.conversationId).toBe("conv-123");
    expect(snapshot!.belief.isWellFormed).toBe(true);
    expect(snapshot!.belief.factCount).toBe(3);

    // 7 decision fields
    expect(snapshot!.decision.id).toBe("dec-001");
    expect(snapshot!.decision.validInput).toBe(true);
    expect(snapshot!.decision.hasContent).toBe(true);
    expect(snapshot!.decision.readiness).toBe("ready");
    expect(snapshot!.decision.missingInfo).toEqual([]);
    expect(snapshot!.decision.isDecided).toBe(true);
    expect(snapshot!.decision.factCount).toBe(3);

    // Total field count: 4 + 8 + 7 = 19
    const metadataCount = 4;
    const beliefKeys = Object.keys(snapshot!.belief).length;
    const decisionKeys = Object.keys(snapshot!.decision).length;
    expect(metadataCount + beliefKeys + decisionKeys).toBe(19);
  });

  it("debe retornar null si conversationId es vacío", () => {
    expect(createMemorySnapshot(makeValidParams({ conversationId: "" }))).toBeNull();
  });

  it("debe retornar null si memoryId es vacío", () => {
    expect(createMemorySnapshot(makeValidParams({ memoryId: "" }))).toBeNull();
  });

  it("debe retornar null si turnNumber es 0", () => {
    expect(createMemorySnapshot(makeValidParams({ turnNumber: 0 }))).toBeNull();
  });

  it("debe retornar null si turnNumber no es entero", () => {
    expect(createMemorySnapshot(makeValidParams({ turnNumber: 1.5 }))).toBeNull();
  });

  it("debe retornar null si storedAt no es Date válido", () => {
    expect(createMemorySnapshot(makeValidParams({ storedAt: new Date("invalid") }))).toBeNull();
  });

  it("debe retornar null si belief.id es vacío", () => {
    expect(createMemorySnapshot(makeValidParams({
      belief: { ...makeValidParams().belief, id: "" },
    }))).toBeNull();
  });

  it("debe retornar null si decision.id es vacío", () => {
    expect(createMemorySnapshot(makeValidParams({
      decision: { ...makeValidParams().decision, id: "" },
    }))).toBeNull();
  });

  it("debe retornar null si decision.readiness es inválido", () => {
    expect(createMemorySnapshot(makeValidParams({
      decision: { ...makeValidParams().decision, readiness: "invalid_value" as any },
    }))).toBeNull();
  });

  it("debe retornar null si belief.factCount es negativo", () => {
    expect(createMemorySnapshot(makeValidParams({
      belief: { ...makeValidParams().belief, factCount: -1 },
    }))).toBeNull();
  });

  it("debe crear snapshot inmutable (M-5)", () => {
    const snapshot = createMemorySnapshot(makeValidParams())!;
    expect(Object.isFrozen(snapshot)).toBe(true);
    expect(Object.isFrozen(snapshot.belief)).toBe(true);
    expect(Object.isFrozen(snapshot.decision)).toBe(true);
  });

  it("debe congelar missingInfo como readonly array", () => {
    const snapshot = createMemorySnapshot(makeValidParams({
      decision: { ...makeValidParams().decision, missingInfo: ["channel", "receivedAt"] },
    }))!;
    expect(Object.isFrozen(snapshot.decision.missingInfo)).toBe(true);
  });

  it("debe aceptar readiness partial e invalid", () => {
    const partial = createMemorySnapshot(makeValidParams({
      decision: { ...makeValidParams().decision, readiness: "partial", isDecided: false },
    }));
    expect(partial).not.toBeNull();
    expect(partial!.decision.readiness).toBe("partial");
    expect(partial!.decision.isDecided).toBe(false);

    const invalid = createMemorySnapshot(makeValidParams({
      decision: { ...makeValidParams().decision, readiness: "invalid", isDecided: false },
    }));
    expect(invalid).not.toBeNull();
    expect(invalid!.decision.readiness).toBe("invalid");
  });

  it("debe aceptar belief fields nullables como null", () => {
    const snapshot = createMemorySnapshot(makeValidParams({
      belief: {
        ...makeValidParams().belief,
        channel: null,
        receivedAt: null,
        conversationId: null,
      },
    }));
    expect(snapshot).not.toBeNull();
    expect(snapshot!.belief.channel).toBeNull();
    expect(snapshot!.belief.receivedAt).toBeNull();
    expect(snapshot!.belief.conversationId).toBeNull();
  });
});
