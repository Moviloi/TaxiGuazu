import { insertF9ErrorLog } from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

export async function logLearningError(component: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  try {
    await insertF9ErrorLog(component, message, stack);
  } catch (logError) {
    log.error(`[LEARNING_ERROR] Fallo al loggear error de ${component}:`, logError);
    log.error(`[LEARNING_ERROR] Error original:`, error);
  }
}
