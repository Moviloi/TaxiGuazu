import { getExpiredGroupTimeouts, closeWorkflow, getWorkflow } from "./state-machine";
import { notifyTitular, notifyGroup } from "../services/admin.service";
import { getActiveTripByPhone } from "../db/database";

const TIMEOUT_GROUP_MS = 8 * 60 * 1000;

let intervalId: ReturnType<typeof setInterval> | null = null;

export function startTimeoutWorker(): void {
  if (intervalId) return;
  console.log("[TIMEOUT] Worker iniciado (cada 30s)");
  intervalId = setInterval(checkTimeouts, 30000);
}

export function stopTimeoutWorker(): void {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

export async function checkTimeouts(): Promise<void> {
  const expired = getExpiredGroupTimeouts(TIMEOUT_GROUP_MS);

  for (const ctx of expired) {
    console.log(`[TIMEOUT] Grupo expiró para conv ${ctx.conversationId}`);

    const trip = await getActiveTripByPhone(ctx.phone);
    const destino = trip?.destination || "sin destino";

    await notifyTitular(`⚠️ *Nadie respondió en el grupo*

Cliente: ${ctx.phone}
Destino: ${destino}

El viaje quedó sin asignar.`);

    await notifyGroup(`⏰ *Viaje expiró*

Nadie tomó el servicio a ${destino}.
Se notificó al administrador.`);

    closeWorkflow(ctx.conversationId);
  }
}

export function getWorkerStatus(): { running: boolean } {
  return { running: intervalId !== null };
}