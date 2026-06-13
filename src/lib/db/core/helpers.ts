import type { InValue } from "@libsql/client";
import { ensureSchema, getDb } from "./connection";

export async function query<T>(sql: string, args?: InValue[]): Promise<T[]> {
  await ensureSchema();
  const rs = await getDb().execute({ sql, args: args ?? [] });
  return rs.rows as unknown as T[];
}

export async function queryOne<T>(sql: string, args?: InValue[]): Promise<T | null> {
  const rows = await query<T>(sql, args);
  return rows[0] ?? null;
}

export function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = [];
  for (let i = 0; i <= m; i++) {
    dp[i] = [i];
  }
  for (let j = 0; j <= n; j++) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]) + 1;
    }
  }
  return dp[m][n];
}
