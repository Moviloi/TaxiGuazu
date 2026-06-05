export type EntityDomain = "SHOW_TURISTICO" | "HOTEL" | "RESTAURANTE" | "TOUR" | "ATRACCION";

export interface EntityCatalogEntry {
  key: string;
  aliases: string[];
  domains: EntityDomain[];
  ambiguous: boolean;
  semanticAssociations: string[];
  patterns: RegExp[];
}

export const ENTITY_CATALOG: EntityCatalogEntry[] = [
  {
    key: "rafain",
    aliases: ["rafain", "rafain cena show", "rafain palace hotel", "rafain centro hotel"],
    domains: ["SHOW_TURISTICO", "HOTEL"],
    ambiguous: true,
    semanticAssociations: ["show", "cena show", "hotel zona"],
    patterns: [
      /rafain\s*cena\s*show/i,
      /rafain\s*(palace|centro)?\s*hotel/i,
      /rafain/i,
    ],
  },
  {
    key: "madero show",
    aliases: ["madero show"],
    domains: ["SHOW_TURISTICO"],
    ambiguous: false,
    semanticAssociations: ["cena show", "espectáculo"],
    patterns: [/madero\s*show/i],
  },
  {
    key: "itaipu",
    aliases: ["itaipu", "itaipú", "itaipú by night", "itaipu by night"],
    domains: ["ATRACCION", "SHOW_TURISTICO"],
    ambiguous: true,
    semanticAssociations: ["by night", "show", "represa"],
    patterns: [/itaipú\s*by\s*night/i, /itaipu\s*by\s*night/i, /itaipú/i, /itaipu/i],
  },
  {
    key: "cataratas",
    aliases: ["cataratas", "cataratas argentinas", "cataratas brasil"],
    domains: ["ATRACCION", "TOUR"],
    ambiguous: false,
    semanticAssociations: ["excursión", "argentina", "brasil"],
    patterns: [],
  },
  {
    key: "aeropuerto",
    aliases: ["aeropuerto", "aeroparque", "igr", "igu"],
    domains: ["TOUR"],
    ambiguous: false,
    semanticAssociations: ["traslado", "transfer", "taxi"],
    patterns: [],
  },
  {
    key: "dinner show",
    aliases: ["dinner show"],
    domains: ["SHOW_TURISTICO"],
    ambiguous: false,
    semanticAssociations: ["show", "cena show"],
    patterns: [/dinner\s*show/i],
  },
  {
    key: "show folklórico",
    aliases: ["show folklórico", "feirinha"],
    domains: ["SHOW_TURISTICO"],
    ambiguous: false,
    semanticAssociations: ["show", "folklore"],
    patterns: [/show\s*folklórico/i, /feirinha/i],
  },
  {
    key: "dreams show",
    aliases: ["dreams show"],
    domains: ["SHOW_TURISTICO"],
    ambiguous: false,
    semanticAssociations: ["show", "espectáculo"],
    patterns: [/dreams\s*show/i],
  },
  {
    key: "parque das aves",
    aliases: ["parque das aves"],
    domains: ["ATRACCION"],
    ambiguous: false,
    semanticAssociations: ["paseo", "naturaleza"],
    patterns: [/parque\s*das\s*aves/i],
  },
  {
    key: "marco das 3 fronteiras",
    aliases: ["marco das 3 fronteiras", "marco das três fronteiras"],
    domains: ["ATRACCION"],
    ambiguous: false,
    semanticAssociations: ["paseo", "frontera"],
    patterns: [/marco\s*das\s*3\s*fronteiras/i],
  },
];

export function getAllEntityKeys(): string[] {
  return ENTITY_CATALOG.map((e) => e.key);
}

export function getAllDomainPatterns(): RegExp[] {
  const seen = new Set<string>();
  const result: RegExp[] = [];
  for (const entry of ENTITY_CATALOG) {
    for (const p of entry.patterns) {
      const src = p.source;
      if (!seen.has(src)) {
        seen.add(src);
        result.push(p);
      }
    }
  }
  return result;
}

export function getEntityByKey(key: string): EntityCatalogEntry | undefined {
  return ENTITY_CATALOG.find((e) => e.key === key);
}

export function resolveEntityFromCatalog(text: string): { matched: boolean; domains: EntityDomain[]; ambiguous: boolean } {
  for (const entry of ENTITY_CATALOG) {
    for (const pattern of entry.patterns) {
      if (pattern.test(text)) {
        return {
          matched: true,
          domains: entry.domains,
          ambiguous: entry.ambiguous,
        };
      }
    }
  }
  return { matched: false, domains: [], ambiguous: false };
}

export function extractEntitiesFromCatalog(text: string): string[] {
  const found: string[] = [];
  const lower = text.toLowerCase();
  for (const entry of ENTITY_CATALOG) {
    if (entry.aliases.some((a) => lower.includes(a))) {
      found.push(entry.key);
    }
  }
  return found;
}
