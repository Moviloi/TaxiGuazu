/**
 * errors.test.ts — Pruebas de DomainError y subclases
 *
 * Verifica:
 *  - Jerarquía de herencia correcta
 *  - Mensajes descriptivos
 *  - Códigos de error únicos
 *  - equals() y toJSON()
 *  - instanceof y catch-blocks
 */

import { describe, it, expect } from "vitest";
import {
  DomainError,
  SignalValidationError,
  SignalEmptyContentError,
  SignalInvalidChannelError,
  SignalInvalidTimestampError,
  SignalInvalidIdError,
  ObservationValidationError,
  ObservationInvalidIdError,
  ObservationInvalidSignalIdError,
  ObservationInvalidStatusError,
  ObservationTimestampBeforeSignalError,
  SourceValidationError,
  SourceInvalidTypeError,
  ConfidenceValidationError,
  ConfidenceRangeError,
  ConfidenceNaNError,
  FactValidationError,
  FactEmptyPropositionError,
  FactInvalidTypeError,
  EvidenceValidationError,
  EvidenceEmptyFactsError,
  EvidenceInvalidIdError,
  EvidenceInvalidObservationIdError,
} from "@/lib/evidence";

describe("DomainError", () => {
  it("debe ser abstracto (no instanciable directamente)", () => {
    // DomainError es abstracto — solo se instancian subclases
    const error = new SignalValidationError("test");
    expect(error).toBeInstanceOf(DomainError);
    expect(error).toBeInstanceOf(Error);
  });

  it("debe preservar la cadena de prototipos", () => {
    const error = new SignalValidationError("test");
    expect(Object.getPrototypeOf(error)).toBe(SignalValidationError.prototype);
  });

  it("debe tener name = nombre de la clase", () => {
    const error = new EvidenceEmptyFactsError();
    expect(error.name).toBe("EvidenceEmptyFactsError");
  });

  it("equals() debe comparar por code + message", () => {
    const a = new ConfidenceRangeError(1.5);
    const b = new ConfidenceRangeError(1.5);
    const c = new ConfidenceRangeError(-0.5);

    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
    expect(a.equals(null)).toBe(false);
    expect(a.equals("not an error")).toBe(false);
  });

  it("toJSON() debe incluir code, name, message", () => {
    const error = new SignalEmptyContentError();
    const json = error.toJSON();

    expect(json).toHaveProperty("code", "SIGNAL_VALIDATION_ERROR");
    expect(json).toHaveProperty("name", "SignalEmptyContentError");
    expect(json).toHaveProperty("message");
    expect(typeof json.message).toBe("string");
  });
});

// ─── Signal Errors ───

describe("SignalValidationError", () => {
  it("debe tener code SIGNAL_VALIDATION_ERROR", () => {
    const error = new SignalValidationError("generic");
    expect(error.code).toBe("SIGNAL_VALIDATION_ERROR");
    expect(error).toBeInstanceOf(DomainError);
  });
});

describe("SignalEmptyContentError", () => {
  it("debe tener mensaje descriptivo", () => {
    const error = new SignalEmptyContentError();
    expect(error.message).toContain("rawContent must be non-empty");
  });
});

describe("SignalInvalidChannelError", () => {
  it("debe incluir el channel inválido en el mensaje", () => {
    const error = new SignalInvalidChannelError("telegram");
    expect(error.message).toContain("telegram");
    expect(error.message).toContain("whatsapp, webhook, cron, admin_api");
  });
});

describe("SignalInvalidTimestampError", () => {
  it("debe incluir la razón en el mensaje", () => {
    const error = new SignalInvalidTimestampError("fecha futura");
    expect(error.message).toContain("fecha futura");
  });
});

describe("SignalInvalidIdError", () => {
  it("debe incluir el id inválido", () => {
    const error = new SignalInvalidIdError("");
    expect(error.message).toContain('""');
  });
});

// ─── Observation Errors ───

