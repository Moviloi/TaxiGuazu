/**
 * acceptance.test.ts — Pruebas del Acceptance Evaluator (PAA-1 §3, §8.1)
 *
 * PD-IM-1: Verifica cada filtro individualmente:
 *  - F₁: Adecuación Empírica (N_min, C_min, θ_min por dimensión)
 *  - F₂: No-Trivialidad Arquitectónica (match con catálogo de invariantes)
 *  - F₃: Independencia Lógica (BFS hasta k≤3, δ=0.1)
 *  - F₄: No-Coincidencia (Bonferroni, α=0.05, lift>1)
 *  - Acceptance Contract completo: F₁ ∧ F₂ ∧ F₃ ∧ F₄
 */

import { describe, it, expect } from 'vitest';
import { DefaultAcceptanceEvaluator } from '@/lib/pattern-discovery/acceptance';
import type {
  RelationCandidate,
  Relation,
  EvidenceWindow,
  Dimension,
  ProjectedState,
  Pattern,
  Invariant,
  AcceptanceReport,
} from '@/lib/pattern-discovery/types';

// ── Helpers ──

function makeRelation(overrides?: Partial<Relation>): Relation {
  return {
    description: 'channel=whatsapp → factCount≥1',
    variables: ['channel', 'factCount'] as [string, string],
    type: 'implication',
    ...overrides,
  };
}

function makeEvidence(overrides?: Partial<EvidenceWindow>): EvidenceWindow {
  return {
    snapshotCount: 10,
    conversationCount: 3,
    timeRange: { from: '2026-07-14T12:00:00Z', to: '2026-07-14T14:00:00Z' },
    support: 0.5,
    ...overrides,
  };
}

function makeProjectedState(overrides?: Partial<ProjectedState>): ProjectedState {
  return {
    turnNumber: 1,
    storedAt: new Date('2026-07-14T12:00:00Z'),
    conversationId: 'conv-001',
    observationValid: true,
    channel: 'whatsapp',
    hasContent: true,
    isWellFormed: true,
    factCount: 3,
    readiness: 'ready',
    isDecided: true,
    factCountDecision: 3,
    ...overrides,
  };
}

function makeCandidate(overrides?: Partial<RelationCandidate>): RelationCandidate {
  return {
    relation: makeRelation(),
    confidence: 0.8,
    evidence: makeEvidence(),
    dimension: 'intra',
    projectedSnapshots: [makeProjectedState()],
    ...overrides,
  };
}

function makeInvariant(overrides?: Partial<Invariant>): Invariant {
  return {
    id: 'INV-001',
    description: 'canal whatsapp implica factCount≥1',
    source: 'Contract',
    ruleRef: 'PAA-1',
    pattern: 'channel=whatsapp',
    activeSince: '2026-07-01T00:00:00Z',
    ...overrides,
  };
}

const emptyWindow: ProjectedState[] = [makeProjectedState()];
const emptyPatterns: Pattern[] = [];
const emptyInvariants: Invariant[] = [];

// ── F₁: Adecuación Empírica ──

describe('F₁ — Adecuación Empírica', () => {
  it('debe pasar F₁ cuando se cumplen N_min, C_min y θ_min (intra)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'intra',
      confidence: 0.7,     // ≥ 0.6
      evidence: makeEvidence({
        snapshotCount: 5,  // ≥ 3
        conversationCount: 2, // ≥ 1
      }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.passed).toBe(true);
    expect(report.F1_empirical.n).toBe(5);
    expect(report.F1_empirical.theta).toBe(0.7);
  });

  it('debe pasar F₁ para cross con umbrales diferentes', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'cross',
      confidence: 0.6,     // ≥ 0.5
      evidence: makeEvidence({
        snapshotCount: 6,  // ≥ 5
        conversationCount: 3, // ≥ 2
      }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.passed).toBe(true);
  });

  it('debe fallar F₁ cuando N es menor que N_min (intra: 3)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'intra',
      confidence: 0.8,
      evidence: makeEvidence({ snapshotCount: 2, conversationCount: 1 }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.passed).toBe(false);
  });

  it('debe fallar F₁ cuando C es menor que C_min (cross: 2)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'cross',
      confidence: 0.8,
      evidence: makeEvidence({ snapshotCount: 6, conversationCount: 1 }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.passed).toBe(false);
  });

  it('debe fallar F₁ cuando θ es menor que θ_min (intra: 0.6)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'intra',
      confidence: 0.5,
      evidence: makeEvidence({ snapshotCount: 5, conversationCount: 2 }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.passed).toBe(false);
  });

  it('debe retornar los valores correctos de n, coverage y theta cuando falla', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'intra',
      confidence: 0.5,
      evidence: makeEvidence({ snapshotCount: 2, conversationCount: 0 }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F1_empirical.n).toBe(2);
    expect(report.F1_empirical.coverage).toBe(0);
    expect(report.F1_empirical.theta).toBe(0.5);
  });
});

