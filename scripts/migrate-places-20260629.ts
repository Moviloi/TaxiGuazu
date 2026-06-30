// DB Migration: cleanup + rename + aliases
// Fase 1: Desactivar places irrelevantes
// Fase 2: canonical_name corto + display_name completo para aeropuertos
// Fase 3: Aliases faltantes

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
  console.log("=== FASE 1: Desactivar places irrelevantes ===");

  // py_asuncion_area — Asunción está a 300km, no es zona de triple frontera
  await db.execute({
    sql: "UPDATE places SET active_status = 'inactive' WHERE place_id = ?",
    args: ["py_asuncion_area"],
  });
  console.log("  ✅ py_asuncion_area → inactive (Asunción fuera del eje triple frontera)");

  // br_rafain_convention — Centro de Convenciones, no es destino de transporte
  await db.execute({
    sql: "UPDATE places SET active_status = 'inactive' WHERE place_id = ?",
    args: ["br_rafain_convention"],
  });
  console.log("  ✅ br_rafain_convention → inactive (event center, no destino transporte)");

  // py_tekotopa_attraction — Hernandarias, fuera del eje IGR/IGU/CDE
  await db.execute({
    sql: "UPDATE places SET active_status = 'inactive' WHERE place_id = ?",
    args: ["py_tekotopa_attraction"],
  });
  console.log("  ✅ py_tekotopa_attraction → inactive (Hernandarias, fuera del eje)");

  // ar_victoriaaguirre_airbnb — KEEP, ya tiene zone_id=CENTRO ✓

  console.log("\n=== FASE 2: Airport canonical/display ===");

  // IGR
  await db.execute({
    sql: "UPDATE places SET canonical_name = ?, display_name = ? WHERE place_id = ?",
    args: [
      "Aeropuerto IGR",
      "Aeropuerto Internacional Cataratas del Iguazú",
      "ar_igr_airport",
    ],
  });
  console.log("  ✅ IGR: canonical='Aeropuerto IGR'  display='Aeropuerto Internacional Cataratas del Iguazú'");

  // IGU
  await db.execute({
    sql: "UPDATE places SET canonical_name = ?, display_name = ? WHERE place_id = ?",
    args: [
      "Aeropuerto IGU",
      "Aeroporto Internacional de Foz do Iguaçu",
      "br_igu_airport",
    ],
  });
  console.log("  ✅ IGU: canonical='Aeropuerto IGU'  display='Aeroporto Internacional de Foz do Iguaçu'");

  // AGT
  await db.execute({
    sql: "UPDATE places SET canonical_name = ?, display_name = ? WHERE place_id = ?",
    args: [
      "Aeropuerto AGT",
      "Aeropuerto Internacional Guaraní",
      "py_agt_airport",
    ],
  });
  console.log("  ✅ AGT: canonical='Aeropuerto AGT'  display='Aeropuerto Internacional Guaraní'");

  console.log("\n=== FASE 3: Aliases ===");

  // AGT — no tiene ningún alias; necesita todos
  const agtAliases: Array<{ alias: string; lang: string }> = [
    { alias: "agt", lang: "es" },
    { alias: "AGT", lang: "en" },
    { alias: "aeropuerto agt", lang: "es" },
    { alias: "aeropuerto guarani", lang: "es" },
    { alias: "aeropuerto cde", lang: "es" },
    { alias: "guarani airport", lang: "en" },
    { alias: "cde airport", lang: "en" },
    { alias: "aeroporto guarani", lang: "pt" },
  ];
  for (const a of agtAliases) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO aliases (place_id, alias, language) VALUES (?, ?, ?)",
      args: ["py_agt_airport", a.alias, a.lang],
    });
  }
  console.log(`  ✅ AGT: ${agtAliases.length} aliases added`);

  // IGU — agregar versiones español para que matchee "aeropuerto"
  const iguAliases: Array<{ alias: string; lang: string }> = [
    { alias: "aeropuerto igu", lang: "es" },
    { alias: "aeropuerto de foz", lang: "es" },
    { alias: "aeropuerto foz", lang: "es" },
  ];
  for (const a of iguAliases) {
    await db.execute({
      sql: "INSERT OR IGNORE INTO aliases (place_id, alias, language) VALUES (?, ?, ?)",
      args: ["br_igu_airport", a.alias, a.lang],
    });
  }
  console.log(`  ✅ IGU: ${iguAliases.length} Spanish aliases added (now matches "aeropuerto")`);

  console.log("\n=== VERIFICACIÓN ===");
  for (const id of ["ar_victoriaaguirre_airbnb", "py_asuncion_area", "br_rafain_convention", "py_tekotopa_attraction", "ar_igr_airport", "br_igu_airport", "py_agt_airport"]) {
    const r = await db.execute({
      sql: "SELECT place_id, canonical_name, display_name, place_type, active_status FROM places WHERE place_id = ?",
      args: [id],
    });
    const p = r.rows[0] as any;
    if (p) console.log(`  ${p.place_id}: canonical="${p.canonical_name}"  display="${p.display_name}"  active=${p.active_status}`);
    else console.log(`  ${id}: NOT FOUND`);
  }

  console.log("\n=== AGT ALIASES ===");
  const agtAliasRows = await db.execute({ sql: "SELECT alias FROM aliases WHERE place_id = 'py_agt_airport'" });
  for (const a of agtAliasRows.rows) console.log(`  ${(a as any).alias}`);

  console.log("\n=== IGU SPANISH ALIASES ===");
  const iguAliasRows = await db.execute({ sql: "SELECT alias FROM aliases WHERE place_id = 'br_igu_airport' AND language = 'es'" });
  for (const a of iguAliasRows.rows) console.log(`  ${(a as any).alias}`);

  db.close();
}

run();
