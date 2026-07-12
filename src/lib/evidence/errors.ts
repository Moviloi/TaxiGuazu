/**
 * errors.ts — Jerarquía de DomainError para el Evidence Engine
 *
 * Arquitectura Freeze V2 | EVIDENCE_MODEL R-EM-001 a R-EM-020
 * Invarianza: todo error de dominio hereda de DomainError para
 * garantizar manejo homogéneo en catch-blocks.
 *
 * ONTOLOGY §7.1 — Domain Errors
 */

/**
 * DomainError — Raíz de la jerarquía de errores de dominio.
 * Todos los errores del Evidence Engine heredan de esta clase.
 */
export abstract class DomainError extends Error {
  public abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;

    // Garantiza cadena de prototipos correcta en TS < 2.1
    Object.setPrototypeOf(this, new.target.prototype);
  }

  /**
   * Comparación semántica: dos DomainError son iguales
   * si tienen el mismo code y message.
   */
  public equals(other: unknown): boolean {
    return (
      other instanceof DomainError &&
      other.code === this.code &&
      other.message === this.message
    );
  }

  public toJSON(): Record<string, unknown> {
    return {
      code: this.code,
      name: this.name,
      message: this.message,
    };
  }
}

// ---------------------------------------------------------------------------
// Señales (Signal)
// ---------------------------------------------------------------------------

export class SignalValidationError extends DomainError {
  public readonly code = 'SIGNAL_VALIDATION_ERROR';

  constructor(message: string) {
    super(`SignalValidationError: ${message}`);
  }
}

export class SignalEmptyContentError extends SignalValidationError {
  constructor() {
    super('Signal rawContent must be non-empty string');
  }
}

export class SignalInvalidChannelError extends SignalValidationError {
  constructor(channel: string) {
    super(`Invalid channel: "${channel}". Must be one of: whatsapp, webhook, cron, admin_api`);
  }
}

export class SignalInvalidTimestampError extends SignalValidationError {
  constructor(reason: string) {
    super(`Invalid timestamp: ${reason}`);
  }
}

export class SignalInvalidIdError extends SignalValidationError {
  constructor(id: string) {
    super(`Invalid Signal id: "${id}". Must be a non-empty string (preferably UUID v4)`);
  }
}

// ---------------------------------------------------------------------------
// Observaciones (Observation)
// ---------------------------------------------------------------------------

export class ObservationValidationError extends DomainError {
  public readonly code = 'OBSERVATION_VALIDATION_ERROR';

  constructor(message: string) {
    super(`ObservationValidationError: ${message}`);
  }
}

export class ObservationInvalidIdError extends ObservationValidationError {
  constructor(id: string) {
    super(`Invalid Observation id: "${id}". Must be a non-empty string`);
  }
}

export class ObservationInvalidSignalIdError extends ObservationValidationError {
  constructor(signalId: string) {
    super(`Invalid signalId: "${signalId}". Observation must reference a valid Signal`);
  }
}

export class ObservationInvalidStatusError extends ObservationValidationError {
  constructor(status: string) {
    super(
      `Invalid validationStatus: "${status}". Must be one of: valid, invalid_format, unauthorized, rate_limited, duplicate`,
    );
  }
}

export class ObservationTimestampBeforeSignalError extends ObservationValidationError {
  constructor() {
    super('Observation validatedAt must be >= Signal receivedAt');
  }
}

// ---------------------------------------------------------------------------
// Fuentes (Source)
// ---------------------------------------------------------------------------

export class SourceValidationError extends DomainError {
  public readonly code = 'SOURCE_VALIDATION_ERROR';

  constructor(message: string) {
    super(`SourceValidationError: ${message}`);
  }
}

export class SourceInvalidTypeError extends SourceValidationError {
  constructor(type: string) {
    super(
      `Invalid source type: "${type}". Must be one of: direct_extraction, inference, user_confirmation, knowledge_base_lookup, default_value, llm_inference, silence_detection`,
    );
  }
}

// ---------------------------------------------------------------------------
// Confianza (Confidence)
// ---------------------------------------------------------------------------

export class ConfidenceValidationError extends DomainError {
  public readonly code = 'CONFIDENCE_VALIDATION_ERROR';

  constructor(message: string) {
    super(`ConfidenceValidationError: ${message}`);
  }
}

export class ConfidenceRangeError extends ConfidenceValidationError {
  constructor(value: number) {
    super(`Confidence value ${value} is outside valid range [0, 1]`);
  }
}

export class ConfidenceNaNError extends ConfidenceValidationError {
  constructor() {
    super('Confidence value must be a finite number');
  }
}

// ---------------------------------------------------------------------------
// Hechos (Fact)
// ---------------------------------------------------------------------------

export class FactValidationError extends DomainError {
  public readonly code = 'FACT_VALIDATION_ERROR';

  constructor(message: string) {
    super(`FactValidationError: ${message}`);
  }
}

export class FactEmptyPropositionError extends FactValidationError {
  constructor() {
    super('Fact proposition must be a non-empty string');
  }
}

export class FactInvalidTypeError extends FactValidationError {
  constructor(type: string) {
    super(`Invalid Fact type: "${type}"`);
  }
}

// ---------------------------------------------------------------------------
// Evidencia (Evidence)
// ---------------------------------------------------------------------------

export class EvidenceValidationError extends DomainError {
  public readonly code = 'EVIDENCE_VALIDATION_ERROR';

  constructor(message: string) {
    super(`EvidenceValidationError: ${message}`);
  }
}

export class EvidenceEmptyFactsError extends EvidenceValidationError {
  constructor() {
    super('Evidence must contain at least one Fact');
  }
}

export class EvidenceInvalidIdError extends EvidenceValidationError {
  constructor(id: string) {
    super(`Invalid Evidence id: "${id}". Must be a non-empty string`);
  }
}

export class EvidenceInvalidObservationIdError extends EvidenceValidationError {
  constructor(obsId: string) {
    super(`Invalid observationId: "${obsId}". Evidence must reference a valid Observation`);
  }
}
