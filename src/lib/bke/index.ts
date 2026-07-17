// BKE — Business Knowledge Engine: punto de entrada público.
// PR-5A: Foundation.
// PR-5C: Comprehension y Recovery resolvers.
// PR-5E: Entity, Pricing, Message domains implementados.

export { BKEEngine, getBKEEngine } from "./bke-engine";
export * from "./types";

// Dominios
export { resolvePlace, resolveGeoAmbiguity } from "./domains/geo";

// PR-5E: Entity Domain
export { extractEntities, resolveEntity, getEntityCatalog } from "./domains/entity";
export type { ResolvedEntity } from "./domains/entity";

// PR-5E: Pricing Domain
export { estimatePrice, getTariffInfo, calculateTripPrice } from "./domains/pricing";
export type { TariffInfo, PricingBreakdown } from "./domains/pricing";

// PR-5E: Message Domain
export { resolveMessage, resolveMessageSync, getAvailableMessageKeys, isValidMessageKey } from "./domains/message";
export type { MessageKey } from "./domains/message";

// Servicios DRL (PR-5B, PR-5C)
export {
  resolveComprehension,
  getComprehensionDrlMetrics,
  resetComprehensionDrlMetrics,
} from "./services/comprehension-resolver";
export type { ComprehensionResult, ComprehensionMetrics } from "./services/comprehension-resolver";

export {
  resolveRecovery,
  getRecoveryDrlMetrics,
  resetRecoveryDrlMetrics,
} from "./services/recovery-resolver";
export type { RecoveryResult, RecoveryMetrics } from "./services/recovery-resolver";
