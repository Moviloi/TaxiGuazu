// BKE Domain — Entity: extracción y resolución de entidades.
// PR-5A: Foundation — stub.
// PR-5E: Implementación real — centraliza entity-extractor, entity-catalog, known places.
//
// Reutiliza lógica existente sin duplicar: delega a entity-extractor, entity-catalog,
// iguazu-knowledge y location-resolver.

import type { BKEResult, EntityExtraction, EntityQuery } from "@/lib/bke/types";
import { resolveEntityFromCatalog, extractEntitiesFromCatalog, ENTITY_CATALOG, type EntityDomain, type EntityCatalogEntry } from "@/lib/config/entity-catalog";
import { findKnownPlace } from "@/lib/ai/iguazu-knowledge";
import { resolveLocation } from "@/lib/services/geo/location-resolver";
import { log } from "@/lib/utils/logger";
import { isBkeEnabled } from "@/config/feature-flags";

const DOMAIN = "entity";

// ─── Extraer entidades desde texto libre ─────────────────────────────────

/**
 * Extrae entidades de texto libre usando el catálogo de entidades y
 * el conocimiento de lugares conocidos (0 LLM, 100% determinístico).
 *
 * Reutiliza:
 * - entity-catalog.ts -> extractEntitiesFromCatalog
 * - iguazu-knowledge.ts -> findKnownPlace
 * - location-resolver.ts -> resolveLocation
 *
 * Retorna array vacío si no se detectan entidades.
 * Retorna null cuando BKE está deshabilitado.
 */
export async function extractEntities(query: EntityQuery): Promise<BKEResult<EntityExtraction[]> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();
  const { text, domains } = query;
  const extractions: EntityExtraction[] = [];

  // 1. Intentar desde el catálogo de entidades (entity-catalog.ts)
  // extractEntitiesFromCatalog retorna string[] de keys. Buscar la entrada completa
  // en ENTITY_CATALOG para obtener metadatos (domain, aliases, etc.)
  const catalogKeys = extractEntitiesFromCatalog(text);
  for (const key of catalogKeys) {
    const fullEntry = ENTITY_CATALOG.find(e => e.key === key);

    // Verificar si el dominio está en los filtros solicitados
    if (domains && domains.length > 0 && fullEntry) {
      const hasRequestedDomain = fullEntry.domains.some(d => domains.includes(d));
      if (!hasRequestedDomain) continue;
    }

    extractions.push({
      entity: key,
      type: fullEntry?.domains[0] ?? "unknown",
      confidence: 0.9,
      normalized: key,
      span: { start: 0, end: text.length },
    });
  }

  // 2. Intentar desde lugares conocidos (iguazu-knowledge.ts)
  if (!domains || domains.includes("place")) {
    const knownPlace = findKnownPlace(text);
    if (knownPlace) {
      // Evitar duplicados
      const alreadyExtracted = extractions.some(e => e.entity === knownPlace.name);
      if (!alreadyExtracted) {
        extractions.push({
          entity: knownPlace.name,
          type: "place",
          confidence: knownPlace.aliases.some(a => text.toLowerCase().includes(a.toLowerCase())) ? 0.9 : 0.7,
          normalized: knownPlace.name,
          span: { start: 0, end: text.length },
        });
      }
    }
  }

  // 3. Intentar resolución por ubicación (location-resolver.ts) para places
  if (!domains || domains.includes("place")) {
    const resolved = await resolveLocation(text);
    if (resolved.confidence !== "not_found" && resolved.canonical_name) {
      const alreadyExtracted = extractions.some(e => e.entity === resolved.canonical_name);
      if (!alreadyExtracted) {
        const confidenceMap: Record<string, number> = { exact: 1.0, alias: 0.95, fuzzy: 0.8 };
        extractions.push({
          entity: resolved.canonical_name,
          type: "place",
          confidence: confidenceMap[resolved.confidence] ?? 0.5,
          normalized: resolved.canonical_name,
          span: { start: 0, end: text.length },
        });
      }
    }
  }

  const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
  log.info("[BKE:ENTITY]", { text: text.slice(0, 50), matches: extractions.length, latencyMs });

  return {
    data: extractions,
    source: "entity-catalog+known-places+location-resolver",
    confidence: extractions.length > 0 ? Math.max(...extractions.map(e => e.confidence)) : 0,
    latencyMs,
  };
}

// ─── Resolver una entidad individual ─────────────────────────────────────

export interface ResolvedEntity {
  entity: string;
  domain: EntityDomain | "place" | "unknown";
  confidence: number;
  normalized: string;
}

/**
 * Resuelve un texto como entidad única (la más probable).
 * Útil para casos donde se espera una sola entidad (ej: "aeropuerto").
 */
export async function resolveEntity(text: string): Promise<BKEResult<ResolvedEntity> | null> {
  if (!isBkeEnabled()) return null;

  const startTime = performance.now();

  // 1. Intentar catálogo de entidades
  const catalogMatch = resolveEntityFromCatalog(text);
  if (catalogMatch.matched) {
    const matchedEntry = ENTITY_CATALOG.find(
      e => e.patterns.some(p => p.test(text))
    );
    const entityName = matchedEntry?.key ?? text;
    const primaryDomain = catalogMatch.domains[0] ?? "unknown";
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      data: { entity: entityName, domain: primaryDomain, confidence: catalogMatch.ambiguous ? 0.7 : 0.95, normalized: entityName },
      source: "entity-catalog",
      confidence: catalogMatch.ambiguous ? 0.7 : 0.95,
      latencyMs,
    };
  }

  // 2. Intentar lugar conocido
  const knownPlace = findKnownPlace(text);
  if (knownPlace) {
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      data: { entity: knownPlace.name, domain: "place", confidence: 0.9, normalized: knownPlace.name },
      source: "known-places",
      confidence: 0.9,
      latencyMs,
    };
  }

  // 3. Intentar resolución por ubicación
  const resolved = await resolveLocation(text);
  if (resolved.confidence !== "not_found" && resolved.canonical_name) {
    const confidenceMap: Record<string, number> = { exact: 1.0, alias: 0.95, fuzzy: 0.8 };
    const confidence = confidenceMap[resolved.confidence] ?? 0.5;
    const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
    return {
      data: { entity: resolved.canonical_name, domain: "place", confidence, normalized: resolved.canonical_name },
      source: "location-resolver",
      confidence,
      latencyMs,
    };
  }

  const latencyMs = Math.round((performance.now() - startTime) * 100) / 100;
  log.info("[BKE:ENTITY:RESOLVE]", { text: text.slice(0, 50), found: false, latencyMs });
  return { data: null, source: "entity", confidence: 0, latencyMs };
}

// ─── Obtener catálogo completo de entidades ──────────────────────────────

/**
 * Retorna el catálogo completo de entidades conocidas (para uso interno).
 * Re-export desde entity-catalog.ts (no duplica).
 */
export function getEntityCatalog(): EntityCatalogEntry[] {
  return ENTITY_CATALOG;
}

export function getDomainName(): string {
  return DOMAIN;
}
