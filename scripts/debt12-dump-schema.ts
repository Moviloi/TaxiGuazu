/**
 * DEBT-12 Fase C1, Paso 1: Dump ALL 44 table schemas from Turso
 * Generates complete initSchema() DDL with CREATE TABLE IF NOT EXISTS
 * 
 * Output: Writes to scripts/dump-output.txt for inspection
 * Also prints summary to console
 */

import { createClient } from "@libsql/client";
import fs from "fs";

const db = createClient({
  url: process.env.TURSO_DATABASE_URL!,
  authToken: process.env.TURSO_DATABASE_TOKEN!,
});

async function main() {
  // Get all tables (excluding sqlite_ internal)
  const tables = await db.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  
  const tableNames = tables.rows.map(r => String(r.name));
  console.log(`Total tables: ${tableNames.length}`);
  console.log(`Table names: ${tableNames.join(", ")}`);
  console.log("");
  
  // Get all indices
  const indices = await db.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='index' AND sql IS NOT NULL AND name NOT LIKE 'sqlite_%' ORDER BY name"
  );
  
  // Get all triggers
  const triggers = await db.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='trigger' ORDER BY name"
  );
  
  // Get all views
  const views = await db.execute(
    "SELECT name, sql FROM sqlite_master WHERE type='view' ORDER BY name"
  );
  
  // For each table, also get detailed column info
  const outputLines: string[] = [];
  outputLines.push("// ════════════════════════════════════════════════════════════════");
  outputLines.push("// DEBT-12 Fase C1: initSchema() COMPLETO generado desde DB real");
  outputLines.push("// Generado: " + new Date().toISOString());
  outputLines.push("// Tablas: " + tableNames.length);
  outputLines.push("// ════════════════════════════════════════════════════════════════");
  outputLines.push("");
  
  for (const row of tables.rows) {
    const tableName = String(row.name);
    const createSql = String(row.sql || "");
    
    // Convert CREATE TABLE to IF NOT EXISTS
    let ddl = createSql.replace(/^CREATE\s+TABLE\s+(\S+)/i, 'CREATE TABLE IF NOT EXISTS $1');
    
    // Add the DDL
    outputLines.push(`    \`${ddl}\`,`);
    outputLines.push("");
  }
  
  // Add indices
  outputLines.push("    // ── INDICES ──");
  outputLines.push("");
  for (const row of indices.rows) {
    const sql = String(row.sql || "");
    let ddl = sql.replace(/^CREATE\s+(UNIQUE\s+)?INDEX\s+(\S+)/i, (match, unique, name) => {
      return `CREATE ${unique || ''}INDEX IF NOT EXISTS ${name}`;
    });
    outputLines.push(`    \`${ddl}\`,`);
    outputLines.push("");
  }
  
  // Add triggers
  outputLines.push("    // ── TRIGGERS ──");
  outputLines.push("");
  for (const row of triggers.rows) {
    const sql = String(row.sql || "");
    let ddl = sql.replace(/^CREATE\s+TRIGGER\s+(\S+)/i, 'CREATE TRIGGER IF NOT EXISTS $1');
    outputLines.push(`    \`${ddl}\`,`);
    outputLines.push("");
  }
  
  // Add views
  outputLines.push("    // ── VIEWS ──");
  outputLines.push("");
  for (const row of views.rows) {
    const sql = String(row.sql || "");
    let ddl = sql.replace(/^CREATE\s+VIEW\s+(\S+)/i, 'CREATE VIEW IF NOT EXISTS $1');
    outputLines.push(`    \`${ddl}\`,`);
    outputLines.push("");
  }
  
  // Write to file
  fs.writeFileSync("scripts/dump-output.txt", outputLines.join("\n"), "utf-8");
  console.log("Written to scripts/dump-output.txt");
  
  // Print summary of what changed from old initSchema()
  const oldTables = ["connection_state","conversations","messages","trips","drivers","driver_codes","client_preferred_drivers","package_prices","reservation_slots","tariffs","driver_discounts","leads","driver_invitations","alias_lookup","zones","places","aliases","promotions","provider_adjustments","packages","chat_sessions","processed_messages","opportunity_rules","opportunity_log","conversation_f4_log","conversation_events","learning_weights","f9_admin_commands","housekeeping_log","tours","waiting_rates","trip_groups","trip_legs"];
  const newTables = tableNames.filter(t => t !== "_migrations" && t !== "sqlite_sequence");
  
  const added = newTables.filter(t => !oldTables.includes(t));
  const removed = oldTables.filter(t => !newTables.includes(t));
  
  console.log("");
  console.log("═══ CAMBIOS vs initSchema() ANTERIOR ═══");
  console.log(`  Tablas que se AGREGAN (untracked): ${added.join(", ")}`);
  console.log(`  Tablas que se ELIMINAN (legacy): ${removed.join(", ")}`);
  console.log(`  Tablas que se ACTUALIZAN (con drift): trips, drivers, chat_sessions`);
  console.log(`  Total tablas anteriores: ${oldTables.length}`);
  console.log(`  Total tablas nuevas: ${newTables.length}`);
  console.log("");
  
  // Also output the summary
  console.log("═══ TABLE DETAIL ═══");
  for (const row of tables.rows) {
    const name = String(row.name);
    if (name.startsWith("sqlite_") || name === "_migrations") continue;
    
    const cols = await db.execute(`PRAGMA table_info("${name}")`);
    const fks = await db.execute(`PRAGMA foreign_key_list("${name}")`);
    
    console.log(`\n${name} (${cols.rows.length} cols, ${fks.rows.length} FK):`);
    for (const c of cols.rows) {
      const pk = c.pk ? " PK" : "";
      const nn = c.notnull ? " NOT NULL" : "";
      const dflt = c.dflt_value !== null ? ` DEFAULT ${c.dflt_value}` : "";
      console.log(`  ${String(c.name).padEnd(30)} ${String(c.type).padEnd(10)}${nn}${dflt}${pk}`);
    }
    for (const fk of fks.rows) {
      console.log(`  FK: ${String(fk.from)} → ${String(fk.table)}(${String(fk.to)})`);
    }
  }
  
  db.close();
}

main().catch(err => {
  console.error("FATAL:", err);
  process.exit(1);
});
