// DEPENDENCIA: survey → lead-event-helpers → lead.service
// Dirección: trip-execution/survey.service → shared/lead-event-helpers → lead.service
// NO es circular — lead.service NO importa survey ni lead-event-helpers.
// Es acoplamiento vertical (post-venta → preventa): survey puede reiniciar el ciclo de venta
// inyectando un texto simulado en handleLeadMessage. Si lead.service cambia su semántica,
// survey se rompe sin razón semántica (riesgo documentado en DEBT-02).
//
// Solución futura: extraer "crear lead desde texto" a un servicio compartido
// (lead-injection.service) que survey y webhook consuman sin acoplarse directamente a lead.service.
import { handleLeadMessage } from "@/lib/services/lead.service";
import { log } from "@/lib/utils/logger";

export async function createNewLeadFromSurvey(
  phone: string,
  destination: string,
): Promise<void> {
  const destMap: Record<string, string> = {
    cataratas: "Hola! Quiero ir a Cataratas lado argentino",
    foz: "Hola! Quiero ir a Foz do Iguaçu",
  };

  const simulatedText = destMap[destination] || "Hola! Quiero info sobre un viaje";
  await handleLeadMessage(phone, simulatedText);
  log.info(`[SURVEY] Post-encuesta: nuevo lead destino=${destination}`);
}
