// FASE 7: Business Engine Entry Point
// Consume output del pipeline de decisión y retorna significado de negocio.

import { computeLeadMaturity } from "./lead.maturity";
import { computeCustomerValue } from "./customer.value";
import { computeFunnelState } from "./funnel.state";
import type { BusinessInput, BusinessDecision } from "./types";

export function evaluateBusiness(input: BusinessInput): BusinessDecision {
  const leadMaturity = computeLeadMaturity(input);
  const customerValue = computeCustomerValue(input);
  const funnelState = computeFunnelState(input);

  return {
    leadMaturity,
    customerValue,
    funnelState,
    metadata: {
      derivedFrom: input.policyAction,
    },
  };
}

export { computeLeadMaturity } from "./lead.maturity";
export { computeCustomerValue } from "./customer.value";
export { computeFunnelState } from "./funnel.state";
export type { BusinessInput, BusinessDecision, LeadMaturity, CustomerValue, FunnelState } from "./types";
