// FASE 6.5: BOOKING Rule — prioridad 3
// Matches cuando intent === BOOKING.
// riskLevel medium → PROCEED_BOOKING
// otro → ASK_CLARIFICATION

import type { PolicyRule } from "./types";

export const bookingRule: PolicyRule = {
  id: "BOOKING_RULE",
  priority: 3,

  matches(input) {
    return input.intent === "BOOKING";
  },

  execute(input) {
    return {
      action: input.lateral?.riskLevel === "medium" ? "PROCEED_BOOKING" : "ASK_CLARIFICATION",
      confidence: input.confidence,
      reasonCodes: ["BOOKING_RULE_MATCH"],
      metadata: {},
    };
  },
};
