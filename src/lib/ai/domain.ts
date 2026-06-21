import type { Intent, ConversationDomain } from "./types";

const INTENT_TO_DOMAIN: Record<string, ConversationDomain> = {
  GREETING: "information",
  CONSULTA: "information",
  INFORMATIONAL: "information",
  AMBIGUOUS: "information",
  COMMERCIAL: "commercial",
  PRE_BOOKING: "reservation",
  BOOKING: "reservation",
  RESCHEDULE: "reservation",
  POST_SERVICE: "reservation",
  NOW: "dispatch",
  EMERGENCY: "dispatch",
};

export function mapIntentToDomain(intent: Intent): ConversationDomain {
  return INTENT_TO_DOMAIN[intent] ?? "information";
}
