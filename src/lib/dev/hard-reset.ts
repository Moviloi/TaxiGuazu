/**
 * hard-reset.ts — Development Command: Hard Conversation Reset (.limpiar)
 *
 * IMPORTANTE:
 * - NO es funcionalidad del producto.
 * - Es una herramienta exclusiva de desarrollo para reiniciar completamente
 *   el estado conversacional y poder repetir escenarios de prueba.
 * - No debe pasar por CORE, CI, CO, SD, Policies, Response Builder ni LLM.
 * - La detección y early return se manejan en lead.service.ts.
 * - Este módulo solo ejecuta la limpieza de estado.
 *
 * Contrato:
 *   Después de hardReset(phone), el próximo mensaje de ese número debe ser
 *   tratado exactamente igual que el primer mensaje de un cliente nuevo.
 */

import { getDb, getConversationByPhone, deleteConnectionKey } from "@/lib/db/database";
import { resetToIdle } from "@/lib/services/dispatch/dispatch-workflow";
import { log } from "@/lib/utils/logger";

// ── Constantes ──

const CONTINGENCY_KEY_PREFIXES = [
  "contingency_dual_",
  "contingency_pending_B_",
  "contingency_data_",
  "contingency_offered_",
];

// ── Tipos ──

interface HardResetResult {
  conversationDeleted: boolean;
  messagesDeleted: boolean;
  chatSessionDeleted: boolean;
  dispatchReset: boolean;
  leadsDeleted: boolean;
  customerNameCleared: boolean;
  contingencyLocksCleared: number;
}

// ── Hard Reset ──

export async function hardReset(phone: string): Promise<HardResetResult> {
  const result: HardResetResult = {
    conversationDeleted: false,
    messagesDeleted: false,
    chatSessionDeleted: false,
    dispatchReset: false,
    leadsDeleted: false,
    customerNameCleared: false,
    contingencyLocksCleared: 0,
  };

  const conv = await getConversationByPhone(phone);

  if (conv) {
    const convId = conv.id;

    // 1. Delete all messages for this conversation
    await getDb().execute({
      sql: "DELETE FROM messages WHERE conversation_id = ?",
      args: [convId],
    });
    result.messagesDeleted = true;

    // 2. Reset dispatch workflow to idle
    await resetToIdle(convId);
    result.dispatchReset = true;

    // 3. Delete chat_sessions row
    await getDb().execute({
      sql: "DELETE FROM chat_sessions WHERE phone = ?",
      args: [phone],
    });
    result.chatSessionDeleted = true;

    // 4. Reset conversation to pristine state
    //    - mode → AI (not human)
    //    - release from human operator
    //    - unlink any trip
    //    - reset trip_status to default
    //    - clear customer name
    //    - update last_message_at to now (so 48h inactivity check doesn't trigger)
    await getDb().execute({
      sql: `UPDATE conversations SET
        mode = 'AI',
        taken_by_human = 0,
        human_operator_phone = NULL,
        trip_id = NULL,
        trip_status = 'consulta',
        name = NULL,
        last_message_at = unixepoch()
        WHERE id = ?`,
      args: [convId],
    });
    result.conversationDeleted = true; // semantically "reset"

    // 5. Delete leads for this conversation
    await getDb().execute({
      sql: "DELETE FROM leads WHERE conv_id = ?",
      args: [convId],
    });
    result.leadsDeleted = true;

    // 6. Delete opportunity_log entries for this conversation
    await getDb().execute({
      sql: "DELETE FROM opportunity_log WHERE conversation_id = ?",
      args: [convId],
    });

    // 7. Delete events for this conversation
    await getDb().execute({
      sql: "DELETE FROM conversation_events WHERE session_id = ?",
      args: [String(convId)],
    });
  } else {
    // No conversation exists, but there might be orphan chat_sessions
    await getDb().execute({
      sql: "DELETE FROM chat_sessions WHERE phone = ?",
      args: [phone],
    });
    result.chatSessionDeleted = true;
  }

  // 8. Always: delete customer_name from connection_state
  await deleteConnectionKey(`customer_name_${phone}`).catch(() => {});
  result.customerNameCleared = true;

  // 9. Always: delete contingency locks from connection_state
  for (const prefix of CONTINGENCY_KEY_PREFIXES) {
    // We can't do LIKE delete directly, so fetch matching keys and delete them
    try {
      const rows = await getDb().execute({
        sql: "SELECT key FROM connection_state WHERE key LIKE ?",
        args: [`${prefix}%`],
      });

      if (rows.rows && rows.rows.length > 0) {
        for (const row of rows.rows) {
          const key = row.key as string;
          await deleteConnectionKey(key).catch(() => {});
          result.contingencyLocksCleared++;
        }
      }
    } catch {
      // Ignore errors during cleanup — best effort
    }
  }

  // 10. Also clear any customer_name with different prefix patterns
  await deleteConnectionKey(`name_${phone}`).catch(() => {});

  log.info("[HARD_RESET]", {
    phone: phone.slice(-4),
    ...result,
  });

  return result;
}
