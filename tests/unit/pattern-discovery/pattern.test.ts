/**
 * pattern.test.ts — Pruebas del Pattern Value Object (PDE-1 §3.1, §3.2)
 *
 * PD-IM-1: Verifica:
 *  - Identidad determinística (id = H(R∥D))
 *  - Hash SHA-256 truncado a 32 chars
 *  - Versionado (misma identidad, diferente version)
 *  - Supersede (viejo marcado, nuevo activo)
 *  - ε = 0.05 (umbral de diferencia de θ)
 *  - needsNewVersion standalone function
 *  - createSupersededPair standalone function
 *  - equals, deprecate, freeze
 */

import { describe, it, expect } from 'vitest';
import { Pattern, needsNewVersion, createSupersededPair } from '@/lib/pattern-discovery/pattern';
import type { Relation, EvidenceWindow, Dimension, AcceptanceReport } from '@/lib/pattern-discovery/types';

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

function makeAcceptance(overrides?: Partial<AcceptanceReport>): AcceptanceReport {
  return {
    F1_empirical: { passed: true, n: 10, coverage: 3, theta: 0.8 },
    F2_nonTrivial: { passed: true, catalogVersion: 'seed-v1' },
    F3_independence: { passed: true },
    F4_nonCoincidence: { passed: true, pValue: 0.01, correctedP: 0.04, lift: 2.5 },
    ...overrides,
  };
}

function makePatternProps(overrides?: Record<string, unknown>) {
  return {
    relation: makeRelation(),
    confidence: 0.8,
    evidence: makeEvidence(),
    dimension: 'intra' as Dimension,
    acceptance: makeAcceptance(),
    runId: 'run-001',
    producedAt: '2026-07-14T12:00:00Z',
    ...overrides,
  };
}

// ── Tests ──

