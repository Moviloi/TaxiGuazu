// FASE 6.5: Rule Registry Types
// PolicyRule: cada regla es un objeto evaluable por prioridad.

import type { PolicyDecision, PolicyInput } from "../types";

export interface PolicyRule {
  id: string;
  priority: number;
  matches(input: PolicyInput): boolean;
  execute(input: PolicyInput): PolicyDecision;
}
