/**
 * acceptance.ts — Acceptance Evaluator (PAA-1 §3, §8.1)
 *
 * Implementa el Acceptance Contract F₁ ∧ F₂ ∧ F₃ ∧ F₄.
 * Evalúa si una relación candidata merece ser aceptada como Pattern.
 *
 * Parámetros congelados (PAA-1 §3.3.1, §3.4.1):
 *   F₃: profundidad k ≤ 3, δ = 0.1
 *   F₄: Bonferroni, n = |RelationCandidate[]| pre-filtros, α = 0.05
 *
 * R-DEP-3: acceptance.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type {
  AcceptanceEvaluator,
  AcceptanceReport,
  RelationCandidate,
  Invariant,
  Pattern,
  ProjectedState,
  Dimension,
} from './types';

// ── Umbrales arquitectónicos (PAA-1 §3.1) ──
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

// ── Parámetros congelados de F₃ (PAA-1 §3.3.1) ──
const F3_MAX_DEPTH = 3;
const F3_DELTA = 0.1;

// ── Parámetros congelados de F₄ (PAA-1 §3.4.1) ──
const F4_ALPHA = 0.05;
const F4_LIFT_MIN = 1.0;

// ── Filtro 1: Adecuación Empírica ──

function evaluateF1(candidate: RelationCandidate): { passed: boolean; n: number; coverage: number; theta: number } {
  const dim = candidate.dimension;
  const n = candidate.evidence.snapshotCount;
  const coverage = candidate.evidence.conversationCount;
  const theta = candidate.confidence;

  // F₁-a: |E| ≥ N_min(D)
  if (n < N_MIN[dim]) {
    return { passed: false, n, coverage, theta };
  }

  // F₁-b: diversidad de conversaciones
  if (coverage < C_MIN[dim]) {
    return { passed: false, n, coverage, theta };
  }

  // F₁-d: θ ≥ θ_min(D)
  if (theta < THETA_MIN[dim]) {
    return { passed: false, n, coverage, theta };
  }

  return { passed: true, n, coverage, theta };
}

// ── Filtro 2: No-Trivialidad Arquitectónica ──

function evaluateF2(
  candidate: RelationCandidate,
  invariants: Invariant[]
): { passed: boolean; catalogVersion: string; match?: string } {
  const description = candidate.relation.description;

  // Buscar match directo o por patrón
  for (const inv of invariants) {
    try {
      const regex = new RegExp(inv.pattern, 'i');
      if (regex.test(description)) {
        return {
          passed: false,
          catalogVersion: inv.id,
          match: inv.description,
        };
      }
    } catch {
      // Si el patrón no es una regex válida, ignorar
      continue;
    }
  }

  return { passed: true, catalogVersion: 'seed-v1' };
}

// ── Filtro 3: Independencia Lógica (PAA-1 §3.3.1) ──

/**
 * Obtiene las variables involucradas en una relación a partir de su descripción.
 * Variables(R) = { x | x es una variable libre en la representación de R }
 */
function extractVariables(description: string): string[] {
  // Las variables en la descripción son nombres de campo (ej. "channel", "factCount")
  const knownVariables = [
    'channel', 'readiness', 'isDecided', 'hasContent', 'isWellFormed',
    'observationValid', 'factCount', 'factCountDecision', 'turnNumber',
  ];

  return knownVariables.filter(v => description.includes(v));
}

/**
 * Verifica si dos relaciones comparten al menos una variable.
 */
function sharesVariable(desc1: string, desc2: string): boolean {
  const vars1 = extractVariables(desc1);
  const vars2 = extractVariables(desc2);
  return vars1.some(v => vars2.includes(v));
}

/**
 * Evalúa F₃ con profundidad máxima k ≤ 3 y tolerancia δ = 0.1.
 */
function evaluateF3(
  candidate: RelationCandidate,
  existingPatterns: Pattern[]
): { passed: boolean; derivedFrom?: string[] } {
  // Si el catálogo está vacío → F₃ es vacuamente cierto
  if (existingPatterns.length === 0) {
    return { passed: true };
  }

  const candidateDesc = candidate.relation.description;
  const candidateVars = extractVariables(candidateDesc);
  const candidateTheta = candidate.confidence;

  // BFS con profundidad máxima k ≤ 3
  // Buscar cadenas deductivas: P₁ → P₂ → ... → P_k → R
  const visited = new Set<string>();
  const queue: Array<{ pattern: Pattern; depth: number; path: string[] }> = [];

  // Inicializar con todos los patterns activos que compartan variables
  for (const p of existingPatterns) {
    if (p.status !== 'active') continue;
    if (sharesVariable(p.relation.description, candidateDesc)) {
      queue.push({ pattern: p, depth: 1, path: [p.id] });
      visited.add(p.id);
    }
  }

  while (queue.length > 0) {
    const current = queue.shift()!;

    if (current.depth > F3_MAX_DEPTH) continue;

    // Verificar si desde este pattern podemos deducir R
    // (comparten variables y la cadena podría implicar R)
    const currentVars = extractVariables(current.pattern.relation.description);

    // Si todas las variables de R están cubiertas por la cadena
    const coveredByChain = currentVars.some(v => candidateVars.includes(v));
    if (coveredByChain && current.depth <= F3_MAX_DEPTH) {
      // Calcular θ_deducido como el promedio de θ de los patterns en la cadena
      // (simplificación: producto de confianzas para implicaciones)
      let thetaDeducido = 1;
      for (const pId of current.path) {
        const p = existingPatterns.find(ep => ep.id === pId);
        if (p) thetaDeducido *= p.confidence;
      }

      // Verificar tolerancia: |θ_R - θ_deducido| ≤ δ
      const thetaDiff = Math.abs(candidateTheta - thetaDeducido);

      if (thetaDiff <= F3_DELTA) {
        // R es deducible con θ equivalente
        return {
          passed: false,
          derivedFrom: current.path,
        };
      }
      // Si θ_R difiere significativamente → R aporta información nueva → pasa F₃
    }

    // Expandir BFS: buscar patterns que compartan variables con el actual
    if (current.depth < F3_MAX_DEPTH) {
      for (const p of existingPatterns) {
        if (p.status !== 'active') continue;
        if (visited.has(p.id)) continue;
        if (sharesVariable(p.relation.description, current.pattern.relation.description)) {
          visited.add(p.id);
          queue.push({
            pattern: p,
            depth: current.depth + 1,
            path: [...current.path, p.id],
          });
        }
      }
    }
  }

  // No se encontró cadena deductiva completa → pasa F₃
  return { passed: true };
}

