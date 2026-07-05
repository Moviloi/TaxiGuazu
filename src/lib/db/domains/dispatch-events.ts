// Dispatch events — audit log append-only para dispatch_events.
// Mismo patrón que trips.ts: infraestructura de BD, no contiene lógica de dominio.

import { getDb, ensureSchema } from "../core/connection";
import type { DispatchEventType, DispatchEventLevel } from "../types";

/**
 * insertDispatchEvent — escribe un evento en dispatch_events (append-only).
 *
 * Best-effort:
 * - El INSERT se ejecuta sobre getDb() (auto-commit separado del paso
 *   anterior del caller).
 * - Si el INSERT falla, el estado ya fue cambiado sin auditoría.
 * - No hay executor opcional. Si se necesita atomicidad en el futuro,
 *   refactorizar para aceptar DbExecutor.
 */
export async function insertDispatchEvent(
  tripId: string,
  eventType: DispatchEventType,
  level: DispatchEventLevel | null,
  actorPhone: string,
): Promise<void> {
  await ensureSchema();
  const db = getDb();
  await db.execute({
    sql: "INSERT INTO dispatch_events (trip_id, event_type, level, actor_phone, occurred_at) VALUES (?, ?, ?, ?, unixepoch())",
    args: [tripId, eventType, level, actorPhone],
  });
}
