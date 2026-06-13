// ADMIN SERVICE — frozen. ARCHITECTURE NOTE: Módulo congelado.
// No modificar. Gestiona notificaciones a administradores, asignación de viajes
// y comunicación con choferes. Cualquier cambio requiere aprobación de arquitectura.

import { sendWhatsAppMessage } from "@/lib/whatsapp/sender";
import { getAvailableDrivers } from "@/lib/db/database";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

export const ADMIN_PHONE: string = (() => {
  try { return getEnv().ADMIN_PHONE; } catch { return "+5493757613215"; }
})();

export async function notifyAdmin(message: string): Promise<void> {
  const phone = ADMIN_PHONE.replace(/\D/g, "");
  await sendWhatsAppMessage(phone, message);
}

export async function notifyOtherDriversTaken(excludePhone: string, destination: string): Promise<void> {
  const drivers = await getAvailableDrivers();
  await Promise.all(drivers
    .filter(d => d.phone !== excludePhone)
    .map(d => sendWhatsAppMessage(d.phone, `⏰ El viaje a ${destination} ya fue tomado por otro chofer.`)
      .catch(e => log.error(`[NOTIFY] Failed to notify driver:`, e))
    )
  );
}


