import {
  getActiveTripByPhone,
  getClientPreferredDriver,
  insertMessage,
  createTrip,
  setConversationTrip,
  updateTripTariff,
  getConnectionValueFlag,
  setConnectionValue,
  setConnectionFlag,
  deleteConnectionKey,
  getDriverByPhone,
  logDebug,
} from "@/lib/db/database";
import { generateGroqExtraction } from "@/lib/ai/groq";
import { calculateSlotConfidence } from "@/lib/services/confidence";
import { matchTariff } from "@/lib/services/tariff-matcher";
import { advanceToWaitingDriver, getWorkflow } from "@/lib/utils/conversation-workflow";
import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import {
  broadcastTripToDrivers,
  notifyAdmin,
  notifyOtherDriversTaken,
} from "./admin.service";
import {
  assignWorkflowAtomic,
  assignDriverToTrip,
  incrementOfferAccepted,
  updateTripAssignmentSource,
  updateTripDriverAvailable,
  updateTripDriverCommitment,
} from "@/lib/db/database";
import { TITULAR_DELAY_MS, STALE_CANDIDATE_CLEANUP_MS } from "@/config/constants";
import type { TripRow } from "@/lib/db/types";

const AHORA_URGENCY_RE = /\b(ahora|ya mismo|urgente|inmediato|en este momento|estoy en el aeropuerto|acabamos? de llegar|llegamos ahora|reci[eé]n llegamos?|estamos en el aeropuerto)\b/i;

export function isAhoraUrgency(text: string): boolean {
  return AHORA_URGENCY_RE.test(text.toLowerCase());
}

function isAffirmativeMessage(text: string): boolean {
  const t = text.toLowerCase().trim();
  const primary = /^(s[ií]|s[ií] confirmo|ok|okey|dale|confirmo|confirmado|de acuerdo|est[aá] bien|perfecto|mandale|adelante|s[ií] dale|s[ií] gracias)\b/i;
  if (primary.test(t)) return true;
  return /\b(ok\b|dale\b|confirmo\b|adelante\b|acepto\b|de acuerdo\b|viajamos\b|bueno\b.*\bdale\b)/.test(t.replace(/[!¡?¿.,]/g, ""));
}

