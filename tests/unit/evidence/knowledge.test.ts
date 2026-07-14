/**
 * knowledge.test.ts — Pruebas del Value Object Knowledge
 *
 * PR-3A: Verifica que Knowledge es un value object inmutable que
 * consolida Facts desde un Evidence sin inferir nada nuevo.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3A
 */

import { describe, it, expect } from "vitest";
import { Knowledge, Fact, Evidence, Source, Confidence, Signal, Observation } from "@/lib/evidence";
import { KnowledgeValidationError, KnowledgeInvalidIdError, KnowledgeInvalidEvidenceIdError } from "@/lib/evidence";

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

describe("Knowledge — value object inmutable", () => {
  // ── Constructor / create ──

  it("debe construir con create() con todos los campos", () => {
    const facts = [makeFact("observation validated with status valid")];
    const k = Knowledge.create({
      id: "kn-1",
      evidenceId: "ev-1",
      consolidatedAt: new Date("2026-07-12T12:00:00Z"),
      observationStatus: "valid",
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z",
      conversationId: "42",
      facts,
    });

    expect(k.id).toBe("kn-1");
    expect(k.evidenceId).toBe("ev-1");
    expect(k.observationStatus).toBe("valid");
    expect(k.channel).toBe("whatsapp");
    expect(k.hasContent).toBe(true);
    expect(k.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(k.conversationId).toBe("42");
    expect(k.factCount).toBe(1);
    expect(k.facts).toEqual(facts);
  });

  it("debe construir con campos null cuando no están disponibles", () => {
    const facts = [makeFact("observation validated with status valid")];
    const k = Knowledge.create({
      id: "kn-1",
      evidenceId: "ev-1",
      consolidatedAt: new Date(),
      observationStatus: null,
      channel: null,
      hasContent: false,
      receivedAt: null,
      conversationId: null,
      facts,
    });

    expect(k.observationStatus).toBeNull();
    expect(k.channel).toBeNull();
    expect(k.hasContent).toBe(false);
    expect(k.receivedAt).toBeNull();
    expect(k.conversationId).toBeNull();
  });

  // ── Validación de create() ──

  it("debe lanzar KnowledgeInvalidIdError si id es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Knowledge.create({
        id: "", evidenceId: "ev-1", consolidatedAt: new Date(),
        observationStatus: null, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(KnowledgeInvalidIdError);
  });

  it("debe lanzar KnowledgeInvalidEvidenceIdError si evidenceId es vacío", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Knowledge.create({
        id: "kn-1", evidenceId: "", consolidatedAt: new Date(),
        observationStatus: null, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(KnowledgeInvalidEvidenceIdError);
  });

  it("debe lanzar KnowledgeValidationError si consolidatedAt no es Date válido", () => {
    const facts = [makeFact("test")];
    expect(() =>
      Knowledge.create({
        id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date("invalid"),
        observationStatus: null, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts,
      }),
    ).toThrow(KnowledgeValidationError);
  });

  it("debe lanzar KnowledgeValidationError si facts está vacío", () => {
    expect(() =>
      Knowledge.create({
        id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
        observationStatus: null, channel: null, hasContent: false,
        receivedAt: null, conversationId: null, facts: [],
      }),
    ).toThrow(KnowledgeValidationError);
  });

  // ── consolidate desde Evidence ──

  it("debe consolidar Knowledge desde Evidence con Signal + Observation completos", () => {
    const facts = [makeFact("observation validated with status valid")];
    const signal = makeSignal();
    const observation = makeObservation();

    const evidence = Evidence.create({
      id: "ev-1",
      observationId: "obs-1",
      facts,
      type: "user_input",
      createdAt: new Date(),
    });

    const k = Knowledge.consolidate(evidence, signal, observation);

    expect(k).toBeInstanceOf(Knowledge);
    expect(k.evidenceId).toBe("ev-1");
    expect(k.observationStatus).toBe("valid");
    expect(k.channel).toBe("whatsapp");
    expect(k.hasContent).toBe(true);
    expect(k.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(k.conversationId).toBe("42");
    expect(k.factCount).toBe(1);
  });

  it("debe consolidar Knowledge con campos null si no se proveen Signal/Observation", () => {
    const facts = [makeFact("observation validated with status valid")];
    const evidence = Evidence.create({
      id: "ev-1",
      observationId: "obs-1",
      facts,
      type: "user_input",
      createdAt: new Date(),
    });

    // Sin Signal ni Observation — los campos epistémicos quedan null/false
    const k = Knowledge.consolidate(evidence);

    expect(k.evidenceId).toBe("ev-1");
    expect(k.observationStatus).toBeNull();
    expect(k.channel).toBeNull();
    expect(k.hasContent).toBe(false);
    expect(k.receivedAt).toBeNull();
    expect(k.conversationId).toBeNull();
  });

  it("consolidate debe lanzar si evidence es null/undefined", () => {
    expect(() => Knowledge.consolidate(null as unknown as Evidence)).toThrow(KnowledgeValidationError);
    expect(() => Knowledge.consolidate(undefined as unknown as Evidence)).toThrow(KnowledgeValidationError);
  });

  // ── tryCreate ──

  it("tryCreate debe retornar Knowledge válido con datos correctos", () => {
    const facts = [makeFact("test")];
    const k = Knowledge.tryCreate({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(k).toBeInstanceOf(Knowledge);
    expect(k!.id).toBe("kn-1");
  });

  it("tryCreate debe retornar null si id es inválido", () => {
    const facts = [makeFact("test")];
    const k = Knowledge.tryCreate({
      id: "", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(k).toBeNull();
  });

  it("tryCreate debe retornar null si evidenceId es inválido", () => {
    const facts = [makeFact("test")];
    const k = Knowledge.tryCreate({
      id: "kn-1", evidenceId: "", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(k).toBeNull();
  });

  it("tryCreate debe retornar null si facts está vacío", () => {
    const k = Knowledge.tryCreate({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts: [],
    });
    expect(k).toBeNull();
  });

  // ── Queries ──

  it("isFullyConsolidated debe retornar true cuando Signal + Observation tienen todos los campos", () => {
    const facts = [makeFact("observation validated with status valid")];
    const signal = makeSignal();
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.isFullyConsolidated).toBe(true);
  });

  it("isFullyConsolidated debe retornar false si no se provee Signal/Observation", () => {
    const facts = [makeFact("observation validated with status valid")];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence);
    expect(k.isFullyConsolidated).toBe(false);
  });

  // ── Serialización ──

  it("toJSON debe incluir todos los campos consolidados", () => {
    const facts = [makeFact("test")];
    const k = Knowledge.create({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date("2026-07-12T12:00:00Z"),
      observationStatus: "valid", channel: "whatsapp", hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z", conversationId: "42", facts,
    });

    const json = k.toJSON();
    expect(json.id).toBe("kn-1");
    expect(json.evidenceId).toBe("ev-1");
    expect(json.observationStatus).toBe("valid");
    expect(json.channel).toBe("whatsapp");
    expect(json.hasContent).toBe(true);
    expect(json.receivedAt).toBe("2026-07-12T12:00:00.000Z");
    expect(json.conversationId).toBe("42");
    expect(json.factCount).toBe(1);
  });

  // ── Inmutabilidad ──

  it("debe estar congelado (inmutable)", () => {
    const facts = [makeFact("test")];
    const k = Knowledge.create({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    expect(Object.isFrozen(k)).toBe(true);
  });

  // ── Extracción desde Signal y Observation (PR-3D.1) ──

  it("debe extraer observationStatus desde Observation.status", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal();
    const observation = makeObservation({ status: 'valid' });
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.observationStatus).toBe("valid");
  });

  it("debe extraer channel desde Signal.channel", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ channel: 'webhook' });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.channel).toBe("webhook");
  });

  it("debe extraer hasContent=true cuando Signal.rawContent no está vacío", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ rawContent: "Mensaje de prueba" });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.hasContent).toBe(true);
  });

  it("debe extraer receivedAt desde Signal.receivedAt como ISO string", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ receivedAt: new Date("2026-07-12T12:34:56.789Z") });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.receivedAt).toBe("2026-07-12T12:34:56.789Z");
  });

  it("debe extraer conversationId desde Signal.metadata", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ metadata: { phone: "+549111111111", conversationId: 99 } });
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.conversationId).toBe("99");
  });

  it("debe tener conversationId null si Signal no tiene metadata.conversationId", () => {
    const facts = [makeFact("test")];
    const signal = makeSignal({ metadata: { phone: "+549111111111" } }); // sin conversationId
    const observation = makeObservation();
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", facts, type: "user_input", createdAt: new Date(),
    });
    const k = Knowledge.consolidate(evidence, signal, observation);
    expect(k.conversationId).toBeNull();
  });
});
