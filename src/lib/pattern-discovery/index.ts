/**
 * index.ts — Public API del módulo Pattern Discovery
 *
 * Re-exporta los tipos y entry points públicos.
 * R-DEP-1: Ningún módulo interno de PD importa de index.ts.
 */

// ── Tipos públicos ──
export type {
  Dimension,
  PatternStatus,
  RelationType,
  RunStatus,
  Relation,
  EvidenceWindow,
  ProjectedState,
  RelationCandidate,
  DetectionConfig,
  Invariant,
  AcceptanceReport,
  Watermark,
  Pattern as PatternInterface,
  Candidate,
  PatternRun,
  ExecutionConfig,
  MemoryReadAdapter,
  PatternRepository,
  WatermarkManager,
  RelationDetector,
  AcceptanceEvaluator,
  InvariantCatalog,
  PatternOrchestrator,
} from './types';

// ── Pattern Value Object ──
export { Pattern } from './pattern';
export type { PatternProps } from './pattern';

// ── Servicio público ──
export { PatternDiscoveryService, isPatternDiscoveryEnabled } from './pd-service';

// ── Implementaciones concretas (para DI) ──
export { DefaultRelationDetector } from './detector';
export { DefaultAcceptanceEvaluator } from './acceptance';
export { DefaultInvariantCatalog } from './invariant-catalog';
export { DefaultMemoryReadAdapter } from './memory-read';
export { SqlPatternRepository } from './repository';
export { DefaultWatermarkManager } from './watermark';
export { DefaultOrchestrator } from './orchestrator';

// ── Proyección ──
export { project, projectMany } from './projection';
