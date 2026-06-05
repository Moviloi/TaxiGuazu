// FASE 6.5: FALLBACK Rule — prioridad 999
// Siempre matchea. Captura cualquier intent no manejado.

import type { PolicyRule } from "./types";

export const fallbackRule: PolicyRule = {
  id: "FALLBACK",
  priority: 999,

  matches() {
    return true;
  },

  execute() {
    return {
      action: "ASK_CLARIFICATION",
      confidence: 0.5,
      reasonCodes: ["FALLBACK_RULE"],
      metadata: {},
    };
  },
};
