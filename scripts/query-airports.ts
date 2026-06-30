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

// All airports with display_name, aliases, zones
const airports = await query(`
  SELECT p.place_id, p.canonical_name, p.display_name, p.official_name,
         p.google_maps_name, p.city, p.country, p.place_type,
         p.tourist_relevance_score, z.zone_name
  FROM places p LEFT JOIN zones z ON p.zone_id = z.zone_id
  WHERE p.place_type = 'airport' AND p.active_status = 'active'
  ORDER BY p.city
`);
console.log("\n=== AIRPORTS ===");
for (const a of airports) {
  console.log(`${a.place_id}`);
  console.log(`  canonical: ${a.canonical_name}`);
  console.log(`  display:   ${a.display_name}`);
  console.log(`  official:  ${a.official_name}`);
  console.log(`  gmaps:     ${a.google_maps_name}`);
  console.log(`  city: ${a.city}, ${a.country}`);
  console.log(`  type: ${a.place_type}, score: ${a.tourist_relevance_score}`);
  console.log(`  zone: ${a.zone_name}`);
  console.log();
}

// Aliases for airports
const aliases = await query(`
  SELECT a.place_id, a.alias
  FROM aliases a JOIN places p ON p.place_id = a.place_id
  WHERE p.place_type = 'airport' AND p.active_status = 'active'
`);
console.log("=== AIRPORT ALIASES ===");
for (const a of aliases) {
  console.log(`${a.place_id}: "${a.alias}"`);
}

// Places matching "aeropuerto" 
const aeropuerto = await query(`
  SELECT p.canonical_name, p.display_name, p.city, p.country, p.place_type
  FROM places p
  WHERE (p.canonical_name LIKE '%aeropuerto%' OR p.display_name LIKE '%aeropuerto%')
    AND p.active_status = 'active'
  ORDER BY p.canonical_name
`);
console.log("\n=== PLACES '%aeropuerto%' ===");
for (const p of aeropuerto) {
  console.log(`${p.canonical_name} | display="${p.display_name}" | ${p.city}, ${p.country} | ${p.place_type}`);
}

db.close();
