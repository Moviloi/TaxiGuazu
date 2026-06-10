import { getDbInstance } from "@/lib/db/database";
import type { ProviderAdjustmentRow, PromotionRow, PackageRow, OpportunityContext, Opportunity, OpportunityRuleRow } from "@/lib/db/types";
import type { PricingResult } from "./pricing-engine";
import { getActiveComplementRules, insertOpportunityLog } from "@/lib/db/database";
import { getEntityWeight } from "@/lib/services/f6-learning";
import { resolveEntityFromCatalog } from "@/lib/config/entity-catalog";

function getDb() {
  return getDbInstance();
}

async function queryOne<T>(sql: string, args?: any[]): Promise<T | null> {
  const rs = await getDb().execute({ sql, args: args ?? [] });
  return (rs.rows[0] as T | undefined) ?? null;
}

// ── Legacy complement opportunities (post-confirmation cross-sell) ──

const AIRPORT_PATTERN = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
const FALLS_PATTERN = /cataratas|falls/i;
const INTENT_KW_PATTERN = /city tour|cena( show)?|tour|excursión/i;
const entityLabels = new Set(["cena show", "city tour", "show"]);

function computeEntityWeightBoost(label: string, weights: Map<string, number>): number {
  const norm = label.toLowerCase();
  if (entityLabels.has(norm)) {
    for (const [entity, weight] of weights) {
      if (norm.includes(entity) || entity.includes(norm)) return Math.max(0, weight) * 0.2;
    }
  }
  return 0;
}

function matchRule(rule: OpportunityRuleRow, context: OpportunityContext): boolean {
  const label = rule.label.toLowerCase();
  const origin = context.origin.toLowerCase();
  const dest = context.destination.toLowerCase();

  if (label.includes("cataratas")) {
    return !FALLS_PATTERN.test(origin) && !FALLS_PATTERN.test(dest);
  }

  if (label.includes("retorno")) {
    return AIRPORT_PATTERN.test(origin) && !AIRPORT_PATTERN.test(dest);
  }

  const isCityTourOrShow = label.includes("city tour") || label.includes("cena show");
  if (isCityTourOrShow) {
    const entityText = `${origin} ${dest} ${context.entityMatches.join(" ")}`;
    const entityResult = resolveEntityFromCatalog(entityText);

    if (entityResult.matched) {
      if (entityResult.ambiguous) return false;
      if (!entityResult.domains.includes("SHOW_TURISTICO")) return false;
      return context.hotelZone;
    }

    const hasIntent = context.intentKeywords.some((kw) => INTENT_KW_PATTERN.test(kw));
    if (!hasIntent) return false;

    const singleKw = context.intentKeywords.length === 1;
    if (singleKw && /^cena$/i.test(context.intentKeywords[0])) return false;
    if (singleKw && /^show$/i.test(context.intentKeywords[0])) return false;

    if (!context.hotelZone) return false;

    return true;
  }

  return false;
}

export class OpportunityEngine {
  async evaluate(context: OpportunityContext, executor?: any): Promise<Opportunity[]> {
    if (context.hasPendingOpportunity) {
      console.log(`[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (pending opportunity exists)`);
      return [];
    }

    const rules = await getActiveComplementRules();
    if (rules.length === 0) {
      console.log(`[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (no active complements)`);
      return [];
    }

    const matched = rules.filter((r) => matchRule(r, context));
    const entityWeights = new Map<string, number>();
    for (const entity of context.entityMatches) {
      entityWeights.set(entity, await getEntityWeight(entity));
    }

    matched.sort((a, b) => {
      const aBoost = (context.memoryBoost || 0) + computeEntityWeightBoost(a.label, entityWeights);
      const bBoost = (context.memoryBoost || 0) + computeEntityWeightBoost(b.label, entityWeights);
      return (b.priority + bBoost) - (a.priority + aBoost);
    });

    if (matched.length === 0) {
      console.log(`[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (no matching rules)`);
      return [];
    }

    const top3 = matched.slice(0, 3);
    const opportunities: Opportunity[] = [];
    for (const rule of top3) {
      const logId = await insertOpportunityLog(
        context.conversationId,
        context.clientPhone,
        context.tripId,
        rule.id,
        "complement",
        rule.label,
        context.price,
        context.price,
        "post_confirmation",
        executor,
      );
      opportunities.push({
        type: "complement",
        ruleId: rule.id,
        label: rule.label,
        description: rule.description,
        originalPrice: context.price,
        offeredPrice: context.price,
        savings: 0,
        priority: rule.priority,
        logId,
      });
    }

    console.log(`[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=${opportunities.length} top="${top3.map((r) => r.label).join(", ")}"`);
    return opportunities;
  }
}

export const opportunityEngine = new OpportunityEngine();

// ── New commercial opportunity evaluation (pricing-aware) ──

export type OpportunityType = "promotion" | "provider_adjustment" | "package" | "tg_campaign" | "complement";

export interface OpportunityOffer {
  type: OpportunityType;
  label: string;
  description: string | null;
  savings: number;
  already_applied: boolean;
  valid_until: number | null;
}

export interface OpportunityInput {
  pricingResult: PricingResult;
  tripContext: {
    origin: string;
    destination: string;
    tariff_id: number | null;
    passengers: number;
  };
  userIntent: string;
}

export interface OpportunityResult {
  available: boolean;
  opportunities: OpportunityOffer[];
}

