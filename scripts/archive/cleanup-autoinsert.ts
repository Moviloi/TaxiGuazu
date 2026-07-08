/**
 * Limpia alias auto-insertados por el diagnóstico.
 * Solo para la DB local data/bot.db.
 * Uso: npx tsx scripts/cleanup-autoinsert.ts
 */
import { getDb, ensureSchema } from "../src/lib/db/core/connection";

async function main() {
  await ensureSchema();
  const db = getDb();

  // Alias corrupto: "jl hotel" fue auto-insertado por resolveAlias durante
  // el diagnóstico, apuntando incorrectamente a O2 Hotel Iguazú.
  const find = await db.execute({ sql: "SELECT id, place_id, alias FROM aliases WHERE alias = ?", args: ["jl hotel"] });
  if (find.rows.length > 0) {
    const row = find.rows[0] as any;
    console.log(`Encontrado: ID=${row.id}, alias="${row.alias}" → place_id=${row.place_id}`);
    console.log("Este alias fue auto-insertado por resolveAlias() con Levenshtein ≤ 3.");
    console.log("No pertenece al seed original. Eliminando...");
    
    await db.execute({ sql: "DELETE FROM aliases WHERE id = ?", args: [row.id] });
    
    const verify = await db.execute({ sql: "SELECT COUNT(*) as c FROM aliases WHERE alias = ?", args: ["jl hotel"] });
    console.log(`Eliminado. Quedan ${verify.rows[0].c} alias con texto 'jl hotel'.`);
  } else {
    console.log("No se encontró alias corrupto 'jl hotel'. DB limpia.");
  }

  // Verificar count total
  const total = await db.execute({ sql: "SELECT COUNT(*) as c FROM aliases" });
  console.log(`Total aliases en DB: ${total.rows[0].c} (seed define 250)`);

  // Verificar que no haya diferencias
  const diff = (total.rows[0].c as number) - 250;
  if (diff === 0) {
    console.log("✅ DB alineada con seed: 250 alias exactos.");
  } else if (diff > 0) {
    console.log(`⚠️  Aún hay ${diff} alias extraños.`);
    // Listarlos
    const es = await db.execute({ sql: "SELECT id, alias FROM aliases ORDER BY id" });
    const allIds = (es.rows as any[]).map(r => r.id);
    const expectedMaxId = 250; // seed inserts 250 aliases
    const extras = allIds.filter(id => id > expectedMaxId);
    if (extras.length > 0) {
      for (const id of extras) {
        const extra = await db.execute({ sql: "SELECT alias, place_id FROM aliases WHERE id = ?", args: [id] });
        console.log(`  ID=${id}: "${extra.rows[0].alias}"`);
      }
    }
  }
}

main().catch(e => { console.error(e); process.exit(1); });
