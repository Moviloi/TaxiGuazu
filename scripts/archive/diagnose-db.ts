/**
 * Diagnóstico de la DB local — QUÉ places y alias existen realmente.
 * Uso: npx tsx scripts/diagnose-db.ts
 */
import { query } from "@/lib/db/core/helpers";

interface PlaceRow {
  place_id: string;
  canonical_name: string;
  display_name: string | null;
  city: string;
  country: string;
  place_type: string;
  tourist_relevance_score: number;
}

async function main() {
  console.log("=== TODOS LOS PLACES ===");
  const places = await query<PlaceRow>(
    `SELECT place_id, canonical_name, display_name, city, country, place_type, tourist_relevance_score
     FROM places WHERE active_status = 'active'
     ORDER BY place_type, tourist_relevance_score DESC`
  );
  console.log(`Total: ${places.length} places activos\n`);
  for (const p of places) {
    console.log(`[${p.place_type}] (score=${p.tourist_relevance_score}) ${p.canonical_name} | city=${p.city} country=${p.country}`);
    
    // Show aliases for this place
    const aliases = await query<{ alias: string; language: string }>(
      "SELECT alias, language FROM aliases WHERE place_id = ?", [p.place_id]
    );
    if (aliases.length > 0) {
      for (const a of aliases) {
        console.log(`    alias [${a.language}]: "${a.alias}"`);
      }
    }
  }

  console.log("\n=== PLACES CON 'hotel' EN SU NOMBRE ===");
  const hotels = await query<PlaceRow>(
    `SELECT place_id, canonical_name, display_name, city, country, place_type, tourist_relevance_score
     FROM places WHERE active_status = 'active' AND LOWER(canonical_name) LIKE '%hotel%'
     ORDER BY tourist_relevance_score DESC`
  );
  console.log(`Total: ${hotels.length}`);
  for (const h of hotels) {
    console.log(`  ${h.canonical_name} (${h.city}, ${h.place_type}) score=${h.tourist_relevance_score}`);
  }

  console.log("\n=== TODOS LOS ALIAS (primeros 50) ===");
  const allAliases = await query<{ alias: string; place_id: string; language: string }>(
    `SELECT a.alias, a.place_id, a.language
     FROM aliases a
     ORDER BY a.alias
     LIMIT 50`
  );
  for (const a of allAliases) {
    // Get place name
    const p = await query<{ canonical_name: string }>(
      "SELECT canonical_name FROM places WHERE place_id = ?", [a.place_id]
    );
    const name = p.length > 0 ? p[0].canonical_name : "???";
    console.log(`  "${a.alias}" [${a.language}] → ${name}`);
  }
  console.log(`  ... (total aliases: ${(await query<{c: number}>("SELECT COUNT(*) as c FROM aliases"))[0].c})`);
}

main().catch(e => { console.error(e); process.exit(1); });
