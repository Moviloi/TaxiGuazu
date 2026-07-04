// validate-schema-parity.ts — ADR-006 Schema parity validation
// Usage: npx tsx scripts/validate-schema-parity.ts
// Compares initSchema() DDL in connection.ts against the real Turso schema.
// Fails with a clear report if any drift is detected.
//
// Requires: TURSO_DATABASE_URL and TURSO_DATABASE_TOKEN in .env

import { createClient } from "@libsql/client";
import * as fs from "node:fs";
import * as path from "node:path";
import "dotenv/config";

// ── Types ──────────────────────────────────────────────────────────

interface ValidationResult {
  table: string;
  status: "OK" | "FAIL" | "SKIP";
  details: string[];
}

interface TableSchema {
  columns: string[];
  ddlSource: string; // first 80 chars of DDL for identification
}

// ── Helpers ────────────────────────────────────────────────────────

const ROOT = path.resolve(import.meta.dirname, "..");

/** Extract all CREATE TABLE DDL statements from initSchema() in connection.ts */
function extractInitSchemaDDL(): Map<string, TableSchema> {
  const connPath = path.join(ROOT, "src", "lib", "db", "core", "connection.ts");
  const src = fs.readFileSync(connPath, "utf-8");

  // Find the initSchema function body
  const fnStart = src.indexOf("async function initSchema");
  if (fnStart === -1) throw new Error("initSchema() not found in connection.ts");

  const fnBlock = src.substring(fnStart);

  // Match: initSchema() { ... db.batch([`...`, `...`, ...]); ... }
  const batchMatch = fnBlock.match(
    /async function initSchema\s*\(\)\s*:\s*Promise<void>\s*\{[\s\S]*?await\s+db\.batch\(\[([\s\S]*?)\]\);/,
  );
  if (!batchMatch) throw new Error("Could not match db.batch([ ... ]); in initSchema()");

  const batchContent = batchMatch[1];

  // Extract each backtick-delimited SQL string
  const sqlStatements: string[] = [];
  const sqlRegex = /`([\s\S]*?)`/g;
  let m;
  while ((m = sqlRegex.exec(batchContent)) !== null) {
    sqlStatements.push(m[1]);
  }

  if (sqlStatements.length === 0) {
    throw new Error("No backtick SQL strings found in db.batch([]) — parser mismatch");
  }

  // Parse CREATE TABLE statements
  const tables = new Map<string, TableSchema>();

  for (const sql of sqlStatements) {
    const trimmed = sql.trim();
    if (!trimmed.toUpperCase().startsWith("CREATE TABLE")) continue;

    // Extract table name
    const nameMatch = trimmed.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(\w+)/i);
    if (!nameMatch) continue;
    const tableName = nameMatch[1].toLowerCase();

    // Extract column names line by line
    const columns = parseColumns(trimmed);
    tables.set(tableName, {
      columns,
      ddlSource: trimmed.substring(0, 80).replace(/\n/g, " "),
    });
  }

  const createTableCount = tables.size;
  const nonCreateCount = sqlStatements.length - createTableCount;
  if (nonCreateCount > 0) {
    console.log(`  (${nonCreateCount} non-CREATE SQL statements skipped — triggers, etc.)`);
  }

  return tables;
}

/** Parse column names from a CREATE TABLE statement by reading lines */
function parseColumns(sql: string): string[] {
  const lines = sql.split("\n");
  const cols: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Skip the CREATE TABLE header, closing paren, and constraints
    if (/^CREATE\s+TABLE/i.test(trimmed)) continue;
    if (trimmed === ")" || trimmed === ");") continue;
    if (/^(FOREIGN KEY|PRIMARY KEY|UNIQUE|CHECK|CONSTRAINT)\b/i.test(trimmed)) continue;

    // Clean trailing comma
    const clean = trimmed.replace(/,$/, "");

    // Must be "column_name TYPE ..."
    const parts = clean.split(/\s+/);
    if (parts.length < 2) continue;

    const colName = parts[0];
    if (
      /^[a-z_][a-z0-9_]*$/i.test(colName) &&
      !/^(CREATE|TABLE|IF|NOT|EXISTS|CONSTRAINT|FOREIGN|PRIMARY|UNIQUE|CHECK|REFERENCES)$/i.test(colName)
    ) {
      cols.push(colName);
    }
  }

  return cols;
}

// ── Report ─────────────────────────────────────────────────────────

function printReport(results: ValidationResult[]): boolean {
  let allPassed = true;
  let okCount = 0;
  let failCount = 0;
  let skipCount = 0;

  console.log("\n" + "=".repeat(70));
  console.log("  SCHEMA PARITY VALIDATION REPORT  (ADR-006)");
  console.log("=".repeat(70) + "\n");

  for (const result of results) {
    if (result.status === "OK") {
      okCount++;
      console.log(`  ✓ ${result.table}`);
      for (const d of result.details) console.log(`    ${d}`);
    } else if (result.status === "FAIL") {
      failCount++;
      allPassed = false;
      console.log(`  ✗ ${result.table}`);
      for (const d of result.details) console.log(`    ${d}`);
    } else {
      skipCount++;
      console.log(`  - ${result.table} (SKIPPED: ${result.details.join("; ")})`);
    }
  }

  console.log("\n" + "-".repeat(70));
  console.log(`  Tables: ${results.length}  |  OK: ${okCount}  |  FAIL: ${failCount}  |  SKIP: ${skipCount}`);

  if (allPassed) {
    console.log("  RESULT: ✅ PARITY CONFIRMED — initSchema() matches Turso schema");
  } else {
    console.log("  RESULT: ❌ DRIFT DETECTED — review errors above");
    console.log("  ADR-006 requires fixing DDL in initSchema() before deploying.");
  }
  console.log("=".repeat(70) + "\n");

  return allPassed;
}

