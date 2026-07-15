import { createClient } from "@libsql/client";
import type { InValue } from "@libsql/client";
import path from "path";
import fs from "fs";
import { DB_PATH } from "@/config/constants";

type LibSqlClient = ReturnType<typeof createClient>;

export type DbExecutor = {
  execute(stmt: { sql: string; args?: InValue[] }): Promise<{ lastInsertRowid?: number | bigint; rowsAffected?: number }>;
};

let dbClient: LibSqlClient | null = null;
let schemaReady: Promise<void> | null = null;

function getUrl(): string {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) return tursoUrl;
  const fallback = process.env.VERCEL ? "/tmp/bot.db" : DB_PATH;
  const dir = path.dirname(fallback);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return `file:${fallback}`;
}

export function getDb(): LibSqlClient {
  if (dbClient) return dbClient;
  dbClient = createClient({
    url: getUrl(),
    authToken: process.env.TURSO_DATABASE_TOKEN,
  });
  schemaReady = initSchema();
  return dbClient;
}

export async function ensureSchema(): Promise<void> {
  if (!schemaReady) {
    getDb();
    schemaReady = initSchema();
  }
  await schemaReady;
}

// ═══════════════════════════════════════════════════════════════════════════
// initSchema() — Carga schema/schema.sql (única fuente de verdad del DDL).
// ADR-007: schema.sql es la autoridad. Data migrations legacy se ejecutan
// después del DDL para compatibilidad con bases existentes.
// ═══════════════════════════════════════════════════════════════════════════

/** Divide SQL en statements individuales manejando bloques BEGIN/END (triggers). */
function splitSQLStatements(sql: string): string[] {
  const statements: string[] = [];
  let current = '';
  let beginCount = 0;
  const lines = sql.split('\n');

  for (const line of lines) {
    const trimmed = line.trim();

    // Saltar líneas de comentario sueltas
    if (trimmed.startsWith('--') && !current) {
      current += line + '\n';
      continue;
    }

    current += line + '\n';

    const upper = trimmed.toUpperCase();

    // Rastrear BEGIN/END anidados (para triggers con BEGIN...END)
    if (/\bBEGIN\b/.test(upper) && !trimmed.startsWith('--')) beginCount++;
    if (trimmed === 'END;' || trimmed === 'END') {
      beginCount--;
      // Siempre capturar el trigger completo al encontrar END;
      if (beginCount <= 0 && trimmed.endsWith(';')) {
        const stmt = current.trim();
        if (stmt && stmt !== ';') statements.push(stmt);
        current = '';
        beginCount = 0;
      }
      continue;
    }

    // Para statements fuera de bloques, separar por ;
    if (beginCount <= 0 && trimmed.endsWith(';')) {
      const stmt = current.trim();
      if (stmt && stmt !== ';') statements.push(stmt);
      current = '';
    }
  }

  // Capturar resto (último statement sin ;?
  const remaining = current.trim();
  if (remaining && !statements.includes(remaining)) {
    statements.push(remaining);
  }

  return statements;
}

async function initSchema(): Promise<void> {
  const db = getDb();

  // ── Leer y ejecutar schema.sql ──
  const schemaPath = path.resolve(process.cwd(), "schema/schema.sql");
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`[SCHEMA] schema.sql no encontrado en: ${schemaPath}. Verificar que schema/schema.sql existe en la raíz del proyecto.`);
  }
  const schemaSQL = fs.readFileSync(schemaPath, "utf-8");
  const statements = splitSQLStatements(schemaSQL);

  for (const stmt of statements) {
    try {
      await db.execute({ sql: stmt });
    } catch (e) {
      console.error(`[SCHEMA] Error executing: ${stmt.substring(0, 60)}...`, e);
      throw e;
    }
  }

  // NOTA: Los bloques ALTER TABLE legacy (FASE 5.2.5, GRAFO ZONAS, CATASTRO HOTELERO,
  // FASE 5.2.7) fueron eliminados en DEBT-12 Fase C3. Todas las columnas que
  // agregaban ya están cubiertas por los CREATE TABLE completos de initSchema()
  // desde la Fase C1. Ver ADR-006 Addendum: C3.

  // Data migration: populate new columns from legacy workflow_state
  try {
    await db.execute({
      sql: `UPDATE chat_sessions SET conversational_state = workflow_state
            WHERE workflow_state IN ('idle','collecting_slots','awaiting_confirmation')
              AND conversational_state IS NULL`,
    });
    await db.execute({
      sql: `UPDATE chat_sessions SET dispatch_state = workflow_state
            WHERE workflow_state IN ('nivel_1','nivel_2','nivel_3','waiting_driver','closed')
              AND dispatch_state IS NULL`,
    });
    await db.execute({
      sql: `UPDATE chat_sessions SET trip_state = 'opportunity'
            WHERE workflow_state = 'post_trip_opportunity'
              AND trip_state IS NULL`,
    });
  } catch { /* data migration best-effort */ }

  // NOTA: El bloque FASE 5.2.7 (RENAME f4_state→comprehension_state, DROP workflow_state,
  // confirmed_fields, source_message_ids, trip_status) fue eliminado en DEBT-12 Fase C3.
  // Todas esas columnas ya están en su estado final en los CREATE TABLE de initSchema()
  // desde la Fase C1. Las referencias de código a trip_status fueron eliminadas posteriormente.
  // Ver ADR-006 Addendum: C3.

  // FASE 6: Migrar alias_lookup → aliases, eliminar tabla legacy
  // → alias_lookup ya NO se crea en DDL. Solo DBs existentes lo tienen.
  try {
    const legacyAliases = await db.execute({
      sql: `SELECT l.alias, l.canonical_name FROM alias_lookup l
            WHERE l.active = 1
              AND EXISTS (SELECT 1 FROM places p WHERE p.canonical_name = l.canonical_name)`,
    });
    if (legacyAliases.rows && legacyAliases.rows.length > 0) {
      for (const row of legacyAliases.rows as unknown as Array<{ alias: string; canonical_name: string }>) {
        const placeLookup = await db.execute({
          sql: "SELECT place_id FROM places WHERE canonical_name = ? LIMIT 1",
          args: [row.canonical_name],
        });
        if (placeLookup.rows && placeLookup.rows.length > 0) {
          const placeId = (placeLookup.rows[0] as unknown as { place_id: string }).place_id;
          const exists = await db.execute({
            sql: "SELECT id FROM aliases WHERE place_id = ? AND alias = ? AND language = 'es'",
            args: [placeId, row.alias],
          });
          if (!exists.rows || exists.rows.length === 0) {
            await db.execute({
              sql: "INSERT INTO aliases (place_id, alias, language) VALUES (?, ?, 'es')",
              args: [placeId, row.alias],
            });
          }
        }
      }
    }
  } catch { /* best-effort migration */ }

  // Dropear vista y tabla legacy
  const aliasCleanup: string[] = [
    "DROP VIEW IF EXISTS location_aliases",
    "DROP TABLE IF EXISTS alias_lookup",
  ];
  for (const sql of aliasCleanup) {
    try { await db.execute({ sql }); } catch { /* may not exist */ }
  }
}


