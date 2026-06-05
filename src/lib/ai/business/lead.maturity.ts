// FASE 7: Lead Maturity
// Determina qué tan "maduro" está un lead para conversión.

import type { BusinessInput, LeadMaturity } from "./types";

export function computeLeadMaturity(input: BusinessInput): LeadMaturity {
  const { intent, policyAction, lateral } = input;

  // EMERGENCY → conversion_ready
  if (intent === "EMERGENCY" || policyAction === "ESCALATE_EMERGENCY") {
    return "conversion_ready";
  }

  // NOW → hot (or conversion_ready if dispatch_max)
  if (intent === "NOW" || policyAction === "PROCEED_NOW") {
    const isMaxDispatch = lateral?.contextFlags?.some(
      (f) => f === "dispatch_max"
    );
    return isMaxDispatch ? "conversion_ready" : "hot";
  }

  // BOOKING → warm
  if (intent === "BOOKING" || policyAction === "PROCEED_BOOKING") {
    return "warm";
  }

  // POST_SERVICE → warm (post-trip engagement)
  if (intent === "POST_SERVICE") {
    return "warm";
  }

  // GREETING + low confidence → cold
  if (intent === "GREETING") {
    return "cold";
  }

  // PRE_BOOKING → warm (near conversion)
  if (intent === "PRE_BOOKING") {
    return "warm";
  }

  // RESCHEDULE → warm (existing customer)
  if (intent === "RESCHEDULE") {
    return "warm";
  }

  // COMMERCIAL → warm (price inquiry)
  if (intent === "COMMERCIAL") {
    return "warm";
  }

  // INFORMATIONAL → cold
  if (intent === "INFORMATIONAL") {
    return "cold";
  }

  // AMBIGUOUS → cold
  return "cold";
}
