// ARCHITECTURE NOTE (Phase D): Pricing domain — semi-frozen.
// Part of the pricing domain alongside pricing-engine.ts (frozen) and
// tariff-resolver.ts (semi-frozen). Must remain stable until pricing
// domain is fully unblocked for refactor.
// Future: integrate commercial rules into a unified pricing service.

import type { PromotionRow, PackageRow, ProviderAdjustmentRow } from "@/lib/db/types";
import { queryOne } from "@/lib/db/core/helpers";

// ── Types ──

export interface Adjustment {
  type: "promotion" | "provider_adjustment" | "package" | "tg_campaign";
  amount: number;
  reason: string;
  valid_until: number | null;
}

export interface CommercialInput {
  base_price: number;
  preliminary_price: number;
  tariff_id: number | null;
  origin_place_id: string | null;
  destination_place_id: string | null;
  origin_zone_id: string | null;
  destination_zone_id: string | null;
  passenger_count: number;
  modality: string | null;
}

export interface CommercialOutput {
  base_price: number;
  markup: number;
  adjustments: Adjustment[];
  final_price: number;
  source: "standard" | "promotion" | "provider_adjustment" | "package" | "tg_campaign";
  explanation: string[];
}

// ── Lookup interface (injectable for tests) ──

export interface CommercialLookups {
  findPromotion?: (input: CommercialInput, source: string) => Promise<PromotionRow | null>;
  findProviderAdjustment?: (input: CommercialInput) => Promise<ProviderAdjustmentRow | null>;
  findPackage?: (input: CommercialInput) => Promise<PackageRow | null>;
}

// ── Engine ──

export async function applyCommercialRules(
  input: CommercialInput,
  lookups?: CommercialLookups,
): Promise<CommercialOutput> {
  const l = lookups ?? {};
  const adjustments: Adjustment[] = [];
  const explanation: string[] = [];
  const preliminary = input.preliminary_price;
  const markup = preliminary - input.base_price;

  // 1) Promotions
  const promo = await (l.findPromotion ?? findActivePromotion)(input, "promotion");
  if (promo) {
    const amount = -Math.round(preliminary * promo.adjustment_pct / 100);
    adjustments.push({
      type: "promotion",
      amount,
      reason: promo.description ?? promo.name,
      valid_until: promo.valid_until ?? null,
    });
    explanation.push(`Promoción vigente: ${promo.name} (${promo.adjustment_pct}%) — $${Math.abs(amount)}`);
  }

  // 2) Provider adjustments
  const providerAdj = await (l.findProviderAdjustment ?? findProviderAdjustment)(input);
  if (providerAdj) {
    const amount = -Math.round(preliminary * providerAdj.adjustment_value / 100);
    adjustments.push({
      type: "provider_adjustment",
      amount,
      reason: `Ajuste del proveedor: ${providerAdj.adjustment_value}%`,
      valid_until: providerAdj.valid_until ?? null,
    });
    explanation.push(`Ajuste proveedor: ${providerAdj.adjustment_value}% — $${Math.abs(amount)}`);
  }

  // 3) Packages
  const pkg = await (l.findPackage ?? findApplicablePackage)(input);
  if (pkg && pkg.price < preliminary) {
    const amount = preliminary - pkg.price;
    adjustments.push({
      type: "package",
      amount: -Math.abs(amount),
      reason: pkg.description ?? pkg.name,
      valid_until: pkg.valid_until ?? null,
    });
    explanation.push(`Paquete disponible: ${pkg.name} — $${pkg.price}`);
  }

  // 4) TG campaigns
  const campaign = await (l.findPromotion ?? findActivePromotion)(input, "tg_campaign");
  if (campaign) {
    const amount = -Math.round(preliminary * campaign.adjustment_pct / 100);
    adjustments.push({
      type: "tg_campaign",
      amount,
      reason: campaign.description ?? campaign.name,
      valid_until: campaign.valid_until ?? null,
    });
    explanation.push(`Campaña TG: ${campaign.name} (${campaign.adjustment_pct}%) — $${Math.abs(amount)}`);
  }

  // Total adjustment never exceeds markup (preserves base_price)
  const totalRaw = adjustments.reduce((sum, a) => sum + a.amount, 0);
  const cappedTotal = Math.max(totalRaw, -markup);
  const final_price = Math.max(input.base_price, Math.round(preliminary + cappedTotal));

  let source: CommercialOutput["source"] = "standard";
  if (adjustments.length > 0) source = adjustments[0].type;

  return {
    base_price: input.base_price,
    markup,
    adjustments,
    final_price,
    source,
    explanation,
  };
}

// ── Default DB-backed lookups ──

async function findActivePromotion(input: CommercialInput, source: string): Promise<PromotionRow | null> {
  const now = Math.floor(Date.now() / 1000);
  return queryOne<PromotionRow>(
    `SELECT * FROM promotions
     WHERE source = ?
       AND active = 1
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (valid_until IS NULL OR valid_until >= ?)
       AND (max_uses IS NULL OR current_uses < max_uses)
       AND (min_passengers IS NULL OR ? >= min_passengers)
       AND (max_passengers IS NULL OR ? <= max_passengers)
       AND (
         (origin_place_id IS NULL OR origin_place_id = ?)
         AND (destination_place_id IS NULL OR destination_place_id = ?)
         AND (origin_zone_id IS NULL OR origin_zone_id = ?)
         AND (destination_zone_id IS NULL OR destination_zone_id = ?)
       )
     ORDER BY adjustment_pct DESC
     LIMIT 1`,
    [source, now, now, input.passenger_count, input.passenger_count,
     input.origin_place_id, input.destination_place_id,
     input.origin_zone_id, input.destination_zone_id]
  );
}

async function findProviderAdjustment(input: CommercialInput): Promise<ProviderAdjustmentRow | null> {
  if (!input.tariff_id) return null;
  const now = Math.floor(Date.now() / 1000);
  return queryOne<ProviderAdjustmentRow>(
    `SELECT * FROM provider_adjustments
     WHERE tariff_id = ?
       AND active = 1
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (valid_until IS NULL OR valid_until >= ?)
     ORDER BY adjustment_value DESC
     LIMIT 1`,
    [input.tariff_id, now, now]
  );
}

async function findApplicablePackage(input: CommercialInput): Promise<PackageRow | null> {
  const now = Math.floor(Date.now() / 1000);
  return queryOne<PackageRow>(
    `SELECT * FROM packages
     WHERE active = 1
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (valid_until IS NULL OR valid_until >= ?)
       AND (
         (origin_place_id IS NULL OR origin_place_id = ?)
         AND (destination_place_id IS NULL OR destination_place_id = ?)
         AND (origin_zone_id IS NULL OR origin_zone_id = ?)
         AND (destination_zone_id IS NULL OR destination_zone_id = ?)
       )
     ORDER BY price ASC
     LIMIT 1`,
    [now, now,
     input.origin_place_id, input.destination_place_id,
     input.origin_zone_id, input.destination_zone_id]
  );
}
