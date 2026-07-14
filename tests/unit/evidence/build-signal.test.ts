/**
 * build-signal.test.ts — Pruebas del Signal builder del pipeline
 *
 * PR-2B: Verifica que buildSignal construye un Signal válido
 * a partir de datos del pipeline, sin nunca lanzar excepciones.
 *
 * Verifica:
 *  - Construcción válida con text + phone + conversationId
 *  - Construcción válida solo con text (mínimo)
 *  - Retorna null si el text es vacío
 *  - Retorna null si el text es solo espacios
 *  - Nunca lanza (try-variant garantizada)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import { buildSignal } from "@/lib/evidence";

describe("buildSignal — Signal builder del pipeline", () => {
  it("debe construir un Signal válido con text + phone + conversationId", () => {
    const signal = buildSignal({
      text: "Necesito un taxi al aeropuerto",
      phone: "+549111111111",
      conversationId: 42,
    });

    expect(signal).not.toBeNull();
    expect(signal!.rawContent).toBe("Necesito un taxi al aeropuerto");
    expect(signal!.channel).toBe("whatsapp");
    expect(signal!.subtype).toBe("message");
    expect(signal!.metadata).toEqual({
      phone: "+549111111111",
      conversationId: 42,
    });
    expect(signal!.id).toBeTruthy();
    expect(typeof signal!.id).toBe("string");
    expect(signal!.receivedAt).toBeInstanceOf(Date);
    expect(signal!.receivedAt.getTime()).not.toBeNaN();
  });

  it("debe construir un Signal válido solo con text (mínimo)", () => {
    const signal = buildSignal({
      text: "Hola",
    });

    expect(signal).not.toBeNull();
    expect(signal!.rawContent).toBe("Hola");
    expect(signal!.channel).toBe("whatsapp");
    expect(signal!.subtype).toBe("message");
    expect(signal!.metadata).toBeUndefined();
  });

  it("debe tener metadata undefined si no hay phone ni conversationId", () => {
    const signal = buildSignal({ text: "Solo texto" });
    expect(signal!.metadata).toBeUndefined();
  });

  it("debe construir un Signal con phone pero sin conversationId", () => {
    const signal = buildSignal({
      text: "Quiero ir al centro",
      phone: "+549111111111",
    });

    expect(signal).not.toBeNull();
    expect(signal!.metadata).toEqual({ phone: "+549111111111" });
  });

  it("debe construir un Signal con conversationId pero sin phone", () => {
    const signal = buildSignal({
      text: "Cuánto cuesta?",
      conversationId: 7,
    });

    expect(signal).not.toBeNull();
    expect(signal!.metadata).toEqual({ conversationId: 7 });
  });

  it("debe retornar null si el text es vacío (nunca lanza)", () => {
    const signal = buildSignal({ text: "" });
    expect(signal).toBeNull();
  });

  it("debe retornar null si el text es solo espacios (nunca lanza)", () => {
    const signal = buildSignal({ text: "   " });
    expect(signal).toBeNull();
  });

  it("debe generar un id único en cada llamada", () => {
    const a = buildSignal({ text: "Mensaje A" });
    const b = buildSignal({ text: "Mensaje B" });
    expect(a!.id).not.toBe(b!.id);
  });

  it("debe preservar el contenido multilínea", () => {
    const multiline = "Línea 1\nLínea 2\nLínea 3";
    const signal = buildSignal({ text: multiline });
    expect(signal!.rawContent).toBe(multiline);
  });

  it("debe producir un Signal congelado (inmutable)", () => {
    const signal = buildSignal({ text: "Test" });
    expect(Object.isFrozen(signal!)).toBe(true);
  });
});

describe("buildSignal — nunca lanza ante entradas inválidas", () => {
  it("no debe lanzar si text es string vacío (retorna null)", () => {
    expect(() => buildSignal({ text: "" })).not.toThrow();
  });

  it("no debe lanzar si phone es undefined", () => {
    expect(() => buildSignal({ text: "Hola" })).not.toThrow();
  });
});
