import {
  getWorkflow,
  advanceToNivel1,
} from "@/lib/utils/state-machine";
import {
  getActiveTripByPhone,
  getDriverByPhone,
  getFirstWaitingWorkflow,
  getTripByAssignedDriver,
  assignWorkflowAtomic,
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
  setComisionDeclarada,
  getTripById,
  getPrincipalDriver,
} from "@/lib/db/database";
import { notifyAdmin, notifyOtherDriversTaken, offerToSpecificDriver } from "./admin.service";
import { sendWhatsAppMessage, sendInteractiveButtons } from "@/lib/whatsapp/sender";

export function isGroupMessage(from: string): boolean {
  return from.endsWith("@g.us");
}

const ACEPTAR_KEYWORDS = ["acepto", "yo estoy", "yo voy", "lo tomo"];

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

  const workflow = await getWorkflow(convId);
  if (!workflow) return;
  const validStates = ["waiting_group", "nivel_1", "nivel_2", "nivel_3", "waiting_driver"];
  if (!validStates.includes(workflow.state)) return;

  await assignDriver(workflow, driverPhone);
}

export async function handleDriverAccept(driverPhone: string, text: string): Promise<void> {
  if (!isAccepting(text)) return;

  const workflow = await getFirstWaitingWorkflow();
  if (!workflow) return;

  await assignDriver(workflow, driverPhone);
}

export async function handleDriverArrived(driverPhone: string): Promise<void> {
  const trip = await getTripByAssignedDriver(driverPhone);
  if (!trip) return;

  await sendWhatsAppMessage(trip.client_phone, `🟢 *Chofer en camino*

Tu chofer está llegando al destino. Que tengas un buen viaje!`);
  console.log(`[LLEGUÉ] Chofer ${driverPhone} llegó, cliente ${trip.client_phone} notificado`);
}

export async function handleDriverEnViaje(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow) return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  await sendWhatsAppMessage(trip.client_phone, `🟢 *Chofer en camino*

${driverName} está en camino. Que tengas un buen viaje!`);
  console.log(`[EN VIAJE] Chofer ${driverPhone} en viaje, cliente ${trip.client_phone} notificado`);
}

export async function handleDriverCompleted(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow) return;

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  await completeTrip(trip.trip_id);

  // Set as preferred driver (Titular) for this client
  const existingPref = await getClientPreferredDriver(trip.client_phone);
  if (!existingPref) {
    await setClientPreferredDriver(trip.client_phone, driverPhone);
    console.log(`[TITULAR] Cliente ${trip.client_phone} → chofer ${driverPhone} (post-servicio)`);
  }

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

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
  const garantizado = trip.garantizado_base ?? Math.round(price * 0.85);
  const tg = price - garantizado;

  const completedMsg = `🎉 *Viaje completado*

${roleLine ? roleLine.trimStart() : ""}

💰 *Tarifa pública*: $${price.toLocaleString("es-AR")}
📊 *TG*: $${tg.toLocaleString("es-AR")}
💵 *Recibís*: $${garantizado.toLocaleString("es-AR")}
💳 *Pago*: Al chofer

👤 *Cliente*: ${trip.client_phone}`;

  await sendWhatsAppMessage(driverPhone, completedMsg);
  await notifyAdmin(`🎉 Viaje completado por ${driverName} (${driverPhone}). Destino: ${trip.destination}`);
}

export async function handleDriverButtonAccept(convId: number, driverPhone: string): Promise<void> {
  const workflow = await getWorkflow(convId);
  if (!workflow) return;
  const validStates = ["waiting_group", "nivel_1", "nivel_2", "nivel_3", "waiting_driver"];
  if (!validStates.includes(workflow.state)) return;

  await assignDriver(workflow, driverPhone);
}

