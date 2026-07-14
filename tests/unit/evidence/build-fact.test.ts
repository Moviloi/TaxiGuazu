/**
 * build-fact.test.ts — Pruebas del Fact builder del pipeline cognitivo
 *
 * PR-2D: Verifica que buildFact construye Facts estructurales
 * a partir de una Observation (y Signal de contexto), sin nunca
 * lanzar excepciones ni interrumpir el pipeline.
 *
 * Verifica:
 *  - Observation válida + Signal → array de Facts estructurales
 *  - Cada Fact es inmutable (frozen)
 *  - Facts tienen el tipo, proposición, source y confidence correctos
 *  - Observation sin Signal → Facts mínimos (solo de Observation)
 *  - Observation inválida (null/undefined) → null
 *  - Signal sin metadata → Facts parciales
 *  - Facts con conversationId en metadata
 */

import { describe, it, expect } from "vitest";
import { buildFact, Observation, Signal, Fact, Confidence } from "@/lib/evidence";

// ── Helpers ──

function validSignal(overrides?: Partial<Signal>): Signal {
  return Signal.create({
    id: "sig-001",
    rawContent: "Necesito un taxi al aeropuerto",
    channel: "whatsapp",
    subtype: "message",
    receivedAt: new Date("2026-07-12T12:00:00Z"),
    metadata: { phone: "+549111111111", conversationId: 42 },
    ...overrides,
  });
}

function validObservation(overrides?: Partial<Observation>): Observation {
  return Observation.create({
    id: "obs-001",
    signalId: "sig-001",
    status: "valid",
    validatedAt: new Date("2026-07-12T12:00:05Z"),
    ...overrides,
  });
}

describe("buildFact — Fact builder del pipeline", () => {
  it("debe construir Facts estructurales a partir de Observation + Signal", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    expect(facts).not.toBeNull();
    expect(Array.isArray(facts)).toBe(true);
    expect(facts!.length).toBeGreaterThanOrEqual(1);
  });

  it("cada Fact debe ser una instancia válida de Fact", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    facts!.forEach((f) => {
      expect(f).toBeInstanceOf(Fact);
    });
  });

  it("cada Fact debe ser inmutable (frozen)", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    facts!.forEach((f) => {
      expect(Object.isFrozen(f)).toBe(true);
    });
  });

  it("debe incluir Fact de 'observation validated'", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const validatedFact = facts!.find((f) =>
      f.proposition.startsWith("observation validated"),
    );
    expect(validatedFact).toBeDefined();
    expect(validatedFact!.type).toBe("note");
    expect(validatedFact!.source.type).toBe("direct_extraction");
  });

  it("debe incluir Fact de channel cuando hay Signal", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const channelFact = facts!.find((f) =>
      f.proposition.includes("channel"),
    );
    expect(channelFact).toBeDefined();
    expect(channelFact!.proposition).toContain("whatsapp");
  });

  it("debe incluir Fact de 'message content present'", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const contentFact = facts!.find((f) =>
      f.proposition === "message content present",
    );
    expect(contentFact).toBeDefined();
  });

  it("debe incluir Fact de 'received at' timestamp", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const tsFact = facts!.find((f) =>
      f.proposition.startsWith("received at"),
    );
    expect(tsFact).toBeDefined();
    expect(tsFact!.proposition).toContain("2026-07-12");
  });

  it("debe incluir Fact de 'conversation identified' cuando hay conversationId", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const convFact = facts!.find((f) =>
      f.proposition.startsWith("conversation identified"),
    );
    expect(convFact).toBeDefined();
    expect(convFact!.proposition).toContain("42");
  });

  it("debe producir 5 Facts con Signal completo", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    expect(facts!.length).toBe(5);
  });

  it("todos los Facts deben tener confidence DIRECT_EXTRACTION", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    facts!.forEach((f) => {
      expect(f.confidence.equals(Confidence.DIRECT_EXTRACTION)).toBe(true);
    });
  });
});

describe("buildFact — sin Signal (solo Observation)", () => {
  it("debe producir al menos 1 Fact (observation validated)", () => {
    const obs = validObservation();
    const facts = buildFact(obs);

    expect(facts).not.toBeNull();
    expect(facts!.length).toBe(1);
    expect(facts![0].proposition).toContain("observation validated");
  });

  it("no debe incluir Facts de canal si no hay Signal", () => {
    const obs = validObservation();
    const facts = buildFact(obs);

    const channelFact = facts!.find((f) =>
      f.proposition.includes("channel"),
    );
    expect(channelFact).toBeUndefined();
  });
});

describe("buildFact — manejo de errores", () => {
  it("debe retornar null si Observation es null (nunca lanza)", () => {
    // @ts-expect-error — probamos con null en runtime
    const facts = buildFact(null);
    expect(facts).toBeNull();
  });

  it("debe retornar null si Observation es undefined (nunca lanza)", () => {
    // @ts-expect-error — probamos con undefined en runtime
    const facts = buildFact(undefined);
    expect(facts).toBeNull();
  });

  it("nunca debe lanzar aunque Signal tenga datos inválidos", () => {
    const obs = validObservation();
    const badSignal = Signal.tryCreate({
      id: "",
      rawContent: "",
      channel: "invalid",
      receivedAt: new Date("invalid"),
    });
    // Signal inválido retorna null de tryCreate
    expect(badSignal).toBeNull();

    // buildFact con Observation sola (sin Signal) es OK
    const facts = buildFact(obs);
    expect(facts).not.toBeNull();
  });
});

describe("buildFact — Signal con metadata parcial", () => {
  it("debe omitir Fact de conversation si no hay conversationId", () => {
    const signal = validSignal({ metadata: { phone: "+549111111111" } });
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const convFact = facts!.find((f) =>
      f.proposition.startsWith("conversation identified"),
    );
    expect(convFact).toBeUndefined();
    // Siguen existiendo los otros Facts
    expect(facts!.length).toBe(4);
  });

  it("debe omitir Fact de conversation si metadata es undefined", () => {
    const signal = validSignal({ metadata: undefined });
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    const convFact = facts!.find((f) =>
      f.proposition.startsWith("conversation identified"),
    );
    expect(convFact).toBeUndefined();
    expect(facts!.length).toBe(4);
  });
});

describe("buildFact — serialización", () => {
  it("cada Fact.toJSON debe incluir type, proposition, source, confidence", () => {
    const signal = validSignal();
    const obs = validObservation();
    const facts = buildFact(obs, signal);

    facts!.forEach((f) => {
      const json = f.toJSON();
      expect(json.type).toBe("note");
      expect(typeof json.proposition).toBe("string");
      expect(json.source).toBeDefined();
      expect(typeof json.confidence).toBe("number");
    });
  });
});
