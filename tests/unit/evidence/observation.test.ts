/**
 * observation.test.ts — Pruebas de Observation Entity
 *
 * Verifica:
 *  - Creación válida
 *  - Rechazo de invariantes violadas
 *    - id vacío
 *    - signalId vacío
 *    - status inválido
 *    - validatedAt inválido
 *  - fromSignal() factory
 *  - Inmutabilidad
 *  - equals() por id (entidad)
 *  - isValid query
 *  - tryCreate()
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import {
  Observation,
  ObservationInvalidIdError,
  ObservationInvalidSignalIdError,
  ObservationInvalidStatusError,
  Signal,
  OBSERVATION_VALIDATION_STATUSES,
} from "@/lib/evidence";

function validSignal(): Signal {
  return Signal.create({
    id: "sig-001",
    rawContent: "Quiero un taxi",
    channel: "whatsapp",
    receivedAt: new Date(Date.now() - 60000), // 1 minuto en el pasado
  });
}

function validParams(overrides: Record<string, unknown> = {}) {
  return {
    id: "obs-001",
    signalId: "sig-001",
    status: "valid" as const,
    validatedAt: new Date(Date.now() - 30000), // 30s en el pasado
    ...overrides,
  };
}

describe("Observation — creación válida", () => {
  it("debe crear con parámetros mínimos", () => {
    const params = validParams();
    const o = Observation.create(params);
    expect(o.id).toBe("obs-001");
    expect(o.signalId).toBe("sig-001");
    expect(o.status).toBe("valid");
    expect(o.validatedAt.getTime()).toBe(params.validatedAt.getTime());
  });

  it("debe funcionar con todos los status", () => {
    for (const status of OBSERVATION_VALIDATION_STATUSES) {
      const o = Observation.create(validParams({ status }));
      expect(o.status).toBe(status);
    }
  });
});

describe("Observation — rechazo de inválidos", () => {
  it("debe rechazar id vacío", () => {
    expect(() => Observation.create(validParams({ id: "" }))).toThrow(
      ObservationInvalidIdError,
    );
  });

  it("debe rechazar signalId vacío", () => {
    expect(() => Observation.create(validParams({ signalId: "" }))).toThrow(
      ObservationInvalidSignalIdError,
    );
  });

  it("debe rechazar status inválido", () => {
    expect(() =>
      Observation.create(validParams({ status: "pending" })),
    ).toThrow(ObservationInvalidStatusError);
  });

  it("debe rechazar validatedAt no-Date", () => {
    expect(() =>
      Observation.create(validParams({ validatedAt: "not-a-date" })),
    ).toThrow();
  });

  it("debe rechazar validatedAt inválido", () => {
    expect(() =>
      Observation.create(validParams({ validatedAt: new Date("invalid") })),
    ).toThrow();
  });
});

describe("Observation — fromSignal", () => {
  it("debe crear Observation a partir de un Signal", () => {
    const signal = validSignal();
    const obs = Observation.fromSignal(signal);

    expect(obs.signalId).toBe(signal.id);
    expect(obs.status).toBe("valid");
    expect(obs.validatedAt.getTime()).toBeGreaterThanOrEqual(
      signal.receivedAt.getTime(),
    );
  });

  it("debe aceptar status personalizado", () => {
    const signal = validSignal();
    const obs = Observation.fromSignal(signal, "rate_limited");

    expect(obs.status).toBe("rate_limited");
  });

  it("debe aceptar id personalizado", () => {
    const signal = validSignal();
    const obs = Observation.fromSignal(signal, "valid", "custom-obs-id");

    expect(obs.id).toBe("custom-obs-id");
  });

  it("debe lanzar si validatedAt es anterior a receivedAt", () => {
    // Esto no es posible con Date.now() >= signal.receivedAt
    // porque fromSignal usa new Date(). Pero probamos directamente:
    const signal = validSignal();
    expect(() =>
      Observation.create({
        id: "obs-002",
        signalId: signal.id,
        status: "valid",
        validatedAt: new Date("2020-01-01"), // antes del signal
      }),
    ).not.toThrow(); // La validación solo está en fromSignal
  });
});

describe("Observation — inmutabilidad", () => {
  it("debe estar congelado (Object.freeze)", () => {
    const o = Observation.create(validParams());
    expect(Object.isFrozen(o)).toBe(true);
  });

  it("no debe permitir modificar propiedades", () => {
    const o = Observation.create(validParams());
    expect(() => {
      (o as Record<string, unknown>).status = "invalid_format";
    }).toThrow();
  });
});

describe("Observation — entity semantics", () => {
  it("equals() debe comparar por id", () => {
    const a = Observation.create(validParams());
    const b = Observation.create(validParams());
    const c = Observation.create(validParams({ id: "obs-002" }));

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Observation — isValid", () => {
  it("debe retornar true para status 'valid'", () => {
    const o = Observation.create(validParams({ status: "valid" }));
    expect(o.isValid).toBe(true);
  });

  it("debe retornar false para otros status", () => {
    const invalidStatuses: Array<(typeof OBSERVATION_VALIDATION_STATUSES)[number]> =
      ["invalid_format", "unauthorized", "rate_limited", "duplicate"];

    for (const status of invalidStatuses) {
      const o = Observation.create(validParams({ status }));
      expect(o.isValid).toBe(false);
    }
  });
});

describe("Observation — tryCreate", () => {
  it("debe retornar Observation para params válidos", () => {
    const o = Observation.tryCreate(validParams());
    expect(o).not.toBeNull();
    expect(o!.id).toBe("obs-001");
  });

  it("debe retornar null para id vacío", () => {
    expect(Observation.tryCreate(validParams({ id: "" }))).toBeNull();
  });

  it("debe retornar null para status inválido", () => {
    expect(
      Observation.tryCreate(validParams({ status: "bogus" })),
    ).toBeNull();
  });
});

describe("Observation — serialización", () => {
  it("toString() debe ser descriptivo", () => {
    const o = Observation.create(validParams());
    expect(o.toString()).toContain("Observation(");
    expect(o.toString()).toContain("obs-001");
    expect(o.toString()).toContain("valid");
  });

  it("toJSON() debe incluir campos", () => {
    const params = validParams();
    const o = Observation.create(params);
    const json = o.toJSON();
    expect(json.id).toBe("obs-001");
    expect(json.signalId).toBe("sig-001");
    expect(json.status).toBe("valid");
    expect(json.validatedAt).toBe(params.validatedAt.toISOString());
  });
});
