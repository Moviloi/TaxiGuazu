/**
 * types.ts — Tipos compartidos del módulo Memory
 *
 * IM-1: Memory Implementation (PR-13/ATR-1)
 * Arquitectura: ADR-010 (Cognitive Memory Architecture)
 *
 * Define los tipos públicos del sistema de persistencia cognitiva:
 *   MemorySnapshot, MemoryStoreInput, MemoryStoreResult
 *
 * Invariantes:
 *  - MemorySnapshot contiene EXACTAMENTE 19 campos (M-8)
 *  - Todos los campos provienen de Belief o Decision, excepto metadata (M-12)
 *  - El snapshot es inmutable después de construcción (M-5)
 */

// ---------------------------------------------------------------------------
// CognitiveReadiness — re-exportado localmente para evitar dependencia circular
// ---------------------------------------------------------------------------

export type CognitiveReadiness = 'ready' | 'partial' | 'invalid';

// ---------------------------------------------------------------------------
// MemorySnapshot — 19 campos exactos
// ---------------------------------------------------------------------------

export interface MemorySnapshot {
  // Partition key (4 metadata fields)
  /** Operational conversation ID (partition key, NOT semantic) */
  conversationId: string;
  /** UUID v4, unique per snapshot */
  memoryId: string;
  /** Monotonic counter within conversation */
  turnNumber: number;
  /** When Memory wrote the snapshot (NOT when EE ran) */
  storedAt: Date;

  // Belief fields (8)
  belief: {
    id: string;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    isWellFormed: boolean;
    factCount: number;
  };

  // Decision fields (7)
  decision: {
    id: string;
    validInput: boolean;
    hasContent: boolean;
    readiness: CognitiveReadiness;
    missingInfo: readonly string[];
    isDecided: boolean;
    factCount: number;
  };
}

// ---------------------------------------------------------------------------
// MemoryStoreInput — lo que recibe store()
// ---------------------------------------------------------------------------

/**
 * Input para memoryService.store().
 * NOTA: Belief y Decision son los objetos del Evidence Engine.
 * Se importan como tipos para evitar dependencia del barrel completo.
 */
export interface MemoryStoreInput {
  belief: {
    id: string;
    observationValid: boolean;
    channel: string | null;
    hasContent: boolean;
    receivedAt: string | null;
    conversationId: string | null;
    isWellFormed: boolean;
    factCount: number;
    facts?: readonly unknown[];
    knowledgeId?: string;
    createdAt?: Date;
  };
  decision: {
    id: string;
    validInput: boolean;
    hasContent: boolean;
    readiness: CognitiveReadiness;
    missingInfo: readonly string[];
    isDecided: boolean;
    factCount: number;
    facts?: readonly unknown[];
    beliefId?: string;
    createdAt?: Date;
  };
  conversationId: string;
}

// ---------------------------------------------------------------------------
// MemoryStoreResult — lo que retorna store()
// ---------------------------------------------------------------------------

export type MemoryStoreResult =
  | { success: true }
  | { success: false; error: string };
