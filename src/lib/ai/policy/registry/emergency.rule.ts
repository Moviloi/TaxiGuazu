// FASE 6.5: EMERGENCY Rule — prioridad 1
// Matches cuando intent === EMERGENCY o lateral.riskLevel === "high".

import type { PolicyRule } from "./types";

export const emergencyRule: PolicyRule = {
  id: "EMERGENCY_RULE",
  priority: 1,

  matches(input) {
    return input.intent === "EMERGENCY" || input.lateral?.riskLevel === "high";
  },

  execute(input) {
    const isEmergencyIntent = input.intent === "EMERGENCY";
    return {
      action: "ESCALATE_EMERGENCY",
      confidence: 1,
      reasonCodes: ["EMERGENCY_RULE_MATCH"],
      metadata: {
        triggeredBy: isEmergencyIntent ? "intent" : "riskLevel",
        originalIntent: input.intent,
      },
    };
  },
};
