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

// 1. Specific places
const ids = [
  "ar_victoriaaguirre_airbnb",
  "py_asuncion_area",
  "br_rafain_convention",
  "py_tekotopa_attraction",
  "ar_igr_airport",
  "br_igu_airport",
  "py_agt_airport",
  "ar_centro_iguazu_area",
  "br_centro_foz_area",
  "py_centro_cde_area",
];
for (const id of ids) {
  const r = await db.execute({
    sql: `SELECT p.place_id, p.canonical_name, p.display_name, p.zone_id, p.city, p.country, p.place_type, p.active_status
          FROM places p WHERE p.place_id = ?`,
    args: [id],
  });
  if (r.rows.length === 0) { console.log(`${id}: NOT FOUND`); continue; }
  const p = r.rows[0];
  console.log(`${p.place_id}`);
  console.log(`   canonical: ${p.canonical_name}`);
  console.log(`   display:   "${p.display_name}"`);
  console.log(`   zone_id:   ${p.zone_id}`);
  console.log(`   city:      ${p.city}, ${p.country}`);
  console.log(`   type:      ${p.place_type} | active: ${p.active_status}`);
  console.log();
}

// 2. Aliases for airports
console.log("=== AIRPORT ALIASES ===");
for (const id of ["ar_igr_airport", "br_igu_airport", "py_agt_airport"]) {
  const r = await db.execute({
    sql: "SELECT alias FROM aliases WHERE place_id = ?",
    args: [id],
  });
  const aliases = r.rows.map((a: any) => a.alias);
  console.log(`${id}: ${aliases.join(", ")}`);
}

// 3. Zones list
console.log("\n=== ZONES ===");
const zones = await db.execute({ sql: "SELECT zone_id, zone_name, country, region FROM zones ORDER BY zone_id" });
for (const z of zones.rows) {
  console.log(`${(z as any).zone_id} | ${(z as any).zone_name} | ${(z as any).country} | ${(z as any).region}`);
}

db.close();
