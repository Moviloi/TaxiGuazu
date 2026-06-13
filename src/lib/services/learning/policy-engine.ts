import type { LearningDecision, SystemLoad, PolicyEngineResult, Policy, PolicyCondition, PolicyAction, PolicyResult, SimulationResult, SafetyGuardrail } from "./types";
import { getEconomicProfile } from "./economics";
import { clamp01 } from "@/lib/utils/clamp";
import { insertF9ErrorLog } from "@/lib/db/domains/learning";
import { log } from "@/lib/utils/logger";

// ── Error Logging ──

export async function logLearningError(component: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  try {
    await insertF9ErrorLog(component, message, stack);
  } catch (logError) {
    log.error(`[LEARNING_ERROR] Fallo al loggear error de ${component}:`, logError);
    log.error(`[LEARNING_ERROR] Error original:`, error);
  }
}

// ── Policies ──

const DEFAULT_POLICIES: Policy[] = [
  {
    id: "revenue_peak",
    name: "Revenue-first en hora pico",
    priority: 100,
    condition: [
      { field: "peakTime", operator: "eq", value: true },
      { field: "driverAvailability", operator: "lt", value: 5 },
    ],
    action: "modify",
    params: { revenueMultiplier: 1.5 },
    active: true,
  },
  {
    id: "safety_low_drivers",
    name: "Bloquear viajes de bajo margen si pocos choferes",
    priority: 90,
    condition: [
      { field: "driverAvailability", operator: "lt", value: 3 },
    ],
    action: "block",
    params: { reason: "Muy pocos choferes disponibles. Priorizando viajes urgentes." },
    active: true,
  },
  {
    id: "tour_bypass",
    name: "Bypass de precio para tours a Cataratas",
    priority: 80,
    condition: [
      { field: "intent", operator: "eq", value: "tour" },
    ],
    action: "allow",
    params: { bypassPriceThreshold: true },
    active: true,
  },
];

function matchCondition(condition: PolicyCondition, context: Record<string, unknown>): boolean {
  const value = context[condition.field];
  switch (condition.operator) {
    case "eq": return value === condition.value;
    case "neq": return value !== condition.value;
    case "gt": return typeof value === "number" && typeof condition.value === "number" && value > condition.value;
    case "gte": return typeof value === "number" && typeof condition.value === "number" && value >= condition.value;
    case "lt": return typeof value === "number" && typeof condition.value === "number" && value < condition.value;
    case "lte": return typeof value === "number" && typeof condition.value === "number" && value <= condition.value;
    case "in": return Array.isArray(condition.value) && condition.value.includes(value);
    case "contains": return typeof value === "string" && typeof condition.value === "string" && value.includes(condition.value);
    default: return false;
  }
}

function evaluateCondition(conditions: PolicyCondition[], context: Record<string, unknown>): boolean {
  return conditions.every((c) => matchCondition(c, context));
}

async function loadPolicies(): Promise<Policy[]> {
  try {
    const { getAllPolicies } = await import("@/lib/db/domains/learning");
    const rows = await getAllPolicies();
    if (rows.length === 0) return DEFAULT_POLICIES;
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      priority: r.priority,
      condition: JSON.parse(r.condition) as PolicyCondition[],
      action: r.action as PolicyAction,
      params: JSON.parse(r.params || "{}"),
      active: r.active === 1,
    }));
  } catch {
    return DEFAULT_POLICIES;
  }
}

export async function evaluatePolicies(
  f7Decision: LearningDecision,
  load: SystemLoad,
  intent: string,
): Promise<PolicyResult[]> {
  const policies = await loadPolicies();
  const context: Record<string, unknown> = {
    peakTime: load.peakTime,
    driverAvailability: load.driversAvailable,
    queueLength: load.queueLength,
    intent,
    utilityScore: f7Decision.totalUtility,
    hasSelected: f7Decision.selected !== null,
  };

  const results: PolicyResult[] = [];

  for (const policy of policies) {
    if (!policy.active) continue;
    const matched = evaluateCondition(policy.condition, context);
    results.push({
      policyId: policy.id,
      policyName: policy.name,
      action: policy.action,
      matched,
      override: matched && policy.action === "block"
        ? { selected: null, ranked: [] }
        : undefined,
    });
  }

  return results;
}

export async function seedPolicies(): Promise<void> {
  const { insertOrIgnorePolicy } = await import("@/lib/db/domains/learning");
  for (const p of DEFAULT_POLICIES) {
    await insertOrIgnorePolicy(p.id, p.name, p.priority, JSON.stringify(p.condition), p.action, JSON.stringify(p.params), p.active);
  }
}

// ── Simulation ──

export function simulateOpportunity(f7Decision: LearningDecision): SimulationResult | null {
  if (!f7Decision.selected) return null;

  const profile = getEconomicProfile(f7Decision.selected.label);
  const utilityConversion = clamp01(f7Decision.utilityBreakdown.conversion);

  const expectedConversion = clamp01(utilityConversion * 1.5 + profile.conversionProbability * 0.5);
  const expectedRevenue = profile.estimatedRevenue * expectedConversion;
  const systemImpactScore = clamp01((expectedRevenue / 35000) * 0.6 + expectedConversion * 0.4);
  const riskLevel = expectedConversion < 0.3 ? "high" : expectedConversion < 0.6 ? "medium" : "low";

  return { expectedConversion, expectedRevenue, systemImpactScore, riskLevel };
}

