// FASE 7: Customer Value
// Evalúa el valor potencial del cliente basado en señales del pipeline.

import type { BusinessInput, CustomerValue } from "./types";

function urgencyScore(input: BusinessInput): number {
  const { intent, policyAction, lateral } = input;

  // EMERGENCY → máxima urgencia
  if (intent === "EMERGENCY") return 1.0;

  // NOW → alta urgencia
  if (intent === "NOW") {
    const isMaxDispatch = lateral?.contextFlags?.some(
      (f) => f === "dispatch_max"
    );
    return isMaxDispatch ? 1.0 : 0.8;
  }

  // BOOKING → valor medio-alto
  if (intent === "BOOKING" || policyAction === "PROCEED_BOOKING") {
    return 0.7;
  }

  // RESCHEDULE → cliente existente
  if (intent === "RESCHEDULE") return 0.6;

  // PRE_BOOKING → prospecto calificado
  if (intent === "PRE_BOOKING") return 0.5;

  // COMMERCIAL → prospecto
  if (intent === "COMMERCIAL") return 0.4;

  // POST_SERVICE → cliente post-viaje
  if (intent === "POST_SERVICE") return 0.3;

  // GREETING, INFORMATIONAL → bajo
  return 0.2;
}

function riskPenalty(input: BusinessInput): number {
  const { lateral } = input;
  if (!lateral) return 0;
  if (lateral.riskLevel === "high") return -0.3;
  if (lateral.riskLevel === "medium") return -0.1;
  return 0;
}

export function computeCustomerValue(input: BusinessInput): CustomerValue {
  const base = urgencyScore(input);
  const penalty = riskPenalty(input);
  const score = Math.max(0, Math.min(1, base + penalty));

  if (score >= 0.8) return "premium";
  if (score >= 0.6) return "high";
  if (score >= 0.4) return "medium";
  return "low";
}
