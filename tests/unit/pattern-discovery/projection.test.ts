/**
 * projection.test.ts — Pruebas de proyección 19→11 (PBA-1, PDE-1 §2.2)
 *
 * PD-IM-1: Verifica:
 *  - Proyección de 19 campos a 11 exactos
 *  - Mapeo correcto desde MemorySnapshot
 *  - Ningún campo omitido ni extra
 *  - projectMany procesa múltiples snapshots
 */

import { describe, it, expect } from 'vitest';
import { project, projectMany } from '@/lib/pattern-discovery/projection';
import type { MemorySnapshot } from '@/lib/memory/types';

// ── Helpers ──

function makeSnapshot(overrides?: Partial<MemorySnapshot>): MemorySnapshot {
  return {
    conversationId: 'conv-001',
    memoryId: 'mem-001',
    turnNumber: 1,
    storedAt: new Date('2026-07-14T12:00:00Z'),
    belief: {
      id: 'bel-001',
      observationValid: true,
      channel: 'whatsapp',
      hasContent: true,
      receivedAt: '2026-07-14T12:00:00Z',
      conversationId: 'conv-001',
      isWellFormed: true,
      factCount: 3,
    },
    decision: {
      id: 'dec-001',
      validInput: true,
      hasContent: true,
      readiness: 'ready' as const,
      missingInfo: [] as readonly string[],
      isDecided: true,
      factCount: 3,
    },
    ...overrides,
  };
}

function listKeys(obj: Record<string, unknown>): string[] {
  return Object.keys(obj).sort();
}

// ── Tests ──

describe('project — proyección 19→11', () => {
  it('debe retornar exactamente 11 campos (ni más, ni menos)', () => {
    const snapshot = makeSnapshot();
    const projected = project(snapshot);
    const keys = listKeys(projected as unknown as Record<string, unknown>);
    expect(keys).toHaveLength(11);
  });

  it('debe incluir los 3 campos de metadata: turnNumber, storedAt, conversationId', () => {
    const snapshot = makeSnapshot();
    const projected = project(snapshot);
    expect(projected).toHaveProperty('turnNumber');
    expect(projected).toHaveProperty('storedAt');
    expect(projected).toHaveProperty('conversationId');
  });

  it('debe incluir los 5 campos de belief: observationValid, channel, hasContent, isWellFormed, factCount', () => {
    const snapshot = makeSnapshot();
    const projected = project(snapshot);
    expect(projected).toHaveProperty('observationValid');
    expect(projected).toHaveProperty('channel');
    expect(projected).toHaveProperty('hasContent');
    expect(projected).toHaveProperty('isWellFormed');
    expect(projected).toHaveProperty('factCount');
  });

  it('debe incluir los 3 campos de decision: readiness, isDecided, factCountDecision', () => {
    const snapshot = makeSnapshot();
    const projected = project(snapshot);
    expect(projected).toHaveProperty('readiness');
    expect(projected).toHaveProperty('isDecided');
    expect(projected).toHaveProperty('factCountDecision');
  });

  it('NO debe incluir campos internos de MemorySnapshot (memoryId, belief.id, decision.id, etc.)', () => {
    const snapshot = makeSnapshot();
    const projected = project(snapshot);
    const keys = listKeys(projected as unknown as Record<string, unknown>);
    expect(keys).not.toContain('memoryId');
    expect(keys).not.toContain('belief');
    expect(keys).not.toContain('decision');
  });

  it('debe mapear turnNumber correctamente desde snapshot.turnNumber', () => {
    const snapshot = makeSnapshot({ turnNumber: 42 });
    expect(project(snapshot).turnNumber).toBe(42);
  });

  it('debe mapear storedAt correctamente desde snapshot.storedAt', () => {
    const date = new Date('2026-07-14T15:30:00Z');
    const snapshot = makeSnapshot({ storedAt: date });
    expect(project(snapshot).storedAt).toBe(date);
  });

  it('debe mapear conversationId correctamente desde snapshot.conversationId', () => {
    const snapshot = makeSnapshot({ conversationId: 'conv-999' });
    expect(project(snapshot).conversationId).toBe('conv-999');
  });

  it('debe mapear observationValid desde snapshot.belief.observationValid', () => {
    const snapshot = makeSnapshot();
    snapshot.belief.observationValid = false;
    expect(project(snapshot).observationValid).toBe(false);
  });

  it('debe mapear channel desde snapshot.belief.channel', () => {
    const snapshot = makeSnapshot();
    snapshot.belief.channel = 'sms';
    expect(project(snapshot).channel).toBe('sms');
  });

  it('debe mapear hasContent desde snapshot.belief.hasContent', () => {
    const snapshot = makeSnapshot();
    snapshot.belief.hasContent = false;
    expect(project(snapshot).hasContent).toBe(false);
  });

  it('debe mapear isWellFormed desde snapshot.belief.isWellFormed', () => {
    const snapshot = makeSnapshot();
    snapshot.belief.isWellFormed = false;
    expect(project(snapshot).isWellFormed).toBe(false);
  });

  it('debe mapear factCount desde snapshot.belief.factCount', () => {
    const snapshot = makeSnapshot();
    snapshot.belief.factCount = 7;
    expect(project(snapshot).factCount).toBe(7);
  });

  it('debe mapear readiness desde snapshot.decision.readiness', () => {
    const snapshot = makeSnapshot();
    snapshot.decision.readiness = 'partial';
    expect(project(snapshot).readiness).toBe('partial');
  });

  it('debe mapear isDecided desde snapshot.decision.isDecided', () => {
    const snapshot = makeSnapshot();
    snapshot.decision.isDecided = false;
    expect(project(snapshot).isDecided).toBe(false);
  });

  it('debe mapear factCountDecision desde snapshot.decision.factCount', () => {
    const snapshot = makeSnapshot();
    snapshot.decision.factCount = 5;
    expect(project(snapshot).factCountDecision).toBe(5);
  });
});

describe('projectMany — proyección múltiple', () => {
  it('debe retornar un array vacío para entrada vacía', () => {
    expect(projectMany([])).toEqual([]);
  });

  it('debe proyectar cada snapshot individualmente', () => {
    const s1 = makeSnapshot({ turnNumber: 1, conversationId: 'conv-1' });
    const s2 = makeSnapshot({ turnNumber: 2, conversationId: 'conv-2' });
    const s3 = makeSnapshot({ turnNumber: 3, conversationId: 'conv-3' });

    const result = projectMany([s1, s2, s3]);
    expect(result).toHaveLength(3);
    expect(result[0].turnNumber).toBe(1);
    expect(result[1].turnNumber).toBe(2);
    expect(result[2].turnNumber).toBe(3);
  });

  it('no debe mutar los snapshots originales', () => {
    const snapshot = makeSnapshot();
    const before = snapshot.turnNumber;
    projectMany([snapshot]);
    expect(snapshot.turnNumber).toBe(before);
  });
});
