/**
 * repository.ts — Pattern Repository (PDE-1 §4.2, §4.4)
 *
 * Implementa PatternRepository sobre la misma DB Turso/SQLite.
 * Tablas con prefijo pd_ para separación lógica de las tablas de Memory.
 *
 * R-DEP-3: repository.ts importa exclusivamente de types.ts y externos.
 * No importa de otros módulos de implementación.
 */

import type {
  PatternRepository,
  Watermark,
  Pattern,
  Candidate,
  PatternRun,
  Invariant,
} from './types';

// ── Tipo del executor de DB ──
interface DbExecutor {
  execute(stmt: { sql: string; args?: any[] }): Promise<{
    rows?: any[];
    lastInsertRowid?: number | bigint;
    rowsAffected?: number;
  }>;
}

// ── DDL de las tablas del Pattern Catalog ──
const CREATE_TABLES_SQL = [
  `CREATE TABLE IF NOT EXISTS pd_watermark (
    id INTEGER PRIMARY KEY CHECK(id = 1),
    last_stored_at TEXT,
    last_run_at TEXT,
    total_snapshots_processed INTEGER NOT NULL DEFAULT 0
  )`,
  `CREATE TABLE IF NOT EXISTS pd_patterns (
    id TEXT NOT NULL,
    version INTEGER NOT NULL,
    run_id TEXT NOT NULL,
    produced_at TEXT NOT NULL,
    dimension TEXT NOT NULL,
    confidence REAL NOT NULL,
    relation_json TEXT NOT NULL,
    evidence_json TEXT NOT NULL,
    acceptance_json TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'active',
    superseded_by TEXT,
    PRIMARY KEY (id, version)
  )`,
  `CREATE TABLE IF NOT EXISTS pd_runs (
    run_id TEXT PRIMARY KEY,
    triggered_at TEXT NOT NULL,
    started_at TEXT NOT NULL,
    completed_at TEXT,
    status TEXT NOT NULL DEFAULT 'running',
    watermark_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pd_candidates (
    id TEXT PRIMARY KEY,
    first_seen_at TEXT NOT NULL,
    last_seen_at TEXT NOT NULL,
    observation_count INTEGER NOT NULL DEFAULT 1,
    relation_json TEXT NOT NULL,
    dimension TEXT NOT NULL,
    best_confidence REAL NOT NULL,
    best_evidence_json TEXT NOT NULL
  )`,
  `CREATE TABLE IF NOT EXISTS pd_invariants (
    id TEXT PRIMARY KEY,
    description TEXT NOT NULL,
    source TEXT NOT NULL,
    rule_ref TEXT NOT NULL,
    pattern TEXT NOT NULL,
    active_since TEXT NOT NULL,
    active_until TEXT
  )`,
];

// ── SqlPatternRepository ──

export class SqlPatternRepository implements PatternRepository {
  private db: DbExecutor;
  private schemaEnsured: boolean = false;

  constructor(db: DbExecutor) {
    this.db = db;
  }

  /**
   * Asegura que las tablas del Pattern Catalog existen.
   * Se ejecuta en la primera operación que requiera la DB.
   */
  private async ensureSchema(): Promise<void> {
    if (this.schemaEnsured) return;

    for (const sql of CREATE_TABLES_SQL) {
      try {
        await this.db.execute({ sql, args: [] });
      } catch {
        // Si una tabla ya existe, continuar
      }
    }

    this.schemaEnsured = true;
  }

  // ── Serialización JSON para persistencia ──

  private serializePattern(p: Pattern): any {
    return {
      id: p.id,
      version: p.version,
      runId: p.runId,
      producedAt: p.producedAt,
      dimension: p.dimension,
      confidence: p.confidence,
      relation: p.relation,
      evidence: p.evidence,
      acceptance: p.acceptance,
      status: p.status,
      supersededBy: p.supersededBy,
    };
  }

  // ── Watermark ──