export async function handleAhoraMessage(
  phone: string,
  text: string,
  convId: number,
  customerName: string | null,
): Promise<void> {
  await logDebug("ahora", "05_ahora_handler_enter", JSON.stringify({ phone, text: text.substring(0, 100), convId }));

  const existingTrip = await getActiveTripByPhone(phone);

  if (existingTrip && existingTrip.status === "consulta") {
    const workflow = await getWorkflow(convId);
    if (workflow && workflow.state === "waiting_driver") {
      if (isAffirmativeMessage(text)) {
        await resolveDisponiblesAndAssign(convId, phone, existingTrip);
        return;
      }
    }
    await logDebug("ahora", "06_exit_existing_trip_consulta", JSON.stringify({ convId }));
    return;
  }

  const history: any[] = [];
  await logDebug("ahora", "07_calling_groq_extraction");
  const raw = await generateGroqExtraction(text, history, customerName || undefined);
  await logDebug("ahora", "08_groq_extraction_returned", JSON.stringify({ raw }));

  if (!raw) {
    await logDebug("ahora", "09_exit_raw_null");
    return;
  }

  const { TripExtractionSchema } = await import("@/lib/ai/extraction-schema");
  const parsed = TripExtractionSchema.safeParse(raw);
  await logDebug("ahora", "10_safe_parse_result", JSON.stringify({ success: parsed.success, data: parsed.success ? parsed.data : (parsed.error as any)?.issues }));

  if (!parsed.success) {
    await logDebug("ahora", "11_exit_parse_failed");
    return;
  }

  await logDebug("ahora", "12_calling_calculate_slot_confidence");
  const confidenceResult = await calculateSlotConfidence(parsed.data, text);
  await logDebug("ahora", "13_confidence_returned", JSON.stringify({ action: confidenceResult.action, overall: confidenceResult.overall_confidence, slots: confidenceResult.slots }));

  if (confidenceResult.action === "fallback_regex") {
    await logDebug("ahora", "14_exit_action_fallback_regex", JSON.stringify({ extraction: parsed.data, confidence: confidenceResult }));
    await sendWhatsAppMessage(phone, "😅 No entendí bien el destino. Podés decirme \"desde [origen] hasta [destino]\"? Ej: \"desde el aeropuerto hasta el centro\".");
    return;
  }

  const origin = parsed.data.origin || "";
  const destination = parsed.data.destination || "";
  const pax = parsed.data.passengers || 1;
  await logDebug("ahora", "15_post_confidence", JSON.stringify({ origin, destination, pax }));

  if (!origin || !destination) {
    await logDebug("ahora", "16_exit_missing_origin_or_destination", JSON.stringify({ origin, destination, extraction: parsed.data }));
    return;
  }

  await logDebug("ahora", "17_calling_match_tariff", JSON.stringify({ origin, destination, pax }));
  const tariffMatch = await matchTariff(origin, destination, pax);
  const price = tariffMatch.matched ? tariffMatch.price : 0;
  const tripId = `trip_${Date.now()}`;
  await logDebug("ahora", "18_tariff_matched", JSON.stringify({ matched: tariffMatch.matched, price, method: tariffMatch.method, canonicalOrigin: tariffMatch.canonicalOrigin, canonicalDestination: tariffMatch.canonicalDestination }));

  await logDebug("ahora", "19_before_create_trip", JSON.stringify({ tripId, origin, destination, price, pax }));
  await createTrip(tripId, phone, origin, destination, price, pax, undefined, undefined);
  await logDebug("ahora", "20_after_create_trip", JSON.stringify({ tripId }));
  await setConversationTrip(convId, tripId);

  if (tariffMatch.matched) {
    await updateTripTariff(tripId, tariffMatch.tariffId, tariffMatch.piso);
  }

  await advanceToWaitingDriver(convId, phone);
  await setConnectionFlag(`ahora_caliente_${convId}`);

  const trip = await getActiveTripByPhone(phone);
  if (!trip) {
    await logDebug("ahora", "21_exit_trip_not_found_after_create");
    return;
  }

  const priceMsg = `🚕 Viaje de *${origin}* a *${destination}*\nTarifa: $${price.toLocaleString("es-AR")} ARS (hasta ${pax > 4 ? "6" : "4"} pasajeros)\n\n¿Confirmás?`;

  await logDebug("ahora", "22_before_send_whatsapp", JSON.stringify({ phone, priceMsg: priceMsg.substring(0, 200) }));
  await sendWhatsAppMessage(phone, priceMsg);
  await logDebug("ahora", "23_after_send_whatsapp");

  await insertMessage(convId, "assistant", priceMsg);

  await sendDisponibleToTitular(trip, convId, phone);
  await scheduleFlotaDisponible(convId, trip, phone);
  await logDebug("ahora", "24_handler_completed");
}

async function sendDisponibleToTitular(
  trip: TripRow,
  convId: number,
  clientPhone: string,
): Promise<void> {
  const pref = await getClientPreferredDriver(clientPhone);
  if (!pref) return;

  const titular = await getDriverByPhone(pref.preferred_driver_phone);
  if (!titular || !titular.active) return;

  const body = `⭐ *Oferta prioritaria*\n\nOrigen: ${trip.origin || "No especificado"}\nDestino: ${trip.destination}\nTarifa estimada: $${(trip.price_base || 0).toLocaleString("es-AR")}\n\nCliente consultando disponibilidad.\n\n¿Estarías disponible para tomarlo?`;

  await sendInteractiveButtons(titular.phone, body, [
    { id: `disponible_${convId}`, title: "Disponible" },
  ]);

  await setConnectionValue(
    `disponible_titular_${convId}`,
    JSON.stringify({ ts: Date.now(), tripId: trip.trip_id, phone: titular.phone }),
  );

  console.log(`[AHORA] Titular ${titular.phone} notificado conv ${convId}`);
}

async function scheduleFlotaDisponible(
  convId: number,
  trip: TripRow,
  clientPhone: string,
): Promise<void> {
  const dueAt = Math.floor(Date.now() / 1000) + Math.floor(TITULAR_DELAY_MS / 1000);
  await setConnectionValue(`flota_disponible_at_${convId}`, String(dueAt));

  setTimeout(() => {
    executeFlotaDisponible(convId, trip, clientPhone).catch((e) =>
      console.error(`[AHORA] Flota setTimeout error conv ${convId}:`, e),
    );
  }, TITULAR_DELAY_MS);

  console.log(`[AHORA] Flota programada para conv ${convId} en ${TITULAR_DELAY_MS}ms`);
}

export async function executeFlotaDisponible(
  convId: number,
  trip: TripRow,
  clientPhone: string,
): Promise<void> {
  if (await getConnectionValueFlag(`flota_disponible_done_${convId}`)) return;

  const workflow = await getWorkflow(convId);
  if (!workflow || workflow.state !== "waiting_driver") return;

  await broadcastTripToDrivers(trip, convId, clientPhone, "ahora", trip.passengers, "disponible");
  await setConnectionFlag(`flota_disponible_done_${convId}`);

  console.log(`[AHORA] Flota broadcast enviado conv ${convId}`);
}

