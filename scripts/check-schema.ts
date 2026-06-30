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
  // Schema
  const schema = await db.execute({ sql: "SELECT sql FROM sqlite_master WHERE name = 'places'" });
  console.log("=== PLACES SCHEMA ===");
  console.log(schema.rows[0]?.sql);
  
  const aliasSchema = await db.execute({ sql: "SELECT sql FROM sqlite_master WHERE name = 'aliases'" });
  console.log("\n=== ALIASES SCHEMA ===");
  console.log(aliasSchema.rows[0]?.sql);

  const zoneSchema = await db.execute({ sql: "SELECT sql FROM sqlite_master WHERE name = 'zones'" });
  console.log("\n=== ZONES SCHEMA ===");
  console.log(zoneSchema.rows[0]?.sql);

  // Zones
  console.log("\n=== ZONES ===");
  const zones = await db.execute({ sql: "PRAGMA table_info(zones)" });
  for (const c of zones.rows) console.log(c);

  console.log("\n=== ZONES DATA ===");
  const zData = await db.execute({ sql: "SELECT * FROM zones ORDER BY zone_id" });
  for (const z of zData.rows) console.log(`${z.zone_id} | ${z.zone_name} | ${z.country}`);

  db.close();
}

run();
