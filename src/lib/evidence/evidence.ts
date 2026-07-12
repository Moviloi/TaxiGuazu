/**
 * evidence.ts — Evidence Entity
 *
 * ONTOLOGY §5.1 + EVIDENCE_MODEL R-EM-001 a R-EM-005, R-EM-009
 * Evidence es el conjunto registrado de Facts, cada uno con su
 * Source y Confidence, que han sido extraídos de una Observación.
 *
 * El acto de registro — escribir el Evidence con su cadena de
 * procedencia en el Evidence Store — es lo que confiere estatus
 * epistémico a los Facts.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4)
 *  - observationId: string no vacío
 *  - facts: array no vacío de Fact
 *  - type: EvidenceType válido
 *  - createdAt: Date válido
 *  - Inmutable (readonly + Object.freeze)
 *  - Identidad por id (entidad)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import {
  EvidenceValidationError,
  EvidenceEmptyFactsError,
  EvidenceInvalidIdError,
  EvidenceInvalidObservationIdError,
} from './errors';
import {
  EvidenceType,
  isEvidenceType,
  isNonEmptyString,
} from './types';
import { Fact } from './fact';

/**
 * Evidence — Entidad inmutable.
 *
 * Representa un conjunto registrado de Facts con su cadena
 * de procedencia. Es la unidad de persistencia del sistema
 * epistémico: cada turno de conversación genera uno o más
 * Evidence records en el Evidence Store.
 */
export class Evidence {
  /** Identificador único del Evidence (UUID v4) */
  public readonly id: string;
  /** Identificador de la Observación que originó estos Facts */
  public readonly observationId: string;
  /** Conjunto de Facts extraídos (mínimo 1) */
  public readonly facts: readonly Fact[];
  /** Tipo de Evidence (user_input, system_inference, etc.) */
  public readonly type: EvidenceType;
  /** Marca temporal de creación */
  public readonly createdAt: Date;
  /** IDs de Evidence previo que originó este (cadena de procedencia) */
  public readonly provenance: readonly string[];

  private constructor(params: {
    id: string;
    observationId: string;
    facts: readonly Fact[];
    type: EvidenceType;
    createdAt: Date;
    provenance?: readonly string[];
  }) {
    this.id = params.id;
    this.observationId = params.observationId;
    this.facts = params.facts;
    this.type = params.type;
    this.createdAt = params.createdAt;
    this.provenance = params.provenance ?? [];
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Evidence validando todas las invariantes.
   * Lanza EvidenceValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    observationId: string;
    facts: readonly Fact[];
    type: EvidenceType;
    createdAt: Date;
    provenance?: readonly string[];
  }): Evidence {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new EvidenceInvalidIdError(params.id);
    }

    // 2. Validar observationId
    if (!isNonEmptyString(params.observationId)) {
      throw new EvidenceInvalidObservationIdError(params.observationId);
    }

    // 3. Validar facts — debe tener al menos uno
    if (!Array.isArray(params.facts) || params.facts.length === 0) {
      throw new EvidenceEmptyFactsError();
    }

    // 4. Validar que todos los elementos sean Fact
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) {
        throw new EvidenceValidationError(
          `facts[${i}] must be a valid Fact instance`,
        );
      }
    }

    // 5. Validar type
    if (!isEvidenceType(params.type)) {
      throw new EvidenceValidationError(
        `Invalid evidence type: "${params.type}". Must be one of: user_input, system_inference, backend_response, outcome`,
      );
    }

    // 6. Validar createdAt
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) {
      throw new EvidenceValidationError('createdAt must be a valid Date');
    }

    // 7. Validar provenance
    if (params.provenance !== undefined) {
      if (!Array.isArray(params.provenance)) {
        throw new EvidenceValidationError('provenance must be an array of strings');
      }
      for (let i = 0; i < params.provenance.length; i++) {
        if (!isNonEmptyString(params.provenance[i])) {
          throw new EvidenceValidationError(
            `provenance[${i}] must be a non-empty string`,
          );
        }
      }
    }

    return new Evidence(params);
  }

  /**
   * Crea un Evidence de tipo user_input a partir de Facts
   * extraídos de una Observación.
   */
  public static fromObservation(
    observationId: string,
    facts: readonly Fact[],
    type: EvidenceType = 'user_input',
    provenance?: readonly string[],
  ): Evidence {
    return Evidence.create({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      observationId,
      facts,
      type,
      createdAt: new Date(),
      provenance,
    });
  }

  /**
   * Try-variant: retorna Evidence o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    observationId: string;
    facts: readonly Fact[];
    type: string;
    createdAt: Date;
    provenance?: readonly string[];
  }): Evidence | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.observationId)) return null;
    if (!Array.isArray(params.facts) || params.facts.length === 0) return null;
    for (const f of params.facts) {
      if (!(f instanceof Fact)) return null;
    }
    if (!isEvidenceType(params.type)) return null;
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) return null;
    if (params.provenance !== undefined) {
      if (!Array.isArray(params.provenance)) return null;
      for (const p of params.provenance) {
        if (!isNonEmptyString(p)) return null;
      }
    }

    return new Evidence({
      id: params.id,
      observationId: params.observationId,
      facts: params.facts,
      type: params.type as EvidenceType,
      createdAt: params.createdAt,
      provenance: params.provenance,
    });
  }

  // ---------------------------------------------------------------------------
  // Entity semantics — comparación por identidad
  // ---------------------------------------------------------------------------

  /**
   * Dos Evidence son la misma entidad si tienen el mismo id.
   */
  public equals(other: Evidence): boolean {
    return this.id === other.id;
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** Cantidad de Facts contenidos */
  public get factCount(): number {
    return this.facts.length;
  }

  /**
   * Retorna los Facts de un tipo específico.
   * @param type FactType a filtrar
   */
  public factsByType(type: string): Fact[] {
    return this.facts.filter((f) => f.type === type);
  }

  /**
   * Confianza combinada: promedio de todas las confianzas de los Facts.
   * Útil para determinar la fiabilidad agregada del Evidence.
   */
  public get averageConfidence(): number {
    if (this.facts.length === 0) return 0;
    const sum = this.facts.reduce((acc, f) => acc + f.confidence.value, 0);
    return sum / this.facts.length;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return `Evidence(${this.id}: obs=${this.observationId}, facts=${this.facts.length}, type=${this.type})`;
  }

  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      observationId: this.observationId,
      facts: this.facts.map((f) => f.toJSON()),
      type: this.type,
      createdAt: this.createdAt.toISOString(),
      provenance: [...this.provenance],
    };
  }
}
