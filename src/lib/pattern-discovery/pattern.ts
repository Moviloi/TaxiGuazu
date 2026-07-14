/**
 * pattern.ts — Pattern Value Object (PDE-1 §3.1, §3.2)
 *
 * Value Object inmutable con identidad determinística.
 * id = H(relation.description || '::' || dimension)
 * Versionado automático: misma identidad, diferente θ → nueva versión.
 *
 * R-DEP-4: pattern.ts importa exclusivamente de types.ts y externos.
 */

import { createHash } from 'crypto';
import type {
  Pattern as PatternInterface,
  Relation,
  EvidenceWindow,
  Dimension,
  AcceptanceReport,
  PatternStatus,
} from './types';

// ── PatternProps (solo para construcción) ──
export interface PatternProps {
  relation: Relation;
  confidence: number;
  evidence: EvidenceWindow;
  dimension: Dimension;
  acceptance: AcceptanceReport;
  runId: string;
  producedAt: string;
  status?: PatternStatus;
  supersededBy?: string;
  version?: number;
}

// ── Constantes de versionado ──
const VERSION_EPSILON = 0.05;  // ε: umbral de diferencia de θ (PDE-1 §3.2)

/**
 * Computa el ID determinístico del Pattern.
 * SHA-256 truncado a 32 caracteres hex.
 */
function computeId(relation: Relation, dimension: Dimension): string {
  const hash = createHash('sha256')
    .update(`${relation.description}::${dimension}`)
    .digest('hex');
  return hash.substring(0, 32);
}

/**
 * Determina si un Pattern necesita una nueva versión.
 * Útil cuando el patrón viene del repositorio (no es una instancia de la clase Pattern).
 *
 * @returns true si θ o evidence.snapshotCount cambiaron significativamente
 */
export function needsNewVersion(
  existing: PatternInterface,
  newConfidence: number,
  newSnapshotCount: number
): boolean {
  const thetaDiff = Math.abs(existing.confidence - newConfidence);
  if (thetaDiff > VERSION_EPSILON) return true;
  if (existing.evidence.snapshotCount !== newSnapshotCount) return true;
  return false;
}

/**
 * Crea versiones superseded/active para un patrón existente y su reemplazo.
 * Útil cuando el patrón viene del repositorio (no es una instancia de la clase Pattern).
 */
export function createSupersededPair(
  existing: PatternInterface,
  newPattern: Pattern
): [Pattern, Pattern] {
  const supersededVersion = new Pattern({
    relation: existing.relation,
    confidence: existing.confidence,
    evidence: existing.evidence,
    dimension: existing.dimension,
    acceptance: existing.acceptance,
    runId: existing.runId,
    producedAt: existing.producedAt,
    status: 'superseded',
    supersededBy: `${newPattern.id}@${newPattern.version}`,
    version: existing.version,
  });

  return [supersededVersion, newPattern];
}

/**
 * Pattern — Value Object inmutable.
 *
 * Una vez construido, sus propiedades no pueden modificarse.
 * Para "cambiar" un Pattern, se crea una nueva versión.
 */
export class Pattern implements PatternInterface {
  readonly id: string;
  readonly version: number;
  readonly relation: Relation;
  readonly confidence: number;
  readonly evidence: EvidenceWindow;
  readonly dimension: Dimension;
  readonly acceptance: AcceptanceReport;
  readonly runId: string;
  readonly producedAt: string;
  readonly status: PatternStatus;
  readonly supersededBy?: string;

  constructor(props: PatternProps) {
    this.id = computeId(props.relation, props.dimension);
    this.version = props.version ?? 1;
    this.relation = props.relation;
    this.confidence = props.confidence;
    this.evidence = props.evidence;
    this.dimension = props.dimension;
    this.acceptance = props.acceptance;
    this.runId = props.runId;
    this.producedAt = props.producedAt;
    this.status = props.status ?? 'active';
    this.supersededBy = props.supersededBy;

    Object.freeze(this);
  }

  /**
   * Compara si dos Patterns son equivalentes (mismo id y versión).
   */
  equals(other: Pattern): boolean {
    return this.id === other.id && this.version === other.version;
  }

  /**
   * Determina si este Pattern debe ser versionado al reemplazarlo.
   * Retorna true si θ o evidence.snapshotCount cambiaron significativamente.
   */
  needsNewVersion(newConfidence: number, newSnapshotCount: number): boolean {
    const thetaDiff = Math.abs(this.confidence - newConfidence);
    if (thetaDiff > VERSION_EPSILON) return true;
    if (this.evidence.snapshotCount !== newSnapshotCount) return true;
    return false;
  }

  /**
   * Crea una versión superseded de este Pattern y marca el nuevo como activo.
   *
   * @param newPattern — El Pattern que reemplaza a este
   * @returns [oldPattern (superseded), newPattern (active)]
   */
  supersede(newPattern: Pattern): [Pattern, Pattern] {
    const supersededVersion = new Pattern({
      relation: this.relation,
      confidence: this.confidence,
      evidence: this.evidence,
      dimension: this.dimension,
      acceptance: this.acceptance,
      runId: this.runId,
      producedAt: this.producedAt,
      status: 'superseded',
      supersededBy: `${newPattern.id}@${newPattern.version}`,
      version: this.version,
    });

    return [supersededVersion, newPattern];
  }

  /**
   * Crea un Pattern marcado como deprecated.
   */
  deprecate(): Pattern {
    return new Pattern({
      relation: this.relation,
      confidence: this.confidence,
      evidence: this.evidence,
      dimension: this.dimension,
      acceptance: this.acceptance,
      runId: this.runId,
      producedAt: this.producedAt,
      status: 'deprecated',
      version: this.version,
    });
  }
}
