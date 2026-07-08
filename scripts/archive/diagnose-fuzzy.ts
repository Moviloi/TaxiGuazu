/**
 * Diagnóstico del fuzzy match (Levenshtein ≤ 3) en resolveAlias.
 * PASO 2: ¿qué alias "hotel amerian" matchea y por qué?
 * Uso: npx tsx scripts/diagnose-fuzzy.ts
 */
import { resolveAlias } from "@/lib/db/database";
import { levenshtein } from "@/lib/db/core/helpers";
import { query } from "@/lib/db/core/helpers";

interface AliasRow { alias: string; canonical_name: string; place_id: string; }

async function main() {
  const INPUTS = [
    "hotel amerian",
    "hotel amerian iguazu",
    "amerian",
    "hotel meliá",
    "hotel melia",
    "jl hotel",
    "bourbon",
  ];

  // ─── PASO 2A: ¿Qué devuelve resolveAlias para cada input? ───
  console.log("=".repeat(80));
  console.log("PASO 2A — resolveAlias() con Levenshtein ≤ 3");
  console.log("=".repeat(80));

  for (const input of INPUTS) {
    // Ejecutar 10x para verificar determinismo
    const results: string[] = [];
    for (let i = 0; i < 10; i++) {
      const res = await resolveAlias(input);
      const sig = res.resolved ? `→ "${res.names.join(", ")}"` : `→ NOT_FOUND (keeps "${res.names.join(", ")}")`;
      results.push(sig);
    }
    const unique = new Set(results);
    console.log(`\n"${input}": ${unique.size === 1 ? "✅" : "⚠️"} ${unique.size} variante(s)`);
    console.log(`  ${results[0]}`);
  }

  // ─── PASO 2B: Distancia Levenshtein exacta ───
  console.log("\n" + "=".repeat(80));
  console.log("PASO 2B — Distancia Levenshtein entre inputs y alias sospechosos");
  console.log("=".repeat(80));

  // Cargar todos los alias
  const allAliases = await query<AliasRow>(
    `SELECT DISTINCT a.alias, p.canonical_name, a.place_id
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE p.active_status = 'active'`
  );

  const TARGETS = ["hotel amerian", "hotel amerian iguazu", "amerian"];
  for (const input of TARGETS) {
    console.log(`\n--- Input: "${input}" ---`);
    const distances = allAliases
      .map(row => ({
        alias: row.alias,
        place: row.canonical_name,
        distance: levenshtein(input.toLowerCase().trim(), row.alias.toLowerCase()),
      }))
      .filter(d => d.distance <= 5)  // mostrar ≤ 5 para contexto
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 10);

    if (distances.length === 0) {
      console.log("  (ningún alias con distancia ≤ 5)");
    } else {
      for (const d of distances) {
        const threshold = d.distance <= 3 ? "⚠️ MATCH (≤3)" : "OK (>3)";
        console.log(`  dist=${d.distance} ${threshold}: "${d.alias}" → ${d.place}`);
      }
    }
  }

  // ─── PASO 2C: Efecto colateral — auto-insert ───
  console.log("\n" + "=".repeat(80));
  console.log("PASO 2C — SIDE EFFECT: Auto-insert de alias");
  console.log("Cuando resolveAlias encuentra match por Levenshtein ≤ 3,");
  console.log("INSERTA el input como nuevo alias (permanente).");
  console.log("Esto significa que llamadas futuras harán EXACT MATCH");
  console.log("y el fuzzy match quedará oculto.");
  console.log("=".repeat(80));

  console.log("\nAlias existentes con 'amerian':");
  const amerianAliases = await query<AliasRow>(
    `SELECT a.alias, p.canonical_name, a.place_id
     FROM aliases a JOIN places p ON p.place_id = a.place_id
     WHERE a.alias LIKE '%amerian%' AND p.active_status = 'active'`
  );
  for (const a of amerianAliases) {
    console.log(`  "${a.alias}" → ${a.canonical_name} (${a.place_id})`);
  }
}

main().catch(e => { console.error(e); process.exit(1); });
