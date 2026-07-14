/**
 * belief.ts — Belief Value Object
 *
 * PR-3B: Belief representa el compromiso epistémico del sistema:
 * "el sistema cree que...".
 *
 * Belief se construye EXCLUSIVAMENTE a partir de Knowledge. No infiere,
 * no interpreta, no deduce intención, origen ni destino. Toma los campos
 * consolidados de Knowledge y los transforma en una postura epistémica:
 *   - observationStatus (string) → observationValid (boolean)
 *   - isWellFormed representa si la creencia está completa
 *
 * Belief NO es una decisión.
 * Belief NO es certeza.
 * Belief NO es memoria.
 * Belief NO modifica el pipeline conversacional.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4)
 *  - knowledgeId: string no vacío
 *  - createdAt: Date válido
 *  - observationValid: boolean (derivado de Knowledge.observationStatus)
 *  - channel: string | null (desde Knowledge.channel)
 *  - hasContent: boolean (desde Knowledge.hasContent)
 *  - receivedAt: string | null (desde Knowledge.receivedAt)
 *  - conversationId: string | null (desde Knowledge.conversationId)
 *  - isWellFormed: boolean (core fields presentes)
 *  - Inmutable (readonly + Object.freeze)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3B
 */

import { Fact } from './fact';
import { Knowledge } from './knowledge';
import {
  BeliefValidationError,
  BeliefInvalidIdError,
  BeliefInvalidKnowledgeIdError,
} from './errors';
import { isNonEmptyString } from './types';

/**
 * Belief — Value Object inmutable.
 *
 * Representa el compromiso epistémico del sistema basado en
 * el Knowledge consolidado. Belief es lo que el sistema "cree"
 * en este turno, antes de cualquier decisión o acción.
 */
export class Belief {
  /** Identificador único (UUID v4) */
  public readonly id: string;
  /** ID del Knowledge que originó este Belief */
  public readonly knowledgeId: string;
  /** Marca temporal de creación */
  public readonly createdAt: Date;

  // ── Campos epistémicos ──
  // Derivados de Knowledge sin inferir nada nuevo.

  /** El sistema cree que la observación fue válida */
  public readonly observationValid: boolean;
  /** El sistema cree que el canal de entrada es X (o null si no detectable) */
  public readonly channel: string | null;
  /** El sistema cree que hay contenido textual */
  public readonly hasContent: boolean;
  /** El sistema cree que el mensaje se recibió en X timestamp (ISO) */
  public readonly receivedAt: string | null;
  /** El sistema cree que la conversación es X (o null si no identificable) */
  public readonly conversationId: string | null;

  // ── Calidad epistémica ──
  // Sin inferencia. Solo conteo de campos presentes.

  /** ¿La creencia está bien formada? (core fields presentes) */
  public readonly isWellFormed: boolean;

  /** Referencia a los Facts originales */
  public readonly facts: readonly Fact[];
  /** Cantidad de Facts */
  public readonly factCount: number;

  private constructor(params: {
    id: string;
    knowledgeId: string;
    createdAt: Date;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }) {
    this.id = params.id;
    this.knowledgeId = params.knowledgeId;
    this.createdAt = params.createdAt;
    this.observationValid = params.observationValid;
    this.channel = params.channel;
    this.hasContent = params.hasContent;
    this.receivedAt = params.receivedAt;
    this.conversationId = params.conversationId;
    this.facts = params.facts;
    this.factCount = params.facts.length;

    // isWellFormed: core fields presentes (observationValid=true + channel + hasContent + receivedAt)
    this.isWellFormed =
      params.observationValid === true &&
      params.channel !== null &&
      params.hasContent === true &&
      params.receivedAt !== null;

    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Belief validando todas las invariantes.
   * Lanza BeliefValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    knowledgeId: string;
    createdAt: Date;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }): Belief {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new BeliefInvalidIdError(params.id);
    }

    // 2. Validar knowledgeId
    if (!isNonEmptyString(params.knowledgeId)) {
      throw new BeliefInvalidKnowledgeIdError(params.knowledgeId);
    }

    // 3. Validar createdAt
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) {
      throw new BeliefValidationError('createdAt must be a valid Date');
    }

    // 4. Validar facts — debe tener al menos uno
    if (!Array.isArray(params.facts) || params.facts.length === 0) {
      throw new BeliefValidationError('facts must be a non-empty array of Fact');
    }

    // 5. Validar que todos los elementos sean Fact
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) {
        throw new BeliefValidationError(`facts[${i}] must be a valid Fact instance`);
      }
    }

    return new Belief(params);
  }

  /**
   * Construcción directa desde Knowledge.
   *
   * Transforma los campos consolidados de Knowledge en el
   * compromiso epistémico del sistema:
   *   - observationStatus ("valid") → observationValid (true)
   *   - Los demás campos se transfieren sin modificación
   *
   * @param knowledge — Knowledge fuente
   * @returns Belief derivado
   * @throws BeliefValidationError si Knowledge es inválido
   */
  public static fromKnowledge(knowledge: Knowledge): Belief {
    if (!knowledge) {
      throw new BeliefValidationError('knowledge must be a valid Knowledge instance');
    }

    return Belief.create({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      knowledgeId: knowledge.id,
      createdAt: new Date(),
      observationValid: knowledge.observationStatus === 'valid',
      channel: knowledge.channel,
      hasContent: knowledge.hasContent,
      receivedAt: knowledge.receivedAt,
      conversationId: knowledge.conversationId,
      facts: [...knowledge.facts],
    });
  }

  /**
   * Try-variant: retorna Belief o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    knowledgeId: string;
    createdAt: Date;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }): Belief | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.knowledgeId)) return null;
    if (!(params.createdAt instanceof Date) || isNaN(params.createdAt.getTime())) return null;
    if (!Array.isArray(params.facts) || params.facts.length === 0) return null;
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) return null;
    }
    return new Belief(params);
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
      knowledgeId: this.knowledgeId,
      createdAt: this.createdAt.toISOString(),
      observationValid: this.observationValid,
      channel: this.channel,
      hasContent: this.hasContent,
      receivedAt: this.receivedAt,
      conversationId: this.conversationId,
      isWellFormed: this.isWellFormed,
      factCount: this.factCount,
    };
  }
}
