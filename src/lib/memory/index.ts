/**
 * index.ts — Public API del módulo Memory
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Re-exporta todos los tipos, clases y funciones del dominio
 * Memory para consumo externo (orquestador, tests).
 *
 * Uso:
 *   import { MemoryService, SqliteMemoryStorage, isMemoryShadowModeEnabled, type MemorySnapshot } from '@/lib/memory';
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
export type {
  MemorySnapshot,
  MemoryStoreInput,
  MemoryStoreResult,
  CognitiveReadiness,
} from './types';

// ---------------------------------------------------------------------------
// MemorySnapshot Entity
// ---------------------------------------------------------------------------
export { createMemorySnapshot } from './memory-snapshot';

// ---------------------------------------------------------------------------
// Builder
// ---------------------------------------------------------------------------
export { buildSnapshot } from './build-snapshot';
export type { BuildSnapshotInput } from './build-snapshot';

// ---------------------------------------------------------------------------
// Storage
// ---------------------------------------------------------------------------
export type { MemoryStorage } from './memory-storage';
export { SqliteMemoryStorage } from './memory-storage';

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------
export { MemoryService, isMemoryShadowModeEnabled } from './memory-service';
export { getDefaultMemoryService } from './memory-init';
