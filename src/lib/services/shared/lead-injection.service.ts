import { handleLeadMessage } from "@/lib/services/lead.service";
import { log } from "@/lib/utils/logger";

export async function injectLeadFromText(phone: string, text: string): Promise<void> {
  await handleLeadMessage(phone, text);
  log.info(`[LEAD_INJECTION] Lead inyectado phone=******${phone.slice(-4)}`);
}
