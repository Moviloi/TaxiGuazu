/**
 * build-decision.test.ts — Pruebas del Decision builder
 *
 * PR-3C: Verifica que buildDecision construye Decision a partir
 * de Belief, sin nunca lanzar excepciones y sin inferir nada
 * operacional.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3C
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

import { buildDecision, Decision, Belief, Knowledge, Evidence, Fact, Source, Confidence, Signal, Observation } from "@/lib/evidence";
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

function makeBelief(facts: Fact[], signal?: Signal, observation?: Observation): Belief {
  const evidence = Evidence.create({
    id: "ev-test",
    observationId: "obs-test",
    facts,
    type: "user_input",
    createdAt: new Date(),
  });
  const knowledge = Knowledge.consolidate(evidence, signal, observation);
  return Belief.fromKnowledge(knowledge);
}

describe("buildDecision — Decision builder del pipeline", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ── Construcción válida ──

  it("debe construir Decision a partir de Belief con Signal + Observation", () => {
    const facts = [makeFact("test")];
    // Observation válida pero sin Signal → channel=null, hasContent=false, receivedAt=null
    // → observationValid=true, isWellFormed=false → readiness "partial"
    const observation = makeObservation({ status: 'valid' });
    const belief = makeBelief(facts, undefined, observation);

    const decision = buildDecision(belief);

    expect(decision).toBeInstanceOf(Decision);
    expect(decision!.beliefId).toBe(belief.id);
    expect(decision!.validInput).toBe(true);
    expect(decision!.readiness).toBe("partial");
    expect(decision!.isDecided).toBe(false);
    expect(decision!.factCount).toBe(1);
  });

  it("debe construir Decision 'ready' desde Belief bien formado", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal(); // datos completos
    const observation = makeObservation({ status: 'valid' });
    const belief = makeBelief(facts, signal, observation);

    const decision = buildDecision(belief);

    expect(decision).toBeInstanceOf(Decision);
    expect(decision!.readiness).toBe("ready");
    expect(decision!.isDecided).toBe(true);
    expect(decision!.missingInfo).toEqual([]);
  });

  it("debe construir Decision 'invalid' desde Belief con observación inválida", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation({ status: 'invalid_format' }); // status no-valid
    const belief = makeBelief(facts, signal, observation);

    const decision = buildDecision(belief);

    expect(decision).toBeInstanceOf(Decision);
    expect(decision!.validInput).toBe(false);
    expect(decision!.readiness).toBe("invalid");
    expect(decision!.isDecided).toBe(false);
    expect(decision!.missingInfo).toContain("validObservation");
  });

  it("debe preservar los Facts originales (mismos objetos, contenido idéntico)", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const belief = makeBelief(facts, signal, observation);

    const decision = buildDecision(belief);

    expect(decision!.facts[0]).toBe(facts[0]);
    expect(decision!.facts).toEqual(facts);
  });

  // ── Guard: belief null ──

  it("debe retornar null si belief es null", () => {
    expect(buildDecision(null as unknown as Belief)).toBeNull();
  });

  it("debe retornar null si belief es undefined", () => {
    expect(buildDecision(undefined as unknown as Belief)).toBeNull();
  });

  // ── Logging ──

  it("debe loguear [EVIDENCE_DECISION] en construcción exitosa", () => {
    const facts = [makeFact("observation validated with status valid")];
    const belief = makeBelief(facts);

    buildDecision(belief);

    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_DECISION]", expect.any(Object));
  });

  it("debe loguear [EVIDENCE] Failed to build Decision si falla internamente", () => {
    const facts = [makeFact("observation validated with status valid")];
    const belief = makeBelief(facts);

    // Forzamos un fallo: reemplazamos Decision.fromBelief temporalmente
    const originalFromBelief = Decision.fromBelief;
    Decision.fromBelief = (() => { throw new Error("Simulated failure"); }) as typeof Decision.fromBelief;

    const result = buildDecision(belief);

    expect(result).toBeNull();
    expect(log.warn).toHaveBeenCalledWith("[EVIDENCE] Failed to build Decision", expect.any(Object));

    // Restaurar
    Decision.fromBelief = originalFromBelief;
  });

  // ── Nunca lanza ──

  it("nunca debe lanzar excepciones (fallo silencioso)", () => {
    const facts = [makeFact("observation validated with status valid")];
    const belief = makeBelief(facts);

    expect(() => buildDecision(belief)).not.toThrow();
    expect(() => buildDecision(null as unknown as Belief)).not.toThrow();
    expect(() => buildDecision(undefined as unknown as Belief)).not.toThrow();
  });

  // ── Inmutabilidad ──

  it("debe producir un Decision congelado (inmutable)", () => {
    const facts = [makeFact("observation validated with status valid")];
    const belief = makeBelief(facts);

    const decision = buildDecision(belief);

    expect(Object.isFrozen(decision!)).toBe(true);
  });
});
