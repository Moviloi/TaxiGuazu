import type { Opportunity } from "@/lib/db/types";

// ── Opportunity Scoring & System Load ──

export interface OpportunityEconomics {
  id: number;
  type: string;
  estimatedRevenue: number;
  conversionProbability: number;
  margin: number;
  operationalCost: number;
}

export type HumanFeedbackType = "good_offer" | "bad_offer" | "wrong_route" | "high_value_missed" | "spam_detected";

export interface HumanFeedbackRow {
  id: number;
  session_id: string;
  feedback_type: HumanFeedbackType;
  entity: string | null;
  operator_id: string;
  timestamp: number;
}

export interface SystemLoad {
  driversAvailable: number;
  operatorsAvailable: number;
  peakTime: boolean;
  queueLength: number;
}

export interface ObjectiveWeights {
  conversion: number;
  revenue: number;
  satisfaction: number;
  efficiency: number;
  escalationCost: number;
}

export const DEFAULT_OBJECTIVE_WEIGHTS: ObjectiveWeights = {
  conversion: 0.35,
  revenue: 0.30,
  satisfaction: 0.20,
  efficiency: 0.10,
  escalationCost: 0.05,
};

export interface ScoredOpportunity extends Opportunity {
  economicScore: number;
  utilityScore: number;
}

export interface LearningDecision {
  ranked: ScoredOpportunity[];
  selected: ScoredOpportunity | null;
  utilityBreakdown: {
    conversion: number;
    revenue: number;
    satisfaction: number;
    efficiency: number;
    escalationCost: number;
  };
  totalUtility: number;
  loadAdjusted: boolean;
}

// ── Policy Simulation & Guardrails ──

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
  override?: Partial<LearningDecision>;
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

export interface PolicyEngineResult {
  policyResults: PolicyResult[];
  simulation: SimulationResult | null;
  experimentVariant: string | null;
  activeGuardrails: SafetyGuardrail[];
  blocked: boolean;
  finalOverride: Partial<LearningDecision> | null;
}

// ── Drift Detection & Learning ──

export type LearningEventType =
  | "conversion"
  | "cancelled_trip"
  | "ignored_opportunity"
  | "manual_override"
  | "operator_correction"
  | "admin_command"
  | "prediction_error";

export type LearningEventSource = "F3" | "F7" | "F8" | "HUMAN";

export interface LearningEvent {
  id?: number;
  sessionId: string;
  type: LearningEventType;
  entity?: string;
  intent?: string;
  predictedValue?: number;
  actualValue?: number;
  revenue?: number;
  timestamp: number;
  source: LearningEventSource;
}

export type DriftSeverity = "low" | "medium" | "high" | "critical";

export interface LearningDrift {
  id?: number;
  metric: string;
  entity: string;
  driftValue: number;
  severity: DriftSeverity;
  timestamp?: number;
}

export type AdminCommandAction =
  | "update_price"
  | "reclassify_entity"
  | "modify_policy"
  | "optimize_routing"
  | "adjust_weight";

export interface ParsedAdminCommand {
  original: string;
  action: AdminCommandAction;
  target: string;
  value: unknown;
  author: string;
}
