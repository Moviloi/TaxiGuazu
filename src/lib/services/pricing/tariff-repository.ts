// Tariff Repository — Pricing domain.
// Extracted from db/domains/trips.ts (Hardening P1).
// Owns the core tariff lookup logic.

import { queryOne } from "@/lib/db/database";
import type { TariffRow } from "@/lib/db/types";

/**
 * findTariffByPriority — Single query que evalúa los 4 niveles de resolución
 * (place→place, place→zone, zone→place, zone→zone) en una sola sentencia SQL
 * y retorna el match con la resolution_priority más baja (mayor prioridad).
 * 
 * Orden de prioridad (resolution_priority):
 *   1 = place→place   (más específico)
 *   2 = place→zone
 *   3 = zone→place
 *   4 = zone→zone     (fallback general)
 */
export async function findTariffByPriority(opts: {
  originPlaceId: string | null;
  destPlaceId: string | null;
  originZoneId: string | null;
  destZoneId: string | null;
}): Promise<TariffRow | null> {
  const { originPlaceId, destPlaceId, originZoneId, destZoneId } = opts;
  return queryOne<TariffRow>(
    `SELECT * FROM tariffs WHERE active = 1
     AND (
       (origin_place_id = ? AND destination_place_id = ?)
       OR (origin_place_id = ? AND destination_zone_id = ?)
       OR (origin_zone_id = ? AND destination_place_id = ?)
       OR (origin_zone_id = ? AND destination_zone_id = ?)
     )
     ORDER BY resolution_priority ASC
     LIMIT 1`,
    [originPlaceId, destPlaceId,
     originPlaceId, destZoneId,
     originZoneId, destPlaceId,
     originZoneId, destZoneId]
  );
}