export async function logSimulation(
  sessionId: string,
  opportunityLabel: string,
  result: SimulationResult,
): Promise<void> {
  const { insertSimulation } = await import("@/lib/db/domains/learning");
  await insertSimulation(sessionId, opportunityLabel, result.expectedConversion, result.expectedRevenue, result.riskLevel);
}

// ── Experiment ──

export interface ExperimentConfig {
  id: string;
  name: string;
  variants: { id: string; name: string; trafficPercent: number }[];
  active: boolean;
}

const DEFAULT_EXPERIMENTS: ExperimentConfig[] = [
  {
    id: "revenue_vs_conversion",
    name: "Revenue vs Conversion",
    variants: [
      { id: "A", name: "Revenue-first", trafficPercent: 50 },
      { id: "B", name: "Conversion-first", trafficPercent: 50 },
    ],
    active: true,
  },
];

export function assignVariant(phone: string, experimentId: string): string | null {
  const exp = DEFAULT_EXPERIMENTS.find((e) => e.id === experimentId);
  if (!exp || !exp.active) return null;

  const phoneHash = phone.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const bucket = phoneHash % 100;

  let cumulative = 0;
  for (const v of exp.variants) {
    cumulative += v.trafficPercent;
    if (bucket < cumulative) return v.id;
  }
  return exp.variants[0]?.id ?? null;
}

export async function recordPolicyResult(
  policyId: string,
  variant: string | null,
  revenue: number,
  conversion: boolean,
): Promise<void> {
  const { insertPolicyResult } = await import("@/lib/db/domains/learning");
  await insertPolicyResult(policyId, variant, revenue, conversion);
}

export async function getWinningVariant(
  experimentId: string,
): Promise<{ variantId: string; score: number } | null> {
  const { getWinningPolicyVariant } = await import("@/lib/db/domains/learning");
  return getWinningPolicyVariant(experimentId);
}

// ── Guardrails ──

const HARDCODED_GUARDRAILS: SafetyGuardrail[] = [
  {
    id: "critical_load",
    name: "Carga crítica: bloquear ofertas de bajo valor",
    condition: [{ field: "driverAvailability", operator: "lte", value: 2 }],
    level: "critical",
    action: "block",
    message: "Sistema con carga crítica. Ofertas de bajo valor bloqueadas.",
  },
  {
    id: "high_escalation",
    name: "Escalación alta: forzar modo CLARIFICATION",
    condition: [{ field: "escalationRate", operator: "gt", value: 0.5 }],
    level: "warning",
    action: "override_f4",
    message: "Tasa de escalación alta. Forzando modo clarificación.",
  },
  {
    id: "revenue_drop",
    name: "Caída de revenue: desactivar descuentos agresivos",
    condition: [{ field: "revenueDrop", operator: "eq", value: true }],
    level: "warning",
    action: "disable_policy",
    message: "Caída de revenue detectada. Descuentos agresivos desactivados.",
  },
];

function matchGuardrailCondition(condition: PolicyCondition[], context: Record<string, unknown>): boolean {
  return condition.every((c) => {
    const value = context[c.field];
    switch (c.operator) {
      case "eq": return value === c.value;
      case "neq": return value !== c.value;
      case "gt": return typeof value === "number" && typeof c.value === "number" && value > c.value;
      case "gte": return typeof value === "number" && typeof c.value === "number" && value >= c.value;
      case "lt": return typeof value === "number" && typeof c.value === "number" && value < c.value;
      case "lte": return typeof value === "number" && typeof c.value === "number" && value <= c.value;
      default: return false;
    }
  });
}

export async function evaluateGuardrails(
  load: SystemLoad,
  escalationRate: number,
  revenueDrop: boolean,
): Promise<SafetyGuardrail[]> {
  const ctx: Record<string, unknown> = {
    driverAvailability: load.driversAvailable,
    queueLength: load.queueLength,
    peakTime: load.peakTime,
    escalationRate,
    revenueDrop,
  };

  return HARDCODED_GUARDRAILS.filter((g) => matchGuardrailCondition(g.condition, ctx));
}

// ── Policy Engine ──

export async function runPolicyEngine(
  f7Decision: LearningDecision,
  load: SystemLoad,
  intent: string,
  escalationRate: number,
  phone: string,
  sessionId: string,
): Promise<PolicyEngineResult> {
  const policyResults = await evaluatePolicies(f7Decision, load, intent);

  const blockPolicy = policyResults.find((p) => p.matched && p.action === "block");
  const simulation = simulateOpportunity(f7Decision);

  if (simulation && f7Decision.selected) {
    logSimulation(sessionId, f7Decision.selected.label, simulation).catch(
      (e) => logLearningError("policy-simulation", e),
    );
  }

  const experimentVariant = assignVariant(phone, "revenue_vs_conversion");

  const revenueDrop = f7Decision.selected === null;
  const activeGuardrails = await evaluateGuardrails(load, escalationRate, revenueDrop);

  const criticalGuardrail = activeGuardrails.find((g) => g.level === "critical" && g.action === "block");

  const blocked = (blockPolicy !== undefined || criticalGuardrail !== undefined) && f7Decision.selected !== null;

  const finalOverride = policyResults.find((p) => p.matched && p.override)?.override ?? null;

  return {
    policyResults,
    simulation,
    experimentVariant,
    activeGuardrails,
    blocked,
    finalOverride,
  };
}
