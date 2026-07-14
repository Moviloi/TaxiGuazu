/**
 * observation.ts — Observation Entity
 *
 * ONTOLOGY §4.2 + EVIDENCE_MODEL R-EM-007
 * Una Observación es un Signal que ha pasado la validación
 * channel-level. Es la primera entidad con estatus epistémico
 * referenciable en el sistema.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4)
 *  - signalId: string no vacío — referencia al Signal original
 *  - status: ObservationValidationStatus válido
 *  - validatedAt: Date válido
 *  - validatedAt >= Signal.receivedAt (validación no puede ser anterior)
 *  - Inmutable (readonly + Object.freeze)
 *  - Identidad por id (entidad)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import {
  ObservationValidationError,
  ObservationInvalidIdError,
  ObservationInvalidSignalIdError,
  ObservationInvalidStatusError,
  ObservationTimestampBeforeSignalError,
} from './errors';
import {
  ObservationValidationStatus,
  isObservationValidationStatus,
  isNonEmptyString,
} from './types';
import { Signal } from './signal';

/**
 * Observation — Entidad inmutable.
 *
 * Representa un Signal que ha atravesado la puerta de validación,
 * obteniendo así estatus epistémico dentro del sistema.
 */
export class Observation {
  /** Identificador único de la Observación (UUID v4) */
  public readonly id: string;
  /** Identificador del Signal que originó esta Observación */
  public readonly signalId: string;
  /** Resultado de la validación channel-level */
  public readonly status: ObservationValidationStatus;
  /** Marca temporal de cuando se realizó la validación */
  public readonly validatedAt: Date;

  private constructor(params: {
    id: string;
    signalId: string;
    status: ObservationValidationStatus;
    validatedAt: Date;
  }) {
    this.id = params.id;
    this.signalId = params.signalId;
    this.status = params.status;
    this.validatedAt = params.validatedAt;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye una Observation validando todas las invariantes.
   * Lanza ObservationValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    signalId: string;
    status: ObservationValidationStatus;
    validatedAt: Date;
    /** Contexto de validación: receivedAt del Signal origen.
     *  Cuando se provee, se verifica validatedAt >= signalReceivedAt.
     *  No se almacena ni serializa. */
    signalReceivedAt?: Date;
  }): Observation {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new ObservationInvalidIdError(params.id);
    }

    // 2. Validar signalId
    if (!isNonEmptyString(params.signalId)) {
      throw new ObservationInvalidSignalIdError(params.signalId);
    }

    // 3. Validar status
    if (!isObservationValidationStatus(params.status)) {
      throw new ObservationInvalidStatusError(params.status);
    }

    // 4. Validar validatedAt
    if (!(params.validatedAt instanceof Date) || isNaN(params.validatedAt.getTime())) {
      throw new ObservationValidationError(
        'validatedAt must be a valid Date',
      );
    }

    // 5. Validar invariante temporal (contexto de validación únicamente)
    if (params.signalReceivedAt !== undefined) {
      if (params.validatedAt.getTime() < params.signalReceivedAt.getTime()) {
        throw new ObservationTimestampBeforeSignalError();
      }
    }

    return new Observation(params);
  }

  /**
   * Construye una Observation a partir de un Signal y un resultado
   * de validación. El validatedAt se establece automáticamente.
   */
  public static fromSignal(
    signal: Signal,
    status: ObservationValidationStatus = 'valid',
    id?: string,
  ): Observation {
    const now = new Date();

    return Observation.create({
      id:
        id ??
        `${crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`,
      signalId: signal.id,
      status,
      validatedAt: now,
      // Pasa receivedAt como contexto de validación para que
      // create() verifique la invariante temporal
      signalReceivedAt: signal.receivedAt,
    });
  }

  /**
   * Try-variant: retorna Observation o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    signalId: string;
    status: string;
    validatedAt: Date;
    /** Contexto de validación (no se almacena) */
    signalReceivedAt?: Date;
  }): Observation | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.signalId)) return null;
    if (!isObservationValidationStatus(params.status)) return null;
    if (!(params.validatedAt instanceof Date) || isNaN(params.validatedAt.getTime())) return null;
    if (params.signalReceivedAt !== undefined) {
      if (params.validatedAt.getTime() < params.signalReceivedAt.getTime()) return null;
    }

    return new Observation({
      id: params.id,
      signalId: params.signalId,
      status: params.status as ObservationValidationStatus,
      validatedAt: params.validatedAt,
    });
  }

  // ---------------------------------------------------------------------------
  // Entity semantics — comparación por identidad
  // ---------------------------------------------------------------------------

  /**
   * Dos Observation son la misma entidad si tienen el mismo id.
   */
  public equals(other: Observation): boolean {
    return this.id === other.id;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** ¿La validación fue exitosa? */
  public get isValid(): boolean {
    return this.status === 'valid';
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return `Observation(${this.id}: signal=${this.signalId}, status=${this.status})`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      signalId: this.signalId,
      status: this.status,
      validatedAt: this.validatedAt.toISOString(),
    };
  }
}