async function assignDriver(workflow: any, driverPhone: string): Promise<void> {
  const convId = workflow.conversation_id || workflow.conversationId;

  const assigned = await assignWorkflowAtomic(convId, driverPhone);
  if (!assigned) {
    const updated = await getWorkflow(convId);
    if (updated?.assignedDriverPhone === driverPhone) {
      console.log(`[ASSIGN] Recuperado: ${driverPhone} ya estaba asignado a conv ${convId}`);
    } else {
      await sendWhatsAppMessage(driverPhone, "⚠️ El viaje ya fue asignado a otro chofer.");
      return;
    }
  }

  const trip = await getActiveTripByPhone(workflow.phone);
  if (!trip) return;

  const fin = await assignDriverToTrip(trip.trip_id, driverPhone);
  await incrementOfferAccepted(driverPhone);
  const commission = fin?.commission || 0;
  const payout = fin?.payout || trip.price_base || 0;
  const price = trip.price_base || 0;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  // Send clean post-acceptance message with actions
  const summary = `✅ *Viaje aceptado*

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

  const clientMsg = `✅ *Viaje confirmado*

Tu chofer es ${driverName}. Te contactará en breve.`;
  await sendWhatsAppMessage(workflow.phone, clientMsg);

  const dest = trip.destination || "No especificado";
  await notifyAdmin(`Viaje asignado a ${driverName} (${driverPhone}). Destino: ${dest}`);

  await notifyOtherDriversTaken(driverPhone, dest);
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
  await createTrip(tripId, lead.client_phone, lead.origin || "", lead.destination, lead.price || undefined, lead.passengers || undefined);
  await getOrCreateConversation(lead.client_phone);
  const conv = await getConversationByPhone(lead.client_phone);
  if (conv) await setConversationTrip(conv.id, tripId);

  // Assign this driver to the trip
  const fin = await assignDriverToTrip(tripId, driverPhone);
  const payout = fin?.payout || lead.price || 0;

  const driver = await getDriverByPhone(driverPhone);
  const driverName = driver?.name || "El chofer";

  // Notify driver
  await sendWhatsAppMessage(driverPhone, `✅ *Lead tomado exitosamente*\n\nCliente: ${lead.client_phone}\nDestino: ${lead.destination}\n💰 *Recibís*: $${payout.toLocaleString("es-AR")}\n\nContactá al cliente para coordinar.`);

  // Notify client
  await sendWhatsAppMessage(lead.client_phone, `✅ *Viaje confirmado*\n\nTu chofer es ${driverName}. Te contactará en breve.`);

  // Notify admin
  await notifyAdmin(`👤 Lead tomado por ${driverName} (${driverPhone})\nCliente: ${lead.client_phone}\nDestino: ${lead.destination}\nPrecio: $${lead.price}`);

  // Notify other drivers
  notifyOtherDriversTaken(driverPhone, lead.destination);

  console.log(`[LEAD] Tomado por ${driverPhone} para conv ${convId}: ${lead.destination}`);
}

export async function handleDriverReconfirmOk(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("reconfirm_ok_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await updateTripState(tripId, "reconfirmado_24hs");
  await sendWhatsAppMessage(driverPhone, `✅ Viaje a ${trip.destination} reconfirmado. Gracias!`);
  await notifyAdmin(`🔄 Viaje reconfirmado por ${driverPhone} para ${tripId} → ${trip.destination}`);
  console.log(`[RECONFIRM] OK ${driverPhone} trip ${tripId}`);
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

  console.log(`[RECONFIRM] NO ${driverPhone} trip ${tripId}`);
}

export async function handleComisionOk(buttonId: string, driverPhone: string): Promise<void> {
  const tripId = buttonId.replace("comision_ok_", "");
  const trip = await getTripById(tripId);
  if (!trip) return;

  await setComisionDeclarada(tripId);
  const commission = trip.commission_amount || Math.round((trip.price_base || 0) * 0.15);
  await sendWhatsAppMessage(driverPhone, `✅ Comisión de $${commission.toLocaleString("es-AR")} confirmada. Gracias!`);
  console.log(`[COMISION] OK ${driverPhone} trip ${tripId} comision=${commission}`);
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
  console.log(`[COMISION] Revision solicitada ${driverPhone} trip ${tripId}`);
}
