// FASE 6.5: POST_SERVICE Rule — prioridad 4
// Matches cuando intent === POST_SERVICE.
// Siempre → POST_SERVICE_HANDLE

import type { PolicyRule } from "./types";

export const postServiceRule: PolicyRule = {
  id: "POST_SERVICE_RULE",
  priority: 4,

  matches(input) {
    return input.intent === "POST_SERVICE";
  },

  execute(input) {
    return {
      action: "POST_SERVICE_HANDLE",
      confidence: input.confidence,
      reasonCodes: ["POST_SERVICE_RULE_MATCH"],
      metadata: {},
    };
  },
};
