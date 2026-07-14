/**
 * build-snapshot.test.ts — Pruebas del Snapshot Builder
 *
 * IM-1: Verifica:
 *  - Construcción Belief + Decision → MemorySnapshot
 *  - Metadata generation (memoryId UUID, storedAt)
 *  - Preservación de 19 campos
 *  - M-9: No enrichment
 *  - M-12: No defaults
 */

import { describe, it, expect } from "vitest";
import { buildSnapshot } from "@/lib/memory";
import type { BuildSnapshotInput } from "@/lib/memory";

function makeValidInput(overrides?: Partial<BuildSnapshotInput>): BuildSnapshotInput {
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
    turnNumber: 1,
    ...overrides,
  };
}

describe("buildSnapshot", () => {
  it("debe construir un snapshot desde Belief + Decision válidos", () => {
    const input = makeValidInput();
    const snapshot = buildSnapshot(input);

    expect(snapshot).not.toBeNull();
    expect(snapshot!.conversationId).toBe("conv-123");
    expect(snapshot!.turnNumber).toBe(1);
    expect(snapshot!.belief.id).toBe("bel-001");
    expect(snapshot!.decision.id).toBe("dec-001");
  });

  it("debe generar memoryId como UUID no vacío", () => {
    const snapshot = buildSnapshot(makeValidInput());
    expect(snapshot).not.toBeNull();
    expect(snapshot!.memoryId).toBeTruthy();
    expect(typeof snapshot!.memoryId).toBe("string");
    expect(snapshot!.memoryId.length).toBeGreaterThan(10);
  });

  it("debe generar storedAt como Date presente", () => {
    const before = Date.now();
    const snapshot = buildSnapshot(makeValidInput());
    const after = Date.now();

    expect(snapshot).not.toBeNull();
    expect(snapshot!.storedAt).toBeInstanceOf(Date);
    expect(snapshot!.storedAt.getTime()).toBeGreaterThanOrEqual(before);
    expect(snapshot!.storedAt.getTime()).toBeLessThanOrEqual(after);
  });

  it("debe preservar los 19 campos sin modificación (M-9: no enrichment)", () => {
    const input = makeValidInput();
    const snapshot = buildSnapshot(input)!;

    // Belief fields must match exactly
    expect(snapshot.belief.id).toBe(input.belief.id);
    expect(snapshot.belief.observationValid).toBe(input.belief.observationValid);
    expect(snapshot.belief.channel).toBe(input.belief.channel);
    expect(snapshot.belief.hasContent).toBe(input.belief.hasContent);
    expect(snapshot.belief.receivedAt).toBe(input.belief.receivedAt);
    expect(snapshot.belief.conversationId).toBe(input.belief.conversationId);
    expect(snapshot.belief.isWellFormed).toBe(input.belief.isWellFormed);
    expect(snapshot.belief.factCount).toBe(input.belief.factCount);

    // Decision fields must match exactly
    expect(snapshot.decision.id).toBe(input.decision.id);
    expect(snapshot.decision.validInput).toBe(input.decision.validInput);
    expect(snapshot.decision.hasContent).toBe(input.decision.hasContent);
    expect(snapshot.decision.readiness).toBe(input.decision.readiness);
    expect(snapshot.decision.missingInfo).toEqual(input.decision.missingInfo);
    expect(snapshot.decision.isDecided).toBe(input.decision.isDecided);
    expect(snapshot.decision.factCount).toBe(input.decision.factCount);
  });

  it("debe retornar null si belief.id es inválido", () => {
    expect(buildSnapshot(makeValidInput({
      belief: { ...makeValidInput().belief, id: "" },
    }))).toBeNull();
  });

  it("debe retornar null si input es parcialmente inválido", () => {
    expect(buildSnapshot(makeValidInput({
      turnNumber: 0,
    }))).toBeNull();
  });

  it("debe computar turnNumber correctamente (valor provisto por caller)", () => {
    const s1 = buildSnapshot(makeValidInput({ turnNumber: 1 }));
    expect(s1!.turnNumber).toBe(1);

    const s5 = buildSnapshot(makeValidInput({ turnNumber: 5 }));
    expect(s5!.turnNumber).toBe(5);
  });

  it("no debe incluir campos excluidos (facts, knowledgeId, beliefId, createdAt)", () => {
    const snapshot = buildSnapshot(makeValidInput())!;
    // Verificar que no hay propiedades del EE que deban excluirse
    expect((snapshot.belief as any).knowledgeId).toBeUndefined();
    expect((snapshot.belief as any).facts).toBeUndefined();
    expect((snapshot.decision as any).beliefId).toBeUndefined();
    expect((snapshot.decision as any).facts).toBeUndefined();
    expect((snapshot.decision as any).createdAt).toBeUndefined();
  });
});