const OPPORTUNITY_KEYWORDS = /\b(descuento|promo|beneficio|oferta|mejor precio|más barato|rebaja|promoción|descuentito|economic|economico|más económico)\b/i;

export function isOpportunityQuery(text: string): boolean {
  return OPPORTUNITY_KEYWORDS.test(text);
}

export async function evaluateOpportunities(input: OpportunityInput): Promise<OpportunityResult> {
  const opportunities: OpportunityOffer[] = [];
  const p = input.pricingResult;
  const now = Math.floor(Date.now() / 1000);

  // 1. Already applied adjustments (from pricing result)
  for (const adj of p.adjustments) {
    opportunities.push({
      type: adj.type as OpportunityType,
      label: adj.reason,
      description: null,
      savings: Math.abs(adj.amount),
      already_applied: true,
      valid_until: adj.valid_until,
    });
  }

  // 2. Provider adjustments not yet applied
  if (p.tariff_id) {
    const providerAdj = await queryOne<ProviderAdjustmentRow>(
      `SELECT * FROM provider_adjustments
       WHERE tariff_id = ? AND active = 1
         AND (valid_from IS NULL OR valid_from <= ?)
         AND (valid_until IS NULL OR valid_until >= ?)
       ORDER BY adjustment_value DESC LIMIT 1`,
      [p.tariff_id, now, now]
    );
    if (providerAdj && !p.adjustments.some(a => a.type === "provider_adjustment")) {
      const savings = Math.round(p.final_price * providerAdj.adjustment_value / 100);
      opportunities.push({
        type: "provider_adjustment",
        label: `Ajuste del proveedor: ${providerAdj.adjustment_value}%`,
        description: null,
        savings,
        already_applied: false,
        valid_until: providerAdj.valid_until,
      });
    }
  }

  // 3. Promotions not yet applied
  const promo = await queryOne<PromotionRow>(
    `SELECT * FROM promotions
     WHERE source = 'promotion' AND active = 1
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (valid_until IS NULL OR valid_until >= ?)
       AND (max_uses IS NULL OR current_uses < max_uses)
       AND (min_passengers IS NULL OR ? >= min_passengers)
       AND (max_passengers IS NULL OR ? <= max_passengers)
       AND (
         (origin_place_id IS NULL OR origin_place_id = ?)
         AND (destination_place_id IS NULL OR destination_place_id = ?)
       )
     ORDER BY adjustment_pct DESC LIMIT 1`,
    [now, now, input.tripContext.passengers, input.tripContext.passengers,
     p.origin.place_id, p.destination.place_id]
  );
  if (promo && !p.adjustments.some(a => a.type === "promotion")) {
    const savings = Math.round(p.final_price * promo.adjustment_pct / 100);
    opportunities.push({
      type: "promotion",
      label: promo.name,
      description: promo.description,
      savings,
      already_applied: false,
      valid_until: promo.valid_until,
    });
  }

  // 4. Packages not yet applied
  const pkg = await queryOne<PackageRow>(
    `SELECT * FROM packages
     WHERE active = 1
       AND (valid_from IS NULL OR valid_from <= ?)
       AND (valid_until IS NULL OR valid_until >= ?)
       AND (
         (origin_place_id IS NULL OR origin_place_id = ?)
         AND (destination_place_id IS NULL OR destination_place_id = ?)
       )
     ORDER BY price ASC LIMIT 1`,
    [now, now, p.origin.place_id, p.destination.place_id]
  );
  if (pkg && pkg.price < p.final_price && !p.adjustments.some(a => a.type === "package")) {
    opportunities.push({
      type: "package",
      label: pkg.name,
      description: pkg.description,
      savings: p.final_price - pkg.price,
      already_applied: false,
      valid_until: pkg.valid_until,
    });
  }

  return {
    available: opportunities.length > 0,
    opportunities,
  };
}

export function formatOpportunityResponse(
  result: OpportunityResult,
  lang: string,
): string {
  if (!result.available) {
    return lang.startsWith("pt")
      ? "No momento, não há benefícios adicionais disponíveis para esta rota. O preço oficial já é o melhor que podemos oferecer."
      : "Por el momento no hay beneficios adicionales disponibles para esta ruta. El precio oficial ya es el mejor que podemos ofrecer.";
  }

  const lines: string[] = [];
  const applied = result.opportunities.filter(o => o.already_applied);
  const available = result.opportunities.filter(o => !o.already_applied);

  if (applied.length > 0) {
    lines.push(lang.startsWith("pt")
      ? "✅ *Benefícios já aplicados ao preço:*"
      : "✅ *Beneficios ya aplicados al precio:*");
    for (const o of applied) {
      lines.push(`• ${o.label} (${lang.startsWith("pt") ? "economia" : "ahorro"}: $${o.savings})`);
    }
  }

  if (available.length > 0) {
    if (lines.length > 0) lines.push("");
    lines.push(lang.startsWith("pt")
      ? "🎯 *Oportunidades disponíveis:*"
      : "🎯 *Oportunidades disponibles:*");
    for (const o of available) {
      const suffix = o.valid_until
        ? ` (${lang.startsWith("pt") ? "válido até" : "válido hasta"} ${new Date(o.valid_until * 1000).toLocaleDateString()})`
        : "";
      lines.push(`• ${o.label} — ${lang.startsWith("pt") ? "economia de" : "ahorro de"} $${o.savings}${suffix}`);
    }
  }

  return lines.join("\n");
}
