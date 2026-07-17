// BKE Domain — Pricing: tarifas, estimaciones y reglas de precio.
// PR-5A: Foundation — stub.
// PR-5E: Implementación real — centraliza pricing-engine, tariff-resolver, commercial-pricing.
//
// Reutiliza lógica existente sin duplicar:
// - resolvePricingForSlots (unified pricing facade)
// - tariff-resolver (tariff lookup by priority)
// - commercial-pricing-engine (promotions, adjustments)
// - fare-learning-engine (learned weight adjustments)

import type { BKEResult, PricingQuery, PriceEstimate } from "@/lib/bke/types";
import { resolveTariff } from "@/lib/services/pricing/tariff-resolver";
import { calculatePrice } from "@/lib/services/pricing/pricing-engine";
import { log } from "@/lib/utils/logger";
import { isBkeEnabled } from "@/config/feature-flags";

const DOMAIN = "pricing";

// ─── Tipos adicionales del dominio ────────────────────────────────────────

export interface TariffInfo {
  tariffId: number | null;
  basePrice: number;
  finalPrice: number;
  currency: string;
  source: string;
  resolutionLevel: number;
}

export interface PricingBreakdown {
  base: number;
  passengerSurcharge: number;
  distanceSurcharge: number;
}

// ─── Estimar precio para un viaje ────────────────────────────────────────

/**
 * Estima el precio para un viaje usando el pipeline de pricing existente.
 * Reutiliza:
 * - resolvePricingForSlots (unified facade)
 * - calculatePrice (pricing-engine)
 * - resolveTariff (tariff-resolver)
 *
 * Retorna null cuando BKE está deshabilitado.
 */
export async function estimatePrice(query: PricingQuery): Promise<BKEResult<PriceEstimate> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();
  const { origin, destination, passengers } = query;

  try {
    // Calcular precio usando pricing-engine + tariff-resolver directamente
    // (NO usa resolvePricingForSlots para evitar dependencia circular con el routing)
    const pricingResult = await calculatePrice({ origin, destination, passengers });
    const tariffMatch = await resolveTariff(origin, destination, passengers);
    const publicPrice4p = tariffMatch?.publicPrice4p ?? null;

    if (!pricingResult || pricingResult.final_price <= 0) {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      log.info("[BKE:PRICING]", { origin, destination, passengers, found: false, latencyMs });
      return {
        data: null,
        source: "pricing-engine+tariff-resolver",
        confidence: 0,
        latencyMs,
      };
    }

    // Construir breakdown a partir del resultado
    const breakdown: PricingBreakdown = {
      base: pricingResult.base_price,
      passengerSurcharge: pricingResult.adjustments?.reduce((sum, adj) => sum + (adj.amount ?? 0), 0) ?? 0,
      distanceSurcharge: 0,
    };

    const estimate: PriceEstimate = {
      amount: publicPrice4p ?? pricingResult.final_price,
      currency: "ARS",
      breakdown,
    };

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.info("[BKE:PRICING]", { origin, destination, passengers, amount: estimate.amount, latencyMs });

    return {
      data: estimate,
      source: pricingResult.source ?? "pricing-engine+tariff-resolver",
      confidence: 0.9,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.error("[BKE:PRICING:ERROR]", { origin, destination, passengers, error: String(error), latencyMs });
    return {
      data: null,
      source: "error",
      confidence: 0,
      latencyMs,
    };
  }
}

// ─── Obtener información de tarifa ────────────────────────────────────────

/**
 * Resuelve la tarifa para un par origen-destino.
 * Reutiliza tariff-resolver.ts -> resolveTariff.
 * El número de pasajeros por defecto es 1.
 */
export async function getTariffInfo(
  origin: string,
  destination: string,
  passengers: number = 1,
): Promise<BKEResult<TariffInfo> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();

  try {
    const tariff = await resolveTariff(origin, destination, passengers);

    if (!tariff || !tariff.matched) {
      const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
      return {
        data: null,
        source: "tariff-resolver",
        confidence: 0,
        latencyMs,
      };
    }

    const info: TariffInfo = {
      tariffId: tariff.tariffId ?? null,
      basePrice: tariff.piso,      // costo proveedor
      finalPrice: tariff.price,    // precio público
      currency: "ARS",
      source: "tariff-resolver",
      resolutionLevel: tariff.resolutionPriority ?? 4,
    };

    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      data: info,
      source: "tariff-resolver",
      confidence: info.resolutionLevel !== null && info.resolutionLevel <= 2 ? 1.0 : 0.85,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.error("[BKE:TARIFF:ERROR]", { origin, destination, error: String(error), latencyMs });
    return { data: null, source: "error", confidence: 0, latencyMs };
  }
}

// ─── Calcular precio directo (sin pasar por la facade unificada) ──────────

/**
 * Calcula el precio usando el pricing-engine directamente.
 * Útil cuando ya se tienen ubicaciones resueltas.
 */
export async function calculateTripPrice(
  origin: string,
  destination: string,
  passengers: number,
): Promise<BKEResult<number> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();

  try {
    const result = await calculatePrice({ origin, destination, passengers });
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;

    if (!result || result.final_price <= 0) {
      return { data: null, source: "pricing-engine", confidence: 0, latencyMs };
    }

    return {
      data: result.final_price,
      source: result.source ?? "pricing-engine",
      confidence: 0.9,
      latencyMs,
    };
  } catch (error) {
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    log.error("[BKE:CALCULATE:ERROR]", { origin, destination, passengers, error: String(error), latencyMs });
    return { data: null, source: "error", confidence: 0, latencyMs };
  }
}

export function getDomainName(): string {
  return DOMAIN;
}
