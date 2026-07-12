/**
 * confidence.test.ts — Pruebas de Confidence Value Object
 *
 * Verifica:
 *  - Creación válida y rechazo de inválidos
 *  - Inmutabilidad (Object.freeze)
 *  - Niveles predefinidos y fromSourceType
 *  - equals(), operadores de comparación, meetsThreshold
 *  - Serialización (toJSON, toString)
 *  - tryCreate
 */

import { describe, it, expect } from "vitest";
import { Confidence, ConfidenceRangeError, ConfidenceNaNError } from "@/lib/evidence";

describe("Confidence — creación", () => {
  it("debe crear con valor en rango [0, 1]", () => {
    const c = Confidence.create(0.75);
    expect(c.value).toBe(0.75);
  });

  it("debe rechazar valor < 0", () => {
    expect(() => Confidence.create(-0.1)).toThrow(ConfidenceRangeError);
  });

  it("debe rechazar valor > 1", () => {
    expect(() => Confidence.create(1.1)).toThrow(ConfidenceRangeError);
  });

  it("debe rechazar NaN", () => {
    expect(() => Confidence.create(NaN)).toThrow(ConfidenceNaNError);
  });

  it("debe rechazar Infinity", () => {
    expect(() => Confidence.create(Infinity)).toThrow(ConfidenceNaNError);
  });

  it("debe aceptar 0 exacto", () => {
    const c = Confidence.create(0);
    expect(c.value).toBe(0);
  });

  it("debe aceptar 1 exacto", () => {
    const c = Confidence.create(1);
    expect(c.value).toBe(1);
  });

  it("debe aceptar valores con precisión decimal", () => {
    const c = Confidence.create(0.333333);
    expect(c.value).toBeCloseTo(0.333333);
  });
});

describe("Confidence — inmutabilidad", () => {
  it("debe ser inmutable (Object.freeze)", () => {
    const c = Confidence.create(0.5);
    expect(Object.isFrozen(c)).toBe(true);
  });

  it("no debe permitir modificar value", () => {
    const c = Confidence.create(0.5);
    expect(() => {
      (c as Record<string, unknown>).value = 0.9;
    }).toThrow();
  });
});

describe("Confidence — niveles predefinidos", () => {
  it("USER_CONFIRMATION debe ser 0.95", () => {
    expect(Confidence.USER_CONFIRMATION.value).toBe(0.95);
  });

  it("DIRECT_EXTRACTION debe ser 0.85", () => {
    expect(Confidence.DIRECT_EXTRACTION.value).toBe(0.85);
  });

  it("KNOWLEDGE_BASE debe ser 0.90", () => {
    expect(Confidence.KNOWLEDGE_BASE.value).toBe(0.90);
  });

  it("INFERENCE debe ser 0.70", () => {
    expect(Confidence.INFERENCE.value).toBe(0.70);
  });

  it("LLM_INFERENCE debe ser 0.65", () => {
    expect(Confidence.LLM_INFERENCE.value).toBe(0.65);
  });

  it("SILENCE_DETECTION debe ser 0.40", () => {
    expect(Confidence.SILENCE_DETECTION.value).toBe(0.40);
  });

  it("DEFAULT_VALUE debe ser 0.30", () => {
    expect(Confidence.DEFAULT_VALUE.value).toBe(0.30);
  });

  it("CERTAIN debe ser 1.0", () => {
    expect(Confidence.CERTAIN.value).toBe(1.0);
  });

  it("NONE debe ser 0.0", () => {
    expect(Confidence.NONE.value).toBe(0.0);
  });
});

describe("Confidence — fromSourceType", () => {
  it("debe mapear user_confirmation a 0.95", () => {
    const c = Confidence.fromSourceType("user_confirmation");
    expect(c.value).toBe(0.95);
  });

  it("debe mapear default_value a 0.30", () => {
    const c = Confidence.fromSourceType("default_value");
    expect(c.value).toBe(0.30);
  });
});

describe("Confidence — value object semantics", () => {
  it("equals() debe comparar por valor", () => {
    const a = Confidence.create(0.75);
    const b = Confidence.create(0.75);
    const c = Confidence.create(0.80);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it("equals() debe ser simétrico", () => {
    const a = Confidence.create(0.5);
    const b = Confidence.create(0.5);
    expect(a.equals(b)).toBe(b.equals(a));
  });

  it("equals() debe ser reflexivo", () => {
    const a = Confidence.create(0.5);
    expect(a.equals(a)).toBe(true);
  });
});

describe("Confidence — operadores de comparación", () => {
  const low = Confidence.create(0.3);
  const high = Confidence.create(0.8);
  const sameLow = Confidence.create(0.3);

  it("isGreaterThan", () => {
    expect(high.isGreaterThan(low)).toBe(true);
    expect(low.isGreaterThan(high)).toBe(false);
    expect(low.isGreaterThan(sameLow)).toBe(false);
  });

  it("isLessThan", () => {
    expect(low.isLessThan(high)).toBe(true);
    expect(high.isLessThan(low)).toBe(false);
    expect(low.isLessThan(sameLow)).toBe(false);
  });

  it("isGreaterThanOrEqual", () => {
    expect(high.isGreaterThanOrEqual(low)).toBe(true);
    expect(low.isGreaterThanOrEqual(sameLow)).toBe(true);
    expect(low.isGreaterThanOrEqual(high)).toBe(false);
  });

  it("isLessThanOrEqual", () => {
    expect(low.isLessThanOrEqual(high)).toBe(true);
    expect(low.isLessThanOrEqual(sameLow)).toBe(true);
    expect(high.isLessThanOrEqual(low)).toBe(false);
  });
});

describe("Confidence — meetsThreshold", () => {
  it("default threshold debe ser 0.5", () => {
    expect(Confidence.create(0.6).meetsThreshold()).toBe(true);
    expect(Confidence.create(0.4).meetsThreshold()).toBe(false);
  });

  it("debe aceptar threshold personalizado", () => {
    expect(Confidence.create(0.8).meetsThreshold(0.75)).toBe(true);
    expect(Confidence.create(0.7).meetsThreshold(0.75)).toBe(false);
  });

  it("debe funcionar en límites exactos", () => {
    expect(Confidence.create(0.5).meetsThreshold(0.5)).toBe(true);
  });
});

describe("Confidence — tryCreate", () => {
  it("debe retornar Confidence para valor válido", () => {
    const c = Confidence.tryCreate(0.5);
    expect(c).not.toBeNull();
    expect(c!.value).toBe(0.5);
  });

  it("debe retornar null para valor < 0", () => {
    expect(Confidence.tryCreate(-1)).toBeNull();
  });

  it("debe retornar null para NaN", () => {
    expect(Confidence.tryCreate(NaN)).toBeNull();
  });

  it("debe retornar null para Infinity", () => {
    expect(Confidence.tryCreate(Infinity)).toBeNull();
  });
});

describe("Confidence — serialización", () => {
  it("toString() debe ser descriptivo", () => {
    const c = Confidence.create(0.5);
    expect(c.toString()).toBe("Confidence(0.500)");
  });

  it("toJSON() debe retornar el número", () => {
    const c = Confidence.create(0.75);
    expect(c.toJSON()).toBe(0.75);
  });
});
