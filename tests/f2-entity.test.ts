import { describe, it, expect } from "vitest";
import type { OpportunityContext, OpportunityRuleRow } from "@/lib/db/types";

const ENTITY_CATALOG: { patterns: RegExp[]; domains: string[] }[] = [
  { patterns: [/rafain\s*cena\s*show/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/madero\s*show/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/itaipú\s*by\s*night/i, /itaipu\s*by\s*night/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/dinner\s*show/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/show\s*folklórico/i, /feirinha/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/dreams\s*show/i], domains: ["SHOW_TURISTICO"] },
  { patterns: [/rafain\s*(palace|centro)?\s*hotel/i], domains: ["HOTEL"] },
  { patterns: [/marco\s*das\s*3\s*fronteiras/i, /parque\s*das\s*aves/i], domains: ["ATRACCION"] },
  { patterns: [/rafain/i], domains: ["HOTEL", "SHOW_TURISTICO"] },
  { patterns: [/itaipú/i, /itaipu/i], domains: ["ATRACCION", "SHOW_TURISTICO"] },
];

function resolveEntity(text: string): { matched: boolean; domains: string[]; ambiguous: boolean } {
  for (const entry of ENTITY_CATALOG) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        return { matched: true, domains: entry.domains, ambiguous: entry.domains.length > 1 };
      }
    }
  }
  return { matched: false, domains: [], ambiguous: false };
}

const AIRPORT_PATTERN = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
const FALLS_PATTERN = /cataratas|falls/i;
const INTENT_KW_PATTERN = /city tour|cena( show)?|tour|excursión/i;

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
    const entityResult = resolveEntity(entityText);

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

function rule(overrides?: Partial<OpportunityRuleRow>): OpportunityRuleRow {
  return { id: 1, opportunity_type: "complement", label: "City Tour", description: "", active: 1, priority: 10, trigger_type: "post_confirmation", tariff_id: null, config_json: null, valid_from: null, valid_until: null, created_at: 1000, ...overrides };
}

function ctx(overrides?: Partial<OpportunityContext>): OpportunityContext {
  return {
    tripId: "T1", clientPhone: "54911", origin: "Hotel Centro", destination: "Aeropuerto", passengers: 2, tariffId: null, price: 100, piso: 80, urgency: "normal", conversationId: 1, tripLegType: "hotel_to_airport", hotelZone: true, intentKeywords: [], entityMatches: [], hasPendingOpportunity: false, ...overrides,
  };
}

describe("F2 — Entity System", () => {
  describe("resolveEntity", () => {
    it("'rafain' alone → ambiguous (HOTEL | SHOW_TURISTICO)", () => {
      const r = resolveEntity("rafain");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(true);
      expect(r.domains).toContain("HOTEL");
      expect(r.domains).toContain("SHOW_TURISTICO");
    });

    it("'rafain cena show' → SHOW_TURISTICO (unambiguous)", () => {
      const r = resolveEntity("rafain cena show");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(false);
      expect(r.domains).toEqual(["SHOW_TURISTICO"]);
    });

    it("'rafain palace hotel' → HOTEL (unambiguous)", () => {
      const r = resolveEntity("rafain palace hotel");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(false);
      expect(r.domains).toEqual(["HOTEL"]);
    });

    it("'itaipú' alone → ambiguous (ATRACCION | SHOW_TURISTICO)", () => {
      const r = resolveEntity("itaipú");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(true);
    });

    it("'itaipú by night' → SHOW_TURISTICO (unambiguous)", () => {
      const r = resolveEntity("itaipú by night");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(false);
      expect(r.domains).toEqual(["SHOW_TURISTICO"]);
    });

    it("'parque das aves' → ATRACCION (unambiguous)", () => {
      const r = resolveEntity("parque das aves");
      expect(r.matched).toBe(true);
      expect(r.ambiguous).toBe(false);
      expect(r.domains).toEqual(["ATRACCION"]);
    });

    it("unknown text → no match", () => {
      const r = resolveEntity("cataratas argentinas");
      expect(r.matched).toBe(false);
      expect(r.ambiguous).toBe(false);
    });
  });

  describe("matchRule — City Tour / Cena Show entity integration", () => {
    it("ambiguous 'rafain' → blocks (returns false)", () => {
      expect(matchRule(rule({ label: "Cena Show Rafain" }), ctx({ entityMatches: ["rafain"], hotelZone: true }))).toBe(false);
    });

    it("'rafain cena show' → valid when hotelZone", () => {
      expect(matchRule(rule({ label: "Cena Show Rafain" }), ctx({ entityMatches: ["rafain cena show"], hotelZone: true }))).toBe(true);
    });

    it("HOTEL domain matched → blocked (not SHOW_TURISTICO)", () => {
      expect(matchRule(rule({ label: "Cena Show" }), ctx({ entityMatches: ["rafain palace hotel"], hotelZone: true }))).toBe(false);
    });

    it("no entity match + no intent keyword → blocked", () => {
      expect(matchRule(rule({ label: "Cena Show" }), ctx({ entityMatches: [], hotelZone: true }))).toBe(false);
    });

    it("no entity match + has intent keyword + hotelZone → valid", () => {
      expect(matchRule(rule({ label: "Cena Show" }), ctx({ entityMatches: [], intentKeywords: ["city tour"], hotelZone: true }))).toBe(true);
    });

    it("standalone 'cena' → blocked", () => {
      expect(matchRule(rule({ label: "Cena Show" }), ctx({ entityMatches: [], intentKeywords: ["cena"], hotelZone: true }))).toBe(false);
    });

    it("standalone 'show' → blocked", () => {
      expect(matchRule(rule({ label: "Cena Show" }), ctx({ entityMatches: [], intentKeywords: ["show"], hotelZone: true }))).toBe(false);
    });

    it("no hotelZone → blocked even with entity", () => {
      expect(matchRule(rule({ label: "Cena Show Rafain" }), ctx({ entityMatches: ["rafain cena show"], hotelZone: false }))).toBe(false);
    });
  });
});
