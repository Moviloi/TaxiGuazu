// run-migrations.ts — DEBT-12 Fase C2: Migration runner real
// Usage: npx tsx scripts/run-migrations.ts
//
// Aplica migraciones SQL versionadas desde db/migrations/
// Cada migración se ejecuta en su propia transacción.
// Una vez aplicada, se registra en _migrations y no se re-aplica.
//
// Para entornos con TURSO_DATABASE_URL, apunta a Turso (producción).
// Sin TURSO_DATABASE_URL, apunta a data/bot.db (desarrollo local).

import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";

// ── Constants ──────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");
const MIGRATIONS_DIR = path.join(ROOT, "db", "migrations");
const LOCAL_DB_PATH = path.join(ROOT, "data", "bot.db");

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

// ── Core ────────────────────────────────────────────────────────────

async function ensureMigrationsTable(db: ReturnType<typeof createClient>): Promise<void> {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS _migrations (
      name TEXT PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);
}

function readMigrationFiles(): string[] {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    return [];
  }
  const files = fs.readdirSync(MIGRATIONS_DIR).filter(
    (f) => f.endsWith(".sql") && !f.startsWith("."),
  );
  files.sort(); // alphabetical = numerical order
  return files;
}

async function getAppliedNames(db: ReturnType<typeof createClient>): Promise<Set<string>> {
  const result = await db.execute("SELECT name FROM _migrations");
  return new Set(result.rows.map((r) => String(r.name)));
}

async function main(): Promise<void> {
  console.log("\n  ⚙  Migration Runner — DEBT-12 Fase C2\n");

  // ── Validate migrations directory ─────────────────────────────
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    console.log("  db/migrations/ directory not found — nothing to do.\n");
    return;
  }

  const files = readMigrationFiles();
  if (files.length === 0) {
    console.log("  No migration files found in db/migrations/ — nothing to do.\n");
    return;
  }

  // ── Connect ───────────────────────────────────────────────────
  const db = getClient();

  try {
    await ensureMigrationsTable(db);
    const appliedNames = await getAppliedNames(db);

    // ── Process each migration ──────────────────────────────────
    let applied = 0;
    let skipped = 0;
    let failed = 0;

    for (const file of files) {
      const name = file.replace(/\.sql$/, "");
      const filePath = path.join(MIGRATIONS_DIR, file);
      const sql = fs.readFileSync(filePath, "utf-8").trim();

      if (!sql) {
        console.log(`  - ${name} (SKIPPED: empty file)`);
        skipped++;
        continue;
      }

      if (appliedNames.has(name)) {
        console.log(`  ✓ ${name} (already applied — skipped)`);
        skipped++;
        continue;
      }

      // Apply within a single transaction
      try {
        await db.execute("BEGIN TRANSACTION");
        await db.execute(sql);
        await db.execute({
          sql: "INSERT INTO _migrations (name, applied_at) VALUES (?, unixepoch())",
          args: [name],
        });
        await db.execute("COMMIT");
        console.log(`  ✓ ${name} (APPLIED)`);
        applied++;
      } catch (err: unknown) {
        await db.execute("ROLLBACK");
        const msg = err instanceof Error ? err.message : String(err);
        console.log(`  ✗ ${name} (FAILED)`);
        console.log(`    Error: ${msg}`);
        failed++;
        break; // Stop at first failure
      }
    }

    // ── Summary ──────────────────────────────────────────────────
    console.log("\n" + "-".repeat(60));
    console.log(`  Files: ${files.length}  |  Applied: ${applied}  |  Skipped: ${skipped}  |  Failed: ${failed}`);
    if (failed > 0) {
      console.log("  RESULT: ❌ STOPPED — fix the failing migration and re-run.");
      process.exit(1);
    }
    console.log("  RESULT: ✅ All migrations applied.\n");
  } finally {
    db.close();
  }
}

main().catch((err: unknown) => {
  console.error("\n  FATAL:", err instanceof Error ? err.message : String(err), "\n");
  process.exit(1);
});