// ── F₂: No-Trivialidad Arquitectónica ──

describe('F₂ — No-Trivialidad Arquitectónica', () => {
  it('debe pasar F₂ cuando no hay invariantes que matcheen', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'turnNumber>5 → hasContent=true' }),
      evidence: makeEvidence({ snapshotCount: 5, conversationCount: 2 }),
      confidence: 0.8,
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);
    expect(report.F2_nonTrivial.passed).toBe(true);
    expect(report.F2_nonTrivial.catalogVersion).toBe('seed-v1');
  });

  it('debe fallar F₂ cuando la relación matchea una invariante', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'channel=whatsapp → factCount≥1' }),
      evidence: makeEvidence({ snapshotCount: 5, conversationCount: 2 }),
      confidence: 0.8,
    });

    const invariants = [makeInvariant({ pattern: 'channel=whatsapp' })];
    const report = evaluator.evaluate(candidate, invariants, emptyPatterns, emptyWindow);

    expect(report.F2_nonTrivial.passed).toBe(false);
    expect(report.F2_nonTrivial.match).toBeDefined();
  });

  it('debe usar regex para matchear invariantes', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'channel=smS → factCount≥1' }),
      evidence: makeEvidence({ snapshotCount: 5, conversationCount: 2 }),
      confidence: 0.8,
    });

    const invariants = [makeInvariant({ pattern: 'channel=\\w+' })];
    const report = evaluator.evaluate(candidate, invariants, emptyPatterns, emptyWindow);

    expect(report.F2_nonTrivial.passed).toBe(false);
  });
});

// ── F₃: Independencia Lógica ──

