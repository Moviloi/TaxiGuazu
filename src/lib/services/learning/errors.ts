import { insertF9ErrorLog } from "@/lib/db/domains/learning";

export async function logLearningError(component: string, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : String(error);
  const stack = error instanceof Error ? (error.stack ?? null) : null;
  try {
    await insertF9ErrorLog(component, message, stack);
  } catch (logError) {
    console.error(`[LEARNING_ERROR] Fallo al loggear error de ${component}:`, logError);
    console.error(`[LEARNING_ERROR] Error original:`, error);
  }
}