  async readWatermark(): Promise<Watermark> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT last_stored_at, last_run_at, total_snapshots_processed FROM pd_watermark WHERE id = 1`,
        args: [],
      });

      if (!result.rows || result.rows.length === 0) {
        return { lastStoredAt: null, lastRunAt: null, totalSnapshotsProcessed: 0 };
      }

      const row = result.rows[0] as {
        last_stored_at: string | null;
        last_run_at: string | null;
        total_snapshots_processed: number;
      };

      return {
        lastStoredAt: row.last_stored_at,
        lastRunAt: row.last_run_at,
        totalSnapshotsProcessed: row.total_snapshots_processed,
      };
    } catch {
      return { lastStoredAt: null, lastRunAt: null, totalSnapshotsProcessed: 0 };
    }
  }

  async writeWatermark(w: Watermark): Promise<void> {
    await this.ensureSchema();

    try {
      await this.db.execute({
        sql: `INSERT INTO pd_watermark (id, last_stored_at, last_run_at, total_snapshots_processed)
              VALUES (1, ?, ?, ?)
              ON CONFLICT(id) DO UPDATE SET
                last_stored_at = excluded.last_stored_at,
                last_run_at = excluded.last_run_at,
                total_snapshots_processed = excluded.total_snapshots_processed`,
        args: [w.lastStoredAt, w.lastRunAt, w.totalSnapshotsProcessed],
      });
    } catch {
      // Best-effort
    }
  }

  // ── Patterns ──

  async readActivePatterns(): Promise<Pattern[]> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM pd_patterns WHERE status = 'active' ORDER BY produced_at DESC`,
        args: [],
      });

      if (!result.rows) return [];
      return result.rows.map(r => JSON.parse((r as any).acceptance_json));
    } catch {
      return [];
    }
  }

  async readPatternHistory(id: string): Promise<Pattern[]> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM pd_patterns WHERE id = ? ORDER BY version ASC`,
        args: [id],
      });

      if (!result.rows) return [];
      return result.rows.map(r => JSON.parse((r as any).acceptance_json));
    } catch {
      return [];
    }
  }

  async writePatterns(patterns: Pattern[]): Promise<void> {
    await this.ensureSchema();

    for (const p of patterns) {
      try {
        const serialized = this.serializePattern(p);
        await this.db.execute({
          sql: `INSERT OR REPLACE INTO pd_patterns
                (id, version, run_id, produced_at, dimension, confidence,
                 relation_json, evidence_json, acceptance_json, status, superseded_by)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            p.id,
            p.version,
            p.runId,
            p.producedAt,
            p.dimension,
            p.confidence,
            JSON.stringify(p.relation),
            JSON.stringify(p.evidence),
            JSON.stringify(serialized),
            p.status,
            p.supersededBy ?? null,
          ],
        });
      } catch {
        // Best-effort por pattern
      }
    }
  }

  async deprecatePatterns(ids: string[]): Promise<void> {
    await this.ensureSchema();

    for (const id of ids) {
      try {
        await this.db.execute({
          sql: `UPDATE pd_patterns SET status = 'deprecated' WHERE id = ? AND status = 'active'`,
          args: [id],
        });
      } catch {
        // Best-effort
      }
    }
  }

  async supersedePattern(supersededId: string, successor: Pattern): Promise<void> {
    await this.ensureSchema();

    try {
      // Marcar el anterior como superseded
      await this.db.execute({
        sql: `UPDATE pd_patterns SET status = 'superseded', superseded_by = ?
              WHERE id = ? AND status = 'active'`,
        args: [`${successor.id}@${successor.version}`, supersededId],
      });

      // Insertar el nuevo
      await this.writePatterns([successor]);
    } catch {
      // Best-effort
    }
  }

  // ── Candidates ──

  async readCandidates(): Promise<Candidate[]> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM pd_candidates ORDER BY best_confidence DESC`,
        args: [],
      });

      if (!result.rows) return [];

      return result.rows.map(r => {
        const row = r as any;
        return {
          id: row.id,
          firstSeenAt: row.first_seen_at,
          lastSeenAt: row.last_seen_at,
          observationCount: row.observation_count,
          relation: JSON.parse(row.relation_json),
          dimension: row.dimension,
          bestConfidence: row.best_confidence,
          bestEvidence: JSON.parse(row.best_evidence_json),
        } as Candidate;
      });
    } catch {
      return [];
    }
  }

  async writeCandidates(candidates: Candidate[]): Promise<void> {
    await this.ensureSchema();

    for (const c of candidates) {
      try {
        await this.db.execute({
          sql: `INSERT OR REPLACE INTO pd_candidates
                (id, first_seen_at, last_seen_at, observation_count,
                 relation_json, dimension, best_confidence, best_evidence_json)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [
            c.id,
            c.firstSeenAt,
            c.lastSeenAt,
            c.observationCount,
            JSON.stringify(c.relation),
            c.dimension,
            c.bestConfidence,
            JSON.stringify(c.bestEvidence),
          ],
        });
      } catch {
        // Best-effort
      }
    }
  }

  async promoteCandidate(id: string): Promise<void> {
    try {
      await this.db.execute({
        sql: `DELETE FROM pd_candidates WHERE id = ?`,
        args: [id],
      });
    } catch {
      // Best-effort
    }
  }

  // ── Runs ──

  async writeRun(run: PatternRun): Promise<void> {
    await this.ensureSchema();

    try {
      await this.db.execute({
        sql: `INSERT OR REPLACE INTO pd_runs
              (run_id, triggered_at, started_at, completed_at, status,
               watermark_json, metrics_json)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [
          run.runId,
          run.triggeredAt,
          run.startedAt,
          run.completedAt,
          run.status,
          JSON.stringify(run.watermark),
          JSON.stringify(run.metrics),
        ],
      });
    } catch {
      // Best-effort
    }
  }

  async readLastRun(): Promise<PatternRun | null> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM pd_runs ORDER BY started_at DESC LIMIT 1`,
        args: [],
      });

      if (!result.rows || result.rows.length === 0) return null;

      const row = result.rows[0] as any;
      return {
        runId: row.run_id,
        triggeredAt: row.triggered_at,
        startedAt: row.started_at,
        completedAt: row.completed_at ?? '',
        status: row.status,
        watermark: JSON.parse(row.watermark_json),
        metrics: JSON.parse(row.metrics_json),
        patterns: { accepted: [], candidates: [], deprecated: [] },
      } as PatternRun;
    } catch {
      return null;
    }
  }

  // ── Invariants ──

  async readInvariants(): Promise<Invariant[]> {
    await this.ensureSchema();

    try {
      const result = await this.db.execute({
        sql: `SELECT * FROM pd_invariants`,
        args: [],
      });

      if (!result.rows) return [];

      return result.rows.map(r => {
        const row = r as any;
        return {
          id: row.id,
          description: row.description,
          source: row.source,
          ruleRef: row.rule_ref,
          pattern: row.pattern,
          activeSince: row.active_since,
        } as Invariant;
      });
    } catch {
      return [];
    }
  }
}