describe('F₃ — Independencia Lógica', () => {
  it('debe pasar F₃ cuando el catálogo está vacío (vacuamente cierto)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({ confidence: 0.8 });
    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);

    expect(report.F3_independence.passed).toBe(true);
  });

  it('debe pasar F₃ cuando no hay patrones que compartan variables', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'turnNumber>5 → isWellFormed=true' }),
      confidence: 0.8,
    });

    // Pattern existente NO relacionado
    const existingPattern: Pattern = {
      id: 'abc123',
      version: 1,
      relation: makeRelation({ description: 'channel=whatsapp → factCount≥1' }),
      confidence: 0.9,
      evidence: makeEvidence(),
      dimension: 'intra',
      acceptance: {
        F1_empirical: { passed: true, n: 10, coverage: 3, theta: 0.9 },
        F2_nonTrivial: { passed: true, catalogVersion: 'seed-v1' },
        F3_independence: { passed: true },
        F4_nonCoincidence: { passed: true, pValue: 0.01, correctedP: 0.04, lift: 2.5 },
      },
      status: 'active',
      runId: 'run-001',
      producedAt: '2026-07-14T12:00:00Z',
      equals: function () { return false; },
      supersede: function (p: Pattern) { return [this, p]; },
    };

    const report = evaluator.evaluate(candidate, emptyInvariants, [existingPattern], emptyWindow);
    expect(report.F3_independence.passed).toBe(true);
  });

  it('debe fallar F₃ cuando la relación es deducible (comparte variables y θ similar)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'channel=whatsapp → factCount≥1' }),
      confidence: 0.85,
      evidence: makeEvidence({ snapshotCount: 5, conversationCount: 2 }),
    });

    // Pattern existente que comparte variable "channel" y tiene θ ≈ 0.85
    const existingPattern: Pattern = {
      id: 'abc123',
      version: 1,
      relation: makeRelation({ description: 'channel=sms → factCount>0' }),
      confidence: 0.82,
      evidence: makeEvidence({ snapshotCount: 10, conversationCount: 3 }),
      dimension: 'intra',
      acceptance: {
        F1_empirical: { passed: true, n: 10, coverage: 3, theta: 0.82 },
        F2_nonTrivial: { passed: true, catalogVersion: 'seed-v1' },
        F3_independence: { passed: true },
        F4_nonCoincidence: { passed: true, pValue: 0.01, correctedP: 0.04, lift: 2.5 },
      },
      status: 'active',
      runId: 'run-001',
      producedAt: '2026-07-14T12:00:00Z',
      equals: function () { return false; },
      supersede: function (p: Pattern) { return [this, p]; },
    };

    const report = evaluator.evaluate(candidate, emptyInvariants, [existingPattern], emptyWindow);
    expect(report.F3_independence.passed).toBe(false);
    expect(report.F3_independence.derivedFrom).toBeDefined();
    expect(report.F3_independence.derivedFrom!.length).toBeGreaterThanOrEqual(1);
  });

  it('debe pasar F₃ cuando θ difiere significativamente (> δ=0.1) aunque comparta variables', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      relation: makeRelation({ description: 'channel=whatsapp → factCount≥1' }),
      confidence: 0.95, // muy diferente al existente
    });

    const existingPattern: Pattern = {
      id: 'abc123',
      version: 1,
      relation: makeRelation({ description: 'channel=sms → factCount>0' }),
      confidence: 0.3,  // muy diferente
      evidence: makeEvidence(),
      dimension: 'intra',
      acceptance: {
        F1_empirical: { passed: true, n: 10, coverage: 3, theta: 0.3 },
        F2_nonTrivial: { passed: true, catalogVersion: 'seed-v1' },
        F3_independence: { passed: true },
        F4_nonCoincidence: { passed: true, pValue: 0.01, correctedP: 0.04, lift: 2.5 },
      },
      status: 'active',
      runId: 'run-001',
      producedAt: '2026-07-14T12:00:00Z',
      equals: function () { return false; },
      supersede: function (p: Pattern) { return [this, p]; },
    };

    const report = evaluator.evaluate(candidate, emptyInvariants, [existingPattern], emptyWindow);
    expect(report.F3_independence.passed).toBe(true);
  });
});

// ── F₄: No-Coincidencia ──

