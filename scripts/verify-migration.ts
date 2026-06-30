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

async function main() {
  // AGT canonical
  const agt = await db.execute({ sql: "SELECT place_id, canonical_name, display_name, active_status FROM places WHERE place_id = ?", args: ["py_agt_airport"] });
  console.log("AGT:", JSON.stringify(agt.rows[0]));

  // AGT aliases
  const aliases = await db.execute({ sql: "SELECT alias FROM aliases WHERE place_id = ?", args: ["py_agt_airport"] });
  console.log("AGT aliases:", aliases.rows.map((r: any) => r.alias).join(", "));

  // All active airports
  const airports = await db.execute({ sql: "SELECT place_id, canonical_name, display_name, place_type FROM places WHERE place_type = 'airport' AND active_status = 'active'" });
  console.log("\nAll active airports:");
  for (const a of airports.rows) console.log(`  ${(a as any).place_id}: canonical="${(a as any).canonical_name}"  display="${(a as any).display_name}"`);

  db.close();
}

main();