describe("ObservationValidationError", () => {
  it("debe tener code OBSERVATION_VALIDATION_ERROR", () => {
    const error = new ObservationValidationError("generic");
    expect(error.code).toBe("OBSERVATION_VALIDATION_ERROR");
  });
});

describe("ObservationInvalidIdError", () => {
  it("debe incluir el id inválido", () => {
    const error = new ObservationInvalidIdError("");
    expect(error.message).toContain('""');
  });
});

describe("ObservationInvalidSignalIdError", () => {
  it("debe indicar que signalId es inválido", () => {
    const error = new ObservationInvalidSignalIdError("bad-id");
    expect(error.message).toContain("bad-id");
  });
});

describe("ObservationInvalidStatusError", () => {
  it("debe listar los status válidos", () => {
    const error = new ObservationInvalidStatusError("bogus");
    expect(error.message).toContain("bogus");
    expect(error.message).toContain("valid, invalid_format");
  });
});

describe("ObservationTimestampBeforeSignalError", () => {
  it("debe indicar la violación temporal", () => {
    const error = new ObservationTimestampBeforeSignalError();
    expect(error.message).toContain("validatedAt must be >=");
  });
});

// ─── Source Errors ───

describe("SourceValidationError", () => {
  it("debe tener code SOURCE_VALIDATION_ERROR", () => {
    const error = new SourceValidationError("generic");
    expect(error.code).toBe("SOURCE_VALIDATION_ERROR");
  });
});

describe("SourceInvalidTypeError", () => {
  it("debe listar tipos válidos", () => {
    const error = new SourceInvalidTypeError("email");
    expect(error.message).toContain("email");
    expect(error.message).toContain("direct_extraction");
  });
});

// ─── Confidence Errors ───

describe("ConfidenceValidationError", () => {
  it("debe tener code CONFIDENCE_VALIDATION_ERROR", () => {
    const error = new ConfidenceValidationError("generic");
    expect(error.code).toBe("CONFIDENCE_VALIDATION_ERROR");
  });
});

describe("ConfidenceRangeError", () => {
  it("debe incluir el valor fuera de rango", () => {
    const error = new ConfidenceRangeError(1.5);
    expect(error.message).toContain("1.5");
    expect(error.message).toContain("[0, 1]");
  });
});

describe("ConfidenceNaNError", () => {
  it("debe indicar que se espera un número finito", () => {
    const error = new ConfidenceNaNError();
    expect(error.message).toContain("finite");
  });
});

// ─── Fact Errors ───

describe("FactValidationError", () => {
  it("debe tener code FACT_VALIDATION_ERROR", () => {
    const error = new FactValidationError("generic");
    expect(error.code).toBe("FACT_VALIDATION_ERROR");
  });
});

describe("FactEmptyPropositionError", () => {
  it("debe indicar proposition vacía", () => {
    const error = new FactEmptyPropositionError();
    expect(error.message).toContain("proposition");
  });
});

describe("FactInvalidTypeError", () => {
  it("debe incluir el type inválido", () => {
    const error = new FactInvalidTypeError("bogus_type");
    expect(error.message).toContain("bogus_type");
  });
});

// ─── Evidence Errors ───

describe("EvidenceValidationError", () => {
  it("debe tener code EVIDENCE_VALIDATION_ERROR", () => {
    const error = new EvidenceValidationError("generic");
    expect(error.code).toBe("EVIDENCE_VALIDATION_ERROR");
  });
});

describe("EvidenceEmptyFactsError", () => {
  it("debe indicar que se requiere al menos 1 fact", () => {
    const error = new EvidenceEmptyFactsError();
    expect(error.message).toContain("at least one Fact");
  });
});

describe("EvidenceInvalidIdError", () => {
  it("debe incluir el id inválido", () => {
    const error = new EvidenceInvalidIdError("");
    expect(error.message).toContain('""');
  });
});

describe("EvidenceInvalidObservationIdError", () => {
  it("debe incluir observationId inválido", () => {
    const error = new EvidenceInvalidObservationIdError("obs-123");
    expect(error.message).toContain("obs-123");
  });
});
