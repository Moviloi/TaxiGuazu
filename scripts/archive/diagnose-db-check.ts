/**
 * Verificación de seguridad: ¿qué alias existían antes y después del diagnóstico?
 * Uso: npx tsx scripts/diagnose-db-check.ts
 */
import { query } from "@/lib/db/core/helpers";

interface AliasRow { id: number; alias: string; place_id: string; language: string; canonical_name: string; }

async function main() {
  console.log("=== 1. ALIAS TOTALES ===");
  const total = await query<{ c: number }>("SELECT COUNT(*) as c FROM aliases");
  console.log(`Total aliases en DB: ${total[0].c}`);

  console.log("\n=== 2. ALIASES POR IDIOMA ===");
  const byLang = await query<{ language: string; c: number }>(
    "SELECT language, COUNT(*) as c FROM aliases GROUP BY language ORDER BY c DESC"
  );
  for (const r of byLang) console.log(`  ${r.language}: ${r.c}`);

  console.log("\n=== 3. ALIASES SOSPECHOSOS (posible auto-insert del test) ===");
  // El auto-insert siempre usa language='es'
  // Buscar alias de palabras individuales comunes que podrían haber sido insertados
  const suspicious = await query<AliasRow>(`
    SELECT a.id, a.alias, a.place_id, a.language, p.canonical_name
    FROM aliases a
    JOIN places p ON p.place_id = a.place_id
    WHERE a.language = 'es'
      AND (
        a.alias IN ('hotel amerian', 'amerian', 'hotel melia', 'hotel meliá', 
                     'hotel amerian iguazu', 'jl hotel', 'bourbon', 'hotel')
        OR a.alias LIKE '%hotel%'
      )
    ORDER BY a.id
  `);
  
  if (suspicious.length === 0) {
    console.log("  (ningún alias sospechoso encontrado)");
  } else {
    for (const a of suspicious) {
      console.log(`  ID=${a.id}: "${a.alias}" [${a.language}] → ${a.canonical_name} (${a.place_id})`);
    }
  }

  console.log("\n=== 4. TODOS LOS ALIAS 'es' QUE PODRÍAN SER AUTO-INSERT ===");
  const esAliases = await query<AliasRow>(`
    SELECT a.id, a.alias, a.place_id, p.canonical_name
    FROM aliases a
    JOIN places p ON p.place_id = a.place_id
    WHERE a.language = 'es'
    ORDER BY a.id
  `);
  console.log(`Total alias en español: ${esAliases.length}`);
  for (const a of esAliases) {
    console.log(`  ID=${a.id}: "${a.alias}" → ${a.canonical_name}`);
  }

  console.log("\n=== 5. COMPARACIÓN: alias en seed-data.ts (ESPAÑOL) ===");
  // El seed data define 250 aliases. Los alias en español son los que fueron seed.
  // Cualquier alias 'es' que NO esté en el seed es auto-insert.
  const seedEsAliases = [
    "amerian",
    "amerian portal",
    "gran melia",
    "gran meliá",
    "gran meliá iguazú",
    "hotel casinu akarai",
    "hotel melia",
    "hotel meliá",
    "melia",
    "meliá",
    // ... (many more)
  ];
  // En lugar de listarlos, mejor contar cuántos alias 'es' hay vs seed

  console.log("\n=== 6. LÍMITES DE SEGURIDAD ===");
  const seedCount = 250; // seed-data.ts dice 250
  const currentCount = total[0].c;
  const diff = currentCount - seedCount;
  console.log(`Seed definió: 250 alias`);
  console.log(`DB tiene:     ${currentCount} alias`);
  if (diff > 0) {
    console.log(`⚠️  DIFERENCIA: ${diff} alias no seed — posible auto-insert`);
  } else if (diff < 0) {
    console.log(`ℹ️  DB tiene ${Math.abs(diff)} menos que el seed (puede faltar ejecutar seed completo)`);
  } else {
    console.log(`✅ Coincide exactamente con el seed`);
  }

  console.log("\n=== 7. VERIFICACIÓN: alias 'jl hotel' (el más riesgoso del test) ===");
  const jl = await query<AliasRow>(`
    SELECT a.id, a.alias, a.place_id, a.language, p.canonical_name
    FROM aliases a
    JOIN places p ON p.place_id = a.place_id
    WHERE a.alias = 'jl hotel'
  `);
  if (jl.length === 0) {
    console.log("  ✅ NO existe 'jl hotel' como alias — el Levenshtein no gatilló auto-insert");
  } else {
    for (const a of jl) {
      console.log(`  ⚠️  EXISTE: "${a.alias}" [${a.language}] → ${a.canonical_name}`);
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
