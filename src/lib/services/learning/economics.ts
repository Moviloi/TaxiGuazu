import type { OpportunityEconomics } from "./types";
import { clamp01 } from "@/lib/utils/clamp";

const ECONOMIC_PROFILES: Record<string, Omit<OpportunityEconomics, "id" | "type">> = {
  "cataratas": { estimatedRevenue: 25000, conversionProbability: 0.70, margin: 0.30, operationalCost: 8000 },
  "city tour": { estimatedRevenue: 15000, conversionProbability: 0.65, margin: 0.35, operationalCost: 5000 },
  "cena show": { estimatedRevenue: 35000, conversionProbability: 0.50, margin: 0.40, operationalCost: 10000 },
  "retorno": { estimatedRevenue: 12000, conversionProbability: 0.80, margin: 0.25, operationalCost: 4000 },
};

export function getEconomicProfile(label: string): Omit<OpportunityEconomics, "id" | "type"> {
  const lower = label.toLowerCase();
  for (const [key, profile] of Object.entries(ECONOMIC_PROFILES)) {
    if (lower.includes(key)) return profile;
  }
  return { estimatedRevenue: 10000, conversionProbability: 0.50, margin: 0.20, operationalCost: 5000 };
}

export function computeEconomicScore(label: string, price: number): number {
  const profile = getEconomicProfile(label);
  const priceFactor = price > 0 ? Math.min(2, price / 15000) : 1;
  const marginFactor = clamp01(profile.margin / 0.50);
  const netValue = (profile.estimatedRevenue * priceFactor) * marginFactor;
  const risk = clamp01(1 - profile.conversionProbability);
  const score = (netValue * clamp01(profile.conversionProbability) * marginFactor) - (profile.operationalCost * risk);
  return Math.max(0, Math.round(score * 100) / 100);
}