// ── Main ───────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.log("  Loading initSchema() DDL from connection.ts ...");

  let ddlTables: Map<string, TableSchema>;
  try {
    ddlTables = extractInitSchemaDDL();
    console.log(`  Found ${ddlTables.size} tables in initSchema()`);
  } catch (e: any) {
    console.error(`\nFATAL: Cannot parse initSchema() — ${e.message}`);
    process.exit(1);
  }

  // Connect to Turso
  const dbUrl = process.env.TURSO_DATABASE_URL;
  const dbToken = process.env.TURSO_DATABASE_TOKEN;

  if (!dbUrl || !dbToken) {
    console.error("\nFATAL: TURSO_DATABASE_URL and TURSO_DATABASE_TOKEN required in .env");
    process.exit(1);
  }

  const turso = createClient({ url: dbUrl, authToken: dbToken });
  const results: ValidationResult[] = [];

  try {
    // Get all user tables from Turso (exclude _migrations and sqlite_*)
    const tablesResult = await turso.execute(
      "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name != '_migrations' ORDER BY name",
    );
    const dbTableNames = tablesResult.rows.map((r) => String(r.name).toLowerCase());

    // ── Check 1: Table existence parity ──────────────────────────────
    const onlyInDB = dbTableNames.filter((t) => !ddlTables.has(t));
    const onlyInDDL = [...ddlTables.keys()].filter((t) => !dbTableNames.includes(t));

    for (const tableName of onlyInDB) {
      const colResult = await turso.execute(`PRAGMA table_info("${tableName}")`);
      const dbCols = colResult.rows.map((r) => String(r.name));
      results.push({
        table: tableName,
        status: "FAIL",
        details: [
          `  Tabla existe en DB pero NO en initSchema()`,
          `  Columnas en DB (${dbCols.length}): ${dbCols.join(", ")}`,
          `  → Agregar CREATE TABLE IF NOT EXISTS a initSchema()`,
        ],
      });
    }

    for (const tableName of onlyInDDL) {
      results.push({
        table: tableName,
        status: "FAIL",
        details: [`Tabla existe en initSchema() pero NO en DB real — posible tabla legacy o typo`],
      });
    }

    // ── Check 2: Column parity for tables that exist in both ────────
    const commonTables = dbTableNames.filter((t) => ddlTables.has(t));

    for (const tableName of commonTables) {
      const colResult = await turso.execute(`PRAGMA table_info("${tableName}")`);
      const dbCols = colResult.rows.map((r) => String(r.name));
      const ddlCols = ddlTables.get(tableName)!.columns;

      const extraInDB = dbCols.filter((c) => !ddlCols.includes(c));
      const extraInDDL = ddlCols.filter((c) => !dbCols.includes(c));

      if (extraInDB.length === 0 && extraInDDL.length === 0) {
        results.push({
          table: tableName,
          status: "OK",
          details: [`${dbCols.length} columns — parity OK`],
        });
      } else {
        const diffLines: string[] = [];
        if (extraInDB.length > 0) {
          diffLines.push(`  En DB no en DDL: ${extraInDB.join(", ")}`);
          diffLines.push(`  → Agregar columnas faltantes al CREATE TABLE en initSchema()`);
        }
        if (extraInDDL.length > 0) {
          diffLines.push(`  En DDL no en DB: ${extraInDDL.join(", ")}`);
          diffLines.push(`  → Remover columnas fantasma del DDL o migrar la DB`);
        }
        results.push({
          table: tableName,
          status: "FAIL",
          details: diffLines,
        });
      }
    }

    // ── Check 3: _migrations orphan warning ─────────────────────────
    const migrationsResult = await turso.execute(
      "SELECT COUNT(*) as cnt FROM sqlite_master WHERE type='table' AND name='_migrations'",
    );
    if (migrationsResult.rows.length > 0 && Number(migrationsResult.rows[0].cnt) > 0) {
      const countResult = await turso.execute("SELECT COUNT(*) as cnt FROM _migrations");
      const migrationCount = Number(countResult.rows[0].cnt);
      if (migrationCount > 0) {
        // This is informational only, not a FAIL
        console.log(`\n  ℹ  _migrations table exists with ${migrationCount} entries (historical — not checked)`);
      }
    }
  } catch (e: any) {
    console.error(`\nFATAL: Turso query error — ${e.message}`);
    await turso.close();
    process.exit(1);
  }

  await turso.close();

  // Print report and exit
  const allPassed = printReport(results);
  process.exit(allPassed ? 0 : 1);
}

main();
