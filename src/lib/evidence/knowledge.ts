/**
 * knowledge.ts — Knowledge Value Object
 *
 * PR-3A: Knowledge representa información consolidada obtenida
 * exclusivamente a partir de un Evidence.
 *
 * Knowledge NO es una creencia.
 * Knowledge NO es una decisión.
 * Knowledge NO es memoria.
 *
 * Knowledge es el resultado de consolidar Facts ya presentes en el
 * Evidence en una representación estructurada y consultable. Las
 * proposiciones de los Facts se extraen sin inferir nada nuevo:
 * no se deduce intención, origen, destino ni se interpreta lenguaje.
 *
 * Invariantes:
 *  - id: string no vacío (UUID v4)
 *  - evidenceId: string no vacío
 *  - consolidatedAt: Date válido
 *  - facts: readonly Fact[] (mínimo 1, referencia a Facts originales)
 *  - observationStatus: string | null (extraído de Facts)
 *  - channel: string | null (extraído de Facts)
 *  - hasContent: boolean (extraído de Facts)
 *  - receivedAt: string | null (extraído de Facts — ISO string)
 *  - conversationId: string | null (extraído de Facts)
 *  - Inmutable (readonly + Object.freeze)
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-3A
 */

import { Fact } from './fact';
import { Evidence } from './evidence';
import { Signal } from './signal';
import { Observation } from './observation';
import {
  KnowledgeValidationError,
  KnowledgeInvalidIdError,
  KnowledgeInvalidEvidenceIdError,
} from './errors';
import { isNonEmptyString } from './types';

/**
 * Knowledge — Value Object inmutable.
 *
 * Representa información consolidada extraída de un Evidence.
 * Es la primera capa de significado estructurado del motor
 * cognitivo, antes de creencias, decisiones o memoria.
 */
export class Knowledge {
  /** Identificador único (UUID v4) */
  public readonly id: string;
  /** ID del Evidence que originó este Knowledge */
  public readonly evidenceId: string;
  /** Marca temporal de consolidación */
  public readonly consolidatedAt: Date;

  // ── Campos consolidados desde Facts ──
  // Extraídos de proposiciones sin inferir nada nuevo.

  /** Status de la Observation (extraído de "observation validated with status X") */
  public readonly observationStatus: string | null;
  /** Canal de entrada (extraído de "signal received via X channel") */
  public readonly channel: string | null;
  /** Indica si el mensaje tiene contenido textual */
  public readonly hasContent: boolean;
  /** Timestamp ISO de recepción (extraído de "received at <ISO>") */
  public readonly receivedAt: string | null;
  /** ID de conversación (extraído de "conversation identified as X") */
  public readonly conversationId: string | null;

  /** Referencia completa a los Facts originales (preservados para auditoría) */
  public readonly facts: readonly Fact[];
  /** Cantidad de Facts */
  public readonly factCount: number;

  private constructor(params: {
    id: string;
    evidenceId: string;
    consolidatedAt: Date;
    observationStatus: string | null;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }) {
    this.id = params.id;
    this.evidenceId = params.evidenceId;
    this.consolidatedAt = params.consolidatedAt;
    this.observationStatus = params.observationStatus;
    this.channel = params.channel;
    this.hasContent = params.hasContent;
    this.receivedAt = params.receivedAt;
    this.conversationId = params.conversationId;
    this.facts = params.facts;
    this.factCount = params.facts.length;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Knowledge validando todas las invariantes.
   * Lanza KnowledgeValidationError si alguna invariante se viola.
   */
  public static create(params: {
    id: string;
    evidenceId: string;
    consolidatedAt: Date;
    observationStatus: string | null;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }): Knowledge {
    // 1. Validar id
    if (!isNonEmptyString(params.id)) {
      throw new KnowledgeInvalidIdError(params.id);
    }

    // 2. Validar evidenceId
    if (!isNonEmptyString(params.evidenceId)) {
      throw new KnowledgeInvalidEvidenceIdError(params.evidenceId);
    }

    // 3. Validar consolidatedAt
    if (!(params.consolidatedAt instanceof Date) || isNaN(params.consolidatedAt.getTime())) {
      throw new KnowledgeValidationError('consolidatedAt must be a valid Date');
    }

    // 4. Validar facts — debe tener al menos uno
    if (!Array.isArray(params.facts) || params.facts.length === 0) {
      throw new KnowledgeValidationError('facts must be a non-empty array of Fact');
    }

    // 5. Validar que todos los elementos sean Fact
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) {
        throw new KnowledgeValidationError(`facts[${i}] must be a valid Fact instance`);
      }
    }