export async function resolveDisponiblesAndAssign(
  convId: number,
  clientPhone: string,
  trip: TripRow,
): Promise<void> {
  const state = await getConnectionStateAll();
  const availableKeys = Object.keys(state).filter((k) =>
    k.startsWith(`disponible_${convId}_`),
  );

  if (availableKeys.length === 0) {
    console.log(`[AHORA] Sin disponibles conv ${convId}, degradando a broadcast`);
    await deleteConnectionKey(`ahora_caliente_${convId}`);
    await broadcastTripToDrivers(trip, convId, clientPhone, "ahora", trip.passengers, "broadcast");
    return;
  }

  const disponibles = availableKeys
    .map((k) => {
      try {
        const data = JSON.parse(state[k] || "{}");
        return { key: k, ...data };
      } catch {
        return null;
      }
    })
    .filter(Boolean) as Array<{ key: string; ts: number; name?: string; phone: string }>;

  disponibles.sort((a, b) => a.ts - b.ts);

  let winnerPhone: string | null = null;

  const pref = await getClientPreferredDriver(clientPhone);
  if (pref) {
    const titularDisponible = disponibles.find((d) => d.phone === pref.preferred_driver_phone);
    if (titularDisponible) {
      winnerPhone = titularDisponible.phone;
      console.log(`[AHORA] Titular ${winnerPhone} gana (prioridad) conv ${convId}`);
    }
  }

  if (!winnerPhone) {
    winnerPhone = disponibles[0].phone;
    console.log(`[AHORA] FIFO: ${winnerPhone} gana conv ${convId}`);
  }

  const assigned = await assignWorkflowAtomic(convId, winnerPhone);
  if (!assigned) {
    const workflow = await getWorkflow(convId);
    if (workflow?.assignedDriverPhone === winnerPhone) {
      console.log(`[AHORA] Recuperado: ${winnerPhone} ya asignado conv ${convId}`);
    } else {
      console.error(`[AHORA] Fallo asignación atómica conv ${convId}`);
      return;
    }
  }

  const fin = await assignDriverToTrip(trip.trip_id, winnerPhone);
  await incrementOfferAccepted(winnerPhone);
  await updateTripAssignmentSource(trip.trip_id, "AVAILABLE_POOL");

  const driver = await getDriverByPhone(winnerPhone);
  const driverName = driver?.name || "El chofer";
  const price = trip.price_base || 0;
  const commission = fin?.commission || 0;
  const payout = fin?.payout || price;

  const summary = `✅ *Viaje asignado*

👤 *Cliente*: ${clientPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination || "No especificado"}
Tarifa pública: $${price.toLocaleString("es-AR")}

📊 *TG*: $${commission.toLocaleString("es-AR")}
💵 *Recibís*: $${payout.toLocaleString("es-AR")}`;

  await sendInteractiveButtons(winnerPhone, summary, [
    { id: `voy_${convId}`, title: "🚗 Voy" },
  ]);

  await sendWhatsAppMessage(
    clientPhone,
    `✅ ¡Viaje confirmado! Tu chofer es ${driverName}. Te contactará en breve.`,
  );

  const dest = trip.destination || "No especificado";
  await notifyAdmin(`✅ *Viaje asignado (AVAILABLE_POOL)*\n\nChofer: ${driverName} (${winnerPhone})\nDestino: ${dest}\nTarifa: $${price.toLocaleString("es-AR")}`);

  await notifyOtherDriversTaken(winnerPhone, dest);

  for (const d of disponibles) {
    await deleteConnectionKey(d.key);
  }
  await deleteConnectionKey(`disponible_titular_${convId}`);
  await deleteConnectionKey(`flota_disponible_at_${convId}`);
  await deleteConnectionKey(`flota_disponible_done_${convId}`);
  await deleteConnectionKey(`ahora_caliente_${convId}`);

  console.log(`[AHORA] Asignación completada conv ${convId} → ${driverName}`);
}

export async function handleDriverDisponible(
  convId: number,
  driverPhone: string,
): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow) return;
  if (workflow.state !== "waiting_driver") return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "Chofer";

  await setConnectionValue(
    `disponible_${convId}_${driverPhone}`,
    JSON.stringify({ ts: Date.now(), name: driverName, phone: driverPhone }),
  );

  await updateTripDriverAvailable(trip.trip_id, Math.floor(Date.now() / 1000));

  await sendWhatsAppMessage(
    driverPhone,
    `✅ Anotado. Si el cliente confirma, te avisamos para que confirmes con *Voy*.`,
  );

  console.log(`[AHORA] ${driverPhone} disponible conv ${convId}`);
}

