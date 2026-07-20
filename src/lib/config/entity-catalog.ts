export type EntityDomain = "SHOW_TURISTICO" | "HOTEL" | "RESTAURANTE" | "TOUR" | "ATRACCION";

export interface EntityCatalogEntry {
  key: string;
  aliases: string[];
  domains: EntityDomain[];
  ambiguous: boolean;
  semanticAssociations: string[];
  patterns: RegExp[];
}

// ── Compile-time default/fallback catalog ──
// P1-09: ENTITY_CATALOG se carga desde DB vía loadEntityCatalogFromDB().
// Los valores hardcodeados aquí son el fallback si DB no está disponible.

const DEFAULT_CATALOG: EntityCatalogEntry[] = [
  {
    key: "rafain",
    aliases: ["rafain", "rafain cena show", "rafain palace hotel", "rafain centro hotel"],
    domains: ["SHOW_TURISTICO", "HOTEL"],
    ambiguous: true,
    semanticAssociations: ["show", "cena show", "hotel zona"],
    patterns: [/rafain\s*cena\s*show/i, /rafain\s*(palace|centro)?\s*hotel/i, /rafain/i],
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

// Mutable reference — inicializado con defaults, reemplazable vía loadEntityCatalogFromDB()
let _catalog: EntityCatalogEntry[] = [...DEFAULT_CATALOG];

interface EntityPatternRow {
  entity_key: string;
  aliases_json: string;
  domains_json: string;
  ambiguous: number;
  semantic_associations_json: string;
  patterns_json: string;
}

/**
 * Carga el catálogo de entidades desde la tabla entity_patterns en DB.
 * Reemplaza la referencia mutable _catalog. Seguro de llamar múltiples veces.
 * Si DB no está disponible, los defaults hardcodeados se conservan.
 */
export async function loadEntityCatalogFromDB(): Promise<void> {
  try {
    const { query } = await import("@/lib/db/core/helpers");
    const rows = await query<EntityPatternRow>("SELECT * FROM entity_patterns");
    if (!rows || rows.length === 0) return;

    const loaded: EntityCatalogEntry[] = rows.map((r) => {
      const aliases: string[] = JSON.parse(r.aliases_json);
      const domains: EntityDomain[] = JSON.parse(r.domains_json);
      const semanticAssociations: string[] = JSON.parse(r.semantic_associations_json);
      const patternSources: string[] = JSON.parse(r.patterns_json);
      const patterns: RegExp[] = patternSources.map((src) => new RegExp(src, "i"));
      return {
        key: r.entity_key,
        aliases,
        domains,
        ambiguous: r.ambiguous !== 0,
        semanticAssociations,
        patterns,
      };
    });

    _catalog = loaded;
  } catch {
    // DB no disponible — conservar defaults
  }
}

export function getAllEntityKeys(): string[] {
  return _catalog.map((e) => e.key);
}

export function getAllDomainPatterns(): RegExp[] {
  const seen = new Set<string>();
  const result: RegExp[] = [];
  for (const entry of _catalog) {
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

export function resolveEntityFromCatalog(text: string): { matched: boolean; domains: EntityDomain[]; ambiguous: boolean } {
  for (const entry of _catalog) {
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
  for (const entry of _catalog) {
    if (entry.aliases.some((a) => lower.includes(a))) {
      found.push(entry.key);
    }
  }
  return found;
}

// Mantener ENTITY_CATALOG como export para compatibilidad con código legacy
/** @deprecated Usar las funciones exportadas (getAllEntityKeys, etc.) o loadEntityCatalogFromDB */
export const ENTITY_CATALOG: ReadonlyArray<EntityCatalogEntry> = DEFAULT_CATALOG;