    return new Knowledge(params);
  }

  /**
   * Consolidación desde un Evidence más fuentes estructuradas.
   *
   * PR-3D.1: Ya NO parsea proposiciones de Facts. Extrae los campos
   * consolidados directamente de Signal y Observation (fuentes
   * estructuradas disponibles en el pipeline).
   *
   * Signal y Observation son opcionales — si no se proporcionan,
   * los campos epistémicos quedan como null/false (consolidación
   * mínima). El pipeline productivo siempre los provee.
   *
   * @param evidence — Evidence fuente (requerido)
   * @param signal — Signal original (opcional, datos estructurados)
   * @param observation — Observation derivada (opcional, datos estructurados)
   * @returns Knowledge consolidado
   * @throws KnowledgeValidationError si el Evidence es inválido
   */
  public static consolidate(
    evidence: Evidence,
    signal?: Signal,
    observation?: Observation,
  ): Knowledge {
    if (!evidence) {
      throw new KnowledgeValidationError('evidence must be a valid Evidence instance');
    }

    // Extraer campos consolidados de fuentes estructuradas.
    // NO se parsean proposiciones de Facts.
    const observationStatus = observation?.status ?? null;
    const channel = signal?.channel ?? null;
    const hasContent = signal ? signal.rawContent.length > 0 : false;
    const receivedAt = signal?.receivedAt?.toISOString() ?? null;
    const conversationId =
      signal?.metadata &&
      typeof signal.metadata === 'object' &&
      'conversationId' in signal.metadata &&
      signal.metadata.conversationId !== undefined
        ? String(signal.metadata.conversationId)
        : null;

    return Knowledge.create({
      id: crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      evidenceId: evidence.id,
      consolidatedAt: new Date(),
      observationStatus,
      channel,
      hasContent,
      receivedAt,
      conversationId,
      facts: [...evidence.facts],
    });
  }

  /**
   * Try-variant: retorna Knowledge o null si alguna invariante falla.
   */
  public static tryCreate(params: {
    id: string;
    evidenceId: string;
    consolidatedAt: Date;
    observationStatus: string | null;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    facts: readonly Fact[];
  }): Knowledge | null {
    if (!isNonEmptyString(params.id)) return null;
    if (!isNonEmptyString(params.evidenceId)) return null;
    if (!(params.consolidatedAt instanceof Date) || isNaN(params.consolidatedAt.getTime())) return null;
    if (!Array.isArray(params.facts) || params.facts.length === 0) return null;
    for (let i = 0; i < params.facts.length; i++) {
      if (!(params.facts[i] instanceof Fact)) return null;
    }
    return new Knowledge(params);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /**
   * ¿Este Knowledge tiene todos los campos consolidados disponibles?
   * Indica si se pudo extraer información de todas las proposiciones.
   */
  public get isFullyConsolidated(): boolean {
    return (
      this.observationStatus !== null &&
      this.channel !== null &&
      this.hasContent &&
      this.receivedAt !== null
    );
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  /**
   * Serialización a JSON (solo datos, sin Facts para evitar ciclos).
   */
  public toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      evidenceId: this.evidenceId,
      consolidatedAt: this.consolidatedAt.toISOString(),
      observationStatus: this.observationStatus,
      channel: this.channel,
      hasContent: this.hasContent,
      receivedAt: this.receivedAt,
      conversationId: this.conversationId,
      factCount: this.factCount,
    };
  }
}
