import { query, queryOne } from "../core/helpers";
import type { TourRow } from "../types";

export async function getTourById(id: number): Promise<TourRow | null> {
  return queryOne<TourRow>("SELECT * FROM tours WHERE id = ?", [id]);
}

export async function listActiveTours(): Promise<TourRow[]> {
  return query<TourRow>("SELECT * FROM tours WHERE active = 1 ORDER BY name");
}

export async function findTour(opts: {
  originPlaceId?: string | null;
  originZoneId?: string | null;
  tripType?: "round_trip" | "tour";
}): Promise<TourRow | null> {
  const conditions: string[] = ["active = 1"];
  const args: unknown[] = [];

  if (opts.originPlaceId) {
    conditions.push("origin_place_id = ?");
    args.push(opts.originPlaceId);
  }
  if (opts.originZoneId) {
    conditions.push("origin_zone_id = ?");
    args.push(opts.originZoneId);
  }
  if (opts.tripType) {
    conditions.push("trip_type = ?");
    args.push(opts.tripType);
  }

  return queryOne<TourRow>(
    `SELECT * FROM tours WHERE ${conditions.join(" AND ")} ORDER BY id LIMIT 1`,
    args as any[],
  );
}

export async function insertTour(data: {
  name: string;
  trip_type: "round_trip" | "tour";
  origin_place_id?: string | null;
  origin_zone_id?: string | null;
  destination_place_id?: string | null;
  destination_zone_id?: string | null;
  waypoints?: string | null;
  wait_hours: number;
  price_4p: number;
  price_6p: number;
  driver_price_4p: number;
  driver_price_6p: number;
  crosses_border?: number;
}): Promise<number | bigint | null> {
  const rs = await queryOne<{ id: number | bigint }>(
    `INSERT INTO tours (name, trip_type, origin_place_id, origin_zone_id, destination_place_id, destination_zone_id, waypoints, wait_hours, price_4p, price_6p, driver_price_4p, driver_price_6p, crosses_border)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     RETURNING id`,
    [
      data.name,
      data.trip_type,
      data.origin_place_id ?? null,
      data.origin_zone_id ?? null,
      data.destination_place_id ?? null,
      data.destination_zone_id ?? null,
      data.waypoints ?? null,
      data.wait_hours,
      data.price_4p,
      data.price_6p,
      data.driver_price_4p,
      data.driver_price_6p,
      data.crosses_border ?? 0,
    ],
  );
  return rs?.id ?? null;
}

export async function updateTour(id: number, data: Partial<{
  name: string;
  trip_type: "round_trip" | "tour";
  origin_place_id: string | null;
  origin_zone_id: string | null;
  destination_place_id: string | null;
  destination_zone_id: string | null;
  waypoints: string | null;
  wait_hours: number;
  price_4p: number;
  price_6p: number;
  driver_price_4p: number;
  driver_price_6p: number;
  crosses_border: number;
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
  await query("UPDATE tours SET " + sets.join(", ") + " WHERE id = ?", args as any[]);
}

export async function deleteTour(id: number): Promise<void> {
  await query("UPDATE tours SET active = 0 WHERE id = ?", [id]);
}
