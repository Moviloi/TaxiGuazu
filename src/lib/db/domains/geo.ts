import { queryOne } from "../core/helpers";

export async function findPlaceByAlias(
  alias: string,
): Promise<{ place_id: string; canonical_name: string; operational_zone: string | null } | null> {
  return queryOne(
    `SELECT p.place_id, p.canonical_name, p.operational_zone
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) = ? AND p.active = 1
     LIMIT 1`,
    [alias],
  );
}

export async function findPlaceByName(
  name: string,
): Promise<{ place_id: string; canonical_name: string; operational_zone: string | null } | null> {
  return queryOne(
    `SELECT place_id, canonical_name, operational_zone FROM places
     WHERE LOWER(canonical_name) = ? AND active = 1
     LIMIT 1`,
    [name],
  );
}

export async function getOperationalZone(
  placeId: string,
): Promise<{ operational_zone: string | null } | null> {
  return queryOne<{ operational_zone: string | null }>(
    "SELECT operational_zone FROM places WHERE place_id = ?",
    [placeId],
  );
}
