// ARCHITECTURE NOTE (Phase D): Dispatch domain — semi-frozen.
// Deeply coupled to admin.service.ts (frozen) and @/lib/services/dispatch/dispatch-workflow (semi-frozen).
// Imports dispatch internals (driver tiers, workflow transitions) from frozen modules.
// Future: consolidate dispatch orchestration into a single dispatch.service.ts.

import {
  getDispatchWorkflow,
  advanceToNivel1,
  advanceToWaitingDriver,
  assignWorkflowAtomic,
} from "@/lib/services/dispatch/dispatch-workflow";
import {
  getActiveTripByPhone,
  getDriverByPhone,
  getTripByAssignedDriver,
  assignDriverToTrip,
  completeTrip,
  getClientPreferredDriver,
  setClientPreferredDriver,
  incrementOfferAccepted,
  getLeadByConv,
  takeLead,
  createTrip,
  setConversationTrip,
  getConversationByPhone,
  getOrCreateConversation,
  updateTripState,
  setCommissionDeclared,
  getTripById,
  getPrincipalDriver,
  findTariff,
  updateTripTariff,
  getConnectionValue,
  getConnectionValueFlag,
  setConnectionValue,
  deleteConnectionKey,
  getCustomerName,
} from "@/lib/db/database";
import { notifyAdmin, notifyOtherDriversTaken } from "../admin/admin.service";
import { offerToSpecificDriver, broadcastTripToDrivers } from "./dispatch.service";
import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";
import { log } from "@/lib/utils/logger";

export function isGroupMessage(from: string): boolean {
  return from.endsWith("@g.us");
}

const ACEPTAR_KEYWORDS = ["acepto", "yo estoy", "yo voy", "lo tomo"];

interface ContingencyData {
  origin?: string;
  destination?: string;
  passengers?: number;
}

function validateContingencyTripData(
  data: ContingencyData | undefined | null,
  passengers?: number,
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];
  if (!data) {
    missing.push("no_data");
    return { valid: false, missing };
  }
  if (!data.origin?.trim()) missing.push("origin");
  if (!data.destination?.trim()) missing.push("destination");
  if (passengers == null || passengers <= 0) missing.push("passengers");
  return { valid: missing.length === 0, missing };
}

function isAccepting(text: string): boolean {
  const t = text.toLowerCase().trim();
  return ACEPTAR_KEYWORDS.some((k) => t.includes(k));
}

export async function handleDriverResponse(
  groupMsg: string,
  driverPhone: string,
  convId: number
): Promise<void> {
  if (!isAccepting(groupMsg)) return;

  const workflow = await getDispatchWorkflow(convId);
  if (!workflow) return;
  const validStates = ["nivel_1", "nivel_2", "nivel_3", "waiting_driver"];
  if (!validStates.includes(workflow.state)) return;

  await assignDriver(workflow, driverPhone);
}

export async function handleDriverAccept(_driverPhone: string, text: string): Promise<void> {
  if (!isAccepting(text)) return;

  log.info(`[LEGACY-ACCEPT] Chofer intentó aceptar por texto — flujo deshabilitado`);
  return;
}

export async function handleDriverArrived(driverPhone: string): Promise<void> {
  const trip = await getTripByAssignedDriver(driverPhone);
  if (!trip) return;

  await sendWhatsAppMessage(trip.client_phone, `🟢 *Chofer en camino*

Tu chofer está llegando al destino. Que tengas un buen viaje!`);
  log.info(`[LLEGUÉ] Chofer llegó, cliente notificado`);
}

export async function handleDriverEnViaje(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getDispatchWorkflow(convId);
  if (!workflow) return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  await sendWhatsAppMessage(trip.client_phone, `🟢 *Chofer en camino*

${driverName} está en camino. Que tengas un buen viaje!`);
  log.info(`[EN VIAJE] Chofer en viaje, cliente notificado`);
}

