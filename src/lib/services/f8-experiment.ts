import { getDbInstance } from "@/lib/db/database";

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
  await getDbInstance().execute({
    sql: "INSERT INTO policy_results (policy_id, variant, revenue, conversion, timestamp) VALUES (?, ?, ?, ?, unixepoch())",
    args: [policyId, variant, revenue, conversion ? 1 : 0],
  });
}

export async function getWinningVariant(
  experimentId: string,
): Promise<{ variantId: string; score: number } | null> {
  const rs = await getDbInstance().execute({
    sql: `SELECT variant, AVG(revenue) as avg_revenue, AVG(conversion) as avg_conversion,
       COUNT(*) as trials
     FROM policy_results
     WHERE policy_id = ?
     GROUP BY variant
     ORDER BY (AVG(revenue) * 0.6 + AVG(conversion) * 0.4) DESC
     LIMIT 1`,
    args: [experimentId],
  });
  const row = rs.rows[0] as unknown as { variant: string; avg_revenue: number; avg_conversion: number; trials: number } | undefined;
  if (!row || row.trials < 10) return null;

  const score = row.avg_revenue * 0.6 + row.avg_conversion * 0.4;
  return { variantId: row.variant, score };
}
