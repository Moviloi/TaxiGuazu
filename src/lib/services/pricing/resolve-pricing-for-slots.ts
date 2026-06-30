// Unified pricing facade — single entry point for all pricing operations.
// Consolidates calculatePrice + resolveTariff + divergence logging.
// INPUT: raw origin/destination strings + passenger count
// OUTPUT: canonical PricingResult + optional tariff divergence info

import { calculatePrice, type PricingResult } from "@/lib/services/pricing/pricing-engine";
import { resolveTariff } from "@/lib/services/pricing/tariff-resolver";

export type { PricingResult };

export interface PricingSlotsInput {
  origin: string;
  destination: string;
  passengers: number;
}

export interface PricingDivergence {
  v3Price: number;
  v2Price: number;
  level: string;
}

export interface ResolvedPricing {
  pricingResult: PricingResult;
  divergence: PricingDivergence | null;
  publicPrice4p: number | null;
  publicPrice6p: number | null;
}

export async function resolvePricingForSlots(input: PricingSlotsInput): Promise<ResolvedPricing> {
  const pricingResult = await calculatePrice(input);
  const tariffMatch = await resolveTariff(input.origin, input.destination, input.passengers);

  let divergence: PricingDivergence | null = null;
  if (tariffMatch.matched && pricingResult.final_price > 0 && Math.abs(tariffMatch.price - pricingResult.final_price) > 0) {
    divergence = {
      v3Price: pricingResult.final_price,
      v2Price: tariffMatch.price,
      level: tariffMatch.level,
    };
  }

  return { 
    pricingResult, 
    divergence,
    publicPrice4p: tariffMatch.publicPrice4p,
    publicPrice6p: tariffMatch.publicPrice6p,
  };
}
