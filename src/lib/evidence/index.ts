/**
 * index.ts — Public API del Evidence Engine
 *
 * Arquitectura Freeze V2 | Evidence Engine — PR-1
 *
 * Re-exporta todos los tipos, clases y utilidades del dominio
 * Evidence para consumo externo (pipeline, tests, shadow mode).
 *
 * Uso:
 *   import { Signal, Observation, Fact, Evidence, Source, Confidence } from '@/lib/evidence';
 */

// ---------------------------------------------------------------------------
// Domain Errors
// ---------------------------------------------------------------------------
export {
  DomainError,
  SignalValidationError,
  SignalEmptyContentError,
  SignalInvalidChannelError,
  SignalInvalidTimestampError,
  SignalInvalidIdError,
  ObservationValidationError,
  ObservationInvalidIdError,
  ObservationInvalidSignalIdError,
  ObservationInvalidStatusError,
  ObservationTimestampBeforeSignalError,
  SourceValidationError,
  SourceInvalidTypeError,
  ConfidenceValidationError,
  ConfidenceRangeError,
  ConfidenceNaNError,
  FactValidationError,
  FactEmptyPropositionError,
  FactInvalidTypeError,
  EvidenceValidationError,
  EvidenceEmptyFactsError,
  EvidenceInvalidIdError,
  EvidenceInvalidObservationIdError,
  KnowledgeValidationError,
  KnowledgeInvalidIdError,
  KnowledgeInvalidEvidenceIdError,
  BeliefValidationError,
  BeliefInvalidIdError,
  BeliefInvalidKnowledgeIdError,
  DecisionValidationError,
  DecisionInvalidIdError,
  DecisionInvalidBeliefIdError,
} from './errors';

// ---------------------------------------------------------------------------
// Shared Types
// ---------------------------------------------------------------------------
// Type-only re-exports (needed for isolatedModules)
export type {
  ChannelType,
  SignalSubtype,
  ObservationValidationStatus,
  FactType,
  SourceType,
  EvidenceType,
} from './types';

// Value re-exports (const arrays, helper functions)
export {
  CHANNEL_TYPES,
  isChannelType,
  SIGNAL_SUBTYPES,
  isSignalSubtype,
  OBSERVATION_VALIDATION_STATUSES,
  isObservationValidationStatus,
  FACT_TYPES,
  isFactType,
  SOURCE_TYPES,
  isSourceType,
  SOURCE_RELIABILITY,
  EVIDENCE_TYPES,
  isEvidenceType,
  isNonEmptyString,
  isRecord,
} from './types';

// ---------------------------------------------------------------------------
// Value Objects & Entities
// ---------------------------------------------------------------------------
export { Signal } from './signal';
export { Observation } from './observation';
export { Source } from './source';
export { Confidence } from './confidence';
export { Fact } from './fact';
export { Evidence } from './evidence';
export { Knowledge } from './knowledge';
export { Belief } from './belief';
export { Decision } from './decision';
export type { CognitiveReadiness } from './decision';

// ---------------------------------------------------------------------------
// Pipeline Builders
// ---------------------------------------------------------------------------
export { buildSafe } from './build-safe';
export { buildSignal, isEvidenceShadowModeEnabled } from './build-signal';
export { buildObservation } from './build-observation';
export { buildFact } from './build-fact';
export { buildEvidence } from './build-evidence';
export { buildKnowledge } from './build-knowledge';
export { buildBelief } from './build-belief';
export { buildDecision } from './build-decision';
export { ShadowResult } from './shadow-result';
export { runShadowCognition, isShadowLoggingEnabled } from './run-shadow-cognition';
