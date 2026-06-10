import { getDbInstance } from "@/lib/db/database";

function getDb() {
  return getDbInstance();
}

export interface ResolveLocationResult {
  place_id: string | null;
  canonical_name: string | null;
  operational_zone: string | null;
  confidence: "exact" | "alias" | "fuzzy" | "not_found";
}

async function queryOne<T>(sql: string, args?: any[]): Promise<T | null> {
  const rs = await getDb().execute({ sql, args: args ?? [] });
  return (rs.rows[0] as T | undefined) ?? null;
}

function normalize(text: string): string {
  return text.toLowerCase().trim();
}

function removeAccents(text: string): string {
  return text.replace(/[áéíóúüñ]/g, (c) => {
    const map: Record<string, string> = { á: "a", é: "e", í: "i", ó: "o", ú: "u", ü: "u", ñ: "n" };
    return map[c] || c;
  });
}

export async function resolveLocation(text: string): Promise<ResolveLocationResult> {
  if (!text || text.trim() === "") {
    return { place_id: null, canonical_name: null, operational_zone: null, confidence: "not_found" };
  }

  const raw = text.trim();

  // 1. Exact alias match → place
  const byAlias = await queryOne<{ place_id: string; canonical_name: string; operational_zone: string | null }>(
    `SELECT p.place_id, p.canonical_name, p.operational_zone
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) = ? AND p.active = 1
     LIMIT 1`,
    [normalize(raw)]
  );
  if (byAlias) {
    return { ...byAlias, confidence: "alias" };
  }

  // 2. Exact canonical name match → place
  const byName = await queryOne<{ place_id: string; canonical_name: string; operational_zone: string | null }>(
    `SELECT place_id, canonical_name, operational_zone FROM places
     WHERE LOWER(canonical_name) = ? AND active = 1
     LIMIT 1`,
    [normalize(raw)]
  );
  if (byName) {
    return { ...byName, confidence: "exact" };
  }

  // 3. Fuzzy alias match (accent-insensitive)
  const normalizedNoAccent = removeAccents(normalize(raw));
  const fuzzyAlias = await queryOne<{ place_id: string; canonical_name: string; operational_zone: string | null }>(
    `SELECT p.place_id, p.canonical_name, p.operational_zone
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) = ? AND p.active = 1
     LIMIT 1`,
    [normalizedNoAccent]
  );
  if (fuzzyAlias) {
    return { ...fuzzyAlias, confidence: "fuzzy" };
  }

  // 4. Fuzzy canonical name match (accent-insensitive)
  const fuzzyName = await queryOne<{ place_id: string; canonical_name: string; operational_zone: string | null }>(
    `SELECT place_id, canonical_name, operational_zone FROM places
     WHERE LOWER(canonical_name) = ? AND active = 1
     LIMIT 1`,
    [normalizedNoAccent]
  );
  if (fuzzyName) {
    return { ...fuzzyName, confidence: "fuzzy" };
  }

  return { place_id: null, canonical_name: null, operational_zone: null, confidence: "not_found" };
}

export async function resolveLocationToPlaceId(text: string): Promise<string | null> {
  const result = await resolveLocation(text);
  return result.place_id;
}