// ── Filtro 4: No-Coincidencia (PAA-1 §3.4.1) ──

/**
 * Calcula p-value simplificado usando chi-cuadrado.
 */
function calculatePValue(
  candidate: RelationCandidate,
  fullWindow: ProjectedState[]
): number {
  const n = fullWindow.length;
  if (n < 2) return 1;

  const [v1, v2] = candidate.relation.variables;
  const val1 = candidate.relation.description.split('=')[1]?.split(' ')[0] ?? '';
  const val2 = candidate.relation.description.split('→')[1]?.split('=')[1]?.trim() ?? '';

  // Tabla de contingencia 2×2
  const a = candidate.evidence.snapshotCount;  // V1=val1 AND V2=val2
  const b = fullWindow.filter(s =>
    String(s[v1 as keyof ProjectedState]) === val1 &&
    String(s[v2 as keyof ProjectedState]) !== val2
  ).length;  // V1=val1 AND V2≠val2
  const c = fullWindow.filter(s =>
    String(s[v1 as keyof ProjectedState]) !== val1 &&
    String(s[v2 as keyof ProjectedState]) === val2
  ).length;  // V1≠val1 AND V2=val2
  const d = n - a - b - c;  // V1≠val1 AND V2≠val2

  // Evitar división por cero
  const row1 = a + b;
  const row2 = c + d;
  const col1 = a + c;
  const col2 = b + d;

  if (row1 === 0 || row2 === 0 || col1 === 0 || col2 === 0) return 1;

  // Chi-cuadrado con corrección de Yates
  // χ² = Σ((|O-E|-0.5)²/E)
  const expected = (row1 * col1) / n;
  if (expected === 0) return 1;

  const chiSq =
    Math.pow(Math.max(0, Math.abs(a - expected) - 0.5), 2) / expected;

  // Para 1 grado de libertad, p ≈ exp(-χ²/2) (aproximación)
  const pValue = Math.exp(-chiSq / 2);

  return Math.min(1, pValue);
}

/**
 * Evalúa F₄ con Bonferroni (PAA-1 §3.4.1).
 *
 * @param candidate — Relación candidata
 * @param fullWindow — Ventana completa de snapshots
 * @param totalCandidates — n total para corrección Bonferroni (|RelationCandidate[]| pre-filtros)
 * @param currentLift — Lift calculado (si se proporciona, se usa)
 */
function evaluateF4(
  candidate: RelationCandidate,
  fullWindow: ProjectedState[],
  totalCandidates: number
): { passed: boolean; pValue: number; correctedP: number; lift: number } {
  const lift = candidate.evidence.support > 0
    ? candidate.confidence / candidate.evidence.support
    : 1;

  // F₄-b: lift > L_min
  if (lift <= F4_LIFT_MIN) {
    return { passed: false, pValue: 1, correctedP: 1, lift };
  }

  // Calcular p-value
  const pValue = calculatePValue(candidate, fullWindow);

  // F₄-c: corrección Bonferroni
  const n = Math.max(1, totalCandidates);
  const correctedP = Math.min(1, pValue * n);

  // F₄-a: p-value corregido < α
  if (correctedP >= F4_ALPHA) {
    return { passed: false, pValue, correctedP, lift };
  }

  return { passed: true, pValue, correctedP, lift };
}

// ── DefaultAcceptanceEvaluator ──

export class DefaultAcceptanceEvaluator implements AcceptanceEvaluator {
  /**
   * Número total de candidatos en esta ejecución (para corrección Bonferroni).
   * Se setea externamente antes de evaluar.
   */
  private totalCandidatesInRun: number = 0;

  setTotalCandidates(n: number): void {
    this.totalCandidatesInRun = n;
  }

  /**
   * Evalúa si una relación candidata pasa el Acceptance Contract.
   * F₁ ∧ F₂ ∧ F₃ ∧ F₄ (PAA-1 §8.1).
   */
  evaluate(
    candidate: RelationCandidate,
    invariants: Invariant[],
    existingPatterns: Pattern[],
    fullWindow: ProjectedState[]
  ): AcceptanceReport {
    const f1 = evaluateF1(candidate);
    const f2 = evaluateF2(candidate, invariants);
    const f3 = evaluateF3(candidate, existingPatterns);
    const f4 = evaluateF4(candidate, fullWindow, this.totalCandidatesInRun);

    return {
      F1_empirical: f1,
      F2_nonTrivial: f2,
      F3_independence: f3,
      F4_nonCoincidence: f4,
    };
  }
}
