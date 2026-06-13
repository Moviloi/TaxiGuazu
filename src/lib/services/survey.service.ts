import { sendInteractiveButtons } from "@/lib/whatsapp/sender";
import {
  getTripsPendingSurvey,
  markSurveySent,
  setSurveyResponse,
  getTripById,
} from "@/lib/db/database";
import { handleLeadMessage } from "./lead.service";

export async function sendPendingSurveys(): Promise<void> {
  const trips = await getTripsPendingSurvey();

  for (const trip of trips) {
    const hoursSince = (Date.now() / 1000 - (trip.confirmed_at || trip.updated_at || trip.created_at || 0)) / 3600;
    if (hoursSince < 4) continue;
    if (trip.survey_sent) continue;

    const clientMsg = `Hola! ¿Cómo estuvo tu viaje a ${trip.destination}?

Tu opinión nos ayuda a mejorar.`;

    await sendInteractiveButtons(trip.client_phone, clientMsg, [
      { id: `survey_ok_${trip.trip_id}`, title: "😊 Excelente" },
      { id: `survey_mid_${trip.trip_id}`, title: "😐 Bien" },
      { id: `survey_bad_${trip.trip_id}`, title: "😠 Mal" },
    ]);

    await markSurveySent(trip.trip_id);
    console.log(`[SURVEY] Enviada trip=${trip.trip_id}`);
  }

  if (trips.length > 0) {
    console.log(`[SURVEY] ${trips.length} encuesta(s) enviada(s)`);
  }
}

export async function handleSurveyResponse(phone: string, buttonId: string): Promise<void> {
  const parts = buttonId.split("_");
  const rating = parts[1];
  const tripId = parts.slice(2).join("_");

  await setSurveyResponse(tripId, rating);

  const trip = await getTripById(tripId);
  if (!trip) return;

  const thanks = rating === "ok"
    ? "😊 ¡Qué bueno! Nos alegra que hayas tenido una buena experiencia."
    : rating === "mid"
    ? "Gracias por tu respuesta. Siempre buscamos mejorar."
    : "😔 Lamentamos que no haya sido la mejor experiencia. Vamos a tomar tu opinión para mejorar.";

  if (rating === "ok" || rating === "mid") {
    await sendInteractiveButtons(phone, `${thanks}\n\n¿Tenés pensado otro viaje próximamente?`, [
      { id: `newtrip_cataratas_${tripId}`, title: "Sí, Cataratas" },
      { id: `newtrip_foz_${tripId}`, title: "Sí, Foz" },
      { id: `newtrip_none_${tripId}`, title: "No por ahora" },
    ]);
  } else {
    await sendInteractiveButtons(phone, thanks, [
      { id: `newtrip_none_${tripId}`, title: "Entendido" },
    ]);
  }
}

export async function handleNewTripResponse(phone: string, buttonId: string): Promise<void> {
  const parts = buttonId.split("_");
  const dest = parts[1];

  if (dest === "none") return;

  const destMap: Record<string, string> = {
    cataratas: "Hola! Quiero ir a Cataratas lado argentino",
    foz: "Hola! Quiero ir a Foz do Iguaçu",
  };

  const simulatedText = destMap[dest] || "Hola! Quiero info sobre un viaje";
  await handleLeadMessage(phone, simulatedText);
  console.log(`[SURVEY] Post-encuesta: nuevo lead destino=${dest}`);
}
