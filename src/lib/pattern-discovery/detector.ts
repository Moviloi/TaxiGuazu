/**
 * detector.ts — Relation Detector (PDE-1 §6.2, PD-IM-0 §2.5)
 *
 * Implementa RelationDetector. Genera relaciones candidatas desde
 * ProjectedState[] usando detectores iniciales simples:
 * - Tablas de contingencia para pares categóricos
 * - Correlación para pares numéricos
 * - Estabilidad temporal
 * - Contraste entre conversaciones
 *
 * R-DEP-3: detector.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type {
  RelationDetector,
  RelationCandidate,
  ProjectedState,
  DetectionConfig,
  Relation,
  RelationType,
  EvidenceWindow,
  Dimension,
} from './types';

// ── Umbrales mínimos (PAA-1 §3.1) ──
const N_MIN: Record<Dimension, number> = {
  intra: 3,
  inter: 3,
  cross: 5,
};

const C_MIN: Record<Dimension, number> = {
  intra: 1,
  inter: 1,
  cross: 2,
};

const THETA_MIN: Record<Dimension, number> = {
  intra: 0.6,
  inter: 0.6,
  cross: 0.5,
};

// ── Pares de campos analizables para detección ──
interface FieldPair {
  name: string;
  v1: keyof ProjectedState;
  v2: keyof ProjectedState;
  type: RelationType;
}

// Pares categóricos (tablas de contingencia)
const CATEGORICAL_PAIRS: FieldPair[] = [
  { name: 'channel→readiness',      v1: 'channel',    v2: 'readiness',      type: 'correlation' },
  { name: 'channel→isDecided',       v1: 'channel',    v2: 'isDecided',     type: 'correlation' },
  { name: 'hasContent→isDecided',    v1: 'hasContent', v2: 'isDecided',     type: 'implication' },
  { name: 'isWellFormed→readiness',  v1: 'isWellFormed', v2: 'readiness',   type: 'implication' },
  { name: 'observationValid→hasContent', v1: 'observationValid', v2: 'hasContent', type: 'correlation' },
  { name: 'readiness→isDecided',     v1: 'readiness',  v2: 'isDecided',     type: 'correlation' },
];

// Pares numéricos (correlación)
const NUMERIC_PAIRS: FieldPair[] = [
  { name: 'factCount→factCountDecision', v1: 'factCount', v2: 'factCountDecision', type: 'correlation' },
  { name: 'turnNumber→factCount',        v1: 'turnNumber', v2: 'factCount',        type: 'trend' },
  { name: 'turnNumber→factCountDecision', v1: 'turnNumber', v2: 'factCountDecision', type: 'trend' },
];

// ── Helpers ──

/**
 * Obtiene el valor de un campo de ProjectedState como string para comparación categórica.
 */
function getFieldValue(s: ProjectedState, field: keyof ProjectedState): string {
  const v = s[field];
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean') return v ? 'true' : 'false';
  return String(v);
}

/**
 * Detecta la dimensión más probable para una relación basada en la distribución
 * de conversations en la evidencia.
 */
function inferDimension(snapshots: ProjectedState[]): Dimension {
  const conversations = new Set(snapshots.map(s => s.conversationId));
  const count = conversations.size;

  if (count >= C_MIN.cross) return 'cross';
  if (count >= C_MIN.inter) return 'inter';
  return 'intra';
}

/**
 * Calcula support (proporción de snapshots que confirman la relación).
 */
function calculateSupport(
  snapshots: ProjectedState[],
  v1: keyof ProjectedState,
  val1: string,
  v2: keyof ProjectedState,
  val2: string
): number {
  const n = snapshots.length;
  if (n === 0) return 0;

  const countBoth = snapshots.filter(
    s => getFieldValue(s, v1) === val1 && getFieldValue(s, v2) === val2
  ).length;

  return countBoth / n;
}

/**
 * Detecta la moda de un campo categórico y cuenta ocurrencias.
 */
