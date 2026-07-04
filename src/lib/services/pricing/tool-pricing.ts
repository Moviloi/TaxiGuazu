// Tool Pricing — contrato estable para cálculo de precios.
// Parte de AIT-021 (P1-tools). Wrapper alrededor de resolve-pricing-for-slots.ts.
// Consumido por el orquestador vía interfaz tipada.

import { z } from "zod";
import { resolvePricingForSlots } from "./resolve-pricing-for-slots";
import type { PricingResult } from "./resolve-pricing-for-slots";

// ── Tipos de entrada ──

export const PricingToolInputSchema = z.object({
  origin: z.string().min(1, "origin is required"),
  destination: z.string().min(1, "destination is required"),
  passengers: z.number().int().min(1).max(6),
  modality: z.string().optional(),
});
export type PricingToolInput = z.infer<typeof PricingToolInputSchema>;

// ── Tipos de salida ──

export interface PricingToolAdjustment {
  type: string;
  amount: number;
  description: string;
}

export const PricingToolOutputSchema = z.object({
  finalPrice: z.number(),
  basePrice: z.number(),
  currency: z.string().default("ARS"),
  tariffId: z.number().nullable(),
  level: z.string(),
  origin: z.object({
    canonicalName: z.string(),
    displayName: z.string().optional(),
    zoneId: z.string().nullable().optional(),
  }),
  destination: z.object({
    canonicalName: z.string(),
    displayName: z.string().optional(),
    zoneId: z.string().nullable().optional(),
  }),
  adjustments: z.array(z.object({
    type: z.string(),
    amount: z.number(),
    description: z.string(),
  })).optional(),
  breakdown: z.object({
    v2Price: z.number(),
    v3Price: z.number(),
    divergence: z.number().optional(),
  }).optional(),
});
export type PricingToolOutput = z.infer<typeof PricingToolOutputSchema>;

// ── Interfaz del tool ──

export interface PricingTool {
  calculatePrice(input: PricingToolInput): Promise<PricingToolOutput>;
}

// ── Implementación concreta ──

function toToolOutput(r: PricingResult): PricingToolOutput {
  return {
    finalPrice: r.final_price,
    basePrice: r.base_price,
    currency: "ARS",
    tariffId: r.tariff_id,
    level: r.level,
    origin: {
      canonicalName: (r as any).origin?.canonical_name ?? "",
    },
    destination: {
      canonicalName: (r as any).destination?.canonical_name ?? "",
    },
    adjustments: (r.adjustments as any[])?.map(a => ({
      type: a.type ?? "unknown",
      amount: a.amount ?? 0,
      description: a.description ?? a.type ?? "",
    })),
  };
}

export const pricingTool: PricingTool = {
  async calculatePrice(input: PricingToolInput): Promise<PricingToolOutput> {
    const parsed = PricingToolInputSchema.parse(input);
    const result = await resolvePricingForSlots({
      origin: parsed.origin,
      destination: parsed.destination,
      passengers: parsed.passengers,
    });
    return PricingToolOutputSchema.parse(toToolOutput(result.pricingResult));
  },
};
