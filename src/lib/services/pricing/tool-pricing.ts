// Tool Pricing — contrato estable para cálculo de precios.
// Parte de AIT-021 (P1-tools). Wrapper alrededor de resolve-pricing-for-slots.ts.
// Exporta SOLO la interfaz con Zod (PricingToolInput/Output/pricingTool).
// Las funciones originales se usan puertas adentro, no se re-exportan.

import { z } from "zod";
import { resolvePricingForSlots as _resolvePricingForSlots } from "./resolve-pricing-for-slots";
import type { PricingResult as _PricingResult } from "./resolve-pricing-for-slots";

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
  // New contract fields (camelCase)
  finalPrice: z.number(),
  basePrice: z.number(),
  currency: z.string().default("ARS"),
  tariffId: z.number().nullable(),
  level: z.string(),
  origin: z.object({
    canonicalName: z.string(),
    displayName: z.string().optional(),
    zoneId: z.string().nullable().optional(),
    place_id: z.string(),
    canonical_name: z.string(),
    zone_id: z.string(),
  }),
  destination: z.object({
    canonicalName: z.string(),
    displayName: z.string().optional(),
    zoneId: z.string().nullable().optional(),
    place_id: z.string(),
    canonical_name: z.string(),
    zone_id: z.string(),
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

  // Backward-compat fields (snake_case, mismo valor que camelCase)
  final_price: z.number(),
  base_price: z.number(),
  tariff_id: z.number().nullable(),
  markup: z.number().default(0),
  source: z.enum(["standard", "promotion", "provider_adjustment", "package", "tg_campaign"]).default("standard"),
  explanation: z.array(z.string()).default([]),
});
export type PricingToolOutput = z.infer<typeof PricingToolOutputSchema>;

// ── Interfaz del tool ──

export interface PricingTool {
  calculatePrice(input: PricingToolInput): Promise<PricingToolOutput>;
}

// ── Implementación concreta ──

/** Convierte PricingResult interno → PricingToolOutput (contrato público).
 *  Exportado para uso en la frontera entre capas. */
export function pricingResultToToolOutput(r: _PricingResult): PricingToolOutput {
  return {
    finalPrice: r.final_price,
    basePrice: r.base_price,
    currency: "ARS",
    tariffId: r.tariff_id,
    level: r.level,
    origin: {
      canonicalName: r.origin?.canonical_name ?? "",
      place_id: r.origin?.place_id ?? "",
      canonical_name: r.origin?.canonical_name ?? "",
      zone_id: r.origin?.zone_id ?? "",
    },
    destination: {
      canonicalName: r.destination?.canonical_name ?? "",
      place_id: r.destination?.place_id ?? "",
      canonical_name: r.destination?.canonical_name ?? "",
      zone_id: r.destination?.zone_id ?? "",
    },
    adjustments: r.adjustments?.map(a => ({
      type: a.type,
      amount: a.amount,
      description: a.reason ?? a.type,
    })),

    // Backward-compat
    final_price: r.final_price,
    base_price: r.base_price,
    tariff_id: r.tariff_id,
    markup: r.markup ?? 0,
    source: r.source,
    explanation: r.explanation,
  };
}

/** Convierte PricingToolOutput (contrato público) → PricingResult interno.
 *  Necesario en la frontera porque los consumidores legacy (executeTrip, etc.)
 *  todavía esperan PricingResult. */
export function pricingToolOutputToResult(target: PricingToolOutput): _PricingResult {
  return {
    base_price: target.base_price,
    markup: target.markup,
    adjustments: (target.adjustments ?? []).map(a => ({
      type: a.type as "promotion" | "provider_adjustment" | "package" | "tg_campaign",
      amount: a.amount,
      reason: a.description,
      valid_until: null,
    })),
    final_price: target.final_price,
    tariff_id: target.tariff_id,
    origin: {
      place_id: target.origin.place_id,
      canonical_name: target.origin.canonical_name,
      zone_id: target.origin.zone_id,
    },
    destination: {
      place_id: target.destination.place_id,
      canonical_name: target.destination.canonical_name,
      zone_id: target.destination.zone_id,
    },
    level: target.level,
    source: target.source,
    explanation: target.explanation,
  };
}

export const pricingTool: PricingTool = {
  async calculatePrice(input: PricingToolInput): Promise<PricingToolOutput> {
    const parsed = PricingToolInputSchema.parse(input);
    const result = await _resolvePricingForSlots({
      origin: parsed.origin,
      destination: parsed.destination,
      passengers: parsed.passengers,
    });
    return PricingToolOutputSchema.parse(pricingResultToToolOutput(result.pricingResult));
  },
};
