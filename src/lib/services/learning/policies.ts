import { getAllPolicies, insertOrIgnorePolicy } from "@/lib/db/domains/learning";
import type { Policy, PolicyCondition, PolicyAction, PolicyResult, LearningDecision, SystemLoad } from "./types";

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
  for (const p of DEFAULT_POLICIES) {
    await insertOrIgnorePolicy(p.id, p.name, p.priority, JSON.stringify(p.condition), p.action, JSON.stringify(p.params), p.active);
  }
}
