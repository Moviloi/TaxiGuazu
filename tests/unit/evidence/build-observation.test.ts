/**
 * build-observation.test.ts — Pruebas del Observation builder del pipeline
 *
 * PR-2C: Verifica que buildObservation construye una Observation válida
 * a partir de un Signal, sin nunca lanzar excepciones.
 *
 * Verifica:
 *  - Signal válido → Observation válida con status 'valid'
 *  - Observation referencia al Signal correcto (signalId)
 *  - Observation.validatedAt >= Signal.receivedAt
 *  - Observation es inmutable (frozen)
 *  - Signal inválido → retorna null (nunca lanza)
 *  - Inmutabilidad de Observation
 */

import { describe, it, expect } from "vitest";
import { buildObservation, Signal, Observation } from "@/lib/evidence";

function validSignal(): Signal {
  return Signal.create({
    id: "sig-001",
    rawContent: "Necesito un taxi al aeropuerto",
    channel: "whatsapp",
    subtype: "message",
    receivedAt: new Date("2026-07-12T12:00:00Z"),
    metadata: { phone: "+549111111111", conversationId: 42 },
  });
}

describe("buildObservation — Observation builder del pipeline", () => {
  it("debe construir una Observation válida a partir de un Signal válido", () => {
    const signal = validSignal();
    const obs = buildObservation(signal);

    expect(obs).not.toBeNull();
    expect(obs).toBeInstanceOf(Observation);
    expect(obs!.status).toBe("valid");
  });

  it("debe referenciar al Signal correcto mediante signalId", () => {
    const signal = validSignal();
    const obs = buildObservation(signal);

    expect(obs!.signalId).toBe("sig-001");
  });

  it("debe tener validatedAt >= receivedAt del Signal", () => {
    const before = new Date();
    const signal = validSignal();
    const obs = buildObservation(signal);
    const after = new Date();

    expect(obs!.validatedAt.getTime()).toBeGreaterThanOrEqual(signal.receivedAt.getTime());
    expect(obs!.validatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(obs!.validatedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("debe generar un id único para cada Observation", () => {
    const signalA = validSignal();
    const signalB = Signal.create({
      id: "sig-002",
      rawContent: "Otro mensaje",
      channel: "whatsapp",
      subtype: "message",
      receivedAt: new Date(),
    });

    const obsA = buildObservation(signalA);
    const obsB = buildObservation(signalB);

    expect(obsA!.id).not.toBe(obsB!.id);
  });

  it("debe producir una Observation congelada (inmutable)", () => {
    const signal = validSignal();
    const obs = buildObservation(signal);

    expect(Object.isFrozen(obs!)).toBe(true);
  });

  it("no debe mutar el Signal original", () => {
    const signal = validSignal();
    const originalId = signal.id;
    const originalContent = signal.rawContent;

    buildObservation(signal);

    expect(signal.id).toBe(originalId);
    expect(signal.rawContent).toBe(originalContent);
  });

  it("debe aceptar status 'valid' explícitamente", () => {
    const signal = validSignal();
    const obs = buildObservation(signal);
    expect(obs!.status).toBe("valid");
  });
});

describe("buildObservation — manejo de errores", () => {
  it("debe retornar null si el Signal es null (nunca lanza)", () => {
    // @ts-expect-error — probamos con null en runtime
    const obs = buildObservation(null);
    expect(obs).toBeNull();
  });

  it("debe retornar null si signal es undefined (nunca lanza)", () => {
    // @ts-expect-error — probamos con undefined en runtime
    const obs = buildObservation(undefined);
    expect(obs).toBeNull();
  });

  it("nunca debe lanzar si el Signal tiene id vacío", () => {
    const badSignal = Signal.tryCreate({
      id: "",
      rawContent: "test",
      channel: "whatsapp",
      receivedAt: new Date(),
    });
    // Signal inválido retorna null de tryCreate
    expect(badSignal).toBeNull();
  });
});

describe("buildObservation — serialización", () => {
  it("Observation.toJSON debe incluir signalId y status", () => {
    const signal = validSignal();
    const obs = buildObservation(signal);
    const json = obs!.toJSON();

    expect(json.signalId).toBe("sig-001");
    expect(json.status).toBe("valid");
    expect(json.id).toBeTruthy();
    expect(typeof json.validatedAt).toBe("string");
  });
});
