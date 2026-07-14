/**
 * invariant-catalog.ts — Catálogo de invariantes (PAA-1 §6.2)
 *
 * Implementa InvariantCatalog. Contiene el seed inicial de invariantes
 * basado en PAA-1 §6.2.
 *
 * R-DEP-3: invariant-catalog.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type { Invariant, InvariantCatalog } from './types';

// ── Seed inicial del catálogo (PAA-1 §6.2) ──
const SEED_INVARIANTS: Invariant[] = [
  // Evidence Engine
  {
    id: 'EE-I1',
    description: 'isDecided → readiness',
    source: 'EE',
    ruleRef: 'PAA-1 §6.2',
    pattern: 'isDecided.*readiness|readiness.*isDecided',
    activeSince: '2026-07-14',
  },
  {
    id: 'EE-I2',
    description: 'readiness=ready ↔ isDecided=true',
    source: 'EE',
    ruleRef: 'PAA-1 §6.2',
    pattern: 'readiness.*ready.*isDecided|isDecided.*true.*readiness',
    activeSince: '2026-07-14',
  },

  // Memory
  {
    id: 'M-1',
    description: 'Append-only: snapshots no se modifican ni eliminan',
    source: 'Memory',
    ruleRef: 'ADR-010 M-1',
    pattern: 'snapshot.*no.*modific|append.*only',
    activeSince: '2026-07-14',
  },
  {
    id: 'M-7',
    description: 'turnNumber monotónico +1',
    source: 'Memory',
    ruleRef: 'ADR-010 M-7',
    pattern: 'turnNumber.*monoton|turnNumber.*increment',
    activeSince: '2026-07-14',
  },

  // Schema
  {
    id: 'DB-I1',
    description: 'memoryId NOT NULL',
    source: 'Schema',
    ruleRef: 'PAA-1 §6.2 DB-I1',
    pattern: 'memoryId.*null|memoryId.*vacio',
    activeSince: '2026-07-14',
  },
  {
    id: 'DB-I2',
    description: 'conversationId NOT NULL',
    source: 'Schema',
    ruleRef: 'PAA-1 §6.2 DB-I2',
    pattern: 'conversationId.*null',
    activeSince: '2026-07-14',
  },
];

// ── DefaultInvariantCatalog ──

export class DefaultInvariantCatalog implements InvariantCatalog {
  private invariants: Invariant[];

  constructor(seed?: Invariant[]) {
    this.invariants = seed ?? [...SEED_INVARIANTS];
  }

  /**
   * Retorna todas las invariantes del catálogo.
   */
  async getAll(): Promise<Invariant[]> {
    return [...this.invariants];
  }

  /**
   * Retorna solo las invariantes activas.
   */
  async getActive(): Promise<Invariant[]> {
    // Por simplicidad, todas las invariantes del seed están activas
    return [...this.invariants];
  }

  /**
   * Coteja una descripción de relación contra el catálogo.
   * Retorna la invariante que matchea, o null si no hay match.
   *
   * El matching se hace por expresión regular contra el campo `pattern`
   * de cada invariante.
   */
  matches(relationDescription: string): Invariant | null {
    for (const inv of this.invariants) {
      try {
        const regex = new RegExp(inv.pattern, 'i');
        if (regex.test(relationDescription)) {
          return inv;
        }
      } catch {
        // Si el patrón no es una regex válida, ignorar
        continue;
      }
    }
    return null;
  }

  /**
   * Agrega una invariante al catálogo.
   */
  add(invariant: Invariant): void {
    this.invariants.push(invariant);
  }
}
