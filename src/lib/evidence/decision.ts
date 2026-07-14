/**
 * decision.ts — Decision Value Object
 *
 * PR-3C: Decision representa el compromiso cognitivo del sistema:
 * "el sistema decide que...".
 *
 * Decision se construye EXCLUSIVAMENTE a partir de Belief. No infiere
 * intención, origen, destino, política ni ruta de respuesta. Toma los
 * campos epistémicos de Belief y los transforma en una determinación
 * cognitiva:
 *   - observationValid (boolean) → validInput (boolean)
 *   - isWellFormed → readiness (CognitiveReadiness)
 *
 * Decision NO es una decisión operacional.
 * Decision NO es un comando.
 * Decision NO es una política.
 * Decision NO es una ruta de respuesta.
 * Decision NO modifica el pipeline conversacional.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4)
 *  - beliefId: string no vacío
 *  - createdAt: Date válido
 *  - validInput: boolean (derivado de Belief.observationValid)
 *  - hasContent: boolean (derivado de Belief.hasContent)
 *  - readiness: CognitiveReadiness (derivado de Belief.isWellFormed)
 *  - missingInfo: readonly string[] (auto-diagnóstico de campos ausentes)
 *  - isDecided: boolean (readiness === "ready")
 *  - Inmutable (readonly + Object.freeze)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3C
 */

import { Fact } from './fact';
import { Belief } from './belief';
import {
  DecisionValidationError,
  DecisionInvalidIdError,
  DecisionInvalidBeliefIdError,
} from './errors';
import { isNonEmptyString } from './types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/**
 * CognitiveReadiness — Nivel de completitud cognitiva.
 *
 * "ready"   → El sistema tiene toda la información epistémica necesaria
 * "partial" → Falta información epistémica, pero la entrada es válida
 * "invalid" → La entrada no es válida (observación inválida)
 */
export type CognitiveReadiness = 'ready' | 'partial' | 'invalid';

// ---------------------------------------------------------------------------
// Decision
// ---------------------------------------------------------------------------

/**
 * Decision — Value Object inmutable.
 *
 * Representa el compromiso cognitivo del sistema basado en
 * el Belief. Decision es lo que el sistema "decide saber"
 * en este turno, sin cruzar al plano operacional.
 */
export class Decision {
  /** Identificador único (UUID v4) */
  public readonly id: string;
  /** ID del Belief que originó esta Decision */
  public readonly beliefId: string;
  /** Marca temporal de creación */
  public readonly createdAt: Date;

  // ── Campos cognitivos ──
  // Derivados de Belief sin inferir nada nuevo.

  /** El sistema determina que la entrada fue válida */
  public readonly validInput: boolean;
  /** El sistema determina que hay contenido textual */
  public readonly hasContent: boolean;
  /** Nivel de completitud cognitiva */
  public readonly readiness: CognitiveReadiness;
  /** Campos epistémicos ausentes (auto-diagnóstico) */
  public readonly missingInfo: readonly string[];

  // ── Calidad de la decisión ──

  /** ¿El sistema está listo para proceder? (readiness === "ready") */
  public readonly isDecided: boolean;

  /** Referencia a los Facts originales */
  public readonly facts: readonly Fact[];
  /** Cantidad de Facts */
  public readonly factCount: number;

