import {
  getExpiredByState,
  advanceToNivel2,
  advanceToNivel3,
  closeWorkflow,
} from "./conversation-workflow";
import {
  getActiveTripByPhone,
  getDriverByPhone,
  getDriverExpiry,
  getTripsByScheduledAtWindow,
  getTripsPendingCloseOut,
  getDbInstance,
  updateTripState,
  findTariff,
  getExpiredTrips,
  getConnectionValue,
  getConnectionValueFlag,
  setConnectionFlag,
  setConnectionValue,
  deleteConnectionKey,
} from "../db/database";
import { notifyAdmin, broadcastTripToDrivers, offerToSpecificDriver, getPrincipal2 } from "../services/admin.service";
import { sendWhatsAppMessage, sendInteractiveButtons } from "../whatsapp/sender";
import { sendPendingSurveys } from "../services/survey.service";
import {
  TIMEOUT_NIVEL_1_MS,
  TIMEOUT_NIVEL_2_MS,
  TIMEOUT_NIVEL_3_MS,
  TIMEOUT_WAITING_DRIVER_MS,
  CRON_12H_S,
  CRON_24H_S,
  STALE_WORKFLOW_THRESHOLD_S,
} from "@/config/constants";

export async function checkTimeouts(): Promise<void> {
  await sendPendingSurveys();

  // === DISPATCH LEVELS ===

  // Nivel 1 expired → offer to Nivel 2 (Principal2)
  const nivel1Expired = await getExpiredByState("nivel_1", TIMEOUT_NIVEL_1_MS);
  for (const ctx of nivel1Expired) {
    console.log(`[TIMEOUT] Nivel 1 expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    if (!trip) continue;

    const principal2 = await getPrincipal2();
    if (principal2 && principal2.status === "active") {
      const expiry = await getDriverExpiry(principal2.phone);
      if (expiry.active) {
        await advanceToNivel2(ctx.conversationId, ctx.phone);
        await offerToSpecificDriver(
          principal2.phone, trip, ctx.conversationId,
          `⭐ *NIVEL 2 — RESERVA*`,
          `El Principal no respondió. Tenés 30min para aceptar.`
        );
        console.log(`[DISPATCH] Nivel 1 timeout → Nivel 2 (${principal2.name}) conv ${ctx.conversationId}`);
        continue;
      }
    }

    // No principal2 → broadcast
    await advanceToNivel3(ctx.conversationId, ctx.phone);
    await broadcastTripToDrivers(trip, ctx.conversationId, ctx.phone);
    console.log(`[DISPATCH] Nivel 1 timeout → broadcast conv ${ctx.conversationId}`);
  }

  // Nivel 2 expired → broadcast (Nivel 3)
  const nivel2Expired = await getExpiredByState("nivel_2", TIMEOUT_NIVEL_2_MS);
  for (const ctx of nivel2Expired) {
    console.log(`[TIMEOUT] Nivel 2 expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    if (!trip) continue;

    await advanceToNivel3(ctx.conversationId, ctx.phone);
    await broadcastTripToDrivers(trip, ctx.conversationId, ctx.phone);
    console.log(`[DISPATCH] Nivel 2 timeout → broadcast conv ${ctx.conversationId}`);
  }

  // Nivel 3 expired → notify admin
  const nivel3Expired = await getExpiredByState("nivel_3", TIMEOUT_NIVEL_3_MS);
  for (const ctx of nivel3Expired) {
    console.log(`[TIMEOUT] Nivel 3 expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    const destino = trip?.destination || "sin destino";

    await notifyAdmin(`⚠️ *Viaje sin asignar*

Cliente: ${ctx.phone}
Destino: ${destino}

Los 3 niveles de despacho agotados. Reasigná manualmente.`);

    await closeWorkflow(ctx.conversationId);
  }

  // Waiting driver (AHORA) expired → notify admin, or offer contingency for 5-6pax
  const waitingDriverExpired = await getExpiredByState("waiting_driver", TIMEOUT_WAITING_DRIVER_MS);
  for (const ctx of waitingDriverExpired) {
    console.log(`[TIMEOUT] Waiting driver expiró para conv ${ctx.conversationId}`);
    const trip = await getActiveTripByPhone(ctx.phone);
    const destino = trip?.destination || "sin destino";

    // Check if contingency was already offered for this conv
    if (await getConnectionValueFlag(`contingency_offered_${ctx.conversationId}`)) continue;

    if (trip && trip.passengers && trip.passengers > 4) {
      // FIXME: La lógica de contingencia de 2 vehículos fue diseñada para una flota 4p/6p.
      // Al incorporar vehículos de mayor capacidad debe revisarse o reemplazarse por una
      // estrategia configurable basada en car_capacity.
      // Store original trip data for contingency handler
      const tripData = JSON.stringify({
        origin: trip.origin,
        destination: trip.destination,
        price_base: trip.price_base,
        passengers: trip.passengers,
        flight_number: trip.flight_number || null,
      });
      await setConnectionValue(`contingency_data_${ctx.conversationId}`, tripData);
      await setConnectionFlag(`contingency_offered_${ctx.conversationId}`);

      // Look up the 4p tariff for accurate pricing
      const tariff4p = await findTariff(trip.origin || "", trip.destination || "ninguno", 4);
      const price4p = tariff4p?.price || trip.price_base || 0;

      await closeWorkflow(ctx.conversationId);

      await sendInteractiveButtons(ctx.phone,
        `Mirá, en este microsegundo no encuentro una minivan de hasta 6 plazas disponible. Pero para no hacerte esperar, te puedo buscar dos autos de hasta 4 pasajeros ya mismo. Te saldría [$${price4p.toLocaleString("es-AR")}] × 2 en total (es decir, $${price4p.toLocaleString("es-AR")} cada uno). ¿Te sirve que intente buscártelos?`, [
        { id: `contingencia_si_${ctx.conversationId}`, title: "✅ Sí, buscá" },
        { id: `contingencia_no_${ctx.conversationId}`, title: "❌ No, gracias" },
      ]);

      console.log(`[CONTINGENCIA] Ofrecida para conv ${ctx.conversationId} (${trip.passengers} pax)`);
      continue;
    }

    // Check if this is a dual contingency timeout (Trip B waiting after Trip A was assigned)
    const dualValue = await getConnectionValue(`contingency_dual_${ctx.conversationId}`);
    if (dualValue) {
      console.log(`[TIMEOUT] Dual contingency — Trip B timeout para conv ${ctx.conversationId}`);
      const dual = JSON.parse(dualValue);

      // Cancel Trip B
      if (trip) {
        await updateTripState(trip.trip_id, "cancelado");
      }

      // Cancel Trip A
      await updateTripState(dual.tripA_id, "cancelado");

      // Notify Trip A driver
      await sendWhatsAppMessage(dual.driverA_phone, `❌ El segundo auto no se confirmó a tiempo. El viaje compartido se cancela. Disculpá las molestias.`);

      // Notify client
      await sendWhatsAppMessage(ctx.phone, `Disculpá, no pudimos conseguir dos autos disponibles. Un operador se va a comunicar para ayudarte.`);

      // Notify admin
      await notifyAdmin(`⚠️ *Contingencia fallida — 2 autos no disponible*

Cliente: ${ctx.phone}
Auto A: ${dual.driverA_name} (${dual.driverA_phone}) — cancelado
Ambos viajes cancelados. Contactar manualmente.`);

      // Clean up
      await deleteConnectionKey(`contingency_dual_${ctx.conversationId}`);

      await closeWorkflow(ctx.conversationId);
      continue;
    }

    await sendWhatsAppMessage(ctx.phone, "Disculpá, no encontramos un chofer disponible ahora mismo. Un operador se va a comunicar para ayudarte.");
    await notifyAdmin(`⚠️ *AHORA sin chofer*

Cliente: ${ctx.phone}
Destino: ${destino}

Ningún chofer tomó el servicio AHORA. Reasigná manualmente.`);

    await closeWorkflow(ctx.conversationId);
  }

  // === CRON JOBS ===
  await checkReconfirmacion24hs();
  await checkMensajeFelicidad12hs();
  await checkCierreChofer();
  await checkDiscrepanciaComision();
  await checkDolarApiNotification();
  await checkSessionCleanup();
}

// === RECONFIRMACIÓN 24HS ===
async function checkReconfirmacion24hs(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const in24h = now + CRON_24H_S;
  const trips = await getTripsByScheduledAtWindow(now, in24h);
  const reconfKey = "last_reconfirm_24hs";

  for (const trip of trips) {
    if (!trip.assigned_driver_phone) continue;
    if (trip.status === "completado" || trip.status === "cancelado") continue;

    // Check if already notified for this window
    if (await getConnectionValueFlag(`${reconfKey}_${trip.trip_id}`)) continue;

    const driver = await getDriverByPhone(trip.assigned_driver_phone);
    if (!driver) continue;

    const dateStr = new Date((trip.scheduled_at || 0) * 1000).toLocaleString("es-AR", {
      weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
    });

    await sendInteractiveButtons(driver.phone,
      `🔄 *Reconfirmación de viaje*

Quedan 24hs para el viaje a *${trip.destination}*
📅 ${dateStr}

¿Confirmás que vas a realizarlo?`, [
      { id: `reconfirm_ok_${trip.trip_id}`, title: "✅ Confirmado" },
      { id: `reconfirm_no_${trip.trip_id}`, title: "❌ No puedo" },
    ]);

    await setConnectionFlag(`${reconfKey}_${trip.trip_id}`);

    console.log(`[CRON] Reconfirmación 24hs enviada a ${driver.phone} para trip ${trip.trip_id}`);
  }
}

// === MENSAJE FELICIDAD 12HS ===
async function checkMensajeFelicidad12hs(): Promise<void> {
  const now = Math.floor(Date.now() / 1000);
  const in12h = now + CRON_12H_S;
  const trips = await getTripsByScheduledAtWindow(now, in12h);
  const felizKey = "last_feliz_msg";

  for (const trip of trips) {
    if (trip.status === "completado" || trip.status === "cancelado") continue;

    if (await getConnectionValueFlag(`${felizKey}_${trip.trip_id}`)) continue;

    await sendWhatsAppMessage(trip.client_phone,
      `🌟 *Todo listo para tu viaje*

Recordá que tu chofer asignado se contactará con vos antes del servicio para coordinar todos los detalles.

Cualquier cambio, avisanos por este chat.`);

    await setConnectionFlag(`${felizKey}_${trip.trip_id}`);

    console.log(`[CRON] Mensaje felicidad 12hs enviado a ${trip.client_phone} para trip ${trip.trip_id}`);
  }
}

// === CIERRE CHOFER (2H POST VIAJE) ===
async function checkCierreChofer(): Promise<void> {
  const trips = await getTripsPendingCloseOut();
  const cierreKey = "last_cierre_msg";

  for (const trip of trips) {
    if (!trip.assigned_driver_phone) continue;

    if (await getConnectionValueFlag(`${cierreKey}_${trip.trip_id}`)) continue;

    const commission = trip.commission_amount || Math.round((trip.price_base || 0) * 0.15);

    await sendInteractiveButtons(trip.assigned_driver_phone,
      `📊 *Cierre de viaje*

Destino: ${trip.destination}
Comisión: $${commission.toLocaleString("es-AR")}

¿Confirmás la comisión declarada?`, [
      { id: `comision_ok_${trip.trip_id}`, title: "✅ Confirmar" },
      { id: `comision_revision_${trip.trip_id}`, title: "📝 Revisar" },
    ]);

    await setConnectionFlag(`${cierreKey}_${trip.trip_id}`);

    console.log(`[CRON] Cierre chofer enviado a ${trip.assigned_driver_phone} para trip ${trip.trip_id}`);
  }
}

// === DISCREPANCIA COMISIÓN (24H POST) ===
async function checkDiscrepanciaComision(): Promise<void> {
  const cutoff = Math.floor(Date.now() / 1000) - CRON_24H_S;
  const discreKey = "last_discre_msg";

  const trips = await getDbInstance().execute({
    sql: "SELECT * FROM trips WHERE status = 'completado' AND (comision_declarada IS NULL OR comision_declarada = 0) AND confirmed_at IS NOT NULL AND confirmed_at < ?",
    args: [cutoff],
  });

  for (const row of trips.rows as any[]) {
    const tripId = row.trip_id;

    if (await getConnectionValueFlag(`${discreKey}_${tripId}`)) continue;

    const trip = await getActiveTripByPhone(row.client_phone);
    const commission = trip?.commission_amount || Math.round((row.price_base || 0) * 0.15);

    await notifyAdmin(`⚠️ *Discrepancia de comisión*

Viaje: ${tripId}
Cliente: ${row.client_phone}
Destino: ${row.destination}
Comisión pendiente: $${commission.toLocaleString("es-AR")}
Chofer: ${row.assigned_driver_phone || "N/A"}

Hace más de 24hs del viaje y el chofer no declaró la comisión.`);

    await setConnectionFlag(`${discreKey}_${tripId}`);

    console.log(`[CRON] Discrepancia comisión notificada para trip ${tripId}`);
  }
}

// === DOLARAPI DIARIO ===
async function checkDolarApiNotification(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const lastDate = await getConnectionValue("dolar_last_fetch_date");
  if (lastDate === today) return;

  let dolarBlue = "N/A";
  let dolarVenta: number | null = null;
  let realArs = "N/A";

  try {
    const resp = await fetch("https://dolarapi.com/v1/dolares", { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as any[];
    const blue = data.find((d: any) => d.nombre?.toLowerCase().includes("blue"));
    if (blue) {
      dolarBlue = `$${blue.compra}/${blue.venta}`;
      dolarVenta = blue.venta;
    }
  } catch (e) {
    console.error("[DOLARAPI] Error fetching USD:", e);
  }

  try {
    const resp = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", { signal: AbortSignal.timeout(5000) });
    const data = await resp.json() as any;
    const bid = data?.USDBRL?.bid;
    if (bid && dolarVenta) {
      const brlToArs = Math.round(dolarVenta / parseFloat(bid));
      realArs = `$${brlToArs}`;
    }
  } catch (e) {
    console.error("[DOLARAPI] Error fetching BRL:", e);
  }

  await notifyAdmin(`📊 *Cotizaciones del día* (${today})

💵 Dólar Blue: ${dolarBlue}
💶 Real (BRL→ARS): ${realArs}

Usá .env: COTIZACION_DOLAR y COTIZACION_REAL`);

  await setConnectionValue("dolar_last_fetch_date", today);

  console.log(`[DOLARAPI] Cotizaciones notificadas para ${today}`);
}

// === SESSION CLEANUP DIARIO ===
async function checkSessionCleanup(): Promise<void> {
  const today = new Date().toISOString().split("T")[0];
  const lastDate = await getConnectionValue("last_session_cleanup_date");
  if (lastDate === today) return;

  const now = Math.floor(Date.now() / 1000);

  // 1. Archive trips with past scheduled_at that weren't completed
  const expiredTrips = await getExpiredTrips();
  for (const t of expiredTrips) {
    console.log(`[CLEANUP] Archivando trip expirado ${t.trip_id}`);
    await updateTripState(t.trip_id, "completado");
  }

  // 2. Close orphaned workflows (active but no activity >24h)
  // Fase 3 v5.0: ahora consulta chat_sessions (SoT) con JOIN a conversations.
  const staleCutoff = now - STALE_WORKFLOW_THRESHOLD_S;
  const stale = await getDbInstance().execute({
    sql: `SELECT c.id as conversation_id
          FROM chat_sessions cs
          JOIN conversations c ON c.phone = cs.phone
          WHERE cs.workflow_state != 'closed' AND cs.updated_at < ?`,
    args: [staleCutoff],
  });
  for (const w of stale.rows as any[]) {
    console.log(`[CLEANUP] Cerrando workflow huérfano conv ${w.conversation_id}`);
    await closeWorkflow(w.conversation_id);
  }

  await setConnectionValue("last_session_cleanup_date", today);

  console.log(`[CLEANUP] Ejecutado para ${today}: ${expiredTrips.length} trips, ${stale.rows.length} workflows`);
}