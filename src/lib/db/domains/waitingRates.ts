import { query, queryOne } from "../core/helpers";
import type { WaitingRateRow } from "../types";

export async function getWaitingRateById(id: number): Promise<WaitingRateRow | null> {
  return queryOne<WaitingRateRow>("SELECT * FROM waiting_rates WHERE id = ?", [id]);
}

export async function listActiveWaitingRates(): Promise<WaitingRateRow[]> {
  return query<WaitingRateRow>("SELECT * FROM waiting_rates WHERE active = 1 ORDER BY country, zone_id");
}

export async function findWaitingRateByZone(zoneId: string, country: string): Promise<WaitingRateRow | null> {
  return queryOne<WaitingRateRow>(
    "SELECT * FROM waiting_rates WHERE zone_id = ? AND country = ? AND active = 1 LIMIT 1",
    [zoneId, country],
  );
}

export async function insertWaitingRate(data: {
  zone_id: string;
  country: "AR" | "BR" | "PY";
  price_per_hour_4p: number;
  price_per_hour_6p: number;
}): Promise<number | bigint | null> {
  const rs = await queryOne<{ id: number | bigint }>(
    `INSERT INTO waiting_rates (zone_id, country, price_per_hour_4p, price_per_hour_6p)
     VALUES (?, ?, ?, ?)
     RETURNING id`,
    [data.zone_id, data.country, data.price_per_hour_4p, data.price_per_hour_6p],
  );
  return rs?.id ?? null;
}

export async function updateWaitingRate(id: number, data: Partial<{
  zone_id: string;
  country: "AR" | "BR" | "PY";
  price_per_hour_4p: number;
  price_per_hour_6p: number;
  active: number;
}>): Promise<void> {
  const sets: string[] = [];
  const args: unknown[] = [];

  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sets.push(`${key} = ?`);
      args.push(value);
    }
  }

  if (sets.length === 0) return;

  args.push(id);
  await query("UPDATE waiting_rates SET " + sets.join(", ") + " WHERE id = ?", args as any[]);
}
