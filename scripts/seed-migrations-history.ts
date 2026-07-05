// seed-migrations-history.ts — DEBT-12 Fase C2: One-time seed of 13 historical migrations
// Usage: npx tsx scripts/seed-migrations-history.ts
//
// Registra en _migrations las 13 migraciones históricas que ya están aplicadas
// en Turso real pero no tienen reflejo versionado en db/migrations/.
// Ejecutar UNA SOLA VEZ por entorno (local o producción) para que el migration
// runner no intente re-aplicar migraciones que ya existen.
//
// Los timestamps (applied_at) son los valores EXACTOS de la tabla _migrations
// en Turso real, obtenidos el 2026-07-05 via PRAGMA table_info + SELECT.

import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";

// ── Constants ──────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");
const LOCAL_DB_PATH = path.join(ROOT, "data", "bot.db");

// Exactas de Turso real — obtenidas 2026-07-05
const HISTORICAL_MIGRATIONS: Array<{ name: string; appliedAt: number }> = [
  { name: "workflows_recreate",              appliedAt: 1779444777 },
  { name: "tariffs_piso_low_defaults",        appliedAt: 1779444777 },
  { name: "tariffs_garantizado_defaults",     appliedAt: 1779444777 },
  { name: "rename_is_titular_to_is_principal", appliedAt: 1779447429 },
  { name: "chat_sessions_workflow_state",     appliedAt: 1779778511 },
  { name: "drivers_shift_any_to_null",        appliedAt: 1779800072 },
  { name: "drivers_payment_method",           appliedAt: 1779864717 },
  { name: "trips_assignment_source",          appliedAt: 1780390959 },
  { name: "trips_driver_commitment_available", appliedAt: 1780390959 },
  { name: "trips_trip_phase_v3",              appliedAt: 1780563497 },
  { name: "trips_phase_backfill_v3",          appliedAt: 1780563497 },
  { name: "zones_operativas_v1",              appliedAt: 1781724760 },
  { name: "tariffs_fk_backfill_v1",           appliedAt: 1781725503 },
];

// ── DB connection ──────────────────────────────────────────────────
// Default: local file. Pass --production to target Turso (requires TURSO env vars).

function getClient(): ReturnType<typeof createClient> {
  const args = process.argv.slice(2);
  const isProduction = args.includes("--production");

  if (isProduction) {
    const tursoUrl = process.env.TURSO_DATABASE_URL;
    const tursoToken = process.env.TURSO_DATABASE_TOKEN;
    if (!tursoUrl || !tursoToken) {
      console.error("\n  FATAL: --production requires TURSO_DATABASE_URL and TURSO_DATABASE_TOKEN in .env\n");
      process.exit(1);
    }
    return createClient({ url: tursoUrl, authToken: tursoToken });
  }

  // Local SQLite (default)
  const dir = path.dirname(LOCAL_DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return createClient({ url: "file:" + LOCAL_DB_PATH });
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("\n  ⚙  Seed Migration History — DEBT-12 Fase C2\n");

  const db = getClient();

  try {
    // Ensure _migrations table exists
    await db.execute(`
      CREATE TABLE IF NOT EXISTS _migrations (
        name TEXT PRIMARY KEY,
        applied_at INTEGER NOT NULL
      )
    `);

    // Check if already seeded
    const countResult = await db.execute("SELECT COUNT(*) as cnt FROM _migrations");
    const currentCount = Number(countResult.rows[0].cnt);

    if (currentCount > 0) {
      console.log(`  _migrations already has ${currentCount} entries — nothing to do.`);
      console.log("  This environment is already seeded (or has real migrations applied).\n");
      return;
    }

    // Seed historical migrations
    let inserted = 0;
    for (const m of HISTORICAL_MIGRATIONS) {
      try {
        await db.execute({
          sql: "INSERT INTO _migrations (name, applied_at) VALUES (?, ?)",
          args: [m.name, m.appliedAt],
        });
        inserted++;
        console.log(`  ✓ ${m.name}`);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ~ ${m.name} (SKIPPED — ${msg})`);
      }
    }

    console.log(`\n  Done: ${inserted} historical migrations registered in _migrations.`);
    console.log("  Run 'npm run migrate' to apply any pending future migrations.\n");
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  console.error("\n  FATAL:", err instanceof Error ? err.message : String(err), "\n");
  process.exit(1);
});
