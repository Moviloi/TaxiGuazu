// FASE 6.5: GREETING Rule — prioridad 5
// Matches cuando intent === GREETING.
// Siempre → SMALLTALK

import type { PolicyRule } from "./types";

export const greetingRule: PolicyRule = {
  id: "GREETING_RULE",
  priority: 5,

  matches(input) {
    return input.intent === "GREETING";
  },

  execute(input) {
    return {
      action: "SMALLTALK",
      confidence: input.confidence,
      reasonCodes: ["GREETING_RULE_MATCH"],
      metadata: {},
    };
  },
};
