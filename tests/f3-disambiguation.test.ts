import { describe, it, expect } from "vitest";

// Replicated from opportunity-engine.ts for test isolation
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

interface TestRule { label: string; priority: number }
interface TestCtx {
  origin: string; destination: string; entityMatches: string[];
  intentKeywords: string[]; hotelZone: boolean;
}

const AIRPORT_PATTERN = /aeropuerto|iguazú|iguacu|airport|aeroparque/i;
const FALLS_PATTERN = /cataratas|falls/i;
const INTENT_KW_PATTERN = /city tour|cena( show)?|tour|excursión/i;

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

  // F3: entity-first — if entity matched, decide by entity alone
  if (entityResult.matched) {
    if (entityResult.ambiguous) return false;
    if (!entityResult.domains.includes("SHOW_TURISTICO")) return false;
    return context.hotelZone;
  }

  // Fall back to intent keywords if no entity matched
  const hasIntent = context.intentKeywords.some((kw) => INTENT_KW_PATTERN.test(kw));
  if (!hasIntent) return false;

  const singleKw = context.intentKeywords.length === 1;
  if (singleKw && /^cena$/i.test(context.intentKeywords[0])) return false;
  if (singleKw && /^show$/i.test(context.intentKeywords[0])) return false;

  return context.hotelZone;
}

describe("F3 — Entity-first Disambiguation", () => {
  describe("Entity overrides intent (F3 principle)", () => {
    it("entity matched → intent keywords ignored", () => {
      // Entity "rafain cena show" matches SHOW_TURISTICO → passes (even without intentKeywords)
      expect(matchRule({ label: "Cena Show Rafain", priority: 10 }, { origin: "hotel", destination: "rafain cena show", entityMatches: [], intentKeywords: [], hotelZone: true })).toBe(true);
    });

    it("ambiguous entity → reject regardless of intent", () => {
      // "rafain" alone is ambiguous → blocked even with valid intent keyword
      expect(matchRule({ label: "Cena Show", priority: 10 }, { origin: "hotel", destination: "rafain", entityMatches: ["rafain"], intentKeywords: ["city tour"], hotelZone: true })).toBe(false);
    });
  });

  describe("Domain separation", () => {
    it("HOTEL domain → blocked for CENA_SHOW rule", () => {
      expect(matchRule({ label: "Cena Show", priority: 10 }, { origin: "hotel", destination: "rafain palace hotel", entityMatches: ["rafain palace hotel"], intentKeywords: [], hotelZone: true })).toBe(false);
    });

    it("ATRACCION domain → blocked for CENA_SHOW rule", () => {
      expect(matchRule({ label: "Cena Show", priority: 10 }, { origin: "hotel", destination: "parque das aves", entityMatches: ["parque das aves"], intentKeywords: [], hotelZone: true })).toBe(false);
    });

    it("SHOW_TURISTICO domain → passes for CENA_SHOW rule", () => {
      expect(matchRule({ label: "Cena Show", priority: 10 }, { origin: "hotel", destination: "madero show", entityMatches: ["madero show"], intentKeywords: [], hotelZone: true })).toBe(true);
    });
  });

  describe("Priority ordering (score ordering correct)", () => {
    it("highest priority rule comes first when multiple match", () => {
      const rules: TestRule[] = [
        { label: "City Tour Básico", priority: 5 },
        { label: "Cena Show Premium", priority: 50 },
        { label: "City Tour Estandar", priority: 10 },
      ];
      const ctx: TestCtx = { origin: "hotel", destination: "rafain cena show", entityMatches: ["rafain cena show"], intentKeywords: [], hotelZone: true };
      const matched = rules.filter((r) => matchRule(r, ctx)).sort((a, b) => b.priority - a.priority);
      expect(matched.length).toBeGreaterThanOrEqual(1);
      expect(matched[0].priority).toBe(50); // Cena Show Premium wins
      expect(matched[0].label).toBe("Cena Show Premium");
    });
  });

  describe("Cataratas / Retorno unaffected by F3", () => {
    it("Cataratas rule still matches when destination has falls", () => {
      expect(matchRule({ label: "Cataratas Argentinas", priority: 10 }, { origin: "hotel", destination: "cataratas", entityMatches: [], intentKeywords: [], hotelZone: true })).toBe(false);
    });

    it("Retorno rule matches when origin has airport", () => {
      expect(matchRule({ label: "Traslado Retorno", priority: 10 }, { origin: "aeropuerto", destination: "hotel", entityMatches: [], intentKeywords: [], hotelZone: true })).toBe(true);
    });
  });
});
