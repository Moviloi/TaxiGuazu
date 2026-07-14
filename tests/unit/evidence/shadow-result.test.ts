/**
 * shadow-result.test.ts — Pruebas del ShadowResult container
 *
 * PR-2F + PR-3A + PR-3B + PR-3C: Verifica que ShadowResult es un
 * contenedor inmutable, correctamente inicializado, con queries y
 * serialización, incluyendo los campos knowledge, belief y decision.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-2F, PR-3A, PR-3B, PR-3C
 */

import { describe, it, expect } from "vitest";
import { ShadowResult, Signal, Observation, Fact, Evidence, Knowledge, Belief, Decision, Confidence, Source } from "@/lib/evidence";

describe("ShadowResult — contenedor inmutable del ciclo cognitivo", () => {
  it("debe construir vacío (todos null)", () => {
    const sr = new ShadowResult({
      signal: null,
      observation: null,
      facts: null,
      evidence: null,
      knowledge: null,
      belief: null,
      decision: null,
    });

    expect(sr.signal).toBeNull();
    expect(sr.observation).toBeNull();
    expect(sr.facts).toBeNull();
    expect(sr.evidence).toBeNull();
    expect(sr.knowledge).toBeNull();
    expect(sr.belief).toBeNull();
    expect(sr.decision).toBeNull();
    expect(sr.isComplete).toBe(false);
    expect(sr.factCount).toBe(0);
  });

  it("debe construir con componentes completos", () => {
    const signal = Signal.create({
      id: "sig-1",
      rawContent: "Hola",
      channel: "whatsapp",
      subtype: "message",
      receivedAt: new Date("2026-07-12T12:00:00Z"),
    });

    const obs = Observation.create({
      id: "obs-1",
      signalId: "sig-1",
      status: "valid",
      validatedAt: new Date("2026-07-12T12:00:01Z"),
    });

    const facts = [
      Fact.create({
        type: "note",
        proposition: "observation validated",
        source: Source.directExtraction("test"),
        confidence: Confidence.DIRECT_EXTRACTION,
      }),
    ];

    const evidence = Evidence.create({
      id: "ev-1",
      observationId: "obs-1",
      type: "user_input",
      facts,
      createdAt: new Date("2026-07-12T12:00:02Z"),
    });

    const knowledge = Knowledge.create({
      id: "kn-1",
      evidenceId: "ev-1",
      consolidatedAt: new Date("2026-07-12T12:00:03Z"),
      observationStatus: "valid",
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z",
      conversationId: null,
      facts,
    });

    const belief = Belief.create({
      id: "bl-1",
      knowledgeId: "kn-1",
      createdAt: new Date("2026-07-12T12:00:04Z"),
      observationValid: true,
      channel: "whatsapp",
      hasContent: true,
      receivedAt: "2026-07-12T12:00:00.000Z",
      conversationId: null,
      facts,
    });

    const decision = Decision.fromBelief(belief);

    const sr = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge, belief, decision });

    expect(sr.signal).toBe(signal);
    expect(sr.observation).toBe(obs);
    expect(sr.facts).toBe(facts);
    expect(sr.evidence).toBe(evidence);
    expect(sr.knowledge).toBe(knowledge);
    expect(sr.belief).toBe(belief);
    expect(sr.decision).toBe(decision);
    expect(sr.factCount).toBe(1);
    expect(sr.isComplete).toBe(true);
  });

  it("debe reportar isComplete=false si falta cualquier componente", () => {
    const signal = Signal.create({
      id: "sig-1",
      rawContent: "Hola",
      channel: "whatsapp",
      subtype: "message",
      receivedAt: new Date(),
    });

    // Sin Observation
    const sr = new ShadowResult({ signal, observation: null, facts: null, evidence: null, knowledge: null, belief: null, decision: null });
    expect(sr.isComplete).toBe(false);

    // Con Observation pero sin Facts
    const obs = Observation.create({
      id: "obs-1", signalId: "sig-1", status: "valid", validatedAt: new Date(),
    });
    const sr2 = new ShadowResult({ signal, observation: obs, facts: null, evidence: null, knowledge: null, belief: null, decision: null });
    expect(sr2.isComplete).toBe(false);

    // Con Facts vacío
    const sr3 = new ShadowResult({ signal, observation: obs, facts: [], evidence: null, knowledge: null, belief: null, decision: null });
    expect(sr3.isComplete).toBe(false);

    // Con Evidence pero sin Knowledge
    const facts = [
      Fact.create({ type: "note", proposition: "test", source: Source.directExtraction("t"), confidence: Confidence.DIRECT_EXTRACTION }),
    ];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", type: "user_input", facts, createdAt: new Date(),
    });
    const sr4 = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge: null, belief: null, decision: null });
    expect(sr4.isComplete).toBe(false);

    // Con Knowledge pero sin Belief
    const knowledge = Knowledge.create({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: "valid", channel: "whatsapp", hasContent: true,
      receivedAt: null, conversationId: null, facts,
    });
    const sr5 = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge, belief: null, decision: null });
    expect(sr5.isComplete).toBe(false);

    // Con Belief pero sin Decision
    const belief = Belief.create({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: true, channel: "whatsapp", hasContent: true,
      receivedAt: null, conversationId: null, facts,
    });
    const sr6 = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge, belief, decision: null });
    expect(sr6.isComplete).toBe(false);
  });

  it("debe retornar factCount=0 si facts es null", () => {
    const sr = new ShadowResult({
      signal: null, observation: null, facts: null, evidence: null, knowledge: null, belief: null, decision: null,
    });
    expect(sr.factCount).toBe(0);
  });

  it("debe retornar factCount correcto si facts tiene elementos", () => {
    const facts = [
      Fact.create({ type: "note", proposition: "a", source: Source.directExtraction("t"), confidence: Confidence.DIRECT_EXTRACTION }),
      Fact.create({ type: "note", proposition: "b", source: Source.directExtraction("t"), confidence: Confidence.DIRECT_EXTRACTION }),
    ];
    const sr = new ShadowResult({ signal: null, observation: null, facts, evidence: null, knowledge: null, belief: null, decision: null });
    expect(sr.factCount).toBe(2);
  });

  it("debe producir toSummary correcto para resultado completo", () => {
    const signal = Signal.create({
      id: "sig-1", rawContent: "Hola", channel: "whatsapp", subtype: "message", receivedAt: new Date(),
    });
    const obs = Observation.create({
      id: "obs-1", signalId: "sig-1", status: "valid", validatedAt: new Date(),
    });
    const facts = [
      Fact.create({ type: "note", proposition: "test", source: Source.directExtraction("t"), confidence: Confidence.DIRECT_EXTRACTION }),
    ];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", type: "user_input", facts, createdAt: new Date(),
    });
    const knowledge = Knowledge.create({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: "valid", channel: "whatsapp", hasContent: true,
      receivedAt: null, conversationId: null, facts,
    });
    const belief = Belief.create({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: true, channel: "whatsapp", hasContent: true,
      receivedAt: null, conversationId: null, facts,
    });
    const decision = Decision.fromBelief(belief);

    const sr = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge, belief, decision });
    expect(sr.toSummary()).toBe("Signal ✓ | Observation ✓ | Facts: 1 | Evidence: ✓ | Knowledge: ✓ | Belief: ✓ | Decision: ✓");
  });

  it("debe producir toSummary correcto para resultado vacío", () => {
    const sr = new ShadowResult({ signal: null, observation: null, facts: null, evidence: null, knowledge: null, belief: null, decision: null });
    expect(sr.toSummary()).toBe("Signal ✗ | Observation ✗ | Facts: 0 | Evidence: ✗ | Knowledge: ✗ | Belief: ✗ | Decision: ✗");
  });

  it("debe estar congelado (inmutable)", () => {
    const sr = new ShadowResult({ signal: null, observation: null, facts: null, evidence: null, knowledge: null, belief: null, decision: null });
    expect(Object.isFrozen(sr)).toBe(true);
  });

  it("debe incluir decision en el resumen cuando está presente", () => {
    const signal = Signal.create({
      id: "sig-1", rawContent: "Hola", channel: "whatsapp", subtype: "message", receivedAt: new Date(),
    });
    const obs = Observation.create({
      id: "obs-1", signalId: "sig-1", status: "valid", validatedAt: new Date(),
    });
    const facts = [
      Fact.create({ type: "note", proposition: "test", source: Source.directExtraction("t"), confidence: Confidence.DIRECT_EXTRACTION }),
    ];
    const evidence = Evidence.create({
      id: "ev-1", observationId: "obs-1", type: "user_input", facts, createdAt: new Date(),
    });
    const knowledge = Knowledge.create({
      id: "kn-1", evidenceId: "ev-1", consolidatedAt: new Date(),
      observationStatus: null, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    const belief = Belief.create({
      id: "bl-1", knowledgeId: "kn-1", createdAt: new Date(),
      observationValid: false, channel: null, hasContent: false,
      receivedAt: null, conversationId: null, facts,
    });
    const decision = Decision.fromBelief(belief);

    const sr = new ShadowResult({ signal, observation: obs, facts, evidence, knowledge, belief, decision });
    expect(sr.toSummary()).toContain("Decision: ✓");
    expect(sr.decision).toBe(decision);
  });
});
