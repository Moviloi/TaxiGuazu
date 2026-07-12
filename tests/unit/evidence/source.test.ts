/**
 * source.test.ts — Pruebas de Source Value Object
 *
 * Verifica:
 *  - Creación con type válido/inválido
 *  - Detail opcional
 *  - Factory methods predefinidos
 *  - Inmutabilidad
 *  - equals() por valor
 *  - tryCreate
 *  - Serialización
 */

import { describe, it, expect } from "vitest";
import {
  Source,
  SourceInvalidTypeError,
  SourceType,
  SOURCE_TYPES,
} from "@/lib/evidence";

describe("Source — creación", () => {
  it("debe crear con type válido", () => {
    const s = Source.create("direct_extraction");
    expect(s.type).toBe("direct_extraction");
  });

  it("debe aceptar detail opcional", () => {
    const s = Source.create("direct_extraction", "regex pattern /origen/");
    expect(s.detail).toBe("regex pattern /origen/");
  });

  it("debe lanzar SourceInvalidTypeError para type inválido", () => {
    expect(() => Source.create("invalid_type" as SourceType)).toThrow(
      SourceInvalidTypeError,
    );
  });

  it("debe funcionar con todos los SOURCE_TYPES", () => {
    for (const type of SOURCE_TYPES) {
      const s = Source.create(type);
      expect(s.type).toBe(type);
    }
  });

  it("debe aceptar detail undefined", () => {
    const s = Source.create("llm_inference");
    expect(s.detail).toBeUndefined();
  });

  it("debe aceptar detail string vacío", () => {
    const s = Source.create("inference", "");
    expect(s.detail).toBe("");
  });
});

describe("Source — inmutabilidad", () => {
  it("debe ser inmutable (Object.freeze)", () => {
    const s = Source.create("user_confirmation");
    expect(Object.isFrozen(s)).toBe(true);
  });

  it("no debe permitir modificar type", () => {
    const s = Source.create("user_confirmation");
    expect(() => {
      (s as Record<string, unknown>).type = "inference";
    }).toThrow();
  });
});

describe("Source — factory methods predefinidos", () => {
  it("directExtraction()", () => {
    const s = Source.directExtraction("regex match");
    expect(s.type).toBe("direct_extraction");
    expect(s.detail).toBe("regex match");
  });

  it("inference()", () => {
    const s = Source.inference();
    expect(s.type).toBe("inference");
    expect(s.detail).toBeUndefined();
  });

  it("userConfirmation()", () => {
    const s = Source.userConfirmation("user said 'yes'");
    expect(s.type).toBe("user_confirmation");
  });

  it("knowledgeBaseLookup()", () => {
    const s = Source.knowledgeBaseLookup("tariff DB");
    expect(s.type).toBe("knowledge_base_lookup");
  });

  it("defaultvalue()", () => {
    const s = Source.defaultvalue("fallback");
    expect(s.type).toBe("default_value");
  });

  it("llmInference()", () => {
    const s = Source.llmInference("Groq response");
    expect(s.type).toBe("llm_inference");
  });

  it("silenceDetection()", () => {
    const s = Source.silenceDetection("no response in 5 min");
    expect(s.type).toBe("silence_detection");
  });
});

describe("Source — value object semantics", () => {
  it("equals() debe comparar type + detail", () => {
    const a = Source.create("direct_extraction", "regex");
    const b = Source.create("direct_extraction", "regex");
    const c = Source.create("direct_extraction", "different");
    const d = Source.create("inference", "regex");

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(d)).toBe(false);
  });

  it("dos Sources sin detail deben ser iguales si mismo type", () => {
    const a = Source.create("user_confirmation");
    const b = Source.create("user_confirmation");
    expect(a.equals(b)).toBe(true);
  });

  it("equals debe ser simétrico", () => {
    const a = Source.create("llm_inference", "detail");
    const b = Source.create("llm_inference", "detail");
    expect(a.equals(b)).toBe(b.equals(a));
  });
});

describe("Source — tryCreate", () => {
  it("debe retornar Source para type válido", () => {
    const s = Source.tryCreate("direct_extraction");
    expect(s).not.toBeNull();
    expect(s!.type).toBe("direct_extraction");
  });

  it("debe retornar null para type inválido", () => {
    expect(Source.tryCreate("bogus")).toBeNull();
  });

  it("debe manejar detail opcional", () => {
    const s = Source.tryCreate("inference", "some detail");
    expect(s).not.toBeNull();
    expect(s!.detail).toBe("some detail");
  });
});

describe("Source — serialización", () => {
  it("toString() sin detail", () => {
    const s = Source.create("user_confirmation");
    expect(s.toString()).toBe("Source(user_confirmation)");
  });

  it("toString() con detail", () => {
    const s = Source.create("direct_extraction", "regex match");
    expect(s.toString()).toBe("Source(direct_extraction: regex match)");
  });

  it("toJSON() sin detail", () => {
    const s = Source.create("user_confirmation");
    expect(s.toJSON()).toEqual({ type: "user_confirmation" });
  });

  it("toJSON() con detail", () => {
    const s = Source.create("inference", "contextual");
    expect(s.toJSON()).toEqual({ type: "inference", detail: "contextual" });
  });
});
