import {
  getExpiredGroupTimeouts,
  getExpiredByState,
  advanceToGroup,
  advanceToBackup,
  closeWorkflow,
} from "./state-machine";
import {
  getActiveTripByPhone,
  getClientPreferredDriver,
  getDriverByPhone,
  getDriverExpiry,
} from "../db/database";
import { notifyAdmin, broadcastTripToDrivers, offerToSpecificDriver } from "../services/admin.service";
import { sendPendingSurveys } from "../services/survey.service";

const TIMEOUT_PREFERRED_MS = 3 * 60 * 1000;
const TIMEOUT_BACKUP_MS = 3 * 60 * 1000;
const TIMEOUT_GROUP_MS = 8 * 60 * 1000;

export async function checkTimeouts(): Promise<void> {
  await sendPendingSurveys();

  // Stage 1: Preferred driver timed out → offer to backup or broadcast
  const preferredExpired = await getExpiredByState("waiting_preferred", TIMEOUT_PREFERRED_MS);
  for (const ctx of preferredExpired) {
    console.log(`[TIMEOUT] Preferido expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    if (!trip) continue;

    const pref = await getClientPreferredDriver(ctx.phone);
    if (pref && pref.backup_driver_phone) {
      const backupDriver = await getDriverByPhone(pref.backup_driver_phone);
      if (backupDriver && backupDriver.active) {
        const expiry = await getDriverExpiry(pref.backup_driver_phone);
        if (expiry.active) {
          await advanceToBackup(ctx.conversationId, ctx.phone);
          const prefDriver = await getDriverByPhone(pref.preferred_driver_phone);
          const prefName = prefDriver?.name || "otro chofer";
          await offerToSpecificDriver(
            backupDriver.phone, trip, ctx.conversationId,
            `🔄 *RESERVA — CHOFER SUPLENTE*`,
            `Pax de ${prefName} no respondió. Tenés 3min para tomar el viaje.`
          );
          console.log(`[PRIORITY] Preferido timeout → backup ${backupDriver.name} (${ctx.conversationId})`);
          continue;
        }
      }
    }

    // No backup → broadcast
    await advanceToGroup(ctx.conversationId, ctx.phone);
    await broadcastTripToDrivers(trip, ctx.conversationId, ctx.phone);
    console.log(`[PRIORITY] Preferido timeout → broadcast (${ctx.conversationId})`);
  }

  // Stage 2: Backup driver timed out → broadcast
  const backupExpired = await getExpiredByState("waiting_backup", TIMEOUT_BACKUP_MS);
  for (const ctx of backupExpired) {
    console.log(`[TIMEOUT] Backup expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    if (!trip) continue;

    await advanceToGroup(ctx.conversationId, ctx.phone);
    await broadcastTripToDrivers(trip, ctx.conversationId, ctx.phone);
    console.log(`[PRIORITY] Backup timeout → broadcast (${ctx.conversationId})`);
  }

  // Stage 3: Group (broadcast) timed out → notify admin
  const groupExpired = await getExpiredGroupTimeouts(TIMEOUT_GROUP_MS);
  for (const ctx of groupExpired) {
    console.log(`[TIMEOUT] Grupo expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    const destino = trip?.destination || "sin destino";

    await notifyAdmin(`⚠️ *Viaje sin asignar*

Cliente: ${ctx.phone}
Destino: ${destino}

Ningún chofer tomó el servicio. Reasigná manualmente.`);

    await closeWorkflow(ctx.conversationId);
  }
}
