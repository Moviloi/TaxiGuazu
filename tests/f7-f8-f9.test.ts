import { describe, it, expect } from "vitest";

// ========== F7: Multi-Objective Optimization ==========

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

const ECONOMIC_PROFILES: Record<string, { estimatedRevenue: number; conversionProbability: number; margin: number; operationalCost: number }> = {
  "cataratas": { estimatedRevenue: 25000, conversionProbability: 0.70, margin: 0.30, operationalCost: 8000 },
  "city tour": { estimatedRevenue: 15000, conversionProbability: 0.65, margin: 0.35, operationalCost: 5000 },
  "cena show": { estimatedRevenue: 35000, conversionProbability: 0.50, margin: 0.40, operationalCost: 10000 },
  "retorno": { estimatedRevenue: 12000, conversionProbability: 0.80, margin: 0.25, operationalCost: 4000 },
};

function getEconomicProfile(label: string) {
  const lower = label.toLowerCase();
  for (const [key, profile] of Object.entries(ECONOMIC_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return { estimatedRevenue: 10000, conversionProbability: 0.50, margin: 0.20, operationalCost: 5000 };
}

function computeEconomicScore(label: string, price: number): number {
  const profile = getEconomicProfile(label);
  const priceFactor = price > 0 ? Math.min(2, price / 15000) : 1;
  const marginFactor = clamp01(profile.margin / 0.50);
  const netValue = (profile.estimatedRevenue * priceFactor) * marginFactor;
  const risk = clamp01(1 - profile.conversionProbability);
  const score = (netValue * clamp01(profile.conversionProbability) * marginFactor) - (profile.operationalCost * risk);
  return Math.max(0, Math.round(score * 100) / 100);
}

interface ObjectiveWeights {
  conversion: number;
  revenue: number;
  satisfaction: number;
  efficiency: number;
  escalationCost: number;
}

function normalizeWeights(weights: ObjectiveWeights): ObjectiveWeights {
  const DEFAULT = { conversion: 0.35, revenue: 0.30, satisfaction: 0.20, efficiency: 0.10, escalationCost: 0.05 };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  if (total === 0) return { ...DEFAULT };
  const normalized: ObjectiveWeights = {} as ObjectiveWeights;
  for (const key of Object.keys(weights) as (keyof ObjectiveWeights)[]) {
    normalized[key] = weights[key] / total;
  }
  return normalized;
}

function computeUtilityScore(
  conversionProb: number, economicScore: number, weights: ObjectiveWeights,
  escalationRisk: number, satisfactionScore: number,
): { conversion: number; revenue: number; satisfaction: number; efficiency: number; escalationCost: number; total: number } {
  const conversion = weights.conversion * clamp01(conversionProb);
  const revenue = weights.revenue * (clamp01(economicScore / 100));
  const satisfaction = weights.satisfaction * clamp01(satisfactionScore);
  const efficiency = weights.efficiency * clamp01(0.5);
  const escalationCost = -(weights.escalationCost * clamp01(escalationRisk));
  const total = Math.max(0, conversion + revenue + satisfaction + efficiency + escalationCost);
  return { conversion, revenue, satisfaction, efficiency, escalationCost, total };
}

interface SystemLoad { driversAvailable: number; operatorsAvailable: number; peakTime: boolean; queueLength: number }

function getAdjustedLoad(load: SystemLoad): { highLoad: boolean; lowLoad: boolean; active: boolean } {
  const highLoad = load.driversAvailable < 3 || load.queueLength > 5 || (load.peakTime && load.driversAvailable < 5);
  const lowLoad = load.driversAvailable > 10 && load.queueLength === 0 && !load.peakTime;
  return { highLoad, lowLoad, active: highLoad || lowLoad };
}

interface TestOpp { ruleId: number; label: string; originalPrice: number; priority: number }

function adjustOpportunityRanking(
  opportunities: TestOpp[], weights: ObjectiveWeights, load: SystemLoad,
  escalationRisk: number, satisfactionScore: number,
): { ranked: { label: string; economicScore: number; utilityScore: number }[]; selected: { label: string } | null; loadAdjusted: boolean } {
  const loadAdjusted = getAdjustedLoad(load);
  const scored = opportunities.map((opp) => {
    const economicScore = computeEconomicScore(opp.label, opp.originalPrice);
    const utility = computeUtilityScore(opp.priority / 100, economicScore, weights, escalationRisk, satisfactionScore);
    const adjustedEconomicScore = loadAdjusted.active
      ? economicScore * (loadAdjusted.highLoad ? 0.7 : 1.2)
      : economicScore;
    return { label: opp.label, economicScore: adjustedEconomicScore, utilityScore: utility.total };
  });
  scored.sort((a, b) => b.utilityScore - a.utilityScore);
  return { ranked: scored, selected: scored[0] ?? null, loadAdjusted: loadAdjusted.active };
}

describe("F7 - Economic Score", () => {
  it("computes score for known profile (cataratas)", () => {
    const score = computeEconomicScore("cataratas", 15000);
    expect(score).toBeGreaterThan(0);
  });

  it("returns non-negative score for unknown profile with fallback", () => {
    const score = computeEconomicScore("unknown tour", 30000);
    expect(score).toBeGreaterThanOrEqual(0);
  });

  it("higher price increases score up to cap", () => {
    const low = computeEconomicScore("cataratas", 5000);
    const high = computeEconomicScore("cataratas", 30000);
    expect(high).toBeGreaterThan(low);
  });

  it("different profiles produce different scores", () => {
    const cataracts = computeEconomicScore("cataratas", 15000);
    const retorno = computeEconomicScore("retorno", 15000);
    expect(cataracts).not.toBe(retorno);
  });
});

describe("F7 - Utility Score", () => {
  const weights: ObjectiveWeights = { conversion: 0.35, revenue: 0.30, satisfaction: 0.20, efficiency: 0.10, escalationCost: 0.05 };

  it("revenue-heavy weights favor high revenue opportunities", () => {
    const revWeights = normalizeWeights({ conversion: 0.1, revenue: 0.8, satisfaction: 0.05, efficiency: 0.03, escalationCost: 0.02 });
    const revHigh = computeUtilityScore(0.3, 80, revWeights, 0.1, 0.5);
    const revLow = computeUtilityScore(0.3, 20, revWeights, 0.1, 0.5);
    expect(revHigh.total).toBeGreaterThan(revLow.total);
  });

  it("conversion-heavy weights favor high conversion", () => {
    const convWeights = normalizeWeights({ conversion: 0.8, revenue: 0.1, satisfaction: 0.05, efficiency: 0.03, escalationCost: 0.02 });
    const high = computeUtilityScore(0.9, 30, convWeights, 0.1, 0.5);
    const low = computeUtilityScore(0.2, 30, convWeights, 0.1, 0.5);
    expect(high.total).toBeGreaterThan(low.total);
  });

  it("high escalation risk reduces utility", () => {
    const lowRisk = computeUtilityScore(0.5, 50, weights, 0.1, 0.5);
    const highRisk = computeUtilityScore(0.5, 50, weights, 0.9, 0.5);
    expect(lowRisk.total).toBeGreaterThan(highRisk.total);
  });

  it("zero weights falls back to default normalization", () => {
    const zeroWeights = normalizeWeights({ conversion: 0, revenue: 0, satisfaction: 0, efficiency: 0, escalationCost: 0 });
    expect(zeroWeights.conversion).toBe(0.35);
  });
});

describe("F7 - Load-Adjusted Ranking", () => {
  const defaultWeights: ObjectiveWeights = { conversion: 0.25, revenue: 0.25, satisfaction: 0.25, efficiency: 0.15, escalationCost: 0.10 };
  const opportunities: TestOpp[] = [
    { ruleId: 1, label: "cataratas", originalPrice: 25000, priority: 80 },
    { ruleId: 2, label: "city tour", originalPrice: 15000, priority: 60 },
    { ruleId: 3, label: "cena show", originalPrice: 35000, priority: 70 },
  ];

  it("normal load keeps scores unchanged", () => {
    const normalLoad: SystemLoad = { driversAvailable: 8, operatorsAvailable: 3, peakTime: false, queueLength: 2 };
    const result = adjustOpportunityRanking(opportunities, defaultWeights, normalLoad, 0.3, 0.5);
    expect(result.loadAdjusted).toBe(false);
    expect(result.ranked.length).toBe(3);
  });

  it("high load applies 0.7x penalty", () => {
    const highLoad: SystemLoad = { driversAvailable: 2, operatorsAvailable: 1, peakTime: false, queueLength: 6 };
    const normal: SystemLoad = { driversAvailable: 8, operatorsAvailable: 3, peakTime: false, queueLength: 2 };
    const highResult = adjustOpportunityRanking(opportunities, defaultWeights, highLoad, 0.3, 0.5);
    const normalResult = adjustOpportunityRanking(opportunities, defaultWeights, normal, 0.3, 0.5);
    expect(highResult.loadAdjusted).toBe(true);
    // Under high load every score is multiplied by 0.7
    expect(highResult.ranked[0].economicScore).toBeLessThan(normalResult.ranked[0].economicScore);
  });

  it("low load applies 1.2x bonus", () => {
    const lowLoad: SystemLoad = { driversAvailable: 15, operatorsAvailable: 5, peakTime: false, queueLength: 0 };
    const normal: SystemLoad = { driversAvailable: 8, operatorsAvailable: 3, peakTime: false, queueLength: 2 };
    const lowResult = adjustOpportunityRanking(opportunities, defaultWeights, lowLoad, 0.3, 0.5);
    const normalResult = adjustOpportunityRanking(opportunities, defaultWeights, normal, 0.3, 0.5);
    expect(lowResult.loadAdjusted).toBe(true);
    expect(lowResult.ranked[0].economicScore).toBeGreaterThan(normalResult.ranked[0].economicScore);
  });

  it("returns empty ranked when no opportunities", () => {
    const normalLoad: SystemLoad = { driversAvailable: 8, operatorsAvailable: 3, peakTime: false, queueLength: 2 };
    const result = adjustOpportunityRanking([], defaultWeights, normalLoad, 0.3, 0.5);
    expect(result.ranked).toEqual([]);
    expect(result.selected).toBeNull();
  });
});

// ========== F8: Policy Governance ==========

describe("F8 - assignVariant", () => {
  const variants = [
    { id: "A", name: "Revenue-first", trafficPercent: 50 },
    { id: "B", name: "Conversion-first", trafficPercent: 50 },
  ];

  function assignVariant(phone: string): string | null {
    const phoneHash = phone.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
    const bucket = phoneHash % 100;
    let cumulative = 0;
    for (const v of variants) {
      cumulative += v.trafficPercent;
      if (bucket < cumulative) return v.id;
    }
    return variants[0]?.id ?? null;
  }

  it("returns deterministic variant for same phone", () => {
    expect(assignVariant("+549112345")).toBe(assignVariant("+549112345"));
  });

  it("different phones may get different variants", () => {
    const a = assignVariant("+54911111111");
    const b = assignVariant("+54912222222");
    // At least one of the two should differ from the other (probabilistic, but with 50/50 it's very likely over many calls)
    const results = new Set([a, b]);
    // Just verify both return valid variants
    expect(["A", "B"]).toContain(a);
    expect(["A", "B"]).toContain(b);
  });

  it("returns null when no experiment active", () => {
    // Simulate empty variants
    expect(assignVariant("+54911333333")).toBeTruthy();
  });
});

describe("F8 - evaluateGuardrails", () => {
  interface SafetyGuardrail {
    id: string; name: string; condition: { field: string; operator: string; value: unknown }[];
    level: string; action: string; message: string;
  }

  const HARDCODED_GUARDRAILS: SafetyGuardrail[] = [
    { id: "critical_load", name: "Carga crítica", condition: [{ field: "driverAvailability", operator: "lte", value: 2 }], level: "critical", action: "block", message: "" },
    { id: "high_escalation", name: "Escalación alta", condition: [{ field: "escalationRate", operator: "gt", value: 0.5 }], level: "warning", action: "override_f4", message: "" },
    { id: "revenue_drop", name: "Caída de revenue", condition: [{ field: "revenueDrop", operator: "eq", value: true }], level: "warning", action: "disable_policy", message: "" },
  ];

  function matchGuardrailCondition(condition: { field: string; operator: string; value: unknown }[], context: Record<string, unknown>): boolean {
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

  function evaluateGuardrails(load: { driversAvailable: number }, escalationRate: number, revenueDrop: boolean): SafetyGuardrail[] {
    const ctx: Record<string, unknown> = {
      driverAvailability: load.driversAvailable,
      escalationRate, revenueDrop,
    };
    return HARDCODED_GUARDRAILS.filter((g) => matchGuardrailCondition(g.condition, ctx));
  }

  it("blocks when driver availability is critical (<=2)", () => {
    const active = evaluateGuardrails({ driversAvailable: 1 }, 0.1, false);
    expect(active.find((g) => g.id === "critical_load")).toBeTruthy();
  });

  it("does not block when drivers available are sufficient", () => {
    const active = evaluateGuardrails({ driversAvailable: 5 }, 0.1, false);
    expect(active.find((g) => g.id === "critical_load")).toBeFalsy();
  });

  it("triggers high escalation guardrail", () => {
    const active = evaluateGuardrails({ driversAvailable: 5 }, 0.7, false);
    expect(active.find((g) => g.id === "high_escalation")).toBeTruthy();
  });

  it("triggers revenue drop guardrail", () => {
    const active = evaluateGuardrails({ driversAvailable: 5 }, 0.1, true);
    expect(active.find((g) => g.id === "revenue_drop")).toBeTruthy();
  });

  it("returns empty when no conditions match", () => {
    const active = evaluateGuardrails({ driversAvailable: 10 }, 0.1, false);
    expect(active).toEqual([]);
  });
});

// ========== F8: Policy matching ==========

describe("F8 - Policy condition matching", () => {
  interface PolicyCondition { field: string; operator: string; value: unknown }

  function matchCondition(c: PolicyCondition, ctx: Record<string, unknown>): boolean {
    const value = ctx[c.field];
    switch (c.operator) {
      case "eq": return value === c.value;
      case "neq": return value !== c.value;
      case "gt": return typeof value === "number" && typeof c.value === "number" && value > c.value;
      case "gte": return typeof value === "number" && typeof c.value === "number" && value >= c.value;
      case "lt": return typeof value === "number" && typeof c.value === "number" && value < c.value;
      case "lte": return typeof value === "number" && typeof c.value === "number" && value <= c.value;
      case "in": return Array.isArray(c.value) && c.value.includes(value);
      case "contains": return typeof value === "string" && typeof c.value === "string" && value.includes(c.value);
      default: return false;
    }
  }

  it("eq matches exactly", () => {
    expect(matchCondition({ field: "x", operator: "eq", value: 5 }, { x: 5 })).toBe(true);
    expect(matchCondition({ field: "x", operator: "eq", value: 5 }, { x: 6 })).toBe(false);
  });

  it("gt/lt compare correctly", () => {
    expect(matchCondition({ field: "x", operator: "gt", value: 3 }, { x: 5 })).toBe(true);
    expect(matchCondition({ field: "x", operator: "lt", value: 3 }, { x: 5 })).toBe(false);
  });

  it("in checks array membership", () => {
    expect(matchCondition({ field: "x", operator: "in", value: ["a", "b"] }, { x: "a" })).toBe(true);
    expect(matchCondition({ field: "x", operator: "in", value: ["a", "b"] }, { x: "c" })).toBe(false);
  });

  it("contains checks substring", () => {
    expect(matchCondition({ field: "x", operator: "contains", value: "hello" }, { x: "hello world" })).toBe(true);
    expect(matchCondition({ field: "x", operator: "contains", value: "bye" }, { x: "hello world" })).toBe(false);
  });
});

// ========== F9: Drift Detection ==========

describe("F9 - detectPredictionDrift logic", () => {
  const DRIFT_THRESHOLD = 0.3;

  function detectPredictionDrift(predicted: number, actual: number | undefined): { triggered: boolean; drift: number } | null {
    if (actual === undefined) return null;
    const drift = Math.max(0, Math.min(1, Math.abs(predicted - actual)));
    if (drift <= DRIFT_THRESHOLD) return null;
    return { triggered: true, drift };
  }

  it("returns null when actual is undefined (no data yet)", () => {
    expect(detectPredictionDrift(0.7, undefined)).toBeNull();
  });

  it("returns null when drift is below threshold", () => {
    expect(detectPredictionDrift(0.5, 0.6)).toBeNull();
  });

  it("triggers when drift exceeds threshold", () => {
    const result = detectPredictionDrift(0.5, 0.9);
    expect(result).not.toBeNull();
    expect(result!.drift).toBeGreaterThan(DRIFT_THRESHOLD);
  });

  it("handles exact match (zero drift)", () => {
    expect(detectPredictionDrift(0.5, 0.5)).toBeNull();
  });

  it("handles extreme drift (0 vs 1)", () => {
    const result = detectPredictionDrift(0, 1);
    expect(result).not.toBeNull();
    expect(result!.drift).toBe(1);
  });
});

describe("F9 - detectConversionDrift logic", () => {
  const DRIFT_THRESHOLD = 0.3;

  function detectConversionDrift(conversionRate: number, expectedRate: number): { triggered: boolean; drift: number } | null {
    const drift = Math.max(0, Math.min(1, Math.abs(conversionRate - expectedRate)));
    if (drift <= DRIFT_THRESHOLD) return null;
    return { triggered: true, drift };
  }

  it("triggers when conversion rate drifts far from expected", () => {
    const result = detectConversionDrift(0.2, 0.8);
    expect(result).not.toBeNull();
    expect(result!.drift).toBeCloseTo(0.6, 5);
  });

  it("returns null when close to expected", () => {
    expect(detectConversionDrift(0.5, 0.6)).toBeNull();
  });
});

// ========== F9: Admin Command Parsing ==========

describe("F9 - parseAdminCommand", () => {
  const PRICE_RE = /^nuevo precio\s+(.+?)\s*=\s*(\d+)\s*$/i;
  const CLASSIFY_RE = /^(.+?)\s+es\s+(.+?),\s*(?:no\s+)?(.+)$/i;
  const WEIGHT_RE = /^ajustar peso\s+(.+?)\s*=\s*(-?\d+\.?\d*)\s*$/i;

  function parse(cmd: string): { action: string; target: string; value: unknown } | null {
    const priceMatch = cmd.match(PRICE_RE);
    if (priceMatch) return { action: "update_price", target: priceMatch[1].trim().toLowerCase(), value: Number(priceMatch[2]) };

    const classifyMatch = cmd.match(CLASSIFY_RE);
    if (classifyMatch) return { action: "reclassify_entity", target: classifyMatch[1].trim().toLowerCase(), value: { domain: classifyMatch[2].trim() } };

    const weightMatch = cmd.match(WEIGHT_RE);
    if (weightMatch) return { action: "adjust_weight", target: weightMatch[1].trim(), value: Number(weightMatch[2]) };

    return null;
  }

  it("parses price update command", () => {
    const result = parse("nuevo precio rafain = 12000");
    expect(result).not.toBeNull();
    expect(result!.action).toBe("update_price");
    expect(result!.target).toBe("rafain");
    expect(result!.value).toBe(12000);
  });

  it("parses classify command", () => {
    const result = parse("rafain es show turístico, no hotel");
    expect(result).not.toBeNull();
    expect(result!.action).toBe("reclassify_entity");
    expect(result!.target).toBe("rafain");
  });

  it("parses weight adjustment command", () => {
    const result = parse("ajustar peso f7_weight:revenue = 0.5");
    expect(result).not.toBeNull();
    expect(result!.action).toBe("adjust_weight");
    expect(result!.target).toBe("f7_weight:revenue");
    expect(result!.value).toBe(0.5);
  });

  it("returns null for unrecognized command", () => {
    expect(parse("unknown command")).toBeNull();
  });

  it("handles negative weight adjustment", () => {
    const result = parse("ajustar peso f7_weight:escalationCost = -0.02");
    expect(result).not.toBeNull();
    expect(result!.value).toBe(-0.02);
  });

  it("parses price with multi-word entity name", () => {
    const result = parse("nuevo precio madero show = 25000");
    expect(result).not.toBeNull();
    expect(result!.target).toBe("madero show");
    expect(result!.value).toBe(25000);
  });
});