export async function handleDriverCompleted(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getDispatchWorkflow(convId);
  if (!workflow) return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  await completeTrip(trip.trip_id);

  // Set as preferred driver (Titular) for this client
  const existingPref = await getClientPreferredDriver(trip.client_phone);
  if (!existingPref) {
    await setClientPreferredDriver(trip.client_phone, driverPhone);
    log.info(`[TITULAR] Post-servicio completado`);
  }

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  const customerName = await getCustomerName(trip.client_phone);
  const clientLabel = customerName
    ? `${customerName} (${trip.client_phone})`
    : trip.client_phone;

  // Send full breakdown to driver post-completion
  const existingPref2 = await getClientPreferredDriver(trip.client_phone);
  const isPreferred = existingPref2 && existingPref2.preferred_driver_phone === driverPhone;
  let roleLine = "";
  if (existingPref2) {
    if (isPreferred) {
      roleLine = `\n⭐ *Sos Chofer Titular* de este cliente`;
    } else {
      const prefDriver = await getDriverByPhone(existingPref2.preferred_driver_phone);
      const prefName = prefDriver?.name || "otro chofer";
      roleLine = `\n🧑‍🤝‍🧑 *Sos Chofer Suplente* de ${prefName} (Titular)`;
    }
  }

  const price = trip.price_base || 0;
  let garantizado = trip.garantizado_base ?? Math.round(price * 0.85);

  const tg = price - garantizado;

  const completedMsg = `🎉 *Viaje completado*

${roleLine ? roleLine.trimStart() : ""}

💰 *Tarifa pública*: $${price.toLocaleString("es-AR")}
📊 *TG*: $${tg.toLocaleString("es-AR")}
💵 *Recibís*: $${garantizado.toLocaleString("es-AR")}
💳 *Pago*: Al chofer

👤 *Cliente*: ${clientLabel}`;

  await sendWhatsAppMessage(driverPhone, completedMsg);
  await notifyAdmin(`🎉 Viaje completado por ${driverName} (${driverPhone}). Destino: ${trip.destination}`);
}

export async function handleDriverButtonAccept(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getDispatchWorkflow(convId);
  if (!workflow) return;
  const validStates = ["nivel_1", "nivel_2", "nivel_3", "waiting_driver"];
  if (!validStates.includes(workflow.state)) return;

  await assignDriver(workflow, driverPhone);
}

