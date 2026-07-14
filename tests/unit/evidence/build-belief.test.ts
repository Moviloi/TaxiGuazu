/**
 * build-belief.test.ts — Pruebas del Belief builder
 *
 * PR-3B: Verifica que buildBelief construye Belief a partir
 * de Knowledge, sin nunca lanzar excepciones y sin inferir nada nuevo.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3B
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { buildBelief, Belief, Knowledge, Evidence, Fact, Source, Confidence, Signal, Observation } from "@/lib/evidence";
import { log } from "@/lib/utils/logger";

function makeFact(proposition: string): Fact {
  return Fact.create({ type: "note", proposition, source: Source.directExtraction("test"), confidence: Confidence.DIRECT_EXTRACTION });
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

function makeKnowledge(facts: Fact[], signal?: Signal, observation?: Observation): Knowledge {
  const evidence = Evidence.create({
    id: "ev-test",
    observationId: "obs-test",
    facts,
    type: "user_input",
    createdAt: new Date(),
  });
  return Knowledge.consolidate(evidence, signal, observation);
}

describe("buildBelief — Belief builder del pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Construcción válida ──

  it("debe construir Belief a partir de Knowledge con Signal + Observation", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const knowledge = makeKnowledge(facts, signal, observation);

    const belief = buildBelief(knowledge);

    expect(belief).toBeInstanceOf(Belief);
    expect(belief!.knowledgeId).toBe(knowledge.id);
    expect(belief!.observationValid).toBe(true);
    expect(belief!.channel).toBe("whatsapp");
    expect(belief!.hasContent).toBe(true);
    expect(belief!.factCount).toBe(1);
    expect(belief!.isWellFormed).toBe(true); // Datos completos
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
    const knowledge = makeKnowledge(facts, signal, observation);

    const belief = buildBelief(knowledge);

    expect(belief!.observationValid).toBe(true);
    expect(belief!.channel).toBe("webhook");
    expect(belief!.hasContent).toBe(true);
    expect(belief!.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(belief!.conversationId).toBe("42");
    expect(belief!.factCount).toBe(1);
    expect(belief!.isWellFormed).toBe(true);
  });

  it("debe preservar los Facts originales (mismos objetos, contenido idéntico)", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const knowledge = makeKnowledge(facts, signal, observation);

    const belief = buildBelief(knowledge);

    expect(belief!.facts[0]).toBe(facts[0]);
    expect(belief!.facts).toEqual(facts);
  });

  // ── Campos faltantes (derivación parcial) ──

  it("debe construir Belief con observationValid=true aunque falte Signal", () => {
    const facts = [makeFact("test")];
    const observation = makeObservation({ status: 'valid' });
    const knowledge = makeKnowledge(facts, undefined, observation); // sin Signal

    const belief = buildBelief(knowledge);

    expect(belief).toBeInstanceOf(Belief);
    expect(belief!.observationValid).toBe(true);
    expect(belief!.channel).toBeNull();
    expect(belief!.hasContent).toBe(false);
    expect(belief!.isWellFormed).toBe(false);
  });

  it("debe construir Belief sin Signal ni Observation (campos null)", () => {
    const facts = [makeFact("test")];
    const knowledge = makeKnowledge(facts); // sin Signal ni Observation

    const belief = buildBelief(knowledge);

    expect(belief).toBeInstanceOf(Belief);
    expect(belief!.factCount).toBe(1);
    expect(belief!.observationValid).toBe(false);
  });

  // ── Guard: knowledge null ──

  it("debe retornar null si knowledge es null", () => {
    expect(buildBelief(null as unknown as Knowledge)).toBeNull();
  });

  it("debe retornar null si knowledge es undefined", () => {
    expect(buildBelief(undefined as unknown as Knowledge)).toBeNull();
  });

  // ── Logging ──

  it("debe loguear [EVIDENCE_BELIEF] en construcción exitosa", () => {
    const facts = [makeFact("observation validated with status valid")];
    const knowledge = makeKnowledge(facts);

    buildBelief(knowledge);

    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_BELIEF]", expect.any(Object));
  });

  it("debe loguear [EVIDENCE] Failed to build Belief si falla internamente", () => {
    const facts = [makeFact("observation validated with status valid")];
    const knowledge = makeKnowledge(facts);

    // Forzamos un fallo: reemplazamos Belief.fromKnowledge temporalmente
    const originalFromKnowledge = Belief.fromKnowledge;
    Belief.fromKnowledge = (() => { throw new Error("Simulated failure"); }) as typeof Belief.fromKnowledge;

    const result = buildBelief(knowledge);

    expect(result).toBeNull();
    expect(log.warn).toHaveBeenCalledWith("[EVIDENCE] Failed to build Belief", expect.any(Object));

    // Restaurar
    Belief.fromKnowledge = originalFromKnowledge;
  });

  // ── Nunca lanza ──

  it("nunca debe lanzar excepciones (fallo silencioso)", () => {
    const facts = [makeFact("observation validated with status valid")];
    const knowledge = makeKnowledge(facts);

    expect(() => buildBelief(knowledge)).not.toThrow();
    expect(() => buildBelief(null as unknown as Knowledge)).not.toThrow();
    expect(() => buildBelief(undefined as unknown as Knowledge)).not.toThrow();
  });

  // ── Inmutabilidad ──

  it("debe producir un Belief congelado (inmutable)", () => {
    const facts = [makeFact("observation validated with status valid")];
    const knowledge = makeKnowledge(facts);

    const belief = buildBelief(knowledge);

    expect(Object.isFrozen(belief!)).toBe(true);
  });
});
