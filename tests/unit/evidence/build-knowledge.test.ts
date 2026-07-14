/**
 * build-knowledge.test.ts — Pruebas del Knowledge builder
 *
 * PR-3A: Verifica que buildKnowledge construye Knowledge a partir
 * de Evidence, sin nunca lanzar excepciones y sin inferir nada nuevo.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3A
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { buildKnowledge, Knowledge, Evidence, Fact, Source, Confidence, Signal, Observation } from "@/lib/evidence";
import { log } from "@/lib/utils/logger";

function makeFact(proposition: string): Fact {
  return Fact.create({ type: "note", proposition, source: Source.directExtraction("test"), confidence: Confidence.DIRECT_EXTRACTION });
}

function makeEvidence(facts: Fact[]): Evidence {
  return Evidence.create({
    id: "ev-test",
    observationId: "obs-test",
    facts,
    type: "user_input",
    createdAt: new Date(),
  });
}

function makeSignal(overrides?: Partial<Signal>): Signal {
  return Signal.create({
    id: "sig-test",
    rawContent: "Necesito un taxi al aeropuerto",
    channel: "whatsapp",
    subtype: "message",
    receivedAt: new Date("2026-07-12T12:00:00.000Z"),
    metadata: { phone: "+549111111111", conversationId: 42 },
    ...overrides,
  });
}

function makeObservation(overrides?: Partial<Observation>): Observation {
  return Observation.create({
    id: "obs-test",
    signalId: "sig-test",
    status: "valid",
    validatedAt: new Date("2026-07-12T12:00:05.000Z"),
    ...overrides,
  });
}

describe("buildKnowledge — Knowledge builder del pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Construcción válida ──

  it("debe construir Knowledge a partir de Evidence con Signal + Observation", () => {
    const facts = [makeFact("observation validated with status valid")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence, signal, observation);

    expect(knowledge).toBeInstanceOf(Knowledge);
    expect(knowledge!.evidenceId).toBe("ev-test");
    expect(knowledge!.observationStatus).toBe("valid");
    expect(knowledge!.channel).toBe("whatsapp");
    expect(knowledge!.hasContent).toBe(true);
    expect(knowledge!.factCount).toBe(1);
  });

  it("debe extraer todos los campos de Signal + Observation", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({
      rawContent: "Mensaje de prueba",
      channel: "webhook",
      receivedAt: new Date("2026-07-12T12:00:00.000Z"),
      metadata: { phone: "+549111111111", conversationId: 42 },
    });
    const observation = makeObservation({ status: 'valid' });
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence, signal, observation);

    expect(knowledge!.observationStatus).toBe("valid");
    expect(knowledge!.channel).toBe("webhook");
    expect(knowledge!.hasContent).toBe(true);
    expect(knowledge!.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(knowledge!.conversationId).toBe("42");
    expect(knowledge!.factCount).toBe(1);
  });

  it("debe preservar los Facts originales (mismos objetos, contenido idéntico)", () => {
    const facts = [makeFact("observation validated with status valid")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence, signal, observation);

    // Cada Fact individual es el mismo objeto (misma referencia)
    expect(knowledge!.facts[0]).toBe(facts[0]);
    // El contenido del array es idéntico
    expect(knowledge!.facts).toEqual(facts);
  });

  // ── Campos faltantes (consolidación parcial) ──

  it("debe construir Knowledge con campos null si no se provee Signal", () => {
    const facts = [makeFact("test")];
    const observation = makeObservation({ status: 'valid' });
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence, undefined, observation);

    expect(knowledge).toBeInstanceOf(Knowledge);
    expect(knowledge!.observationStatus).toBe("valid");
    expect(knowledge!.channel).toBeNull();
    expect(knowledge!.hasContent).toBe(false);
    expect(knowledge!.receivedAt).toBeNull();
  });

  it("debe construir Knowledge aunque no se provea Signal ni Observation", () => {
    const facts = [makeFact("test")];
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence);

    expect(knowledge).toBeInstanceOf(Knowledge);
    expect(knowledge!.factCount).toBe(1);
    expect(knowledge!.observationStatus).toBeNull();
    expect(knowledge!.channel).toBeNull();
  });

  // ── Guard: evidence null ──

  it("debe retornar null si evidence es null", () => {
    expect(buildKnowledge(null as unknown as Evidence)).toBeNull();
  });

  it("debe retornar null si evidence es undefined", () => {
    expect(buildKnowledge(undefined as unknown as Evidence)).toBeNull();
  });

  // ── Logging ──

  it("debe loguear [EVIDENCE_KNOWLEDGE] en construcción exitosa", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence(facts);

    buildKnowledge(evidence, signal, observation);

    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_KNOWLEDGE]", expect.any(Object));
  });

  it("debe loguear [EVIDENCE] Failed to build Knowledge si falla internamente", () => {
    // Forzamos un caso de fallo: Evidence que pase el guard pero falle en consolidate
    const originalConsolidate = Knowledge.consolidate;
    Knowledge.consolidate = (() => { throw new Error("Simulated failure"); }) as unknown as typeof Knowledge.consolidate;

    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence([makeFact("test")]);
    const result = buildKnowledge(evidence, signal, observation);

    expect(result).toBeNull();
    expect(log.warn).toHaveBeenCalledWith("[EVIDENCE] Failed to build Knowledge", expect.any(Object));

    // Restaurar
    Knowledge.consolidate = originalConsolidate;
  });

  // ── Nunca lanza ──

  it("nunca debe lanzar excepciones (fallo silencioso)", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence(facts);

    expect(() => buildKnowledge(evidence, signal, observation)).not.toThrow();
    expect(() => buildKnowledge(null as unknown as Evidence)).not.toThrow();
    expect(() => buildKnowledge(undefined as unknown as Evidence)).not.toThrow();
  });

  // ── Inmutabilidad ──

  it("debe producir un Knowledge congelado (inmutable)", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = makeEvidence(facts);

    const knowledge = buildKnowledge(evidence, signal, observation);

    expect(Object.isFrozen(knowledge!)).toBe(true);
  });
});
