import { findTariff, resolveAlias, searchTariffs } from "@/lib/db/database";

export interface TariffMatchResult {
  matched: boolean;
  canonicalOrigin: string;
  canonicalDestination: string;
  price: number;
  price4p: number;
  price6p: number;
  piso: number;
  pisoLow: number | null;
  garantizado: number;
  tariffId: number;
  method: "exact" | "fuzzy" | "not_found";
  alternatives?: { origin: string; destination: string; price: number }[];
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export async function matchTariff(
  origin: string,
  destination: string,
  pax: number,
): Promise<TariffMatchResult> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));

  // Step A: Resolve via location_aliases
  const origins = (await resolveAlias(origin)).names;
  const destinations = (await resolveAlias(destination)).names;
  const canonicalOrigin = origins[0] || origin;
  const canonicalDestination = destinations[0] || destination;

  // Step B: Exact match in tariffs
  for (const o of origins) {
    for (const d of destinations) {
      const t = await findTariff(o, d, paxNum);
      if (t) {
        return {
          matched: true,
          canonicalOrigin: o,
          canonicalDestination: d,
          price: t.price,
          price4p: t.price_4p,
          price6p: t.price_6p,
          piso: t.piso,
          pisoLow: t.piso_low,
          garantizado: t.garantizado,
          tariffId: t.id,
          method: "exact",
        };
      }
    }
  }

  // Step C: Fuzzy match — search both origin and destination
  const candidates = (await searchTariffs(canonicalOrigin))
    .concat(await searchTariffs(canonicalDestination));

  const seen = new Set<number>();
  const scored: { row: typeof candidates[0]; score: number }[] = [];

  for (const row of candidates) {
    if (seen.has(row.id)) continue;
    seen.add(row.id);
    const oDist = levenshtein(canonicalOrigin.toLowerCase(), row.origin.toLowerCase());
    const dDist = levenshtein(canonicalDestination.toLowerCase(), row.destination.toLowerCase());
    // Each field must independently pass ≤ 35% of its own string length
    const maxOriginLen = Math.max(canonicalOrigin.length, row.origin.length, 1);
    const maxDestLen = Math.max(canonicalDestination.length, row.destination.length, 1);
    if (oDist <= maxOriginLen * 0.50 && dDist <= maxDestLen * 0.50) {
      scored.push({ row, score: oDist + dDist });
    }
  }

  scored.sort((a, b) => a.score - b.score);

  if (scored.length > 0) {
    const best = scored[0].row;
    const price = paxNum > 4 ? best.price_6p : best.price_4p;
    const piso = paxNum > 4 ? best.piso_6p : best.piso_4p;
    const pisoLow = paxNum > 4 ? best.piso_6p_low : best.piso_4p_low;
    const garantizado = paxNum > 4
      ? (best.garantizado_6p ?? Math.round(best.price_6p * 0.85))
      : (best.garantizado_4p ?? Math.round(best.price_4p * 0.85));

    return {
      matched: true,
      canonicalOrigin: best.origin,
      canonicalDestination: best.destination,
      price,
      price4p: best.price_4p,
      price6p: best.price_6p,
      piso,
      pisoLow,
      garantizado,
      tariffId: best.id,
      method: "fuzzy",
      alternatives: scored.slice(1, 4).map(s => ({
        origin: s.row.origin,
        destination: s.row.destination,
        price: paxNum > 4 ? s.row.price_6p : s.row.price_4p,
      })),
    };
  }

  return {
    matched: false,
    canonicalOrigin,
    canonicalDestination,
    price: 0,
    price4p: 0,
    price6p: 0,
    piso: 0,
    pisoLow: null,
    garantizado: 0,
    tariffId: 0,
    method: "not_found",
  };
}
