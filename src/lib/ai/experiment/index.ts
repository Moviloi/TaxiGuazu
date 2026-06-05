// FASE 8: Experimentation Module Entry Point

export { getVariant, hashCode } from "./ab.engine";
export { runShadowPolicy, compareDecisions } from "./shadow.engine";
export { applyVariantPolicy } from "./policy.variant";
export type { PolicyVariant, ExperimentContext, ShadowComparison } from "./types";
