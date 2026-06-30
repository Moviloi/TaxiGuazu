import { createClient } from "@libsql/client";
import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const envPath = join(__dirname, "..", ".env");
const envContent = readFileSync(envPath, "utf-8");
const env: Record<string, string> = {};
for (const line of envContent.split("\n")) {
  const t = line.trim();
  if (!t || t.startsWith("#")) continue;
  const eq = t.indexOf("=");
  if (eq > 0) env[t.slice(0, eq)] = t.slice(eq + 1);
}

const db = createClient({
  url: env["TURSO_DATABASE_URL"]!,
  authToken: env["TURSO_DATABASE_TOKEN"]!,
});

async function query(sql: string, params: any[] = []) {
  const r = await db.execute({ sql, args: params });
  return r.rows;
}

// 1. Cities
const cities = await query("SELECT DISTINCT city, country FROM places WHERE active_status='active' ORDER BY city");
console.log("=== CITIES ===");
for (const c of cities) console.log(c.city, "-", c.country);

// 2. Place types
const types = await query("SELECT place_type, COUNT(*) as cnt FROM places WHERE active_status='active' GROUP BY place_type ORDER BY cnt DESC");
console.log("\n=== PLACE TYPES ===");
for (const t of types) console.log(t.place_type, ":", t.cnt);

// 3. Places matching "centro"
const centro = await query(
  `SELECT p.place_id, p.canonical_name, p.place_type, p.city, p.country, p.tourist_relevance_score, z.zone_name
   FROM places p LEFT JOIN zones z ON p.zone_id = z.zone_id
   WHERE (p.canonical_name LIKE ? OR EXISTS (SELECT 1 FROM aliases a WHERE a.place_id = p.place_id AND LOWER(a.alias) LIKE ?))
   AND p.active_status = 'active'
   ORDER BY p.canonical_name`,
  ["%centro%", "%centro%"]
);
console.log("\n=== PLACES: '%centro%' ===");
for (const p of centro) console.log(p.place_id, "|", p.canonical_name, "|", p.place_type, "|", p.city, "|", p.country, "|", "score:", p.tourist_relevance_score);

// 4. Zones
const zones = await query("SELECT zone_id, zone_name, country, area_group, dispatch_priority FROM zones ORDER BY dispatch_priority");
console.log("\n=== ZONES ===");
for (const z of zones) console.log(z.zone_id, "|", z.zone_name, "|", z.country, "|", z.area_group, "|", "priority:", z.dispatch_priority);

db.close();
