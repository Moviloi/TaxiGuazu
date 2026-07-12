/**
 * evidence.test.ts — Pruebas de Evidence Entity
 *
 * Verifica:
 *  - Creación válida con facts
 *  - Rechazo de invariantes violadas
 *    - facts vacío
 *    - id vacío
 *    - observationId vacío
 *    - type inválido
 *    - elements no-Fact en facts
 *  - fromObservation() factory
 *  - Inmutabilidad
 *  - equals() por id (entidad)
 *  - Queries: factCount, factsByType, averageConfidence
 *  - tryCreate()
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import {
  Evidence,
  EvidenceEmptyFactsError,
  EvidenceInvalidIdError,
  EvidenceInvalidObservationIdError,
  EvidenceValidationError,
  Fact,
  Source,
  Confidence,
  EVIDENCE_TYPES,
} from "@/lib/evidence";

function makeFact(type: string, proposition: string, confidenceVal = 0.85): Fact {
  return Fact.create({
    type: type as any,
    proposition,
    source: Source.directExtraction(),
    confidence: Confidence.create(confidenceVal),
  });
}

function validParams(overrides: Record<string, unknown> = {}) {
  return {
    id: "ev-001",
    observationId: "obs-001",
    facts: [makeFact("origin", "origen es el aeropuerto"), makeFact("destination", "destino es el centro")],
    type: "user_input" as const,
    createdAt: new Date(Date.now() - 10000),
    ...overrides,
  };
}

describe("Evidence — creación válida", () => {
  it("debe crear con 1 fact mínimo", () => {
    const e = Evidence.create(validParams({ facts: [makeFact("origin", "origen")] }));
    expect(e.facts.length).toBe(1);
    expect(e.type).toBe("user_input");
  });

  it("debe crear con múltiples facts", () => {
    const e = Evidence.create(validParams());
    expect(e.facts.length).toBe(2);
  });

  it("debe crear con todos los EvidenceTypes", () => {
    for (const type of EVIDENCE_TYPES) {
      const e = Evidence.create(validParams({ type }));
      expect(e.type).toBe(type);
    }
  });

  it("debe aceptar provenance opcional", () => {
    const e = Evidence.create(validParams({ provenance: ["ev-000"] }));
    expect(e.provenance).toEqual(["ev-000"]);
  });

  it("debe tener provenance vacío por defecto", () => {
    const e = Evidence.create(validParams());
    expect(e.provenance).toEqual([]);
  });
});

describe("Evidence — rechazo de inválidos", () => {
  it("debe rechazar facts vacío", () => {
    expect(() =>
      Evidence.create(validParams({ facts: [] })),
    ).toThrow(EvidenceEmptyFactsError);
  });

  it("debe rechazar facts no-array", () => {
    expect(() =>
      Evidence.create(validParams({ facts: "not-array" })),
    ).toThrow(EvidenceEmptyFactsError);
  });

  it("debe rechazar id vacío", () => {
    expect(() => Evidence.create(validParams({ id: "" }))).toThrow(
      EvidenceInvalidIdError,
    );
  });

  it("debe rechazar observationId vacío", () => {
    expect(() =>
      Evidence.create(validParams({ observationId: "" })),
    ).toThrow(EvidenceInvalidObservationIdError);
  });

  it("debe rechazar type inválido", () => {
    expect(() =>
      Evidence.create(validParams({ type: "invalid_type" })),
    ).toThrow(EvidenceValidationError);
  });

  it("debe rechazar elements no-Fact en facts", () => {
    expect(() =>
      Evidence.create(validParams({ facts: ["not-a-fact" as any] })),
    ).toThrow(EvidenceValidationError);
  });

  it("debe rechazar createdAt no-Date", () => {
    expect(() =>
      Evidence.create(validParams({ createdAt: "invalid" })),
    ).toThrow(EvidenceValidationError);
  });

  it("debe rechazar provenance no-array", () => {
    expect(() =>
      Evidence.create(validParams({ provenance: "not-array" as any })),
    ).toThrow(EvidenceValidationError);
  });

  it("debe rechazar provenance con strings vacías", () => {
    expect(() =>
      Evidence.create(validParams({ provenance: [""] })),
    ).toThrow(EvidenceValidationError);
  });
});

describe("Evidence — fromObservation", () => {
  it("debe crear Evidence con tipo user_input por defecto", () => {
    const e = Evidence.fromObservation("obs-001", [makeFact("origin", "origen")]);
    expect(e.observationId).toBe("obs-001");
    expect(e.type).toBe("user_input");
    expect(e.facts.length).toBe(1);
  });

  it("debe aceptar type personalizado", () => {
    const e = Evidence.fromObservation("obs-001", [makeFact("origin", "origen")], "system_inference");
    expect(e.type).toBe("system_inference");
  });

  it("debe aceptar provenance", () => {
    const e = Evidence.fromObservation("obs-001", [makeFact("origin", "origen")], "user_input", ["ev-000"]);
    expect(e.provenance).toEqual(["ev-000"]);
  });

  it("debe generar id automáticamente", () => {
    const e = Evidence.fromObservation("obs-001", [makeFact("origin", "origen")]);
    expect(e.id).toBeTruthy();
    expect(typeof e.id).toBe("string");
  });
});

describe("Evidence — inmutabilidad", () => {
  it("debe estar congelado (Object.freeze)", () => {
    const e = Evidence.create(validParams());
    expect(Object.isFrozen(e)).toBe(true);
  });

  it("no debe permitir modificar facts", () => {
    const e = Evidence.create(validParams());
    expect(() => {
      (e as Record<string, unknown>).facts = [];
    }).toThrow();
  });
});

describe("Evidence — entity semantics", () => {
  it("equals() debe comparar por id", () => {
    const a = Evidence.create(validParams());
    const b = Evidence.create(validParams());
    const c = Evidence.create(validParams({ id: "ev-002" }));

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Evidence — queries", () => {
  it("factCount debe retornar cantidad de facts", () => {
    const e = Evidence.create(validParams());
    expect(e.factCount).toBe(2);
  });

  it("factCount debe ser 1 con un solo fact", () => {
    const e = Evidence.create(validParams({ facts: [makeFact("origin", "origen")] }));
    expect(e.factCount).toBe(1);
  });

  it("factsByType debe filtrar por tipo", () => {
    const e = Evidence.create(validParams());
    const origins = e.factsByType("origin");
    expect(origins.length).toBe(1);
    expect(origins[0].type).toBe("origin");
  });

  it("factsByType debe retornar array vacío si no hay match", () => {
    const e = Evidence.create(validParams());
    const flights = e.factsByType("flight_number");
    expect(flights).toEqual([]);
  });

  it("averageConfidence debe calcular promedio", () => {
    const e = Evidence.create(
      validParams({
        facts: [
          makeFact("origin", "origen", 0.9),
          makeFact("destination", "destino", 0.7),
        ],
      }),
    );
    expect(e.averageConfidence).toBe(0.8);
  });

  it("averageConfidence debe ser 0 con un fact de confidence 0", () => {
    const e = Evidence.create(
      validParams({
        facts: [makeFact("origin", "origen", 0)],
      }),
    );
    expect(e.averageConfidence).toBe(0);
  });
});

describe("Evidence — tryCreate", () => {
  it("debe retornar Evidence para params válidos", () => {
    const e = Evidence.tryCreate(validParams());
    expect(e).not.toBeNull();
    expect(e!.id).toBe("ev-001");
  });

  it("debe retornar null para id vacío", () => {
    expect(Evidence.tryCreate(validParams({ id: "" }))).toBeNull();
  });

  it("debe retornar null para facts vacío", () => {
    expect(Evidence.tryCreate(validParams({ facts: [] }))).toBeNull();
  });

  it("debe retornar null para type inválido", () => {
    expect(
      Evidence.tryCreate(validParams({ type: "bogus" })),
    ).toBeNull();
  });
});

describe("Evidence — serialización", () => {
  it("toString() debe ser descriptivo", () => {
    const e = Evidence.create(validParams());
    expect(e.toString()).toContain("Evidence(");
    expect(e.toString()).toContain("ev-001");
    expect(e.toString()).toContain("obs=obs-001");
    expect(e.toString()).toContain("facts=2");
    expect(e.toString()).toContain("user_input");
  });

  it("toJSON() debe incluir todos los campos", () => {
    const params = validParams();
    const e = Evidence.create(params);
    const json = e.toJSON();
    expect(json.id).toBe("ev-001");
    expect(json.observationId).toBe("obs-001");
    expect(json.type).toBe("user_input");
    expect(json.createdAt).toBe(params.createdAt.toISOString());
    expect(json.provenance).toEqual([]);
    expect(json.facts).toBeInstanceOf(Array);
    expect(json.facts).toHaveLength(2);
  });
});
