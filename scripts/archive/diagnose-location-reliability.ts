/**
 * Diagnóstico de confiabilidad del resolver de lugares.
 * NO para producción — script temporal de auditoría.
 * 
 * Uso: npx tsx scripts/diagnose-location-reliability.ts
 */

import { resolveLocation, resolveLocationToPlaceId } from "@/lib/services/geo/location-resolver";
import { searchPlaces } from "@/lib/db/domains/geo";
import { query } from "@/lib/db/core/helpers";

// ─── CONFIG ───
const INPUTS = [
  "hotel amerian",
  "amerian",
  "hotel amerian iguazu",
  "hotel amerian portal del iguazu",
];
const ITERATIONS = 10;

// ─── TIPO auxiliar para resultados de searchPlaces ───
interface PlaceRow {
  place_id: string;
  canonical_name: string;
  display_name: string | null;
  city: string;
  country: string;
  place_type: string;
  tourist_relevance_score: number;
  zone_id: string | null;
}

// ─── HELPERS ───
function stableHash(arr: unknown[]): string {
  // Produce un hash simple del contenido del array
  const str = JSON.stringify(arr.map(r => typeof r === "object" && r !== null ? 
    (r as Record<string, unknown>).place_id ?? (r as Record<string, unknown>).canonical_name ?? "?" : r));
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const c = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + c;
    hash |= 0;
  }
  return String(hash);
}

// ─── PASO 1: DETERMINISMO ───
async function testDeterminism() {
  console.log("=".repeat(80));
  console.log("PASO 1 — DETERMINISMO DEL RESOLVER");
  console.log("=".repeat(80));

  for (const input of INPUTS) {
    console.log(`\n--- Input: "${input}" (${ITERATIONS}x) ---`);

    // test resolveLocation
    {
      const results: string[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const res = await resolveLocation(input);
        const sig = `${res.confidence} | place_id=${res.place_id} | name=${res.canonical_name} | zone=${res.zone_id}`;
        results.push(sig);
      }
      const unique = new Set(results);
      console.log(`  resolveLocation: ${unique.size} variante(s)`);
      if (unique.size > 1) {
        console.log(`  ⚠️  NO DETERMINISTA! Variaciones:`);
        for (const r of results) console.log(`    ${r}`);
      } else {
        console.log(`  ✅ DETERMINISTA → ${results[0]}`);
      }
    }

    // test searchPlaces
    {
      const results: string[] = [];
      for (let i = 0; i < ITERATIONS; i++) {
        const places = await searchPlaces(input, 10);
        const sig = places.map((p: PlaceRow) => `${p.canonical_name} (${p.place_type} score=${p.tourist_relevance_score})`).join(" | ");
        results.push(`${places.length} resultados → ${sig}`);
      }
      const unique = new Set(results);
      console.log(`  searchPlaces: ${unique.size} variante(s)`);
      if (unique.size > 1) {
        console.log(`  ⚠️  NO DETERMINISTA! Variaciones:`);
        for (const r of results) console.log(`    ${r}`);
      } else {
        console.log(`  ✅ DETERMINISTA → ${results[0]}`);
      }
    }
  }
}

