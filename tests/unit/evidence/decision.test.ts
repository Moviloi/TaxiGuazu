/**
 * decision.test.ts — Pruebas del Value Object Decision
 *
 * PR-3C: Verifica que Decision es un value object inmutable que
 * determina el compromiso cognitivo desde un Belief sin inferir
 * intención, política ni ruta operacional.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3C
 */

import { describe, it, expect } from "vitest";
import { Decision, CognitiveReadiness, Belief, Fact, Knowledge, Evidence, Source, Confidence, Signal, Observation } from "@/lib/evidence";
import {
  DecisionValidationError,
  DecisionInvalidIdError,
  DecisionInvalidBeliefIdError,
} from "@/lib/evidence";

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

describe("Decision — value object inmutable", () => {
  // ── Constructor / create ──

  it("debe construir con create() con todos los campos", () => {
    const facts = [makeFact("test")];
    const d = Decision.create({
      id: "dc-1",
      beliefId: "bl-1",
      createdAt: new Date("2026-07-12T12:00:00Z"),
      validInput: true,
      hasContent: true,
      readiness: "ready",
      missingInfo: [],
      facts,
    });

    expect(d.id).toBe("dc-1");
    expect(d.beliefId).toBe("bl-1");
    expect(d.validInput).toBe(true);
    expect(d.hasContent).toBe(true);
    expect(d.readiness).toBe("ready");
    expect(d.missingInfo).toEqual([]);
    expect(d.isDecided).toBe(true);
    expect(d.factCount).toBe(1);
    expect(d.facts).toEqual(facts);
  });

  it("debe construir con missingInfo no vacío cuando hay campos ausentes", () => {
    const facts = [makeFact("test")];
    const d = Decision.create({
      id: "dc-1",
      beliefId: "bl-1",
      createdAt: new Date(),
      validInput: true,
      hasContent: false,
      readiness: "partial",
      missingInfo: ["content", "receivedAt", "conversationId"],
      facts,
    });

    expect(d.validInput).toBe(true);
    expect(d.hasContent).toBe(false);
    expect(d.readiness).toBe("partial");
    expect(d.missingInfo).toEqual(["content", "receivedAt", "conversationId"]);
    expect(d.isDecided).toBe(false);
  });

  // ── Validación de create() ──

  it("debe lanzar DecisionInvalidIdError si id es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Decision.create({
        id: "", beliefId: "bl-1", createdAt: new Date(),
        validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
      }),
    ).toThrow(DecisionInvalidIdError);
  });

  it("debe lanzar DecisionInvalidBeliefIdError si beliefId es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Decision.create({
        id: "dc-1", beliefId: "", createdAt: new Date(),
        validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
      }),
    ).toThrow(DecisionInvalidBeliefIdError);
  });

  it("debe lanzar DecisionValidationError si createdAt no es Date válido", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Decision.create({
        id: "dc-1", beliefId: "bl-1", createdAt: new Date("invalid"),
        validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
      }),
    ).toThrow(DecisionValidationError);
  });

  it("debe lanzar DecisionValidationError si readiness es inválido", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Decision.create({
        id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
        validInput: true, hasContent: true, readiness: "unknown" as CognitiveReadiness, missingInfo: [], facts,
      }),
    ).toThrow(DecisionValidationError);
  });

  it("debe lanzar DecisionValidationError si facts está vacío", () => {
    expect(() =>
      Decision.create({
        id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
        validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts: [],
      }),
    ).toThrow(DecisionValidationError);
  });

  // ── fromBelief ──

  it("debe derivar Decision 'invalid' desde Belief con observationValid=false", () => {
    const facts = [makeFact("observation validated with status invalid")];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence);
    const belief = Belief.fromKnowledge(knowledge);

    const d = Decision.fromBelief(belief);

    expect(d).toBeInstanceOf(Decision);
    expect(d.beliefId).toBe(belief.id);
    expect(d.validInput).toBe(false);
    expect(d.readiness).toBe("invalid");
    expect(d.isDecided).toBe(false);
    expect(d.missingInfo).toContain("validObservation");
  });

  it("debe derivar Decision 'ready' desde Belief bien formado", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal(); // Datos completos
    const observation = makeObservation({ status: 'valid' });
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const belief = Belief.fromKnowledge(knowledge);

    const d = Decision.fromBelief(belief);

    expect(d.validInput).toBe(true);
    expect(d.readiness).toBe("ready");
    expect(d.isDecided).toBe(true);
    expect(d.missingInfo).toEqual([]);
  });

  it("debe derivar Decision 'partial' desde Belief parcialmente formado", () => {
    const facts = [makeFact("test")];
    // Sin Signal — Knowledge tiene campos null → Belief parcial
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence); // sin Signal ni Observation
    const belief = Belief.fromKnowledge(knowledge);

    const d = Decision.fromBelief(belief);

    expect(d.validInput).toBe(false); // No hay Observation → observationValid=false
    expect(d.readiness).toBe("invalid");
    expect(d.isDecided).toBe(false);
  });

  it("fromBelief debe lanzar si belief es null/undefined", () => {
    expect(() => Decision.fromBelief(null as unknown as Belief)).toThrow(DecisionValidationError);
    expect(() => Decision.fromBelief(undefined as unknown as Belief)).toThrow(DecisionValidationError);
  });

  // ── tryCreate ──

  it("tryCreate debe retornar Decision válido con datos correctos", () => {
    const facts = [makeFact("test")];
    const d = Decision.tryCreate({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
    });
    expect(d).toBeInstanceOf(Decision);
    expect(d!.id).toBe("dc-1");
  });

  it("tryCreate debe retornar null si id es inválido", () => {
    const facts = [makeFact("test")];
    const d = Decision.tryCreate({
      id: "", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
    });
    expect(d).toBeNull();
  });

  it("tryCreate debe retornar null si beliefId es inválido", () => {
    const facts = [makeFact("test")];
    const d = Decision.tryCreate({
      id: "dc-1", beliefId: "", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
    });
    expect(d).toBeNull();
  });

  it("tryCreate debe retornar null si readiness es inválido", () => {
    const facts = [makeFact("test")];
    const d = Decision.tryCreate({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "bogus" as CognitiveReadiness, missingInfo: [], facts,
    });
    expect(d).toBeNull();
  });

  it("tryCreate debe retornar null si facts está vacío", () => {
    const d = Decision.tryCreate({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts: [],
    });
    expect(d).toBeNull();
  });

  // ── Queries ──

  it("isDecided debe retornar true cuando readiness es 'ready'", () => {
    const facts = [makeFact("test")];
    const d = Decision.create({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
    });
    expect(d.isDecided).toBe(true);
  });

  it("isDecided debe retornar false cuando readiness no es 'ready'", () => {
    const facts = [makeFact("test")];
    const dPartial = Decision.create({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "partial", missingInfo: [], facts,
    });
    const dInvalid = Decision.create({
      id: "dc-2", beliefId: "bl-1", createdAt: new Date(),
      validInput: false, hasContent: true, readiness: "invalid", missingInfo: [], facts,
    });
    expect(dPartial.isDecided).toBe(false);
    expect(dInvalid.isDecided).toBe(false);
  });

  // ── Serialización ──

  it("toJSON debe incluir todos los campos cognitivos", () => {
    const facts = [makeFact("test")];
    const d = Decision.create({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date("2026-07-12T12:00:00Z"),
      validInput: true, hasContent: false, readiness: "partial",
      missingInfo: ["content", "receivedAt"], facts,
    });

    const json = d.toJSON();
    expect(json.id).toBe("dc-1");
    expect(json.beliefId).toBe("bl-1");
    expect(json.validInput).toBe(true);
    expect(json.hasContent).toBe(false);
    expect(json.readiness).toBe("partial");
    expect(json.missingInfo).toEqual(["content", "receivedAt"]);
    expect(json.isDecided).toBe(false);
    expect(json.factCount).toBe(1);
  });

  // ── Inmutabilidad ──

  it("debe estar congelado (inmutable)", () => {
    const facts = [makeFact("test")];
    const d = Decision.create({
      id: "dc-1", beliefId: "bl-1", createdAt: new Date(),
      validInput: true, hasContent: true, readiness: "ready", missingInfo: [], facts,
    });
    expect(Object.isFrozen(d)).toBe(true);
  });

  // ── Escenarios desde Belief real ──

  it("debe derivar readiness='ready' desde Belief con Signal + Observation completos", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal(); // Datos completos
    const observation = makeObservation({ status: 'valid' });
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const belief = Belief.fromKnowledge(knowledge);
    const d = Decision.fromBelief(belief);

    expect(d.validInput).toBe(true);
    expect(d.hasContent).toBe(true);
    expect(d.readiness).toBe("ready");
    expect(d.isDecided).toBe(true);
    expect(d.missingInfo).toEqual([]);
  });

  it("debe derivar readiness='invalid' desde Belief con observación inválida", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation({ status: 'invalid_format' }); // no valid
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const belief = Belief.fromKnowledge(knowledge);
    const d = Decision.fromBelief(belief);

    expect(d.validInput).toBe(false);
    expect(d.readiness).toBe("invalid");
    expect(d.isDecided).toBe(false);
    expect(d.missingInfo).toContain("validObservation");
  });
});
