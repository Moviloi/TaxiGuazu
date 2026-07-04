// Check if trip_events exists in the real Turso DB
import { createClient } from "@libsql/client";
import "dotenv/config";

async function main() {
  const url = process.env.TURSO_DATABASE_URL;
  const token = process.env.TURSO_DATABASE_TOKEN;
  if (!url || !token) { console.error("FATAL: TURSO env vars required"); process.exit(1); }
  const turso = createClient({ url, authToken: token });

  const r = await turso.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='trip_events'");
  console.log("trip_events exists:", r.rows.length > 0);
  if (r.rows.length > 0) {
    const cols = await turso.execute('PRAGMA table_info("trip_events")');
    console.log("columns:", cols.rows.map((c: any) => c.name).join(", "));
  }

  await turso.close();
}
main().catch(console.error);
