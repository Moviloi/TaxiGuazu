import { getDbInstance } from "@/lib/db/database";
import type { TariffRow, TariffV2Match } from "@/lib/db/types";
import { resolveLocation } from "./location-resolver";

function getDb() {
  return getDbInstance();
}

async function queryOne<T>(sql: string, args?: any[]): Promise<T | null> {
  const rs = await getDb().execute({ sql, args: args ?? [] });
  return (rs.rows[0] as T | undefined) ?? null;
}

async function findTariffRow(opts: {
  originPlaceId?: string | null;
  destPlaceId?: string | null;
  originZoneId?: string | null;
  destZoneId?: string | null;
}): Promise<TariffRow | null> {
  const conditions: string[] = ["active = 1"];
  const args: any[] = [];

  if (opts.originPlaceId != null) {
    conditions.push("origin_place_id = ?");
    args.push(opts.originPlaceId);
  } else {
    conditions.push("origin_place_id IS NULL");
  }

  if (opts.destPlaceId != null) {
    conditions.push("destination_place_id = ?");
    args.push(opts.destPlaceId);
  } else {
    conditions.push("destination_place_id IS NULL");
  }

  if (opts.originZoneId != null) {
    conditions.push("origin_zone_id = ?");
    args.push(opts.originZoneId);
  } else {
    conditions.push("origin_zone_id IS NULL");
  }

  if (opts.destZoneId != null) {
    conditions.push("destination_zone_id = ?");
    args.push(opts.destZoneId);
  } else {
    conditions.push("destination_zone_id IS NULL");
  }

  return queryOne<TariffRow>(
    `SELECT * FROM tariffs WHERE ${conditions.join(" AND ")} LIMIT 1`,
    args
  );
}

function buildMatch(row: TariffRow, level: TariffV2Match["level"], pax: number): TariffV2Match {
  const price = pax > 4 ? row.price_6p : row.price_4p;
  const piso = pax > 4 ? row.base_price_6p : row.base_price_4p;
  return {
    matched: true,
    price,
    piso,
    garantizado: piso,
    tariffId: row.id,
    level,
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
    price: 0,
    piso: 0,
    garantizado: 0,
    tariffId: null,
    level: "not_found",
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

  if (!originLoc.place_id || !destLoc.place_id) {
    return notFound(originLoc.place_id, destLoc.place_id, originLoc.operational_zone, destLoc.operational_zone);
  }

  const originPlaceId = originLoc.place_id;
  const destPlaceId = destLoc.place_id;
  const originZoneId = originLoc.operational_zone;
  const destZoneId = destLoc.operational_zone;

  const l1 = await findTariffRow({ originPlaceId, destPlaceId, originZoneId: null, destZoneId: null });
  if (l1) return buildMatch(l1, "place_place", paxNum);

  if (destZoneId) {
    const l2 = await findTariffRow({ originPlaceId, destPlaceId: null, originZoneId: null, destZoneId });
    if (l2) return buildMatch(l2, "place_zone", paxNum);
  }

  if (originZoneId) {
    const l3 = await findTariffRow({ originPlaceId: null, destPlaceId, originZoneId, destZoneId: null });
    if (l3) return buildMatch(l3, "zone_place", paxNum);
  }

  if (originZoneId && destZoneId) {
    const l4 = await findTariffRow({ originPlaceId: null, destPlaceId: null, originZoneId, destZoneId });
    if (l4) return buildMatch(l4, "zone_zone", paxNum);
  }

  return notFound(originPlaceId, destPlaceId, originZoneId, destZoneId);
}

export async function resolveTariffByPlaceIds(
  originPlaceId: string,
  destinationPlaceId: string,
  pax: number,
): Promise<TariffV2Match> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));
  const dId = destinationPlaceId;

  const originZone = await queryOne<{ operational_zone: string | null }>(
    "SELECT operational_zone FROM places WHERE place_id = ?", [originPlaceId]
  );
  const destZone = await queryOne<{ operational_zone: string | null }>(
    "SELECT operational_zone FROM places WHERE place_id = ?", [dId]
  );
  const originZoneId = originZone?.operational_zone ?? null;
  const destZoneId = destZone?.operational_zone ?? null;

  const l1 = await findTariffRow({ originPlaceId, destPlaceId: dId, originZoneId: null, destZoneId: null });
  if (l1) return buildMatch(l1, "place_place", paxNum);

  if (destZoneId) {
    const l2 = await findTariffRow({ originPlaceId, destPlaceId: null, originZoneId: null, destZoneId });
    if (l2) return buildMatch(l2, "place_zone", paxNum);
  }

  if (originZoneId) {
    const l3 = await findTariffRow({ originPlaceId: null, destPlaceId: dId, originZoneId, destZoneId: null });
    if (l3) return buildMatch(l3, "zone_place", paxNum);
  }

  if (originZoneId && destZoneId) {
    const l4 = await findTariffRow({ originPlaceId: null, destPlaceId: null, originZoneId, destZoneId });
    if (l4) return buildMatch(l4, "zone_zone", paxNum);
  }

  return notFound(originPlaceId, dId, originZoneId, destZoneId);
}
