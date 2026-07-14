/**
 * belief.test.ts — Pruebas del Value Object Belief
 *
 * PR-3B: Verifica que Belief es un value object inmutable que
 * deriva el compromiso epistémico desde un Knowledge sin inferir nada nuevo.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3B
 */

import { describe, it, expect } from "vitest";
import { Belief, Fact, Knowledge, Evidence, Source, Confidence, Signal, Observation } from "@/lib/evidence";
import {
  BeliefValidationError,
  BeliefInvalidIdError,
  BeliefInvalidKnowledgeIdError,
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

describe("Belief — value object inmutable", () => {
  // ── Constructor / create ──

  it("debe construir con create() con todos los campos", () => {
    const facts = [makeFact("observation validated with status valid")];
    const b = Belief.create({
      id: "bl-1",
      knowledgeId: "kn-1",
      createdAt: new Date("2026-07-12T12:00:00Z"),
      observationValid: true,
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z",
      conversationId: "42",
      facts,
    });

    expect(b.id).toBe("bl-1");
    expect(b.knowledgeId).toBe("kn-1");
    expect(b.observationValid).toBe(true);
    expect(b.channel).toBe("whatsapp");
    expect(b.hasContent).toBe(true);
    expect(b.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(b.conversationId).toBe("42");
    expect(b.factCount).toBe(1);
    expect(b.facts).toEqual(facts);
  });

  it("debe construir con campos null cuando no están disponibles", () => {
    const facts = [makeFact("observation validated with status valid")];
    const b = Belief.create({
      id: "bl-1",
      knowledgeId: "kn-1",
      createdAt: new Date(),
      observationValid: false,
      channel: null,
      hasContent: false,
      receivedAt: null,
      conversationId: null,
      facts,
    });

    expect(b.observationValid).toBe(false);
    expect(b.channel).toBeNull();
    expect(b.hasContent).toBe(false);
    expect(b.receivedAt).toBeNull();
    expect(b.conversationId).toBeNull();
  });

  // ── Validación de create() ──

  it("debe lanzar BeliefInvalidIdError si id es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Belief.create({
        id: "", knowledgeId: "kn-1", createdAt: new Date(),
        observationValid: false, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(BeliefInvalidIdError);
  });

  it("debe lanzar BeliefInvalidKnowledgeIdError si knowledgeId es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Belief.create({
        id: "bl-1", knowledgeId: "", createdAt: new Date(),
        observationValid: false, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(BeliefInvalidKnowledgeIdError);
  });

  it("debe lanzar BeliefValidationError si createdAt no es Date válido", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Belief.create({
        id: "bl-1", knowledgeId: "kn-1", createdAt: new Date("invalid"),
        observationValid: false, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(BeliefValidationError);
  });

  it("debe lanzar BeliefValidationError si facts está vacío", () => {
    expect(() =>
      Belief.create({
        id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
        observationValid: false, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts: [],
      }),
    ).toThrow(BeliefValidationError);
  });

  // ── fromKnowledge / derivación desde Knowledge ──

  it("debe derivar Belief desde Knowledge con Signal + Observation completos", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();

    const evidence = Evidence.create({
      id: "ev-1",
      observationId: "obs-1",
      facts,
      type: "user_input",
      createdAt: new Date(),
    });

    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);

    expect(b).toBeInstanceOf(Belief);
    expect(b.knowledgeId).toBe(knowledge.id);
    expect(b.observationValid).toBe(true);
    expect(b.channel).toBe("whatsapp");
    expect(b.hasContent).toBe(true);
    expect(b.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(b.conversationId).toBe("42");
    expect(b.factCount).toBe(1);
  });

  it("debe derivar Belief con campos null si no se provee Signal/Observation", () => {
    const facts = [makeFact("test")];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });

    // Sin Signal ni Observation — Knowledge tiene campos null
    const knowledge = Knowledge.consolidate(evidence);
    const b = Belief.fromKnowledge(knowledge);

    expect(b.knowledgeId).toBe(knowledge.id);
    expect(b.observationValid).toBe(false);
    expect(b.channel).toBeNull();
    expect(b.hasContent).toBe(false);
    expect(b.receivedAt).toBeNull();
    expect(b.conversationId).toBeNull();
  });

  it("fromKnowledge debe lanzar si knowledge es null/undefined", () => {
    expect(() => Belief.fromKnowledge(null as unknown as Knowledge)).toThrow(BeliefValidationError);
    expect(() => Belief.fromKnowledge(undefined as unknown as Knowledge)).toThrow(BeliefValidationError);
  });

  // ── tryCreate ──

  it("tryCreate debe retornar Belief válido con datos correctos", () => {
    const facts = [makeFact("test")];
    const b = Belief.tryCreate({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(b).toBeInstanceOf(Belief);
    expect(b!.id).toBe("bl-1");
  });

  it("tryCreate debe retornar null si id es inválido", () => {
    const facts = [makeFact("test")];
    const b = Belief.tryCreate({
      id: "", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(b).toBeNull();
  });

  it("tryCreate debe retornar null si knowledgeId es inválido", () => {
    const facts = [makeFact("test")];
    const b = Belief.tryCreate({
      id: "bl-1", knowledgeId: "", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(b).toBeNull();
  });

  it("tryCreate debe retornar null si facts está vacío", () => {
    const b = Belief.tryCreate({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts: [],
    });
    expect(b).toBeNull();
  });

  // ── Queries ──

  it("isWellFormed debe retornar true cuando todos los campos epistémicos están presentes", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.isWellFormed).toBe(true);
  });

  it("isWellFormed debe retornar false si falta algún campo", () => {
    const facts = [makeFact("test")];
    // Sin Signal — Knowledge tiene campos null
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.isWellFormed).toBe(false);
  });

  // ── Serialización ──

  it("toJSON debe incluir todos los campos derivados", () => {
    const facts = [makeFact("test")];
    const b = Belief.create({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date("2026-07-12T12:00:00Z"),
      observationValid: true, channel: "whatsapp", hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z", conversationId: "42", facts,
    });

    const json = b.toJSON();
    expect(json.id).toBe("bl-1");
    expect(json.knowledgeId).toBe("kn-1");
    expect(json.observationValid).toBe(true);
    expect(json.channel).toBe("whatsapp");
    expect(json.hasContent).toBe(true);
    expect(json.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(json.conversationId).toBe("42");
    expect(json.factCount).toBe(1);
  });

  // ── Inmutabilidad ──

  it("debe estar congelado (inmutable)", () => {
    const facts = [makeFact("test")];
    const b = Belief.create({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(Object.isFrozen(b)).toBe(true);
  });

  // ── Derivación desde Knowledge con datos estructurados (PR-3D.1) ──

  it("debe derivar observationValid=true cuando Observation.status es 'valid'", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation({ status: 'valid' });
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.observationValid).toBe(true);
  });

  it("debe derivar observationValid=false cuando Observation.status no es 'valid'", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation({ status: 'invalid_format' });
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.observationValid).toBe(false);
  });

  it("debe derivar channel desde Signal.channel", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ channel: 'webhook' });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.channel).toBe("webhook");
  });

  it("debe derivar receivedAt desde Signal.receivedAt", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ receivedAt: new Date("2026-07-12T12:34:56.789Z") });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.receivedAt).toBe("2026-07-12T12:34:56.789Z");
  });

  it("debe derivar conversationId desde Signal.metadata", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ metadata: { phone: "+549111111111", conversationId: 77 } });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal, observation);
    const b = Belief.fromKnowledge(knowledge);
    expect(b.conversationId).toBe("77");
  });

  it("debe corresponder a observationValid=false cuando no hay Observation", () => {
    // Sin Observation — observationStatus null en Knowledge → observationValid false en Belief
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const knowledge = Knowledge.consolidate(evidence, signal); // sin observation
    expect(knowledge.observationStatus).toBeNull();
    const b = Belief.fromKnowledge(knowledge);
    expect(b.observationValid).toBe(false);
  });
});
