// DB Migration: Set display_name = "canonical_name (País)" for ALL active places
// Formato: "Aeropuerto IGR (Argentina)", "Centro de Foz do Iguaçu (Brasil)", etc.
// ISO country codes: AR→Argentina, BR→Brasil, PY→Paraguay
//
// Run: npx tsx scripts/migrate-displaynames-20260630.ts

import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envContent = readFileSync(join(__dirname, "..", ".env"), "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1);
}

const db = createClient({ url: env["TURSO_DATABASE_URL"]!, authToken: env["TURSO_DATABASE_TOKEN"]! });

async function run() {
  console.log("=== Migración: display_name = canonical + (País) ===");

  // 1. Contar cuántos places activos hay por país
  const countResult = await db.execute({
    sql: `SELECT country, COUNT(*) as cnt FROM places 
          WHERE active_status = 'active' 
          GROUP BY country ORDER BY country`,
  });
  const totalActive = (countResult.rows as Array<{ country: string; cnt: number }>)
    .reduce((sum, r) => sum + r.cnt, 0);
  console.log(`  Places activos: ${totalActive}`);
  for (const r of countResult.rows as Array<{ country: string; cnt: number }>) {
    console.log(`    ${r.country}: ${r.cnt}`);
  }

  // 2. Mostrar ejemplos ANTES
  const before = await db.execute({
    sql: `SELECT place_id, canonical_name, display_name, country FROM places 
          WHERE active_status = 'active' 
          ORDER BY place_id LIMIT 5`,
  });
  console.log("\n  Ejemplos ANTES:");
  for (const r of before.rows as Array<{ place_id: string; canonical_name: string; display_name: string | null; country: string }>) {
    console.log(`    ${r.place_id}: canonical="${r.canonical_name}" display="${r.display_name ?? "null"}" country=${r.country}`);
  }

  // 3. Ejecutar UPDATE masivo
  console.log("\n  Ejecutando UPDATE...");
  const result = await db.execute({
    sql: `UPDATE places SET display_name = canonical_name || ' (' || 
      CASE country 
        WHEN 'AR' THEN 'Argentina' 
        WHEN 'BR' THEN 'Brasil' 
        WHEN 'PY' THEN 'Paraguay' 
        ELSE country 
      END || ')' 
    WHERE active_status = 'active'`,
  });
  console.log(`  ✅ ${result.rowsAffected} filas actualizadas`);

  // 4. Mostrar ejemplos DESPUÉS
  const after = await db.execute({
    sql: `SELECT place_id, canonical_name, display_name, country FROM places 
          WHERE active_status = 'active' 
          ORDER BY place_id LIMIT 10`,
  });
  console.log("\n  Ejemplos DESPUÉS:");
  for (const r of after.rows as Array<{ place_id: string; canonical_name: string; display_name: string; country: string }>) {
    console.log(`    ${r.place_id}: "${r.display_name}"`);
  }

  // 5. Verificar airports específicamente
  console.log("\n  Aeropuertos:");
  const airports = await db.execute({
    sql: `SELECT place_id, canonical_name, display_name FROM places 
          WHERE place_type = 'airport' AND active_status = 'active'`,
  });
  for (const r of airports.rows as Array<{ place_id: string; canonical_name: string; display_name: string }>) {
    console.log(`    ${r.place_id}: canonical="${r.canonical_name}" → display="${r.display_name}"`);
  }

  // 6. Verificar que el centro también tiene display_name
  console.log("\n  Centros urbanos:");
  const centers = await db.execute({
    sql: `SELECT place_id, canonical_name, display_name, country FROM places 
          WHERE (place_id LIKE '%centro%' OR place_id LIKE '%microcentro%') 
          AND active_status = 'active'`,
  });
  for (const r of centers.rows as Array<{ place_id: string; canonical_name: string; display_name: string; country: string }>) {
    console.log(`    ${r.place_id}: "${r.display_name}"`);
  }

  db.close();
  console.log("\n✅ Migración completa");
}

run();
