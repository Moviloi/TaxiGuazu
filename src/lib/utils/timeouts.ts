import { getExpiredGroupTimeouts, closeWorkflow } from "./state-machine";
import { notifyTitular } from "../services/admin.service";
import { getActiveTripByPhone } from "../db/database";

const TIMEOUT_GROUP_MS = 8 * 60 * 1000;

export async function checkTimeouts(): Promise<void> {
  const expired = await getExpiredGroupTimeouts(TIMEOUT_GROUP_MS);

  for (const ctx of expired) {
    console.log(`[TIMEOUT] Grupo expiró para conv ${ctx.conversationId}`);

    const trip = await getActiveTripByPhone(ctx.phone);
    const destino = trip?.destination || "sin destino";

    await notifyTitular(`⚠️ *Viaje sin asignar*

Cliente: ${ctx.phone}
Destino: ${destino}

Ningún chofer tomó el servicio. Reasigná manualmente.`);

    await closeWorkflow(ctx.conversationId);
  }
}

export function getWorkerStatus(): { running: boolean } {
  return { running: false };
}
