/**
 * build-evidence.test.ts — Pruebas del Evidence builder del pipeline cognitivo
 *
 * PR-2E: Verifica que buildEvidence construye Evidence a partir de
 * Observation + Facts, sin nunca lanzar excepciones ni interrumpir
 * el pipeline. No enriquece Facts, no genera nuevos Facts.
 *
 * Verifica:
 *  - Observation + Facts válidos → Evidence con observationId correcta
 *  - Evidence contiene exactamente los Facts proporcionados
 *  - Evidence.type = 'user_input'
 *  - Evidence.createdAt es un Date válido
 *  - Evidence es inmutable (frozen)
 *  - Observation inválida (null/undefined) → null
 *  - Facts vacío → null
 *  - Evidence.toJSON incluye id, observationId, facts, type, createdAt
 */

import { describe, it, expect } from "vitest";
import { buildEvidence, Observation, Fact, Evidence, Source, Confidence } from "@/lib/evidence";

// ── Helpers ──

function validObservation(): Observation {
  return Observation.create({
    id: "obs-001",
    signalId: "sig-001",
    status: "valid",
    validatedAt: new Date("2026-07-12T12:00:05Z"),
  });
}

function createFact(type: string = "note", proposition: string = "test fact"): Fact {
  return Fact.create({
    type: type as any,
    proposition,
    source: Source.directExtraction("test"),
    confidence: Confidence.DIRECT_EXTRACTION,
  });
}

describe("buildEvidence — Evidence builder del pipeline", () => {
  it("debe construir Evidence a partir de Observation + Facts", () => {
    const obs = validObservation();
    const facts = [createFact(), createFact("note", "message content present")];
    const evidence = buildEvidence(obs, facts);

    expect(evidence).not.toBeNull();
    expect(evidence).toBeInstanceOf(Evidence);
  });

  it("debe referenciar a la Observation correcta mediante observationId", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.observationId).toBe("obs-001");
  });

  it("debe contener exactamente los Facts proporcionados", () => {
    const obs = validObservation();
    const facts = [
      createFact("note", "fact one"),
      createFact("note", "fact two"),
      createFact("note", "fact three"),
    ];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.facts.length).toBe(3);
    expect(evidence!.facts[0].proposition).toBe("fact one");
    expect(evidence!.facts[1].proposition).toBe("fact two");
    expect(evidence!.facts[2].proposition).toBe("fact three");
  });

  it("debe tener type 'user_input'", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.type).toBe("user_input");
  });

  it("debe tener createdAt como Date válido", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.createdAt).toBeInstanceOf(Date);
    expect(isNaN(evidence!.createdAt.getTime())).toBe(false);
  });

  it("debe tener id generado automáticamente (UUID)", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.id).toBeTruthy();
    expect(typeof evidence!.id).toBe("string");
    expect(evidence!.id.length).toBeGreaterThan(0);
  });

  it("debe tener provenance vacío por defecto", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(evidence!.provenance).toEqual([]);
  });

  it("debe producir Evidence inmutable (frozen)", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);

    expect(Object.isFrozen(evidence!)).toBe(true);
  });

  it("no debe mutar los Facts originales", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const originalProposition = facts[0].proposition;

    buildEvidence(obs, facts);

    expect(facts[0].proposition).toBe(originalProposition);
  });

  it("debe generar un id único para cada Evidence", () => {
    const obs = validObservation();
    const facts = [createFact()];

    const evA = buildEvidence(obs, facts);
    const evB = buildEvidence(obs, facts);

    expect(evA!.id).not.toBe(evB!.id);
  });

  it("debe funcionar con Facts de buildFact (5 facts estructurales)", () => {
    // Simula el output de buildFact con Signal completo
    const obs = validObservation();
    const facts = [
      createFact("note", "observation validated with status valid"),
      createFact("note", "signal received via whatsapp channel"),
      createFact("note", "message content present"),
      createFact("note", "received at 2026-07-12T12:00:00.000Z"),
      createFact("note", "conversation identified as 42"),
    ];
    const evidence = buildEvidence(obs, facts);

    expect(evidence).not.toBeNull();
    expect(evidence!.facts.length).toBe(5);
    expect(evidence!.factCount).toBe(5);
  });
});

describe("buildEvidence — manejo de errores", () => {
  it("debe retornar null si Observation es null (nunca lanza)", () => {
    // @ts-expect-error — probamos con null en runtime
    const evidence = buildEvidence(null, [createFact()]);
    expect(evidence).toBeNull();
  });

  it("debe retornar null si Observation es undefined (nunca lanza)", () => {
    // @ts-expect-error — probamos con undefined en runtime
    const evidence = buildEvidence(undefined, [createFact()]);
    expect(evidence).toBeNull();
  });

  it("debe retornar null si Facts es array vacío (nunca lanza)", () => {
    const obs = validObservation();
    const evidence = buildEvidence(obs, []);
    expect(evidence).toBeNull();
  });

  it("debe retornar null si Facts es null (nunca lanza)", () => {
    const obs = validObservation();
    // @ts-expect-error — probamos con null en runtime
    const evidence = buildEvidence(obs, null);
    expect(evidence).toBeNull();
  });

  it("debe retornar null si Facts es undefined (nunca lanza)", () => {
    const obs = validObservation();
    // @ts-expect-error — probamos con undefined en runtime
    const evidence = buildEvidence(obs, undefined);
    expect(evidence).toBeNull();
  });
});

describe("buildEvidence — serialización", () => {
  it("Evidence.toJSON debe incluir id, observationId, facts, type, createdAt, provenance", () => {
    const obs = validObservation();
    const facts = [createFact()];
    const evidence = buildEvidence(obs, facts);
    const json = evidence!.toJSON();

    expect(json.id).toBeTruthy();
    expect(json.observationId).toBe("obs-001");
    expect(Array.isArray(json.facts)).toBe(true);
    expect(json.type).toBe("user_input");
    expect(typeof json.createdAt).toBe("string");
    expect(Array.isArray(json.provenance)).toBe(true);
  });

  it("los Facts serializados deben mantener su estructura", () => {
    const obs = validObservation();
    const facts = [createFact("note", "test proposition")];
    const evidence = buildEvidence(obs, facts);
    const json = evidence!.toJSON();

    expect((json.facts as any[])[0].type).toBe("note");
    expect((json.facts as any[])[0].proposition).toBe("test proposition");
  });
});
