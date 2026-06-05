// FASE 6.5: NOW Rule — prioridad 2
// Matches cuando intent === NOW.
// dispatch_priority_max → PROCEED_NOW
// cualquier otro → ASK_CLARIFICATION

import type { PolicyRule } from "./types";

export const nowRule: PolicyRule = {
  id: "NOW_RULE",
  priority: 2,

  matches(input) {
    return input.intent === "NOW";
  },

  execute(input) {
    const flags = input.lateral?.contextFlags ?? [];
    return {
      action: flags.includes("dispatch_priority_max") ? "PROCEED_NOW" : "ASK_CLARIFICATION",
      confidence: input.confidence,
      reasonCodes: ["NOW_RULE_MATCH"],
      metadata: { lateral: input.lateral },
    };
  },
};
