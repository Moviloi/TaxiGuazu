// Unified pricing facade — single entry point for all pricing operations.
// P2-01: Dual engine eliminated. Uses calculatePrice() exclusively.

import { calculatePrice, type PricingResult } from "@/lib/services/pricing/pricing-engine";

export type { PricingResult };

export interface PricingSlotsInput {
  origin: string;
  destination: string;
  passengers: number;
  dateTime?: Date;
}

export interface ResolvedPricing {
  pricingResult: PricingResult;
}

export async function resolvePricingForSlots(input: PricingSlotsInput): Promise<ResolvedPricing> {
  const pricingResult = await calculatePrice(input);
  return { pricingResult };
}
