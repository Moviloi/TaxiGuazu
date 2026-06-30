import { queryOne, query } from "../core/helpers";

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

export interface PlaceCandidate {
  place_id: string;
  canonical_name: string;
  zone_id: string | null;
  city: string;
  country: string;
  place_type: string;
  tourist_relevance_score: number;
  /** Nombre amigable para mostrar al usuario. Fallback a canonical_name si vacío. */
  display_name?: string;
}

export async function searchPlaces(
  searchText: string,
  limit = 5,
): Promise<PlaceCandidate[]> {
  const exact = searchText.toLowerCase();
  const pattern = `%${exact}%`;

  const sql = `
    SELECT p.place_id, p.canonical_name, p.zone_id,
           p.city, p.country, p.place_type, p.tourist_relevance_score,
           p.display_name
    FROM places p
    WHERE (
      p.canonical_name LIKE ?
      OR EXISTS (SELECT 1 FROM aliases a WHERE a.place_id = p.place_id AND LOWER(a.alias) LIKE ?)
    )
    AND p.active_status = 'active'
    GROUP BY p.place_id
    ORDER BY
      -- Exact canonical name first, then by relevance, then alphabetical
      CASE WHEN LOWER(p.canonical_name) = ? THEN 0 ELSE 1 END,
      p.tourist_relevance_score DESC,
      p.canonical_name
    LIMIT ?
  `;

  return query<PlaceCandidate>(sql, [pattern, pattern, exact, limit]);
}


