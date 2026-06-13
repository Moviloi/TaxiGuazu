import { insertPolicyResult, getWinningPolicyVariant } from "@/lib/db/domains/learning";

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
  await insertPolicyResult(policyId, variant, revenue, conversion);
}

export async function getWinningVariant(
  experimentId: string,
): Promise<{ variantId: string; score: number } | null> {
  return getWinningPolicyVariant(experimentId);
}
