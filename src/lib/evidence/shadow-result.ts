/**
 * shadow-result.ts — Resultado observable del Shadow Mode cognitivo
 *
 * PR-2F + PR-3A + PR-3B + PR-3C: Contenedor inmutable que agrupa el
 * resultado completo del motor cognitivo en shadow mode:
 *   Signal, Observation, Fact[], Evidence, Knowledge, Belief, Decision.
 *
 * Cada componente puede ser null si esa etapa falló, permitiendo
 * inspeccionar exactamente dónde se interrumpió la cadena.
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-2F, PR-3A, PR-3B, PR-3C
 */

import { Signal } from './signal';
import { Observation } from './observation';
import { Fact } from './fact';
import { Evidence } from './evidence';
import { Knowledge } from './knowledge';
import { Belief } from './belief';
import { Decision } from './decision';

/**
 * ShadowResult — Contenedor inmutable del ciclo cognitivo.
 *
 * Representa el estado observable del motor cognitivo en un turno.
 * Solo existe en memoria — no se persiste ni se envía por red.
 */
export class ShadowResult {
  /** Signal construido (o null si falló) */
  public readonly signal: Signal | null;
  /** Observation construida (o null si falló) */
  public readonly observation: Observation | null;
  /** Facts construidos (o null si falló) */
  public readonly facts: readonly Fact[] | null;
  /** Evidence construido (o null si falló) */
  public readonly evidence: Evidence | null;
  /** Knowledge consolidado (o null si falló) */
  public readonly knowledge: Knowledge | null;
  /** Belief epistémico (o null si falló) */
  public readonly belief: Belief | null;
  /** Decision cognitiva (o null si falló) */
  public readonly decision: Decision | null;

  constructor(params: {
    signal: Signal | null;
    observation: Observation | null;
    facts: readonly Fact[] | null;
    evidence: Evidence | null;
    knowledge: Knowledge | null;
    belief: Belief | null;
    decision: Decision | null;
  }) {
    this.signal = params.signal;
    this.observation = params.observation;
    this.facts = params.facts;
    this.evidence = params.evidence;
    this.knowledge = params.knowledge;
    this.belief = params.belief;
    this.decision = params.decision;
    Object.freeze(this);
  }

  // ---------------------------------------------------------------------------
  // Queries
  // ---------------------------------------------------------------------------

  /** ¿El ciclo cognitivo completo fue exitoso? */
  public get isComplete(): boolean {
    return (
      this.signal !== null &&
      this.observation !== null &&
      this.facts !== null &&
      this.facts.length > 0 &&
      this.evidence !== null &&
      this.knowledge !== null &&
      this.belief !== null &&
      this.decision !== null
    );
  }

  /** Cantidad de Facts (0 si facts es null) */
  public get factCount(): number {
    return this.facts?.length ?? 0;
  }

  // ---------------------------------------------------------------------------
  // Serialization (solo para logging de desarrollo — datos NO sensibles)
  // ---------------------------------------------------------------------------

  /**
   * Resumen compacto para logging de desarrollo.
   * No incluye datos del usuario ni contenido de mensajes.
   */
  public toSummary(): string {
    const signalStatus = this.signal ? '✓' : '✗';
    const obsStatus = this.observation ? '✓' : '✗';
    const factCount = this.factCount;
    const evStatus = this.evidence ? '✓' : '✗';
    const knStatus = this.knowledge ? '✓' : '✗';
    const blStatus = this.belief ? '✓' : '✗';
    const dcStatus = this.decision ? '✓' : '✗';
    return `Signal ${signalStatus} | Observation ${obsStatus} | Facts: ${factCount} | Evidence: ${evStatus} | Knowledge: ${knStatus} | Belief: ${blStatus} | Decision: ${dcStatus}`;
  }
}
