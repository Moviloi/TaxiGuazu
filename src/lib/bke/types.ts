// BKE — Business Knowledge Engine: Tipos base del conocimiento de dominio.
// CE-3A: Business Knowledge Engine — knowledge retrieval & business logic.
// PR-5A: Foundation — tipos estables y desacoplados.

// ─── Genéricos ───────────────────────────────────────────────────────────────

/** Resultado genérico de una consulta BKE */
export interface BKEResult<T> {
  data: T | null;
  source: string; // Identificador del origen (ej: "db", "cache", "static")
  confidence: number; // 0.0 – 1.0
  latencyMs?: number;
}

// ─── Geo Domain ──────────────────────────────────────────────────────────────

export interface GeoQuery {
  text: string;
  context?: {
    origin?: string;
    destination?: string;
    language?: string;
  };
}

export interface PlaceMatch {
  placeId: string;
  canonicalName: string;
  zoneId: string | null;
  city: string;
  country: string;
  score: number; // 0.0 – 1.0
  aliases: string[];
}

export interface ZoneInfo {
  zoneId: string;
  name: string;
  city: string;
  proximityKm?: number;
}

// ─── Message Domain ──────────────────────────────────────────────────────────

export interface MessageQuery {
  key: string;
  lang: string;
  context?: Record<string, string>;
}

export interface MessageResult {
  key: string;
  resolved: string;
  lang: string;
  params: Record<string, string>;
}

// ─── Entity Domain ───────────────────────────────────────────────────────────

export interface EntityQuery {
  text: string;
  domains?: string[];
}

export interface EntityExtraction {
  entity: string;
  type: string; // "place", "time", "person", "service", etc.
  confidence: number;
  normalized: string;
  span: { start: number; end: number };
}

// ─── Pricing Domain ──────────────────────────────────────────────────────────

export interface PricingQuery {
  origin: string;
  destination: string;
  passengers: number;
  type?: "transfer" | "tour";
}

export interface PriceEstimate {
  amount: number;
  currency: string;
  breakdown: {
    base: number;
    passengerSurcharge: number;
    distanceSurcharge: number;
  };
  validUntil?: string;
}

// ─── Consulta unificada ──────────────────────────────────────────────────────

export type BKEQuery = GeoQuery | MessageQuery | EntityQuery | PricingQuery;
