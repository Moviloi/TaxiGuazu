// FASE 8: A/B Traffic Distribution Engine
// Distribución determinista basada en hash del correlationId.
// CONTROL = 70%, EXPERIMENT_A = 15%, EXPERIMENT_B = 15%

import type { PolicyVariant } from "./types";

export function hashCode(id: string): number {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    const char = id.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

export function getVariant(correlationId: string): PolicyVariant {
  const h = hashCode(correlationId) % 100;
  if (h < 70) return "CONTROL";
  if (h < 85) return "EXPERIMENT_A";
  return "EXPERIMENT_B";
}
