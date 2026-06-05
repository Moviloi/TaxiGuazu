import { getDbInstance } from "@/lib/db/database";
import { logF9Error } from "./f9-error";

const TABLES: { name: string; dateColumn: string }[] = [
  { name: "system_metrics", dateColumn: "recorded_at" },
  { name: "simulations", dateColumn: "timestamp" },
  { name: "f9_events", dateColumn: "timestamp" },
  { name: "f9_error_log", dateColumn: "created_at" },
  { name: "f9_drift_log", dateColumn: "timestamp" },
  { name: "policy_results", dateColumn: "timestamp" },
  { name: "conversation_f4_log", dateColumn: "recorded_at" },
];

export async function runHousekeeping(): Promise<void> {
  const db = getDbInstance();
  const cutoff = Math.floor(Date.now() / 1000) - 30 * 86400;

  for (const { name, dateColumn } of TABLES) {
    const start = Date.now();
    try {
      const rs = await db.execute({
        sql: `DELETE FROM ${name} WHERE ${dateColumn} < ?`,
        args: [cutoff],
      });
      const rowsDeleted = Number(rs.rowsAffected ?? 0);
      const duration = Date.now() - start;

      if (rowsDeleted > 0) {
        await db.execute({
          sql: `INSERT INTO housekeeping_log (job, rows_deleted, duration_ms) VALUES (?, ?, ?)`,
          args: [name, rowsDeleted, duration],
        });
      }
    } catch (e) {
      const duration = Date.now() - start;
      await logF9Error(`housekeeping:${name}`, e);
      await db.execute({
        sql: `INSERT INTO housekeeping_log (job, rows_deleted, duration_ms) VALUES (?, ?, ?)`,
        args: [name, 0, duration],
      });
    }
  }
}
