import type { OpportunityContext, Opportunity, OpportunityRuleRow } from "@/lib/db/types";
import { getActiveComplementRules, insertOpportunityLog } from "@/lib/db/database";
import type { DbExecutor } from "@/lib/db/database";
import { getEntityWeight } from "@/lib/services/f6-learning";
import { resolveEntityFromCatalog } from "@/lib/config/entity-catalog";

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
  async evaluate(context: OpportunityContext, executor?: DbExecutor): Promise<Opportunity[]> {
    if (context.hasPendingOpportunity) {
      console.log(
        `[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (pending opportunity exists)`
      );
      return [];
    }

    const rules = await getActiveComplementRules();

    if (rules.length === 0) {
      console.log(
        `[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (no active complements)`
      );
      return [];
    }

    const matched = rules
      .filter((r) => matchRule(r, context));

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
      console.log(
        `[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=0 (no matching rules)`
      );
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

    console.log(
      `[OPPORTUNITY_ENGINE] evaluate context={tripId=${context.tripId}} result_count=${opportunities.length} top="${top3.map((r) => r.label).join(", ")}"`
    );

    return opportunities;
  }
}

export const opportunityEngine = new OpportunityEngine();
