// F7: SYSTEM LOAD & ROUTING — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Evaluar carga del sistema y ruteo de decisiones.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: Deshabilitar F9 perdería limpieza de tablas. F7→F8→F9 solo se
//   desbloquea cuando Conversation Core + Pricing + Geo estén congelados.

import type { SystemLoad } from "./f7-types";
import { getDbInstance } from "@/lib/db/database";

export async function getSystemLoad(): Promise<SystemLoad> {
  const driversRs = await getDbInstance().execute(
    "SELECT COUNT(*) as c FROM drivers WHERE status = 'active'",
  );
  const operatorsRs = await getDbInstance().execute(
    "SELECT COUNT(*) as c FROM conversations WHERE mode = 'HUMAN' AND taken_by_human = 1",
  );
  const queueRs = await getDbInstance().execute(
    "SELECT COUNT(*) as c FROM conversations WHERE mode = 'AI' AND taken_by_human = 0 AND last_message_at > ?",
    [Math.floor(Date.now() / 1000) - 3600],
  );

  const driversAvailable = Number((driversRs.rows[0] as any)?.c ?? 0);
  const operatorsAvailable = Number((operatorsRs.rows[0] as any)?.c ?? 0);
  const queueLength = Number((queueRs.rows[0] as any)?.c ?? 0);

  const hour = new Date().getHours();
  const peakTime = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);

  return { driversAvailable, operatorsAvailable, peakTime, queueLength };
}

export function getAdjustedLoad(load: SystemLoad): {
  highLoad: boolean;
  lowLoad: boolean;
  active: boolean;
} {
  const highLoad = load.driversAvailable < 3 || load.queueLength > 5 || (load.peakTime && load.driversAvailable < 5);
  const lowLoad = load.driversAvailable > 10 && load.queueLength === 0 && !load.peakTime;
  return { highLoad, lowLoad, active: highLoad || lowLoad };
}
