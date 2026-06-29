import { queryOne } from "../core/helpers";

export async function findPlaceByAlias(
  alias: string,
): Promise<{ place_id: string; canonical_name: string; zone_id: string | null } | null> {
  return queryOne(
    `SELECT p.place_id, p.canonical_name, p.zone_id
     FROM aliases a JOIN places p ON p.place_id = a.place_id
      WHERE LOWER(a.alias) = ? AND p.active_status = 'active'
     LIMIT 1`,
    [alias],
  );
}

export async function findPlaceByName(
  name: string,
): Promise<{ place_id: string; canonical_name: string; zone_id: string | null } | null> {
  return queryOne(
    `SELECT place_id, canonical_name, zone_id FROM places
     WHERE LOWER(canonical_name) = ? AND active_status = 'active'
     LIMIT 1`,
    [name],
  );
}

export async function getPlaceZone(
  placeId: string,
): Promise<{ zone_id: string | null } | null> {
  return queryOne<{ zone_id: string | null }>(
    "SELECT zone_id FROM places WHERE place_id = ?",
    [placeId],
  );
}

// DEPRECATED: use getPlaceZone instead
export const getOperationalZone = getPlaceZone;
