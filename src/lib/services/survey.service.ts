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
    if (!shouldSendSurvey(trip)) continue;

    const clientMsg = `Hola! ¿Cómo estuvo tu viaje a ${trip.destination}?

Tu opinión nos ayuda a mejorar.`;

    await sendInteractiveButtons(trip.client_phone, clientMsg, [
      { id: `survey_ok_${trip.trip_id}`, title: "😊 Excelente" },
      { id: `survey_mid_${trip.trip_id}`, title: "😐 Bien" },
      { id: `survey_bad_${trip.trip_id}`, title: "😠 Mal" },
    ]);

    await markSurveySent(trip.trip_id);
    console.log(`[SURVEY] Enviada para trip ${trip.trip_id} a ${trip.client_phone}`);
  }

  if (trips.length > 0) {
    console.log(`[SURVEY] ${trips.length} encuesta(s) enviada(s)`);
  }
}

function shouldSendSurvey(trip: any): boolean {
  const now = new Date();
  const tripTime = new Date((trip.updated_at || trip.created_at) * 1000);
  const tripHour = tripTime.getHours();
  const hoursSince = (now.getTime() - tripTime.getTime()) / 3600000;

  if (hoursSince < 4) return false;

  const today = new Date(tripTime);
  today.setDate(tripTime.getDate());

  const nextDay = new Date(tripTime);
  nextDay.setDate(tripTime.getDate() + 1);

  function inWindow(startH: number, startM: number, endH: number, endM: number, base: Date = today): boolean {
    const start = new Date(base);
    start.setHours(startH, startM, 0, 0);
    const end = new Date(base);
    end.setHours(endH, endM, 0, 0);
    return now >= start && now <= end && hoursSince >= 4;
  }

  if (tripHour >= 5 && tripHour < 12) {
    return inWindow(8, 0, 10, 0, nextDay) || inWindow(18, 30, 20, 30, nextDay);
  }

  if (tripHour >= 12 && tripHour < 18) {
    return inWindow(18, 30, 21, 0) || inWindow(8, 0, 10, 0, nextDay);
  }

  if (tripHour >= 18) {
    return inWindow(14, 0, 16, 0, nextDay) || inWindow(18, 30, 20, 30, nextDay);
  }

  return inWindow(18, 30, 20, 30) || inWindow(10, 0, 12, 0, nextDay);
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
  console.log(`[SURVEY] Post-encuesta: nuevo lead para ${dest} de ${phone}`);
}