// ─── PASO 2: POR QUÉ MATCHEAN ESOS HOTELES ───
async function explainFalseMatches() {
  console.log("\n" + "=".repeat(80));
  console.log("PASO 2 — ¿POR QUÉ 'JL Hotel by Bourbon' Y 'Gran Meliá Iguazú' MATCHEAN 'hotel amerian'?");
  console.log("=".repeat(80));

  // 1. Primero, buscar places que tienen "amerian" en su nombre
  console.log("\n1. Places cuyo canonical_name contiene 'amerian':");
  const amerianPlaces = await query<PlaceRow>(
    `SELECT p.place_id, p.canonical_name, p.display_name, p.city, p.country, p.place_type, p.tourist_relevance_score, p.zone_id
     FROM places p
     WHERE LOWER(p.canonical_name) LIKE '%amerian%'
       AND p.active_status = 'active'
     ORDER BY p.tourist_relevance_score DESC`
  );
  if (amerianPlaces.length === 0) console.log("   (ninguno)");
  else for (const p of amerianPlaces) {
    console.log(`   - ${p.place_id}: "${p.canonical_name}" (${p.place_type}, score=${p.tourist_relevance_score})`);
  }

  // 2. Places cuyo canonical_name contiene exactamente "hotel amerian"
  console.log("\n2. Places cuyo canonical_name contiene EXACTAMENTE 'hotel amerian':");
  const exact = await query<PlaceRow>(
    `SELECT p.place_id, p.canonical_name, p.display_name, p.city, p.country, p.place_type, p.tourist_relevance_score, p.zone_id
     FROM places p
     WHERE LOWER(p.canonical_name) = 'hotel amerian'
       AND p.active_status = 'active'`
  );
  if (exact.length === 0) console.log("   (ninguno — no existe un place con canonical_name='hotel amerian')");
  else for (const p of exact) {
    console.log(`   ${p.place_id}: "${p.canonical_name}"`);
  }

  // 3. Alias que contengan "hotel amerian"
  console.log("\n3. Alias que contienen 'hotel amerian' (LIKE):");
  const aliasResults = await query<{ alias: string; place_id: string; canonical_name: string }>(
    `SELECT a.alias, a.place_id, p.canonical_name
     FROM aliases a
     JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) LIKE '%hotel amerian%'
       AND p.active_status = 'active'`
  );
  if (aliasResults.length === 0) console.log("   (ninguno)");
  else for (const a of aliasResults) {
    console.log(`   - alias="${a.alias}" → place="${a.canonical_name}" (${a.place_id})`);
  }

  // 4. Para "hotel amerian" como input, ¿qué devuelve searchPlaces?
  console.log("\n4. searchPlaces('hotel amerian', 10) con SQL raw:");
  const sqlResults = await query<PlaceRow>(
    `SELECT p.place_id, p.canonical_name, p.display_name, p.city, p.country, p.place_type, p.tourist_relevance_score, p.zone_id
     FROM places p
     WHERE (
       LOWER(p.canonical_name) LIKE '%hotel amerian%'
       OR EXISTS (SELECT 1 FROM aliases a WHERE a.place_id = p.place_id AND LOWER(a.alias) LIKE '%hotel amerian%')
     )
     AND p.active_status = 'active'
     GROUP BY p.place_id
     ORDER BY
       CASE WHEN LOWER(p.canonical_name) = 'hotel amerian' THEN 0 ELSE 1 END,
       p.tourist_relevance_score DESC,
       p.canonical_name
     LIMIT 10`
  );
  if (sqlResults.length === 0) {
    console.log("   (vacio — nadie matchea 'hotel amerian' como substring)");
  } else {
    for (const p of sqlResults) {
      console.log(`   [${p.tourist_relevance_score}] ${p.canonical_name} (${p.place_type}, ${p.city})`);
    }
  }

  // 5. BUSCAR "JL Hotel by Bourbon" — cómo aparece
  console.log("\n5. ¿Existe 'JL Hotel by Bourbon' en places?");
  const bourbonSearch = await query<PlaceRow>(
    `SELECT p.place_id, p.canonical_name, p.display_name, p.city, p.country, p.place_type, p.tourist_relevance_score, p.zone_id
     FROM places p
     WHERE LOWER(p.canonical_name) LIKE '%bourbon%'
       AND p.active_status = 'active'`
  );
  if (bourbonSearch.length === 0) {
    console.log("   (no encontrado por 'bourbon')");
    // Buscar más amplio
    const bourbonAlias = await query<{ alias: string; place_id: string; canonical_name: string }>(
      `SELECT a.alias, a.place_id, p.canonical_name
       FROM aliases a
       JOIN places p ON p.place_id = a.place_id
       WHERE LOWER(a.alias) LIKE '%bourbon%'
         AND p.active_status = 'active'`
    );
    if (bourbonAlias.length === 0) {
      console.log("   (tampoco hay alias con 'bourbon')");
    } else {
      for (const a of bourbonAlias) {
        console.log(`   alias="${a.alias}" → place="${a.canonical_name}"`);
      }
    }
  } else {
    for (const p of bourbonSearch) {
      console.log(`   [${p.tourist_relevance_score}] ${p.canonical_name} (${p.place_type}, ${p.city}) — place_id=${p.place_id}`);
      // Mostrar todos sus alias
      const aliases = await query<{ alias: string; language: string }>(
        "SELECT alias, language FROM aliases WHERE place_id = ?", [p.place_id]
      );
      if (aliases.length > 0) {
        console.log(`      Alias:`);
        for (const a of aliases) console.log(`        [${a.language}] "${a.alias}"`);
      }
    }
  }

  // 6. BUSCAR "Gran Meliá Iguazú"
  console.log("\n6. ¿Existe 'Gran Meliá Iguazú' en places?");
  const meliaSearch = await query<PlaceRow>(
    `SELECT p.place_id, p.canonical_name, p.display_name, p.city, p.country, p.place_type, p.tourist_relevance_score, p.zone_id
     FROM places p
     WHERE LOWER(p.canonical_name) LIKE '%meli%'
       AND p.active_status = 'active'
     ORDER BY p.tourist_relevance_score DESC`
  );
  if (meliaSearch.length === 0) {
    console.log("   (no encontrado por 'meli')");
    const meliaAlias = await query<{ alias: string; place_id: string; canonical_name: string }>(
      `SELECT a.alias, a.place_id, p.canonical_name
       FROM aliases a
       JOIN places p ON p.place_id = a.place_id
       WHERE LOWER(a.alias) LIKE '%meli%'
         AND p.active_status = 'active'`
    );
    if (meliaAlias.length === 0) {
      console.log("   (tampoco hay alias con 'meli')");
    } else {
      for (const a of meliaAlias) {
        console.log(`   alias="${a.alias}" → place="${a.canonical_name}"`);
      }
    }
  } else {
    for (const p of meliaSearch) {
      console.log(`   [${p.tourist_relevance_score}] ${p.canonical_name} (${p.place_type}, ${p.city}) — place_id=${p.place_id}`);
      const aliases = await query<{ alias: string; language: string }>(
        "SELECT alias, language FROM aliases WHERE place_id = ?", [p.place_id]
      );
      if (aliases.length > 0) {
        console.log(`      Alias:`);
        for (const a of aliases) console.log(`        [${a.language}] "${a.alias}"`);
      }
    }
  }

  // 7. ¿Hay algún alias "amerian" que apunte a otro lugar?
  console.log("\n7. Alias='amerian' o que contenga 'amerian' (TODOS):");
  const allAmerianAliases = await query<{ alias: string; place_id: string; canonical_name: string; language: string }>(
    `SELECT a.alias, a.place_id, p.canonical_name, a.language
     FROM aliases a
     JOIN places p ON p.place_id = a.place_id
     WHERE LOWER(a.alias) LIKE '%amerian%'
       AND p.active_status = 'active'`
  );
  if (allAmerianAliases.length === 0) {
    console.log("   (ninguno)");
  } else {
    for (const a of allAmerianAliases) {
      console.log(`   [${a.language}] "${a.alias}" → place="${a.canonical_name}" (${a.place_id})`);
    }
  }
}

// ─── MAIN ───
async function main() {
  console.log("🔍 DIAGNÓSTICO DE CONFIABILIDAD — RESOLVER DE LUGARES");
  console.log(`   Iteraciones: ${ITERATIONS}`);
  console.log(`   Inputs: ${INPUTS.join(", ")}`);

  await testDeterminism();
  await explainFalseMatches();

  console.log("\n" + "=".repeat(80));
  console.log("FIN DEL DIAGNÓSTICO");
  console.log("=".repeat(80));
}

main().catch(e => {
  console.error("Error en diagnóstico:", e);
  process.exit(1);
});
