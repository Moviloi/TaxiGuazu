/**
 * fact.test.ts — Pruebas de Fact Value Object
 *
 * Verifica:
 *  - Creación válida
 *  - Rechazo de invariantes violadas
 *    - type inválido
 *    - proposition vacía
 *    - source no-Source
 *    - confidence no-Confidence
 *  - Inmutabilidad
 *  - equals() por valor
 *  - tryCreate()
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import {
  Fact,
  FactEmptyPropositionError,
  FactInvalidTypeError,
  FactValidationError,
  Source,
  Confidence,
  FACT_TYPES,
} from "@/lib/evidence";

function validParams(overrides: Record<string, unknown> = {}) {
  return {
    type: "origin" as const,
    proposition: "el origen es el Aeropuerto Internacional Silvio Pettirossi",
    source: Source.directExtraction("regex match: origen"),
    confidence: Confidence.create(0.85),
    ...overrides,
  };
}

describe("Fact — creación válida", () => {
  it("debe crear con parámetros válidos", () => {
    const f = Fact.create(validParams());
    expect(f.type).toBe("origin");
    expect(f.proposition).toBe(
      "el origen es el Aeropuerto Internacional Silvio Pettirossi",
    );
    expect(f.source.type).toBe("direct_extraction");
    expect(f.confidence.value).toBe(0.85);
  });

  it("debe funcionar con todos los FactTypes", () => {
    for (const type of FACT_TYPES) {
      const f = Fact.create(validParams({ type, proposition: `test ${type}` }));
      expect(f.type).toBe(type);
    }
  });

  it("debe aceptar proposition con caracteres especiales", () => {
    const f = Fact.create(
      validParams({ proposition: "precio: $45.000 Gs." }),
    );
    expect(f.proposition).toBe("precio: $45.000 Gs.");
  });
});

describe("Fact — rechazo de inválidos", () => {
  it("debe rechazar type inválido", () => {
    expect(() =>
      Fact.create(validParams({ type: "nonexistent" })),
    ).toThrow(FactInvalidTypeError);
  });

  it("debe rechazar proposition vacía", () => {
    expect(() => Fact.create(validParams({ proposition: "" }))).toThrow(
      FactEmptyPropositionError,
    );
  });

  it("debe rechazar proposition solo espacios", () => {
    expect(() => Fact.create(validParams({ proposition: "   " }))).toThrow(
      FactEmptyPropositionError,
    );
  });

  it("debe rechazar source que no sea Source", () => {
    expect(() =>
      Fact.create(validParams({ source: "not-a-source" })),
    ).toThrow(FactValidationError);
  });

  it("debe rechazar source null", () => {
    expect(() =>
      Fact.create(validParams({ source: null })),
    ).toThrow(FactValidationError);
  });

  it("debe rechazar confidence que no sea Confidence", () => {
    expect(() =>
      Fact.create(validParams({ confidence: 0.5 })),
    ).toThrow(FactValidationError);
  });

  it("debe rechazar confidence null", () => {
    expect(() =>
      Fact.create(validParams({ confidence: null })),
    ).toThrow(FactValidationError);
  });
});

describe("Fact — inmutabilidad", () => {
  it("debe estar congelado (Object.freeze)", () => {
    const f = Fact.create(validParams());
    expect(Object.isFrozen(f)).toBe(true);
  });

  it("no debe permitir modificar source", () => {
    const f = Fact.create(validParams());
    expect(() => {
      (f as Record<string, unknown>).source = Source.inference();
    }).toThrow();
  });
});

describe("Fact — value object semantics", () => {
  it("equals() debe comparar type + proposition + source + confidence", () => {
    const a = Fact.create(validParams());
    const b = Fact.create(validParams());
    const c = Fact.create(
      validParams({ proposition: "destino diferente" }),
    );

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it("equals() debe detectar diferencias en source", () => {
    const a = Fact.create(validParams());
    const b = Fact.create(
      validParams({ source: Source.inference("diferente") }),
    );

    expect(a.equals(b)).toBe(false);
  });

  it("equals() debe detectar diferencias en confidence", () => {
    const a = Fact.create(validParams());
    const b = Fact.create(validParams({ confidence: Confidence.create(0.5) }));

    expect(a.equals(b)).toBe(false);
  });

  it("equals() debe ser simétrico", () => {
    const a = Fact.create(validParams());
    const b = Fact.create(validParams());
    expect(a.equals(b)).toBe(b.equals(a));
  });

  it("equals() debe ser reflexivo", () => {
    const a = Fact.create(validParams());
    expect(a.equals(a)).toBe(true);
  });
});

describe("Fact — tryCreate", () => {
  it("debe retornar Fact para params válidos", () => {
    const f = Fact.tryCreate(validParams());
    expect(f).not.toBeNull();
    expect(f!.type).toBe("origin");
  });

  it("debe retornar null para type inválido", () => {
    expect(
      Fact.tryCreate(validParams({ type: "bogus" })),
    ).toBeNull();
  });

  it("debe retornar null para proposition vacía", () => {
    expect(
      Fact.tryCreate(validParams({ proposition: "" })),
    ).toBeNull();
  });

  it("debe retornar null para source inválida", () => {
    expect(
      Fact.tryCreate(validParams({ source: "bad" })),
    ).toBeNull();
  });
});

describe("Fact — serialización", () => {
  it("toString() debe ser descriptivo", () => {
    const f = Fact.create(validParams());
    expect(f.toString()).toContain("Fact(");
    expect(f.toString()).toContain("origin");
    expect(f.toString()).toContain("Confidence(0.850)");
  });

  it("toJSON() debe incluir todos los campos", () => {
    const f = Fact.create(validParams());
    const json = f.toJSON();
    expect(json.type).toBe("origin");
    expect(json.proposition).toBe(
      "el origen es el Aeropuerto Internacional Silvio Pettirossi",
    );
    expect(json.source).toEqual({ type: "direct_extraction", detail: "regex match: origen" });
    expect(json.confidence).toBe(0.85);
  });
});
