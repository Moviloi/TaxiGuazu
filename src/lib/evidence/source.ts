/**
 * source.ts — Source Value Object
 *
 * ONTOLOGY §4.4 + EVIDENCE_MODEL R-EM-015
 * Representa el origen de un Fact — el método por el cual
 * el hecho fue obtenido por el sistema.
 *
 * Invariantes:
 *  - type debe ser un SourceType válido
 *  - detail es opcional para información contextual adicional
 *  - Inmutable (readonly + Object.freeze)
 *  - Se compara por valor (type + detail)
 *
 * CP-38: La fiabilidad intrínseca de la fuente se obtiene
 * desde SOURCE_RELIABILITY, con posibilidad de ajuste histórico
 * a través de Confidence (ver confidence.ts).
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 */

import { SourceInvalidTypeError } from './errors';
import { SourceType, isSourceType } from './types';

/**
 * Source — Value Object inmutable.
 *
 * Describe el origen epistémico de un hecho: cómo fue obtenido
 * y en qué contexto (detalle opcional).
 */
export class Source {
  /** Tipo canónico de fuente */
  public readonly type: SourceType;
  /** Detalle contextual opcional (ej: "regex pattern '/ahora/i'") */
  public readonly detail: string | undefined;

  private constructor(type: SourceType, detail?: string) {
    this.type = type;
    this.detail = detail;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Factory methods
  // ---------------------------------------------------------------------------

  /**
   * Construye un Source validando el type.
   * Lanza SourceInvalidTypeError si el type no es válido.
   */
  public static create(type: SourceType, detail?: string): Source {
    if (!isSourceType(type)) {
      throw new SourceInvalidTypeError(type);
    }
    return new Source(type, detail);
  }

  /**
   * Try-variant: retorna Source o null si el type es inválido.
   */
  public static tryCreate(type: string, detail?: string): Source | null {
    if (!isSourceType(type)) return null;
    return new Source(type, detail);
  }

  // ---------------------------------------------------------------------------
  // Source factories predefinidas por método de obtención
  // ---------------------------------------------------------------------------

  /** Extracción directa por reglas deterministas (regex) */
  public static directExtraction(detail?: string): Source {
    return Source.create('direct_extraction', detail);
  }

  /** Inferencia del sistema a partir de hechos existentes */
  public static inference(detail?: string): Source {
    return Source.create('inference', detail);
  }

  /** Confirmación explícita del usuario */
  public static userConfirmation(detail?: string): Source {
    return Source.create('user_confirmation', detail);
  }

  /** Consulta a base de conocimiento */
  public static knowledgeBaseLookup(detail?: string): Source {
    return Source.create('knowledge_base_lookup', detail);
  }

  /** Valor por defecto asignado por el sistema */
  public static defaultvalue(detail?: string): Source {
    return Source.create('default_value', detail);
  }

  /** Inferencia por LLM */
  public static llmInference(detail?: string): Source {
    return Source.create('llm_inference', detail);
  }

  /** Detección por silencio (timeout, no-respuesta) */
  public static silenceDetection(detail?: string): Source {
    return Source.create('silence_detection', detail);
  }

  // ---------------------------------------------------------------------------
  // Value Object semantics
  // ---------------------------------------------------------------------------

  /**
   * Comparación por valor: dos Source son iguales si tienen
   * el mismo type y detail opcional.
   */
  public equals(other: Source): boolean {
    return this.type === other.type && this.detail === other.detail;
  }

  // ---------------------------------------------------------------------------
  // Serialization
  // ---------------------------------------------------------------------------

  public toString(): string {
    return this.detail
      ? `Source(${this.type}: ${this.detail})`
      : `Source(${this.type})`;
  }

  public toJSON(): Record<string, unknown> {
    const json: Record<string, unknown> = { type: this.type };
    if (this.detail !== undefined) {
      json.detail = this.detail;
    }
    return json;
  }
}
