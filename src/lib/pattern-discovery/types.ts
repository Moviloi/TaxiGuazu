/**
 * types.ts — Shared Kernel de Pattern Discovery
 *
 * Define TODAS las interfaces y tipos compartidos del módulo.
 * R-DEP-2: types.ts NO importa ningún módulo de PD.
 * R-DEP-3: Todos los módulos de implementación importan exclusivamente de aquí.
 *
 * Arquitectura congelada: PDE-1, PAA-1, POA-1, PBA-1, MRC-1, PD-IM-0
 */

// ── External types ──
import { MemorySnapshot } from '@/lib/memory/types';

// ── Dimension & Status ──
export type Dimension = 'intra' | 'inter' | 'cross';
export type PatternStatus = 'active' | 'superseded' | 'deprecated';
export type RelationType = 'implication' | 'correlation' | 'trend' | 'stability';
export type RunStatus = 'success' | 'aborted_no_data' | 'failed';

// ── Relation (componente R de la ontología π) ──
export interface Relation {
  description: string;        // "channel=whatsapp → factCount≥1"
  variables: [string, string]; // ["channel", "factCount"]
  type: RelationType;
}

// ── Evidence (componente E de la ontología π) ──
export interface EvidenceWindow {
  snapshotCount: number;
  conversationCount: number;
  timeRange: { from: string; to: string };
  support: number;  // |E| / |W|
}

// ── ProjectedState (proyección 19→11, PDE-1 §2.2) ──
export interface ProjectedState {
  // Metadata (3 campos)
  turnNumber: number;           // snapshot.turnNumber
  storedAt: Date;               // snapshot.storedAt
  conversationId: string;       // snapshot.conversationId

  // Belief (5 campos)
  observationValid: boolean;    // snapshot.belief.observationValid
  channel: string | null;       // snapshot.belief.channel
  hasContent: boolean;          // snapshot.belief.hasContent
  isWellFormed: boolean;        // snapshot.belief.isWellFormed
  factCount: number;            // snapshot.belief.factCount

  // Decision (3 campos)
  readiness: 'ready' | 'partial' | 'invalid';  // snapshot.decision.readiness
  isDecided: boolean;                            // snapshot.decision.isDecided
  factCountDecision: number;                     // snapshot.decision.factCount
}

// ── RelationCandidate (salida de Detect_γ) ──
export interface RelationCandidate {
  relation: Relation;
  confidence: number;          // θ
  evidence: EvidenceWindow;
  dimension: Dimension;
  projectedSnapshots: ProjectedState[];
}

// ── DetectionConfig (parámetros γ) ──
export interface DetectionConfig {
  minSupport: number;
  minConfidence: number;
  enabledDimensions: Dimension[];
  maxRelations?: number;
}

// ── Invariant (para F₂) ──
export interface Invariant {
  id: string;
  description: string;
  source: 'EE' | 'Memory' | 'Contract' | 'Schema';
  ruleRef: string;
  pattern: string;
  activeSince: string;
}

// ── AcceptanceReport (salida de F₁ ∧ F₂ ∧ F₃ ∧ F₄) ──
export interface AcceptanceReport {
  F1_empirical: {
    passed: boolean;
    n: number;
    coverage: number;
    theta: number;
  };
  F2_nonTrivial: {
    passed: boolean;
    catalogVersion: string;
    match?: string;
  };
  F3_independence: {
    passed: boolean;
    derivedFrom?: string[];
  };
  F4_nonCoincidence: {
    passed: boolean;
    pValue: number;
    correctedP: number;
    lift: number;
  };
}

// ── Watermark (PDE-1 §2.4, §3.4) ──
export interface Watermark {
  lastStoredAt: string | null;
  lastRunAt: string | null;
  totalSnapshotsProcessed: number;
}

// ── Pattern (interface — implementation in pattern.ts) ──
export interface Pattern {
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

  equals(other: Pattern): boolean;
  supersede(newPattern: Pattern): [Pattern, Pattern];
}

// ── Candidate (relación que pasó F₁ pero no todos los filtros) ──
export interface Candidate {
  id: string;
  firstSeenAt: string;
  lastSeenAt: string;
  observationCount: number;
  relation: Relation;
  dimension: Dimension;
  bestConfidence: number;
  bestEvidence: EvidenceWindow;
}

// ── PatternRun (salida de una ejecución de PD, PDE-1 §3.4) ──
export interface PatternRun {
  runId: string;
  triggeredAt: string;
  startedAt: string;
  completedAt: string;
  status: RunStatus;
  watermark: Watermark;
  patterns: {
    accepted: string[];       // patternIds aceptados en esta ejecución
    candidates: string[];     // patternIds de candidatos
    deprecated: string[];     // patternIds deprecados
  };
  metrics: {
    durationMs: number;
    relationsEvaluated: number;
    memoryReadCalls: number;
    snapshotsRead: number;
  };
}

// ── ExecutionConfig (parámetros de ejecución) ──
export interface ExecutionConfig {
  detectionConfig?: DetectionConfig;
  dryRun?: boolean;
  windowOverride?: {
    from?: string;
    to?: string;
  };
}

// ═══════════════════════════════════════════════════════════════════════
// Service interfaces (implementaciones en módulos respectivos)
// ═══════════════════════════════════════════════════════════════════════

// ── MemoryReadAdapter ──
export interface MemoryReadAdapter {
  getNewSnapshots(watermark: Watermark): Promise<MemorySnapshot[]>;
  countNewSnapshots(watermark: Watermark): Promise<number>;
  getLatestSnapshot(): Promise<MemorySnapshot | null>;
}

// ── PatternRepository ──
export interface PatternRepository {
  readWatermark(): Promise<Watermark>;
  writeWatermark(w: Watermark): Promise<void>;
  readActivePatterns(): Promise<Pattern[]>;
  readPatternHistory(id: string): Promise<Pattern[]>;
  writePatterns(patterns: Pattern[]): Promise<void>;
  deprecatePatterns(ids: string[]): Promise<void>;
  supersedePattern(supersededId: string, successor: Pattern): Promise<void>;
  readCandidates(): Promise<Candidate[]>;
  writeCandidates(candidates: Candidate[]): Promise<void>;
  promoteCandidate(id: string): Promise<void>;
  writeRun(run: PatternRun): Promise<void>;
  readLastRun(): Promise<PatternRun | null>;
  readInvariants(): Promise<Invariant[]>;
}

// ── WatermarkManager ──
export interface WatermarkManager {
  read(): Promise<Watermark>;
  hasNewData(): Promise<boolean>;
  update(lastStoredAt: string, snapshotsProcessed: number): Promise<Watermark>;
  reset(): Promise<void>;
}

// ── RelationDetector ──
export interface RelationDetector {
  detect(snapshots: ProjectedState[], config: DetectionConfig): RelationCandidate[];
}

// ── AcceptanceEvaluator ──
export interface AcceptanceEvaluator {
  evaluate(
    candidate: RelationCandidate,
    invariants: Invariant[],
    existingPatterns: Pattern[],
    fullWindow: ProjectedState[]
  ): AcceptanceReport;
}

// ── InvariantCatalog ──
export interface InvariantCatalog {
  getAll(): Promise<Invariant[]>;
  getActive(): Promise<Invariant[]>;
  matches(relationDescription: string): Invariant | null;
}

// ── PatternOrchestrator ──
export interface PatternOrchestrator {
  execute(config?: ExecutionConfig): Promise<PatternRun>;
  executeDryRun(config?: ExecutionConfig): Promise<PatternRun>;
}
