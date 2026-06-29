// ARCHITECTURE NOTE (Phase D): Pricing domain — semi-frozen.
// v2: resolución unificada en single query con ORDER BY resolution_priority.
// Reemplaza el enfoque secuencial L1-L4 (4 queries) por una sola consulta SQL
// que evalúa los 4 niveles y retorna el de mayor prioridad.

import type { TariffRow, TariffV2Match } from "@/lib/db/types";
import { findTariffByPriority, getPlaceZone } from "@/lib/db/database";
import { resolveLocation } from "../geo/location-resolver";

const PRIORITY_TO_LEVEL: Record<number, TariffV2Match["level"]> = {
  1: "place_place",
  2: "place_zone",
  3: "zone_place",
  4: "zone_zone",
};

function buildMatch(row: TariffRow, pax: number): TariffV2Match {
  const price4p = row.public_price_4p ?? 0;
  const price6p = row.public_price_6p ?? 0;
  const price = pax > 4 ? price6p : price4p;
  const piso = pax > 4
    ? (row.driver_price_6p ?? price6p)
    : (row.driver_price_4p ?? price4p);
  const priority = row.resolution_priority ?? 4;
  return {
    matched: true,
    publicPrice4p: row.public_price_4p,
    publicPrice6p: row.public_price_6p,
    driverPrice4p: row.driver_price_4p,
    driverPrice6p: row.driver_price_6p,
    price,
    piso,
    garantizado: piso,
    tariffId: row.id,
    level: PRIORITY_TO_LEVEL[priority] ?? "zone_zone",
    resolutionPriority: priority,
    originPlaceId: row.origin_place_id,
    destinationPlaceId: row.destination_place_id,
    originZoneId: row.origin_zone_id,
    destinationZoneId: row.destination_zone_id,
  };
}

function notFound(
  originPlaceId: string | null,
  destPlaceId: string | null,
  originZoneId: string | null,
  destZoneId: string | null,
): TariffV2Match {
  return {
    matched: false,
    publicPrice4p: null,
    publicPrice6p: null,
    driverPrice4p: null,
    driverPrice6p: null,
    price: 0,
    piso: 0,
    garantizado: 0,
    tariffId: null,
    level: "not_found",
    resolutionPriority: null,
    originPlaceId,
    destinationPlaceId: destPlaceId,
    originZoneId,
    destinationZoneId: destZoneId,
  };
}

export async function resolveTariff(
  origin: string,
  destination: string,
  pax: number,
): Promise<TariffV2Match> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));
  const originLoc = await resolveLocation(origin);
  const destLoc = await resolveLocation(destination);
  const originPlaceId = originLoc.place_id;
  const destPlaceId = destLoc.place_id;
  const originZoneId = originLoc.zone_id;
  const destZoneId = destLoc.zone_id;

  // Single query: evalúa los 4 niveles y retorna el de mayor prioridad
  const match = await findTariffByPriority({ originPlaceId, destPlaceId, originZoneId, destZoneId });
  if (match) return buildMatch(match, paxNum);

  return notFound(originPlaceId, destPlaceId, originZoneId, destZoneId);
}

export async function resolveTariffByPlaceIds(
  originPlaceId: string,
  destinationPlaceId: string,
  pax: number,
): Promise<TariffV2Match> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));
  const dId = destinationPlaceId;

  const originZone = await getPlaceZone(originPlaceId);
  const destZone = await getPlaceZone(dId);
  const originZoneId = originZone?.zone_id ?? null;
  const destZoneId = destZone?.zone_id ?? null;

  // Single query: evalúa los 4 niveles con place_ids + zone_ids resueltos
  const match = await findTariffByPriority({ originPlaceId, destPlaceId: dId, originZoneId, destZoneId });
  if (match) return buildMatch(match, paxNum);

  return notFound(originPlaceId, dId, originZoneId, destZoneId);
}