async function assignDriver(workflow: { conversationId: number; phone: string; state: string }, driverPhone: string): Promise<void> {
  const convId = workflow.conversationId;
  if (!convId) {
    log.error(`[ASSIGN] No convId for driver`);
    return;
  }

  const trip = await getActiveTripByPhone(workflow.phone);

  const assigned = await assignWorkflowAtomic(workflow.phone);
  if (!assigned) {
    if (trip?.assigned_driver_phone === driverPhone) {
      log.info(`[ASSIGN] Driver ya estaba asignado a conv ${convId}`);
    } else {
      await sendWhatsAppMessage(driverPhone, "⚠️ El viaje ya fue asignado a otro chofer.");
      return;
    }
  }

  if (!trip) return;

  const fin = await assignDriverToTrip(trip.trip_id, driverPhone);
  await incrementOfferAccepted(driverPhone);
  const commission = fin?.commission || 0;
  const payout = fin?.payout || trip.price_base || 0;
  const price = trip.price_base || 0;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  const clientPhone = workflow.phone;
  const customerName = await getCustomerName(clientPhone);
  const clientCleanPhone = clientPhone.replace(/\D/g, "");
  const clientLabel = customerName
    ? `👤 *Cliente*: ${customerName} (${clientPhone})`
    : `👤 *Cliente*: ${clientPhone}`;

  // Send clean post-acceptance message with actions
  const summary = `✅ *Viaje aceptado*

${clientLabel}
https://wa.me/${clientCleanPhone}
Origen: ${trip.origin || "No especificado"}
Destino: ${trip.destination || "No especificado"}
Tarifa pública: $${price.toLocaleString("es-AR")}
Hora: ${new Date().toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}

📊 *TG*: $${commission.toLocaleString("es-AR")}
💵 *Recibís*: $${payout.toLocaleString("es-AR")}`;

  await sendInteractiveButtons(driverPhone, summary, [
    { id: `realizado_${convId}`, title: "✅ Realizado" },
    { id: `enviaje_${convId}`, title: "🔄 En viaje" },
  ]);

  // Split proforma: instruction first, then standalone copiable text
  await sendWhatsAppMessage(driverPhone, `📋 *Recomendación de seguridad* — copiá y pegá este mensaje al cliente:`);
  await sendWhatsAppMessage(driverPhone, `Hola, buenas tardes. Le saluda ${driverName}, de TaxiGuazú. Veo en el sistema que solicita un traslado desde ${trip.origin ?? "No especificado"} hacia ${trip.destination ?? "No especificado"} y son ${trip.passengers ?? "—"} pasajeros, ¿es correcto todo? Por favor, indíqueme el nombre del hotel o dirección exacta para dejar todo coordinado de mi parte. Le avisaré en cuanto esté llegando para nuestro encuentro. Muchas gracias.`);

  // Check if this is Trip A in a dual contingency (pending_B exists)
  const hasPendingB = await getConnectionValueFlag(`contingency_pending_B_${convId}`);
  const isContingencyTripA = hasPendingB;

  // Check if this is Trip B in a dual contingency (contingency_dual key exists)
  const hasDualActive = await getConnectionValueFlag(`contingency_dual_${convId}`);

  // --- Send client message(s) ---
  if (isContingencyTripA) {
    // Dual contingency Trip A — skip client message, will send combined when both assigned
    log.info(`[CONTINGENCIA] Trip A asignado, esperando Trip B para msg combinado`);
  } else if (hasDualActive) {
    // Dual contingency Trip B — both assigned, send combined message
    let dual: Record<string, any> = {};
    try { dual = JSON.parse(await getConnectionValue(`contingency_dual_${convId}`) || "{}"); } catch { dual = {}; }
    const combinedMsg = `✅ *Tenemos los dos autos confirmados*

${dual.driverA_name} ya lleva ${dual.paxA} pasajeros y ${driverName} lleva los ${dual.paxB} restantes. Ambos te escriben al WhatsApp en este instante para coordinar la puerta de salida. El pago lo arreglás directamente con cada uno en efectivo.`;
    await sendWhatsAppMessage(workflow.phone, combinedMsg);

    // Notify Trip A driver that both are confirmed
    await sendWhatsAppMessage(dual.driverA_phone, `✅ El segundo auto se confirmó. ${driverName} (${driverPhone}) completa el equipo. Viaje compartido confirmado.`);

    // Notify admin
    await notifyAdmin(`✅ *Contingencia resuelta: 2 autos*

Auto A: ${dual.driverA_name} (${dual.driverA_phone})
Auto B: ${driverName} (${driverPhone})
Cliente: ${workflow.phone}`);

    // Clean up dual state
    await deleteConnectionKey(`contingency_dual_${convId}`);
  } else if (workflow.state === "waiting_driver") {
    const clientMsg = `¡Listo! Mi colega ${driverName} ya te va a buscar y te va a escribir al WhatsApp en este instante para coordinar la puerta de salida. El pago de los $${price.toLocaleString("es-AR")} lo arreglás directamente con él en efectivo.\n\nNota: Si tu hotel llega a quedar muy alejado, él puede ajustar la tarifa antes de salir, pero lo manejás directo con él. ¡Buen viaje!`;
    await sendWhatsAppMessage(workflow.phone, clientMsg);
  } else {
    const clientMsg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve.`;
    await sendWhatsAppMessage(workflow.phone, clientMsg);
    await sendWhatsAppMessage(workflow.phone, `Mi colega que hará tu servicio es ${driverName} y te va a contactar para coordinar todos los detalles.`);
  }

  const dest = trip.destination || "No especificado";
  await notifyAdmin(`Viaje asignado a ${driverName} (${driverPhone}). Destino: ${dest}`);

  await notifyOtherDriversTaken(driverPhone, dest);

  // Contingency sequel: if there's a pending Trip B, dispatch it now
  if (hasPendingB) {
    let bData: Record<string, any> = {};
    try { bData = JSON.parse(await getConnectionValue(`contingency_pending_B_${convId}`) || "{}"); } catch { bData = {}; }
    await deleteConnectionKey(`contingency_pending_B_${convId}`);

    const tripBConv = await getConversationByPhone(workflow.phone);
    if (tripBConv) {
      const bFleetCheck = await ensureFleetCanHandle(bData.passengers, {
        phone: workflow.phone,
        convId: tripBConv.id,
        origin: bData.origin,
        destination: bData.destination,
        source: "driver.contingency_trip_b",
      });
      if (!bFleetCheck.ok) {
        return;
      }
    }

    // FASE 27 — Verificar integridad de datos antes de crear Trip B
    const h2Validation = validateContingencyTripData(bData, bData.passengers);
    if (!h2Validation.valid) {
      log.warn("[CONTINGENCY_DISPATCH_BLOCKED]", { trip: "B", missing: h2Validation.missing, convId });
      return;
    }

    const tripIdB = `trip_contingency_${convId}_b_${Date.now()}`;
    await createTrip(tripIdB, workflow.phone, bData.origin, bData.destination, bData.price, bData.passengers, undefined, bData.flight_number || undefined);
    await setConversationTrip(convId, tripIdB);
    const tripB = await getActiveTripByPhone(workflow.phone);
    if (tripB) {
      if (bData.tariff_id) {
        await updateTripTariff(tripB.trip_id, bData.tariff_id, bData.piso || 0);
      }

      // Store dual contingency tracking for Trip B phase
      const dualState = {
        driverA_name: driverName,
        driverA_phone: driverPhone,
        tripA_id: trip.trip_id,
        tripB_id: tripB.trip_id,
        paxA: bData.paxA || Math.min(bData.passengers, 4),
        paxB: bData.passengers,
      };
      await setConnectionValue(`contingency_dual_${convId}`, JSON.stringify(dualState));

      // Notify Trip A driver that Trip B is being dispatched
      await sendWhatsAppMessage(driverPhone, `⏳ Buscando el segundo auto (${dualState.paxB} pasajeros). Si se confirma, te avisamos. Si no se consigue en los próximos minutos, se cancelará el viaje completo.`);

      await advanceToWaitingDriver(convId, workflow.phone);
      await sendWhatsAppMessage(workflow.phone, `Buscando el segundo auto para vos...`);
      await broadcastTripToDrivers(tripB, convId, workflow.phone, "ahora", bData.passengers);
      log.info(`[CONTINGENCIA] Trip B dispatchado para conv ${convId}`);
    }
  }
}

export async function handleDriverTakeLead(convId: number, driverPhone: string): Promise<void> {
  const lead = await getLeadByConv(convId);
  if (!lead) {
    await sendWhatsAppMessage(driverPhone, "❌ Este lead ya no está disponible.");
    return;
  }

  if (lead.taken_by) {
    await sendWhatsAppMessage(driverPhone, "❌ Otro chofer ya tomó este lead.");
    return;
  }

  await takeLead(convId, driverPhone);

  // Verify atomic take succeeded
  const updated = await getLeadByConv(convId);
  if (!updated || updated.taken_by !== driverPhone) {
    await sendWhatsAppMessage(driverPhone, "❌ Otro chofer ya tomó este lead.");
    return;
  }

  // Create trip from lead
  const tripId = `trip_${Date.now()}`;
  const leadConv = await getOrCreateConversation(lead.client_phone);
  const leadConvId = leadConv.id;
  const leadFleetCheck = await ensureFleetCanHandle(lead.passengers ?? 1, {
    phone: lead.client_phone,
    convId: leadConvId,
    origin: lead.origin,
    destination: lead.destination,
    source: "driver.take_lead",
  });
  if (!leadFleetCheck.ok) {
    return;
  }
  await createTrip(tripId, lead.client_phone, lead.origin || "", lead.destination, lead.price || undefined, lead.passengers || undefined);
  const conv = await getConversationByPhone(lead.client_phone);
  if (conv) await setConversationTrip(conv.id, tripId);

  // Assign this driver to the trip
  const fin = await assignDriverToTrip(tripId, driverPhone);
  const payout = fin?.payout || lead.price || 0;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  const leadCustomerName = await getCustomerName(lead.client_phone);
  const leadCleanPhone = lead.client_phone.replace(/\D/g, "");
  const leadClientLabel = leadCustomerName
    ? `${leadCustomerName} (${lead.client_phone})`
    : lead.client_phone;

  // Notify driver
  await sendWhatsAppMessage(driverPhone, `✅ *Lead tomado exitosamente*\n\n👤 Cliente: ${leadClientLabel}\nDestino: ${lead.destination}\n💰 *Recibís*: $${payout.toLocaleString("es-AR")}\n\nContactá al cliente:\nhttps://wa.me/${leadCleanPhone}`);

  // Notify client
  await sendWhatsAppMessage(lead.client_phone, `✅ *Viaje confirmado*\n\nTu chofer es ${driverName}. Te contactará en breve.`);

  // Notify admin
  await notifyAdmin(`👤 Lead tomado por ${driverName} (${driverPhone})\nCliente: ${lead.client_phone}\nDestino: ${lead.destination}\nPrecio: $${lead.price}`);

  // Notify other drivers
  notifyOtherDriversTaken(driverPhone, lead.destination);

  log.info(`[LEAD] Tomado para conv ${convId}: ${lead.destination}`);
}

export async function handleDriverReconfirmOk(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("reconfirm_ok_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await updateTripState(tripId, "reconfirmado_24hs");
  await sendWhatsAppMessage(driverPhone, `✅ Viaje a ${trip.destination} reconfirmado. Gracias!`);
  await notifyAdmin(`🔄 Viaje reconfirmado por ${driverPhone} para ${tripId} → ${trip.destination}`);
  log.info(`[RECONFIRM] OK trip ${tripId}`);
}

export async function handleDriverReconfirmNo(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("reconfirm_no_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await sendWhatsAppMessage(driverPhone, "Entendido. Vamos a buscar otro chofer para el viaje.");
  await notifyAdmin(`🔄 *Reasignar viaje*

El chofer ${driverPhone} no puede realizar el viaje ${tripId} → ${trip.destination}

Reasignar manualmente.`);

  // Reassign to principal
  const conv = await getConversationByPhone(trip.client_phone);
  if (conv) {
    const principal = await getPrincipalDriver();
    if (principal) {
      await advanceToNivel1(conv.id, trip.client_phone);
      await offerToSpecificDriver(
        principal.phone, trip, conv.id,
        `🔄 *REASIGNACIÓN — RESERVA*`,
        `Otro chofer no pudo. Te ofrecemos este viaje (principal).`
      );
    }
  }

  log.info(`[RECONFIRM] NO trip ${tripId}`);
}

export async function handleComisionOk(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("comision_ok_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await setCommissionDeclared(tripId);
  const commission = trip.commission_amount || Math.round((trip.price_base || 0) * 0.15);
  await sendWhatsAppMessage(driverPhone, `✅ Comisión de $${commission.toLocaleString("es-AR")} confirmada. Gracias!`);
  log.info(`[COMISION] OK trip ${tripId} comision=${commission}`);
}

export async function handleComisionRevision(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("comision_revision_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await notifyAdmin(`📝 *Revisión de comisión solicitada*

Chofer: ${driverPhone}
Viaje: ${tripId} → ${trip.destination}
Comisión actual: $${(trip.commission_amount || Math.round((trip.price_base || 0) * 0.15)).toLocaleString("es-AR")}

El chofer pide revisar la comisión. Contactarlo manualmente.`);
  log.info(`[COMISION] Revision solicitada trip ${tripId}`);
}

export async function handleContingenciaSi(convId: number, clientPhone: string): Promise<void> {
  log.info(`[CONTINGENCIA] Sí aceptado para conv ${convId}`);

  const dataValue = await getConnectionValue(`contingency_data_${convId}`);
  if (!dataValue) {
    log.info(`[CONTINGENCIA] No hay data para conv ${convId}`);
    return;
  }

  let origData: Record<string, any>;
  try { origData = JSON.parse(dataValue); } catch { return; }
  await deleteConnectionKey(`contingency_data_${convId}`);
  await deleteConnectionKey(`contingency_offered_${convId}`);

  // Mark original trip as completed to avoid conflicts
  const existingTrip = await getActiveTripByPhone(clientPhone);
  if (existingTrip) {
    await updateTripState(existingTrip.trip_id, "completado");
  }

  // Find standard 4p tariff for this route
  const tariff = await findTariff(origData.origin, origData.destination, 4);
  const price4p = tariff?.price || origData.price_base || 0;

  // Calculate passengers split
  const paxA = Math.min(origData.passengers, 4);
  const paxB = origData.passengers - paxA;

  const aFleetCheck = await ensureFleetCanHandle(paxA, {
    phone: clientPhone,
    convId,
    origin: origData.origin,
    destination: origData.destination,
    source: "driver.contingency_trip_a",
  });
  if (!aFleetCheck.ok) {
    return;
  }

  // FASE 27 — Verificar integridad de datos de contingencia antes de crear trip
  const h3Validation = validateContingencyTripData(origData, paxA);
  if (!h3Validation.valid) {
    log.warn("[CONTINGENCY_DISPATCH_BLOCKED]", { trip: "A", missing: h3Validation.missing, convId });
    await sendWhatsAppMessage(clientPhone, "Lo sentimos, no pudimos procesar tu solicitud. Un operador te va a contactar.");
    await notifyAdmin(`❌ Contingencia Trip A bloqueada para conv ${convId}. Datos faltantes: ${h3Validation.missing.join(", ")}`);
    return;
  }

  // --- Trip A ---
  const tripIdA = `trip_contingency_${convId}_a_${Date.now()}`;
  await createTrip(tripIdA, clientPhone, origData.origin, origData.destination, price4p, paxA, undefined, origData.flight_number || undefined);
  await setConversationTrip(convId, tripIdA);
  const tripA = await getActiveTripByPhone(clientPhone);
  if (!tripA) return;

  if (tariff?.id) {
    await updateTripTariff(tripA.trip_id, tariff.id, tariff.price || 0);
  }

  // Store Trip B data for sequel
  const bData = JSON.stringify({
    origin: origData.origin,
    destination: origData.destination,
    price: price4p,
    passengers: paxB,
    paxA: paxA,
    flight_number: origData.flight_number || null,
    tariff_id: tariff?.id || null,
    piso: tariff?.price || 0,
  });
  await setConnectionValue(`contingency_pending_B_${convId}`, bData);

  await advanceToWaitingDriver(convId, clientPhone);
  await sendWhatsAppMessage(clientPhone, "¡Dale! Buscando los dos autos para vos...");
  await broadcastTripToDrivers(tripA, convId, clientPhone, "ahora", paxA);
  log.info(`[CONTINGENCIA] Trip A dispatchado para conv ${convId}`);
}

export async function handleContingenciaNo(convId: number, clientPhone: string): Promise<void> {
  log.info(`[CONTINGENCIA] No aceptado para conv ${convId}`);

  await deleteConnectionKey(`contingency_data_${convId}`);
  await deleteConnectionKey(`contingency_offered_${convId}`);

  await sendWhatsAppMessage(clientPhone, "No hay problema. Un operador se va a comunicar para ayudarte con tu viaje.");
  await notifyAdmin(`👎 *Contingencia rechazada*

Cliente: ${clientPhone}
Conversación: ${convId}

El cliente rechazó la opción de dos autos. Contactarlo manualmente.`);
  log.info(`[CONTINGENCIA] Rechazada para conv ${convId}`);
}
