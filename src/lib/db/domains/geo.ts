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
): Promise<{ place_id: string; canonical_name: string; display_name: string | null; zone_id: string | null } | null> {
  return queryOne(
    `SELECT place_id, canonical_name, display_name, zone_id FROM places
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

/** Obtiene el score de proximidad entre dos tipos de zona abstractos (P1-08). */
export async function getZoneProximity(
  zoneA: string,
  zoneB: string,
): Promise<{ score: number } | null> {
  return queryOne<{ score: number }>(
    "SELECT score FROM zone_proximity WHERE zone_a = ? AND zone_b = ?",
    [zoneA, zoneB],
  );
}

/** Verifica si un par de zonas es un corredor conocido (P1-08). */
export async function isZoneCorridor(
  zoneA: string,
  zoneB: string,
): Promise<boolean> {
  const row = await queryOne<{ count: number }>(
    "SELECT COUNT(*) as count FROM zone_corridors WHERE zone_a = ? AND zone_b = ?",
    [zoneA, zoneB],
  );
  return (row?.count ?? 0) > 0;
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

export async function getZoneSurcharge(zoneId: string): Promise<{ surcharge_pct: number; surcharge_description: string | null } | null> {
  const row = await queryOne<{ surcharge_pct: number; surcharge_description: string | null }>(
    "SELECT surcharge_pct, surcharge_description FROM zones WHERE zone_id = ? AND active = 1",
    [zoneId]
  );
  if (!row || !row.surcharge_pct) return null;
  return { surcharge_pct: row.surcharge_pct, surcharge_description: row.surcharge_description };
}


