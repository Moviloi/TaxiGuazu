// F8: POLICY SIMULATION & GUARDRAILS — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Simular políticas y aplicar guardrails de decisión.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: F8 usa f9-error para logging. Todo el pipeline se desbloquea junto.

import type { F7Decision } from "./f7-types";

export type PolicyAction = "allow" | "block" | "modify" | "route";

export interface PolicyCondition {
  field: string;
  operator: "eq" | "neq" | "gt" | "gte" | "lt" | "lte" | "in" | "contains";
  value: unknown;
}

export interface Policy {
  id: string;
  name: string;
  priority: number;
  condition: PolicyCondition[];
  action: PolicyAction;
  params: Record<string, unknown>;
  active: boolean;
}

export interface PolicyResult {
  policyId: string;
  policyName: string;
  action: PolicyAction;
  matched: boolean;
  override?: Partial<F7Decision>;
}

export interface SimulationResult {
  expectedConversion: number;
  expectedRevenue: number;
  systemImpactScore: number;
  riskLevel: "low" | "medium" | "high";
}

export interface ExperimentVariant {
  id: string;
  name: string;
  trafficPercent: number;
  policyOverrides: Partial<Policy>[];
}

export type GuardrailLevel = "critical" | "warning" | "info";

export interface SafetyGuardrail {
  id: string;
  name: string;
  condition: PolicyCondition[];
  level: GuardrailLevel;
  action: "block" | "override_f4" | "force_clarify" | "disable_policy";
  message: string;
}

export interface GlobalSystemMetrics {
  totalRevenue: number;
  fleetUtilization: number;
  driverLoadBalance: number;
  conversionRate: number;
  escalationRate: number;
}

export interface F8Result {
  policyResults: PolicyResult[];
  simulation: SimulationResult | null;
  experimentVariant: string | null;
  activeGuardrails: SafetyGuardrail[];
  blocked: boolean;
  finalOverride: Partial<F7Decision> | null;
}
