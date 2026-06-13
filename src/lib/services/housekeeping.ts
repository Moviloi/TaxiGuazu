import { getDbv } from "@/lib/db/core/connection";
import { logLearningError } from "./learning/errors";

async function logCleanup(job: string, rowsDeleted: number, duration: number): Promise<void> {
  await getDbv().execute({
    sql: `INSERT INTO housekeeping_log (job, rows_deleted, duration_ms) VALUES (?, ?, ?)`,
    args: [job, rowsDeleted, duration],
  });
}

export async function runHousekeeping(): Promise<void> {
  const db = getDbv();
  const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;

  for (const { sql, job } of [
    { sql: "DELETE FROM system_metrics WHERE recorded_at < ?", job: "system_metrics" },
    { sql: "DELETE FROM simulations WHERE timestamp < ?", job: "simulations" },
    { sql: "DELETE FROM f9_events WHERE timestamp < ?", job: "f9_events" },
    { sql: "DELETE FROM f9_error_log WHERE created_at < ?", job: "f9_error_log" },
    { sql: "DELETE FROM f9_drift_log WHERE timestamp < ?", job: "f9_drift_log" },
    { sql: "DELETE FROM policy_results WHERE timestamp < ?", job: "policy_results" },
    { sql: "DELETE FROM conversation_f4_log WHERE timestamp < ?", job: "conversation_f4_log" },
  ]) {
    const start = Date.now();
    try {
      const rs = await db.execute({ sql, args: [cutoff] });
      const rowsDeleted = Number(rs.rowsAffected ?? 0);
      const duration = Date.now() - start;

      if (rowsDeleted > 0) {
        await logCleanup(job, rowsDeleted, duration);
      }
    } catch (e) {
      const duration = Date.now() - start;
      await logLearningError(`housekeeping:${job}`, e);
      await logCleanup(job, 0, duration);
    }
  }
}
