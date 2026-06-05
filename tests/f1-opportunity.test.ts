import { describe, it, expect } from "vitest";

// Replicated pure logic from opportunity-engine.ts
const AIRPORT_PATTERN = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
const FALLS_PATTERN = /cataratas|falls/i;
const INTENT_KW_PATTERN = /city tour|cena( show)?|tour|excursión/i;

interface TestRule { label: string; priority: number }
interface TestCtx {
  origin: string; destination: string; entityMatches: string[];
  intentKeywords: string[]; hotelZone: boolean; hasPendingOpportunity: boolean;
}

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
      if (pattern.test(text)) return { matched: true, domains: entry.domains, ambiguous: entry.domains.length > 1 };
    }
  }
  return { matched: false, domains: [], ambiguous: false };
}

function matchRule(rule: TestRule, context: TestCtx): boolean {
  const label = rule.label.toLowerCase();
  const origin = context.origin.toLowerCase();
  const dest = context.destination.toLowerCase();

  if (label.includes("cataratas")) return !FALLS_PATTERN.test(origin) && !FALLS_PATTERN.test(dest);
  if (label.includes("retorno")) return AIRPORT_PATTERN.test(origin) && !AIRPORT_PATTERN.test(dest);

  const isCityTourOrShow = label.includes("city tour") || label.includes("cena show");
  if (!isCityTourOrShow) return false;

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
  return context.hotelZone;
}

const RULES: TestRule[] = [
  { label: "Cataratas Argentinas", priority: 10 },
  { label: "Traslado Retorno", priority: 20 },
  { label: "City Tour Básico", priority: 5 },
  { label: "Cena Show Premium", priority: 50 },
];

function evaluate(rules: TestRule[], ctx: TestCtx): TestRule[] {
  if (ctx.hasPendingOpportunity) return [];
  const matched = rules.filter((r) => matchRule(r, ctx)).sort((a, b) => b.priority - a.priority);
  return matched;
}

function ctx(overrides?: Partial<TestCtx>): TestCtx {
  return {
    origin: "Hotel Iguazú", destination: "Aeropuerto", entityMatches: [],
    intentKeywords: [], hotelZone: true, hasPendingOpportunity: false, ...overrides,
  };
}

describe("F1 — Opportunity Engine (matchRule)", () => {
  describe("Cataratas match", () => {
    it("matches when neither origin nor destination contain 'cataratas'", () => {
      expect(matchRule(RULES[0], ctx({ origin: "Hotel Centro", destination: "Aeropuerto" }))).toBe(true);
    });

    it("blocked when origin contains 'cataratas'", () => {
      expect(matchRule(RULES[0], ctx({ origin: "Hotel Cataratas", destination: "Aeropuerto" }))).toBe(false);
    });

    it("blocked when destination contains 'cataratas'", () => {
      expect(matchRule(RULES[0], ctx({ origin: "Hotel Centro", destination: "Cataratas" }))).toBe(false);
    });
  });

  describe("Aeropuerto Retorno match", () => {
    it("matches when origin has airport keyword and destination does not", () => {
      expect(matchRule(RULES[1], ctx({ origin: "Aeropuerto Iguazú", destination: "Hotel Centro" }))).toBe(true);
    });

    it("blocked when destination also has airport keyword", () => {
      expect(matchRule(RULES[1], ctx({ origin: "Aeropuerto Iguazú", destination: "Aeropuerto" }))).toBe(false);
    });

    it("blocked when origin has no airport keyword", () => {
      expect(matchRule(RULES[1], ctx({ origin: "Hotel Centro", destination: "Hotel" }))).toBe(false);
    });
  });

  describe("City Tour / Cena Show blocking without entity", () => {
    it("blocked when no entity matches and no intent keywords", () => {
      expect(matchRule(RULES[2], ctx({ origin: "Hotel", destination: "Centro", entityMatches: [], intentKeywords: [] }))).toBe(false);
    });

    it("blocked when no entity matches and intent keyword but no hotelZone", () => {
      expect(matchRule(RULES[2], ctx({ origin: "Hotel", destination: "Centro", entityMatches: [], intentKeywords: ["city tour"], hotelZone: false }))).toBe(false);
    });

    it("matches when no entity but has intent keyword and hotelZone", () => {
      expect(matchRule(RULES[2], ctx({ origin: "Hotel", destination: "Centro", entityMatches: [], intentKeywords: ["city tour"], hotelZone: true }))).toBe(true);
    });
  });

  describe("No duplication by pending_opportunity", () => {
    it("evaluate returns empty when pending opportunity exists", () => {
      const result = evaluate(RULES, ctx({ hasPendingOpportunity: true }));
      expect(result).toEqual([]);
    });

    it("evaluate returns matches when no pending opportunity", () => {
      const result = evaluate(RULES, ctx({ origin: "Hotel Centro", destination: "Aeropuerto", entityMatches: ["rafain cena show"], intentKeywords: ["city tour"] }));
      // Cataratas (no falls), Retorno (airport origin), Cena Show (entity) should match
      expect(result.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe("Priority ordering", () => {
    it("returns highest priority rule first", () => {
      const result = evaluate(RULES, ctx({ origin: "Hotel Centro", destination: "Aeropuerto", entityMatches: ["rafain cena show"], intentKeywords: ["city tour"] }));
      expect(result.length).toBeGreaterThan(0);
      // Cena Show Premium has highest priority (50)
      expect(result[0].priority).toBe(50);
      expect(result[0].label).toBe("Cena Show Premium");
    });
  });
});
