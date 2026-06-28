// DISPLAY NAME — capa de presentación de nombres de lugares para UX.
// Separa nomenclatura interna (matching/pricing/dispatch) de la mostrada al cliente.
// NO afecta confidence, extraction, pricing, dispatch, ni slot values.

import { queryOne } from "@/lib/db/core/helpers";

export interface DisplayNameResult {
  displayName: string;
  source: "official_name" | "canonical_name";
}

export async function getPlaceDisplayName(canonicalName: string): Promise<DisplayNameResult> {
  if (!canonicalName || !canonicalName.trim()) {
    return { displayName: canonicalName, source: "canonical_name" };
  }

  const row = await queryOne<{ official_name: string }>(
    `SELECT official_name FROM places
     WHERE LOWER(canonical_name) = LOWER(?) AND active_status = 'active'
     LIMIT 1`,
    [canonicalName.trim()]
  );

  if (!row) {
    return { displayName: canonicalName, source: "canonical_name" };
  }

  const official = row.official_name?.trim();
  if (!official) {
    return { displayName: canonicalName, source: "canonical_name" };
  }

  if (official.length < 3) {
    return { displayName: canonicalName, source: "canonical_name" };
  }

  if (official.trim().toLowerCase() === canonicalName.trim().toLowerCase()) {
    return { displayName: canonicalName, source: "canonical_name" };
  }

  return { displayName: official, source: "official_name" };
}