describe('F₄ — No-Coincidencia', () => {
  /**
   * Helper: crea una ventana con dos grupos.
   * Primer grupo: channel='whatsapp', factCount=1 (match con val1, val2)
   * Segundo grupo: channel='sms', factCount=3 (no match)
   * La descripción de la relación debe usar '=' para que el parseo funcione.
   */
  function makeF4Window(
    matchCount: number,   // cuántos tienen channel='whatsapp' + factCount=1
    otherCount: number,    // cuántos tienen channel='sms' + factCount=3
  ): ProjectedState[] {
    const items: ProjectedState[] = [];
    for (let i = 0; i < matchCount; i++) {
      items.push(makeProjectedState({ channel: 'whatsapp', factCount: 1 }));
    }
    for (let i = 0; i < otherCount; i++) {
      items.push(makeProjectedState({ channel: 'sms', factCount: 3 }));
    }
    return items;
  }

  it('debe pasar F₄ cuando lift > 1 y correctedP < α', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    // 50 match, 50 other → a=50, n=100
    // lift = 0.8 / 0.3 = 2.67 > 1
    // Expected = 50*50/100 = 25, chiSq ≈ 24 → p ≈ 6e-6 → correctedP < 0.05
    const candidate = makeCandidate({
      relation: makeRelation({
        description: 'channel=whatsapp → factCount=1',
        variables: ['channel', 'factCount'] as [string, string],
      }),
      confidence: 0.8,
      evidence: makeEvidence({
        snapshotCount: 50,
        conversationCount: 10,
        support: 0.3,
      }),
    });

    const window = makeF4Window(50, 50);
    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, window);

    expect(report.F4_nonCoincidence.passed).toBe(true);
    expect(report.F4_nonCoincidence.lift).toBeGreaterThan(1);
    expect(report.F4_nonCoincidence.correctedP).toBeLessThan(0.05);
  });

  it('debe fallar F₄ cuando lift ≤ 1', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    // support=0.9, confidence=0.3 → lift = 0.3/0.9 = 0.33 ≤ 1
    const candidate = makeCandidate({
      relation: makeRelation({
        description: 'channel=whatsapp → factCount=1',
        variables: ['channel', 'factCount'] as [string, string],
      }),
      confidence: 0.3,
      evidence: makeEvidence({
        snapshotCount: 50,
        conversationCount: 10,
        support: 0.9,
      }),
    });

    const window = makeF4Window(50, 50);
    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, window);

    expect(report.F4_nonCoincidence.passed).toBe(false);
    expect(report.F4_nonCoincidence.lift).toBeLessThanOrEqual(1);
  });

  it('debe aplicar corrección Bonferroni (n > 1)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(10); // Bonferroni más estricto

    const candidate = makeCandidate({
      relation: makeRelation({
        description: 'channel=whatsapp → factCount=1',
        variables: ['channel', 'factCount'] as [string, string],
      }),
      confidence: 0.8,
      evidence: makeEvidence({
        snapshotCount: 50,
        conversationCount: 10,
        support: 0.3,
      }),
    });

    const window = makeF4Window(50, 50);
    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, window);

    // correctedP = pValue * 10 > pValue
    expect(report.F4_nonCoincidence.pValue).toBeLessThan(report.F4_nonCoincidence.correctedP);
  });

  it('debe fallar F₄ cuando correctedP ≥ α tras Bonferroni', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1000); // Bonferroni muy estricto

    // Ventana mixta donde la asociación es débil
    const window: ProjectedState[] = [
      makeProjectedState({ channel: 'whatsapp', factCount: 1 }),  // match val1 & val2
      makeProjectedState({ channel: 'whatsapp', factCount: 3 }),  // match val1, not val2 → b
      makeProjectedState({ channel: 'sms', factCount: 1 }),       // not val1, match val2 → c
      makeProjectedState({ channel: 'sms', factCount: 3 }),       // neither → d
      makeProjectedState({ channel: 'sms', factCount: 3 }),       // neither → d
    ];

    const candidate = makeCandidate({
      relation: makeRelation({
        description: 'channel=whatsapp → factCount=1',
        variables: ['channel', 'factCount'] as [string, string],
      }),
      confidence: 0.8,    // lift = 0.8/0.3 = 2.67 > 1 (pasa F₄-b)
      evidence: makeEvidence({
        snapshotCount: 1,  // a = 1 (asociación débil)
        conversationCount: 2,
        support: 0.3,
      }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, window);

    // n=1000 → correctedP = pValue * 1000 >> 0.05
    expect(report.F4_nonCoincidence.correctedP).toBeGreaterThanOrEqual(0.05);
  });
});

// ── Acceptance Contract Completo ──

describe('Acceptance Contract Completo (F₁ ∧ F₂ ∧ F₃ ∧ F₄)', () => {
  it('debe pasar el contrato completo cuando todos los filtros pasan', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const window: ProjectedState[] = [];
    for (let i = 0; i < 50; i++) {
      window.push(makeProjectedState({ channel: 'whatsapp', factCount: 1 }));
    }
    for (let i = 0; i < 50; i++) {
      window.push(makeProjectedState({ channel: 'sms', factCount: 3 }));
    }

    const candidate = makeCandidate({
      relation: makeRelation({
        description: 'channel=whatsapp → factCount=1',
        variables: ['channel', 'factCount'] as [string, string],
      }),
      dimension: 'intra',
      confidence: 0.8,
      evidence: makeEvidence({
        snapshotCount: 50,
        conversationCount: 10,
        support: 0.3,
      }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, window);

    expect(report.F1_empirical.passed).toBe(true);
    expect(report.F4_nonCoincidence.passed).toBe(true);
  });

  it('debe fallar el contrato completo cuando F₁ falla (y el resto no se ejecuta conceptualmente)', () => {
    const evaluator = new DefaultAcceptanceEvaluator();
    evaluator.setTotalCandidates(1);

    const candidate = makeCandidate({
      dimension: 'intra',
      confidence: 0.3, // < 0.6
      evidence: makeEvidence({ snapshotCount: 2, conversationCount: 0 }),
    });

    const report = evaluator.evaluate(candidate, emptyInvariants, emptyPatterns, emptyWindow);

    expect(report.F1_empirical.passed).toBe(false);
    // F₂ y F₃ se evalúan igual (no hay short-circuit en la implementación actual)
  });
});
