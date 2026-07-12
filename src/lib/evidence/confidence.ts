/**
 * confidence.ts — Confidence Value Object
 *
 * ONTOLOGY §6.3 + EVIDENCE_MODEL R-EM-016
 * Mide la fiabilidad de un hecho o fuente en rango [0, 1].
 *
 * Invariantes:
 *  - El valor debe ser un número finito en [0, 1]
 *  - Una vez construido es inmutable (readonly + Object.freeze)
 *  - Se compara por valor (value object)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import {
  ConfidenceRangeError,
  ConfidenceNaNError,
} from './errors';
import { SOURCE_RELIABILITY, SourceType } from './types';

/**
 * Confidence — Value Object inmutable.
 *
 * Representa una medida de fiabilidad en rango [0, 1].
 */
export class Confidence {
  /** Valor numérico de confianza en [0, 1] */
  public readonly value: number;

  private constructor(value: number) {
    this.value = value;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Confidence validando el rango [0, 1].
   * Lanza ConfidenceValidationError si el valor es inválido.
   */
  public static create(value: number): Confidence {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new ConfidenceNaNError();
    }
    if (value < 0 || value > 1) {
      throw new ConfidenceRangeError(value);
    }
    return new Confidence(value);
  }

  /**
   * Crea un Confidence a partir del SourceType usando su fiabilidad
   * intrínseca definida en SOURCE_RELIABILITY.
   */
  public static fromSourceType(type: SourceType): Confidence {
    return Confidence.create(SOURCE_RELIABILITY[type]);
  }

  /**
   * Try-variant: retorna Confidence o null si el valor es inválido.
   * Útil en contextos donde no se desea lanzar excepción.
   */
  public static tryCreate(value: number): Confidence | null {
    if (typeof value !== 'number' || !Number.isFinite(value)) return null;
    if (value < 0 || value > 1) return null;
    return new Confidence(value);
  }

  // ---------------------------------------------------------------------------
  // Niveles predefinidos (basados en ONTOLOGY §4.4)
  // ---------------------------------------------------------------------------

  /** Confirmación explícita del usuario — fiabilidad máxima */
  public static readonly USER_CONFIRMATION = Confidence.fromSourceType('user_confirmation');
  /** Extracción directa por regex — alta fiabilidad */
  public static readonly DIRECT_EXTRACTION = Confidence.fromSourceType('direct_extraction');
  /** Consulta a base de conocimiento — fiabilidad alta */
  public static readonly KNOWLEDGE_BASE = Confidence.fromSourceType('knowledge_base_lookup');
  /** Inferencia del sistema — fiabilidad media-alta */
  public static readonly INFERENCE = Confidence.fromSourceType('inference');
  /** Inferencia LLM — fiabilidad media */
  public static readonly LLM_INFERENCE = Confidence.fromSourceType('llm_inference');
  /** Detección por silencio — fiabilidad baja */
  public static readonly SILENCE_DETECTION = Confidence.fromSourceType('silence_detection');
  /** Valor por defecto — fiabilidad mínima */
  public static readonly DEFAULT_VALUE = Confidence.fromSourceType('default_value');
  /** Certeza absoluta (1.0) */
  public static readonly CERTAIN = Confidence.create(1.0);
  /** Certeza nula (0.0) */
  public static readonly NONE = Confidence.create(0.0);

  // ---------------------------------------------------------------------------
  // Value Object semantics
  // ---------------------------------------------------------------------------

  /**
   * Comparación por valor: dos Confidence son iguales si tienen el mismo valor.
   */
  public equals(other: Confidence): boolean {
    return this.value === other.value;
  }

  // ---------------------------------------------------------------------------
  // Operators
  // ---------------------------------------------------------------------------

  public isGreaterThan(other: Confidence): boolean {
    return this.value > other.value;
  }

  public isLessThan(other: Confidence): boolean {
    return this.value < other.value;
  }

  public isGreaterThanOrEqual(other: Confidence): boolean {
    return this.value >= other.value;
  }

  public isLessThanOrEqual(other: Confidence): boolean {
    return this.value <= other.value;
  }

  /**
   * Retorna true si la confianza supera un umbral mínimo.
   * @param threshold Valor opcional (default 0.5)
   */
  public meetsThreshold(threshold: number = 0.5): boolean {
    return this.value >= threshold;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return `Confidence(${this.value.toFixed(3)})`;
  }

  /**
   * Serialización a número para JSON.
   */
  public toJSON(): number {
    return this.value;
  }
}
