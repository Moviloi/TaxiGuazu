/**
 * signal.test.ts — Pruebas de Signal Value Object
 *
 * Verifica:
 *  - Creación válida con todos los campos
 *  - Rechazo de invariantes violadas
 *    - id vacío
 *    - rawContent vacío
 *    - channel inválido
 *    - receivedAt inválido
 *  - Signal.basic() factory simplificada
 *  - Inmutabilidad
 *  - equals() por id
 *  - tryCreate()
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import {
  Signal,
  SignalEmptyContentError,
  SignalInvalidChannelError,
  SignalInvalidTimestampError,
  SignalInvalidIdError,
  CHANNEL_TYPES,
  SIGNAL_SUBTYPES,
} from "@/lib/evidence";

function validParams(overrides: Record<string, unknown> = {}) {
  return {
    id: "550e8400-e29b-41d4-a716-446655440000",
    rawContent: "Necesito un taxi para el aeropuerto",
    channel: "whatsapp" as const,
    receivedAt: new Date("2026-07-12T12:00:00Z"),
    ...overrides,
  };
}

describe("Signal — creación válida", () => {
  it("debe crear con parámetros mínimos", () => {
    const s = Signal.create(validParams());
    expect(s.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(s.rawContent).toBe("Necesito un taxi para el aeropuerto");
    expect(s.channel).toBe("whatsapp");
    expect(s.subtype).toBeUndefined();
    expect(s.metadata).toBeUndefined();
  });

  it("debe aceptar subtype opcional", () => {
    const s = Signal.create(validParams({ subtype: "message" }));
    expect(s.subtype).toBe("message");
  });

  it("debe aceptar metadata opcional", () => {
    const meta = { phone: "595981111111", mediaType: "text" };
    const s = Signal.create(validParams({ metadata: meta }));
    expect(s.metadata).toEqual(meta);
  });

  it("debe funcionar con todos los canales", () => {
    for (const channel of CHANNEL_TYPES) {
      const s = Signal.create(validParams({ channel }));
      expect(s.channel).toBe(channel);
    }
  });

  it("debe funcionar con todos los subtypes", () => {
    for (const subtype of SIGNAL_SUBTYPES) {
      const s = Signal.create(validParams({ subtype }));
      expect(s.subtype).toBe(subtype);
    }
  });

  it("debe preservar el contenido multilínea", () => {
    const content = "Línea 1\nLínea 2\nLínea 3";
    const s = Signal.create(validParams({ rawContent: content }));
    expect(s.rawContent).toBe(content);
  });
});

describe("Signal — rechazo de inválidos", () => {
  it("debe rechazar id vacío", () => {
    expect(() => Signal.create(validParams({ id: "" }))).toThrow(
      SignalInvalidIdError,
    );
  });

  it("debe rechazar id con solo espacios", () => {
    expect(() => Signal.create(validParams({ id: "   " }))).toThrow(
      SignalInvalidIdError,
    );
  });

  it("debe rechazar rawContent vacío", () => {
    expect(() => Signal.create(validParams({ rawContent: "" }))).toThrow(
      SignalEmptyContentError,
    );
  });

  it("debe rechazar rawContent solo espacios", () => {
    expect(() => Signal.create(validParams({ rawContent: "   " }))).toThrow(
      SignalEmptyContentError,
    );
  });

  it("debe rechazar channel inválido", () => {
    expect(() =>
      Signal.create(validParams({ channel: "telegram" })),
    ).toThrow(SignalInvalidChannelError);
  });

  it("debe rechazar receivedAt no-Date", () => {
    expect(() =>
      Signal.create(validParams({ receivedAt: "not-a-date" })),
    ).toThrow(SignalInvalidTimestampError);
  });

  it("debe rechazar receivedAt inválido (Invalid Date)", () => {
    expect(() =>
      Signal.create(validParams({ receivedAt: new Date("invalid") })),
    ).toThrow(SignalInvalidTimestampError);
  });

  it("debe rechazar subtype inválido", () => {
    expect(() =>
      Signal.create(validParams({ subtype: "audio" })),
    ).toThrow();
  });

  it("debe rechazar metadata no objeto", () => {
    expect(() =>
      Signal.create(validParams({ metadata: "not-a-record" })),
    ).toThrow();
  });
});

describe("Signal — basic() factory", () => {
  it("debe generar id automáticamente", () => {
    const s = Signal.basic("Hola");
    expect(s.id).toBeTruthy();
    expect(typeof s.id).toBe("string");
    expect(s.id.length).toBeGreaterThan(0);
  });

  it("debe establecer receivedAt automáticamente", () => {
    const before = new Date();
    const s = Signal.basic("Hola");
    const after = new Date();
    expect(s.receivedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(s.receivedAt.getTime()).toBeLessThanOrEqual(after.getTime());
  });

  it("debe aceptar channel opcional (default whatsapp)", () => {
    const s = Signal.basic("Hola");
    expect(s.channel).toBe("whatsapp");
  });

  it("debe aceptar channel personalizado", () => {
    const s = Signal.basic("Hola", "admin_api");
    expect(s.channel).toBe("admin_api");
  });
});

describe("Signal — inmutabilidad", () => {
  it("debe estar congelado (Object.freeze)", () => {
    const s = Signal.create(validParams());
    expect(Object.isFrozen(s)).toBe(true);
  });

  it("no debe permitir modificar propiedades", () => {
    const s = Signal.create(validParams());
    expect(() => {
      (s as Record<string, unknown>).rawContent = "modificado";
    }).toThrow();
  });

  it("metadata debe estar congelado", () => {
    const meta = { phone: "595981111111" };
    const s = Signal.create(validParams({ metadata: meta }));
    expect(Object.isFrozen(s.metadata)).toBe(true);
  });
});

describe("Signal — value object semantics", () => {
  it("equals() debe comparar por id", () => {
    const id = "550e8400-e29b-41d4-a716-446655440000";
    const a = Signal.create(validParams({ id }));
    const b = Signal.create(validParams({ id }));
    const c = Signal.create(
      validParams({ id: "another-id", rawContent: "otro texto" }),
    );

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });
});

describe("Signal — tryCreate", () => {
  it("debe retornar Signal para params válidos", () => {
    const s = Signal.tryCreate(validParams());
    expect(s).not.toBeNull();
    expect(s!.rawContent).toBe("Necesito un taxi para el aeropuerto");
  });

  it("debe retornar null para id vacío", () => {
    expect(Signal.tryCreate(validParams({ id: "" }))).toBeNull();
  });

  it("debe retornar null para channel inválido", () => {
    expect(
      Signal.tryCreate(validParams({ channel: "telegram" })),
    ).toBeNull();
  });

  it("debe retornar null para receivedAt inválido", () => {
    expect(
      Signal.tryCreate(validParams({ receivedAt: new Date("invalid") })),
    ).toBeNull();
  });
});

describe("Signal — serialización", () => {
  it("toString() debe ser descriptivo", () => {
    const s = Signal.create(validParams());
    expect(s.toString()).toContain("Signal(");
    expect(s.toString()).toContain("whatsapp");
    expect(s.toString()).toContain("aeropuerto");
  });

  it("toString() debe truncar contenido largo", () => {
    const longContent = "a".repeat(200);
    const s = Signal.create(validParams({ rawContent: longContent }));
    expect(s.toString()).toContain("...");
  });

  it("toJSON() debe incluir campos principales", () => {
    const s = Signal.create(validParams());
    const json = s.toJSON();
    expect(json.id).toBe("550e8400-e29b-41d4-a716-446655440000");
    expect(json.channel).toBe("whatsapp");
    expect(json.rawContent).toBe("Necesito un taxi para el aeropuerto");
    expect(json.receivedAt).toBe("2026-07-12T12:00:00.000Z");
  });

  it("toJSON() debe incluir subtype si existe", () => {
    const s = Signal.create(validParams({ subtype: "location" }));
    expect(s.toJSON().subtype).toBe("location");
  });

  it("toJSON() debe incluir metadata si existe", () => {
    const s = Signal.create(validParams({ metadata: { key: "val" } }));
    expect(s.toJSON().metadata).toEqual({ key: "val" });
  });
});