function detectCategoricalRelation(
  snapshots: ProjectedState[],
  pair: FieldPair
): RelationCandidate | null {
  const { v1, v2, type } = pair;

  // Encontrar la combinación más frecuente de valores
  const frequency = new Map<string, number>();
  for (const s of snapshots) {
    const key = `${getFieldValue(s, v1)}→${getFieldValue(s, v2)}`;
    frequency.set(key, (frequency.get(key) || 0) + 1);
  }

  // Encontrar la combinación más frecuente
  let maxCount = 0;
  let bestKey = '';
  for (const [key, count] of frequency) {
    if (count > maxCount) {
      maxCount = count;
      bestKey = key;
    }
  }

  if (maxCount < 2) return null;  // Mínimo 2 ocurrencias

  const [val1, val2] = bestKey.split('→');
  const n = maxCount;

  const support = calculateSupport(snapshots, v1, val1, v2, val2);
  const theta = support;
  const dimension = inferDimension(snapshots);

  // Verificar umbrales mínimos
  if (n < N_MIN[dimension]) return null;
  if (theta < THETA_MIN[dimension]) return null;

  // Construir descripción legible
  const description = `${String(v1)}=${val1} → ${String(v2)}=${val2}`;

  // Contar conversaciones involucradas
  const conversations = new Set(
    snapshots
      .filter(s => getFieldValue(s, v1) === val1 && getFieldValue(s, v2) === val2)
      .map(s => s.conversationId)
  );

  const relation: Relation = {
    description,
    variables: [String(v1), String(v2)],
    type,
  };

  const evidence: EvidenceWindow = {
    snapshotCount: n,
    conversationCount: conversations.size,
    timeRange: { from: '', to: '' },  // Se completa en AcceptanceEvaluator
    support,
  };

  const candidate: RelationCandidate = {
    relation,
    confidence: theta,
    evidence,
    dimension,
    projectedSnapshots: snapshots.filter(
      s => getFieldValue(s, v1) === val1 && getFieldValue(s, v2) === val2
    ),
  };

  return candidate;
}

/**
 * Detecta correlación numérica entre dos campos.
 */
function detectNumericRelation(
  snapshots: ProjectedState[],
  pair: FieldPair
): RelationCandidate | null {
  const { v1, v2, type } = pair;

  const values = snapshots.map(s => ({
    x: Number(s[v1]),
    y: Number(s[v2]),
  }));

  const validValues = values.filter(v => !isNaN(v.x) && !isNaN(v.y));
  if (validValues.length < 3) return null;

  const n = validValues.length;

  // Calcular correlación de Pearson
  const meanX = validValues.reduce((a, v) => a + v.x, 0) / n;
  const meanY = validValues.reduce((a, v) => a + v.y, 0) / n;

  let cov = 0;
  let varX = 0;
  let varY = 0;

  for (const v of validValues) {
    const dx = v.x - meanX;
    const dy = v.y - meanY;
    cov += dx * dy;
    varX += dx * dx;
    varY += dy * dy;
  }

  const denom = Math.sqrt(varX * varY);
  if (denom === 0) return null;

  const r = cov / denom;
  const theta = Math.abs(r);  // |r| como confianza
  const dimension = inferDimension(snapshots);

  if (theta < THETA_MIN[dimension]) return null;
  if (n < N_MIN[dimension]) return null;

  // Construir relación
  const description = `${String(v1)} ~ ${String(v2)} (r=${r.toFixed(3)})`;
  const conversations = new Set(snapshots.map(s => s.conversationId));

  const relation: Relation = {
    description,
    variables: [String(v1), String(v2)],
    type,
  };

  const evidence: EvidenceWindow = {
    snapshotCount: n,
    conversationCount: conversations.size,
    timeRange: { from: '', to: '' },
    support: theta,
  };

  const candidate: RelationCandidate = {
    relation,
    confidence: theta,
    evidence,
    dimension,
    projectedSnapshots: snapshots,
  };

  return candidate;
}

// ── DefaultRelationDetector ──

export class DefaultRelationDetector implements RelationDetector {
  /**
   * Genera todas las relaciones candidatas detectables
   * en la ventana de snapshots proyectados.
   *
   * Aplica detectores iniciales simples:
   * - Pares categóricos → tablas de contingencia
   * - Pares numéricos → correlación de Pearson
   * - Sin relaciones cross aún (futura implementación)
   */
  detect(snapshots: ProjectedState[], config: DetectionConfig): RelationCandidate[] {
    if (snapshots.length < 2) return [];

    const candidates: RelationCandidate[] = [];
    const enabledDims = new Set(config.enabledDimensions);

    // 1. Detectar relaciones categóricas
    for (const pair of CATEGORICAL_PAIRS) {
      const candidate = detectCategoricalRelation(snapshots, pair);
      if (candidate && enabledDims.has(candidate.dimension)) {
        candidates.push(candidate);
      }
    }

    // 2. Detectar relaciones numéricas
    for (const pair of NUMERIC_PAIRS) {
      const candidate = detectNumericRelation(snapshots, pair);
      if (candidate && enabledDims.has(candidate.dimension)) {
        candidates.push(candidate);
      }
    }

    // 3. Aplicar límite opcional de relaciones
    if (config.maxRelations && candidates.length > config.maxRelations) {
      candidates.sort((a, b) => b.confidence - a.confidence);
      return candidates.slice(0, config.maxRelations);
    }

    return candidates;
  }
}
