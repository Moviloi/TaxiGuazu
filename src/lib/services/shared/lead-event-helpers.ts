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
