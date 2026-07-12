/**
 * fact.ts — Fact Value Object
 *
 * ONTOLOGY §4.3 + EVIDENCE_MODEL R-EM-008
 * Un Fact es la unidad atómica más pequeña de significado
 * extraída de una Observación. Cada Fact es una proposición
 * atómica sobre el mundo, que puede ser verdadera o falsa.
 *
 * Invariantes:
 *  - type: FactType válido
 *  - proposition: string no vacío
 *  - source: Source (value object)
 *  - confidence: Confidence (value object)
 *  - Inmutable (readonly + Object.freeze)
 *  - Se compara por valor (type + proposition + source + confidence)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import { FactValidationError, FactEmptyPropositionError, FactInvalidTypeError } from './errors';
import { FactType, isFactType, isNonEmptyString } from './types';
import { Source } from './source';
import { Confidence } from './confidence';

/**
 * Fact — Value Object inmutable.
 *
 * Representa una proposición atómica extraída de una Observación.
 * Los Facts son los átomos del sistema epistémico.
 */
export class Fact {
  /** Tipo de hecho (origin, destination, etc.) */
  public readonly type: FactType;
  /** Proposición atómica en lenguaje natural (ej: "el origen es el Aeropuerto") */
  public readonly proposition: string;
  /** Origen del hecho — cómo fue obtenido */
  public readonly source: Source;
  /** Fiabilidad del hecho */
  public readonly confidence: Confidence;

  private constructor(params: {
    type: FactType;
    proposition: string;
    source: Source;
    confidence: Confidence;
  }) {
    this.type = params.type;
    this.proposition = params.proposition;
    this.source = params.source;
    this.confidence = params.confidence;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Fact validando todas las invariantes.
   * Lanza FactValidationError si alguna invariante se viola.
   */
  public static create(params: {
    type: FactType;
    proposition: string;
    source: Source;
    confidence: Confidence;
  }): Fact {
    // 1. Validar type
    if (!isFactType(params.type)) {
      throw new FactInvalidTypeError(params.type);
    }

    // 2. Validar proposition
    if (!isNonEmptyString(params.proposition)) {
      throw new FactEmptyPropositionError();
    }

    // 3. Validar source
    if (!(params.source instanceof Source)) {
      throw new FactValidationError('source must be a valid Source instance');
    }

    // 4. Validar confidence
    if (!(params.confidence instanceof Confidence)) {
      throw new FactValidationError('confidence must be a valid Confidence instance');
    }

    return new Fact(params);
  }

  /**
   * Try-variant: retorna Fact o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    type: string;
    proposition: string;
    source: Source;
    confidence: Confidence;
  }): Fact | null {
    if (!isFactType(params.type)) return null;
    if (!isNonEmptyString(params.proposition)) return null;
    if (!(params.source instanceof Source)) return null;
    if (!(params.confidence instanceof Confidence)) return null;

    return new Fact({
      type: params.type as FactType,
      proposition: params.proposition,
      source: params.source,
      confidence: params.confidence,
    });
  }

  // ---------------------------------------------------------------------------
  // Value Object semantics — comparación por valor
  // ---------------------------------------------------------------------------

  /**
   * Comparación por valor: dos Fact son iguales si tienen el mismo
   * type, proposition, source y confidence.
   */
  public equals(other: Fact): boolean {
    return (
      this.type === other.type &&
      this.proposition === other.proposition &&
      this.source.equals(other.source) &&
      this.confidence.equals(other.confidence)
    );
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return `Fact(${this.type}: "${this.proposition.slice(0, 40)}" @ ${this.confidence.toString()})`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      type: this.type,
      proposition: this.proposition,
      source: this.source.toJSON(),
      confidence: this.confidence.toJSON(),
    };
  }
}
