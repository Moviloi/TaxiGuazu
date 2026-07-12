/**
 * signal.ts — Signal Value Object
 *
 * ONTOLOGY §3.3 + EVIDENCE_MODEL R-EM-006
 * Un Signal es la unidad más básica de información que percibe
 * el sistema, antes de cualquier interpretación o procesamiento.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4 preferido)
 *  - rawContent: string no vacío
 *  - channel: ChannelType válido
 *  - receivedAt: Date válido (no futuro)
 *  - subtype: SignalSubtype opcional
 *  - metadata: Record opcional
 *  - Inmutable (readonly + Object.freeze)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import {
  SignalValidationError,
  SignalEmptyContentError,
  SignalInvalidChannelError,
  SignalInvalidTimestampError,
  SignalInvalidIdError,
} from './errors';
import {
  ChannelType,
  SignalSubtype,
  isChannelType,
  isSignalSubtype,
  isNonEmptyString,
  isRecord,
} from './types';

/**
 * Signal — Value Object inmutable.
 *
 * Representa la materia prima perceptual del sistema.
 * Un Signal no tiene estatus epistémico — es simplemente
 * una unidad de información que espera ser procesada.
 */
export class Signal {
  /** Identificador único del Signal (UUID v4) */
  public readonly id: string;
  /** Contenido crudo del Signal (texto original) */
  public readonly rawContent: string;
  /** Canal de entrada por el que llegó el Signal */
  public readonly channel: ChannelType;
  /** Subtipo de Signal (message, time, location, system) */
  public readonly subtype: SignalSubtype | undefined;
  /** Marca temporal de recepción */
  public readonly receivedAt: Date;
  /** Metadatos adicionales del canal */
  public readonly metadata: Readonly<Record<string, unknown>> | undefined;

  private constructor(params: {
    id: string;
    rawContent: string;
    channel: ChannelType;
    subtype?: SignalSubtype;
    receivedAt: Date;
    metadata?: Record<string, unknown>;
  }) {
    this.id = params.id;
    this.rawContent = params.rawContent;
    this.channel = params.channel;
    this.subtype = params.subtype;
    this.receivedAt = params.receivedAt;
    this.metadata = params.metadata
      ? (Object.freeze({ ...params.metadata }) as Readonly<
          Record<string, unknown>
        >)
      : undefined;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Signal validando todas las invariantes.
   * Lanza SignalValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    rawContent: string;
    channel: ChannelType;
    subtype?: SignalSubtype;
    receivedAt: Date;
    metadata?: Record<string, unknown>;
  }): Signal {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new SignalInvalidIdError(params.id);
    }

    // 2. Validar rawContent
    if (!isNonEmptyString(params.rawContent)) {
      throw new SignalEmptyContentError();
    }

    // 3. Validar channel
    if (!isChannelType(params.channel)) {
      throw new SignalInvalidChannelError(params.channel);
    }

    // 4. Validar subtype (si se proporciona)
    if (params.subtype !== undefined && !isSignalSubtype(params.subtype)) {
      throw new SignalValidationError(
        `Invalid subtype: "${params.subtype}". Must be one of: message, time, location, system`,
      );
    }

    // 5. Validar receivedAt
    if (!(params.receivedAt instanceof Date) || isNaN(params.receivedAt.getTime())) {
      throw new SignalInvalidTimestampError('receivedAt must be a valid Date');
    }

    // 6. Validar metadata (si se proporciona)
    if (params.metadata !== undefined && !isRecord(params.metadata)) {
      throw new SignalValidationError('metadata must be a Record<string, unknown>');
    }

    return new Signal(params);
  }

  /**
   * Versión simplificada para tests: genera id UUID y receivedAt automáticamente.
   */
  public static basic(
    rawContent: string,
    channel: ChannelType = 'whatsapp',
    subtype?: SignalSubtype,
  ): Signal {
    return Signal.create({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      rawContent,
      channel,
      subtype,
      receivedAt: new Date(),
    });
  }

  /**
   * Try-variant: retorna Signal o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    rawContent: string;
    channel: string;
    subtype?: string;
    receivedAt: Date;
    metadata?: Record<string, unknown>;
  }): Signal | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.rawContent)) return null;
    if (!isChannelType(params.channel)) return null;
    if (params.subtype !== undefined && !isSignalSubtype(params.subtype)) return null;
    if (!(params.receivedAt instanceof Date) || isNaN(params.receivedAt.getTime())) return null;
    if (params.metadata !== undefined && !isRecord(params.metadata)) return null;

    return new Signal({
      id: params.id,
      rawContent: params.rawContent,
      channel: params.channel as ChannelType,
      subtype: params.subtype as SignalSubtype | undefined,
      receivedAt: params.receivedAt,
      metadata: params.metadata,
    });
  }

  // ---------------------------------------------------------------------------
  // Value Object semantics
  // ---------------------------------------------------------------------------

  /**
   * Comparación por valor: dos Signal son iguales si tienen el mismo id.
   * Aunque Signal es value object, el id lo identifica unívocamente
   * porque cada Signal es una recepción única.
   */
  public equals(other: Signal): boolean {
    return this.id === other.id;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return `Signal(${this.id}: ${this.channel} | "${this.rawContent.slice(0, 50)}${this.rawContent.length > 50 ? '...' : ''}")`;
  }

  public toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = {
      id: this.id,
      rawContent: this.rawContent,
      channel: this.channel,
      receivedAt: this.receivedAt.toISOString(),
    };
    if (this.subtype !== undefined) {
      json.subtype = this.subtype;
    }
    if (this.metadata !== undefined) {
      json.metadata = this.metadata;
    }
    return json;
  }
}