describe('Pattern — Identidad', () => {
  it('debe generar el mismo id para la misma relation+dimension', () => {
    const p1 = new Pattern(makePatternProps());
    const p2 = new Pattern(makePatternProps());
    expect(p1.id).toBe(p2.id);
  });

  it('debe generar ids diferentes para distintas relations', () => {
    const p1 = new Pattern(makePatternProps({ relation: makeRelation({ description: 'A→B' }) }));
    const p2 = new Pattern(makePatternProps({ relation: makeRelation({ description: 'C→D' }) }));
    expect(p1.id).not.toBe(p2.id);
  });

  it('debe generar ids diferentes para distintas dimensions', () => {
    const p1 = new Pattern(makePatternProps({ dimension: 'intra' }));
    const p2 = new Pattern(makePatternProps({ dimension: 'cross' }));
    expect(p1.id).not.toBe(p2.id);
  });

  it('debe generar un hash SHA-256 truncado a 32 caracteres hex', () => {
    const p = new Pattern(makePatternProps());
    expect(p.id).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe('Pattern — Versionado', () => {
  it('debe asignar version=1 por defecto', () => {
    const p = new Pattern(makePatternProps());
    expect(p.version).toBe(1);
  });

  it('debe respetar la version explícita', () => {
    const p = new Pattern(makePatternProps({ version: 5 }));
    expect(p.version).toBe(5);
  });

  it('Patterns con mismo id pero diferente version NO deben ser equals', () => {
    const props = makePatternProps();
    const p1 = new Pattern({ ...props, version: 1 });
    const p2 = new Pattern({ ...props, version: 2 });
    expect(p1.equals(p2)).toBe(false);
  });

  it('Patterns con mismo id y version deben ser equals', () => {
    const p1 = new Pattern(makePatternProps());
    const p2 = new Pattern(makePatternProps());
    expect(p1.equals(p2)).toBe(true);
  });
});

describe('Pattern — Supersede', () => {
  it('debe marcar el viejo como superseded y mantener el nuevo como active', () => {
    const old = new Pattern(makePatternProps({ version: 1 }));
    const updated = new Pattern(makePatternProps({ version: 2, confidence: 0.9 }));

    const [superseded, active] = old.supersede(updated);

    expect(superseded.status).toBe('superseded');
    expect(superseded.supersededBy).toBe(`${updated.id}@${updated.version}`);
    expect(superseded.version).toBe(1);
    expect(active.status).toBe('active');
    expect(active.version).toBe(2);
  });

  it('supersede debe preservar los datos originales del viejo pattern', () => {
    const old = new Pattern(makePatternProps());
    const updated = new Pattern(makePatternProps({ confidence: 0.9 }));
    const [superseded] = old.supersede(updated);

    expect(superseded.confidence).toBe(old.confidence);
    expect(superseded.evidence.snapshotCount).toBe(old.evidence.snapshotCount);
    expect(superseded.relation.description).toBe(old.relation.description);
  });
});

describe('Pattern — Deprecate', () => {
  it('debe marcar el pattern como deprecated sin alterar otros campos', () => {
    const p = new Pattern(makePatternProps());
    const deprecated = p.deprecate();

    expect(deprecated.status).toBe('deprecated');
    expect(deprecated.id).toBe(p.id);
    expect(deprecated.version).toBe(p.version);
    expect(deprecated.confidence).toBe(p.confidence);
    expect(deprecated.relation.description).toBe(p.relation.description);
  });
});

describe('Pattern — Freeze (inmutabilidad)', () => {
  it('debe congelar el objeto (Object.freeze)', () => {
    const p = new Pattern(makePatternProps());
    expect(Object.isFrozen(p)).toBe(true);
  });

  it('NO debe permitir modificar propiedades', () => {
    const p = new Pattern(makePatternProps());
    expect(() => {
      (p as Record<string, unknown>).confidence = 0.5;
    }).toThrow();
  });
});

describe('needsNewVersion (standalone)', () => {
  it('debe retornar true cuando θ cambia más de ε=0.05', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.80 }));
    expect(needsNewVersion(existing, 0.86, 10)).toBe(true);
  });

  it('debe retornar false cuando θ cambia exactamente ε=0.05 (dentro del umbral)', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.80 }));
    expect(needsNewVersion(existing, 0.85, 10)).toBe(false);
  });

  it('debe retornar false cuando θ cambia menos de ε', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.80 }));
    expect(needsNewVersion(existing, 0.83, 10)).toBe(false);
  });

  it('debe retornar true cuando snapshotCount cambia aunque θ no cambie', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.80, evidence: makeEvidence({ snapshotCount: 10 }) }));
    expect(needsNewVersion(existing, 0.80, 15)).toBe(true);
  });

  it('debe retornar false cuando nada cambia', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.80, evidence: makeEvidence({ snapshotCount: 10 }) }));
    expect(needsNewVersion(existing, 0.80, 10)).toBe(false);
  });
});

describe('createSupersededPair (standalone)', () => {
  it('debe retornar [superseded, active] con el orden correcto', () => {
    const existing: Pattern = new Pattern(makePatternProps({ version: 1, confidence: 0.7 }));
    const newPattern = new Pattern(makePatternProps({ version: 2, confidence: 0.9 }));

    const [superseded, active] = createSupersededPair(existing, newPattern);

    expect(superseded.status).toBe('superseded');
    expect(superseded.supersededBy).toBe(`${newPattern.id}@${newPattern.version}`);
    expect(superseded.version).toBe(1);
    expect(active.status).toBe('active');
    expect(active.version).toBe(2);
  });

  it('debe preservar los datos del pattern original en la versión superseded', () => {
    const existing = new Pattern(makePatternProps({ confidence: 0.7, evidence: makeEvidence({ snapshotCount: 5 }) }));
    const newPattern = new Pattern(makePatternProps({ confidence: 0.9, evidence: makeEvidence({ snapshotCount: 10 }) }));

    const [superseded] = createSupersededPair(existing, newPattern);

    expect(superseded.confidence).toBe(0.7);
    expect(superseded.evidence.snapshotCount).toBe(5);
    expect(superseded.runId).toBe(existing.runId);
  });
});