  private constructor(params: {
    id: string;
    beliefId: string;
    createdAt: Date;
    validInput: boolean;
    hasContent: boolean;
    readiness: CognitiveReadiness;
    missingInfo: readonly string[];
    facts: readonly Fact[];
  }) {
    this.id = params.id;
    this.beliefId = params.beliefId;
    this.createdAt = params.createdAt;
    this.validInput = params.validInput;
    this.hasContent = params.hasContent;
    this.readiness = params.readiness;
    this.missingInfo = Object.freeze([...params.missingInfo]);
    this.facts = params.facts;
    this.factCount = params.facts.length;

    // isDecided: readiness === "ready"
    this.isDecided = params.readiness === 'ready';

    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Decision validando todas las invariantes.
   * Lanza DecisionValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    beliefId: string;
    createdAt: Date;
    validInput: boolean;
    hasContent: boolean;
    readiness: CognitiveReadiness;
    missingInfo: readonly string[];
    facts: readonly Fact[];
  }): Decision {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new DecisionInvalidIdError(params.id);
    }

    // 2. Validar beliefId
    if (!isNonEmptyString(params.beliefId)) {
      throw new DecisionInvalidBeliefIdError(params.beliefId);
    }

    // 3. Validar createdAt
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) {
      throw new DecisionValidationError('createdAt must be a valid Date');
    }

    // 4. Validar readiness
    const validReadiness: CognitiveReadiness[] = ['ready', 'partial', 'invalid'];
    if (!validReadiness.includes(params.readiness)) {
      throw new DecisionValidationError(
        `Invalid readiness: "${params.readiness}". Must be one of: ${validReadiness.join(', ')}`,
      );
    }

    // 5. Validar facts — debe tener al menos uno
    if (!Array.isArray(params.facts) || params.facts.length === 0) {
      throw new DecisionValidationError('facts must be a non-empty array of Fact');
    }

    // 6. Validar que todos los elementos sean Fact
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) {
        throw new DecisionValidationError(`facts[${i}] must be a valid Fact instance`);
      }
    }

    return new Decision(params);
  }

  /**
   * Construcción desde Belief.
   *
   * Transforma los campos epistémicos de Belief en una
   * determinación cognitiva:
   *   - observationValid → validInput
   *   - hasContent → hasContent (se transfiere)
   *   - isWellFormed → readiness
   *   - Campos null → missingInfo
   *
   * @param belief — Belief fuente
   * @returns Decision derivada
   * @throws DecisionValidationError si Belief es inválido
   */
  public static fromBelief(belief: Belief): Decision {
    if (!belief) {
      throw new DecisionValidationError('belief must be a valid Belief instance');
    }

    // Derivar readiness
    let readiness: CognitiveReadiness;
    if (!belief.observationValid) {
      readiness = 'invalid';
    } else if (belief.isWellFormed) {
      readiness = 'ready';
    } else {
      readiness = 'partial';
    }

    // Derivar missingInfo (auto-diagnóstico)
    const missing: string[] = [];
    if (!belief.observationValid) {
      missing.push('validObservation');
    }
    if (belief.channel === null) {
      missing.push('channel');
    }
    if (!belief.hasContent) {
      missing.push('content');
    }
    if (belief.receivedAt === null) {
      missing.push('receivedAt');
    }
    if (belief.conversationId === null) {
      missing.push('conversationId');
    }

    return Decision.create({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      beliefId: belief.id,
      createdAt: new Date(),
      validInput: belief.observationValid,
      hasContent: belief.hasContent,
      readiness,
      missingInfo: missing,
      facts: [...belief.facts],
    });
  }

  /**
   * Try-variant: retorna Decision o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    beliefId: string;
    createdAt: Date;
    validInput: boolean;
    hasContent: boolean;
    readiness: CognitiveReadiness;
    missingInfo: readonly string[];
    facts: readonly Fact[];
  }): Decision | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.beliefId)) return null;
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) return null;
    const validReadiness: CognitiveReadiness[] = ['ready', 'partial', 'invalid'];
    if (!validReadiness.includes(params.readiness)) return null;
    if (!Array.isArray(params.facts) || params.facts.length === 0) return null;
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) return null;
    }
    return new Decision(params);
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialización a JSON.
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      beliefId: this.beliefId,
      createdAt: this.createdAt.toISOString(),
      validInput: this.validInput,
      hasContent: this.hasContent,
      readiness: this.readiness,
      missingInfo: [...this.missingInfo],
      isDecided: this.isDecided,
      factCount: this.factCount,
    };
  }
}