export async function handleDriverVoy(
  convId: number,
  driverPhone: string,
): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow) return;
  if (workflow.state !== "closed" || workflow.assignedDriverPhone !== driverPhone) return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const now = Math.floor(Date.now() / 1000);
  await updateTripDriverCommitment(trip.trip_id, now);

  if (!trip.assignment_source) {
    await updateTripAssignmentSource(trip.trip_id, "AVAILABLE_POOL");
  }

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  await sendInteractiveButtons(driverPhone, "✅ Compromiso confirmado. Cuando completes el servicio, presioná *Realizado*.", [
    { id: `realizado_${convId}`, title: "✅ Realizado" },
  ]);

  await sendWhatsAppMessage(
    trip.client_phone,
    `🟢 *${driverName} confirmó salida*\n\nTu chofer está en camino. Que tengas un buen viaje!`,
  );

  await deleteConnectionKey(`voy_pending_${convId}`);
  await setConnectionFlag(`voy_confirmado_${convId}`);

  console.log(`[AHORA] Voy confirmado conv ${convId} por ${driverPhone}`);
}

async function getConnectionStateAll(): Promise<Record<string, string>> {
  const { getDbInstance } = await import("@/lib/db/database");
  const db = getDbInstance();
  const rs = await db.execute("SELECT key, value FROM connection_state");
  const result: Record<string, string> = {};
  for (const row of rs.rows as any[]) {
    if (row.value) result[row.key] = row.value;
  }
  return result;
}

export async function cleanupStaleCandidates(): Promise<void> {
  const { getDbInstance } = await import("@/lib/db/database");
  const db = getDbInstance();
  const cutoff = Math.floor(Date.now() / 1000) - Math.floor(STALE_CANDIDATE_CLEANUP_MS / 1000);

  const stale = await db.execute({
    sql: `SELECT w.conversation_id, w.phone FROM workflows w
          INNER JOIN trips t ON t.client_phone = w.phone
          WHERE w.state = 'waiting_driver'
          AND t.status = 'consulta'
          AND t.updated_at < ?`,
    args: [cutoff],
  });

  for (const row of stale.rows as any[]) {
    const convId = row.conversation_id;
    console.log(`[CLEANUP-AHORA] Limpiando candidato stale conv ${convId}`);

    const state = await getConnectionStateAll();
    const keysToDelete = Object.keys(state).filter(
      (k) =>
        k.startsWith(`disponible_${convId}_`) ||
        k.startsWith(`disponible_titular_${convId}`) ||
        k.startsWith(`flota_disponible_at_${convId}`) ||
        k.startsWith(`flota_disponible_done_${convId}`) ||
        k.startsWith(`ahora_caliente_${convId}`),
    );

    for (const key of keysToDelete) {
      await deleteConnectionKey(key);
    }

    const { closeWorkflow } = await import("@/lib/utils/conversation-workflow");
    await closeWorkflow(convId);
  }

  if ((stale.rows as any[]).length > 0) {
    console.log(`[CLEANUP-AHORA] ${(stale.rows as any[]).length} candidatos stale limpiados`);
  }
}

export async function checkPendingFlotaBroadcasts(): Promise<void> {
  const state = await getConnectionStateAll();
  const now = Math.floor(Date.now() / 1000);

  const pendingKeys = Object.keys(state).filter(
    (k) => k.startsWith("flota_disponible_at_") && !state[`flota_disponible_done_${k.replace("flota_disponible_at_", "")}`],
  );

  for (const key of pendingKeys) {
    const dueAt = parseInt(state[key] || "0", 10);
    if (dueAt && dueAt <= now) {
      const convIdStr = key.replace("flota_disponible_at_", "");
      const convId = parseInt(convIdStr, 10);
      if (!convId) continue;

      if (await getConnectionValueFlag(`flota_disponible_done_${convId}`)) continue;

      const workflow = await getWorkflow(convId);
      if (!workflow || workflow.state !== "waiting_driver") {
        await deleteConnectionKey(key);
        continue;
      }

      const trip = await getActiveTripByPhone(workflow.phone);
      if (trip) {
        console.log(`[AHORA] Flota broadcast pendiente ejecutado conv ${convId}`);
        await executeFlotaDisponible(convId, trip, workflow.phone);
      }
    }
  }
}
