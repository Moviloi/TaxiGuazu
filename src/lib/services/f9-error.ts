import { getDbInstance } from "@/lib/db/database";

export async function logF9Error(component: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  try {
    await getDbInstance().execute({
      sql: "INSERT INTO f9_error_log (component, error, stack, created_at) VALUES (?, ?, ?, unixepoch())",
      args: [component, message, stack],
    });
  } catch (logError) {
    console.error(`[F9_ERROR] Fallo al loggear error de ${component}:`, logError);
    console.error(`[F9_ERROR] Error original:`, error);
  }
}
