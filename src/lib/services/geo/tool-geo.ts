// Tool Geo — contrato estable para resolución de ubicaciones.
// Parte de AIT-020 (P1-tools). Wrapper alrededor de location-resolver.ts.
// Consumido por el orquestador vía interfaz tipada.

import { z } from "zod";
import { resolveLocation } from "./location-resolver";
import type { PlaceCandidate } from "@/lib/db/domains/geo";

// Re-export de geo-engine.ts para compatibilidad con ExecutionDeps
// (resolveGeoRoute no es resolución de ubicación, es clasificación de ruta)
export { resolveGeoRoute } from "./geo-engine";

// ── Tipos de entrada ──

export const GeoToolInputSchema = z.object({
  text: z.string().min(1, "text is required"),
  lang: z.enum(["es", "en", "pt"]).optional(),
});
export type GeoToolInput = z.infer<typeof GeoToolInputSchema>;

// ── Tipos de salida ──

export interface GeoToolCandidate {
  placeId: string;
  canonicalName: string;
  displayName: string;
  city: string;
  country: string;
  placeType: string;
  zoneId: string;
}

export const GeoToolOutputSchema = z.object({
  placeId: z.string().nullable(),
  canonicalName: z.string().nullable(),
  displayName: z.string().nullable(),
  zoneId: z.string().nullable(),
  confidence: z.enum(["exact", "alias", "fuzzy", "not_found"]),
  candidates: z.array(z.object({
    placeId: z.string(),
    canonicalName: z.string(),
    displayName: z.string(),
    city: z.string(),
    country: z.string(),
    placeType: z.string(),
    zoneId: z.string(),
  })).optional(),
});
export type GeoToolOutput = z.infer<typeof GeoToolOutputSchema>;

// ── Interfaz del tool ──

export interface GeoTool {
  resolveLocation(input: GeoToolInput): Promise<GeoToolOutput>;
}

// ── Implementación concreta (wrapper sobre location-resolver.ts) ──

function candidateToTool(c: PlaceCandidate): GeoToolCandidate {
  return {
    placeId: c.place_id,
    canonicalName: c.canonical_name,
    displayName: c.display_name ?? c.canonical_name,
    city: c.city,
    country: c.country,
    placeType: c.place_type,
    zoneId: c.zone_id ?? "",
  };
}

export const geoTool: GeoTool = {
  async resolveLocation(input: GeoToolInput): Promise<GeoToolOutput> {
    const parsed = GeoToolInputSchema.parse(input);
    const result = await resolveLocation(parsed.text);

    const output: GeoToolOutput = {
      placeId: result.place_id,
      canonicalName: result.canonical_name,
      displayName: result.canonical_name ?? "",
      zoneId: result.zone_id,
      confidence: result.confidence,
    };

    // Si la resolución es ambigua, incluir candidatos para desambiguación
    if (result.confidence === "not_found" || result.confidence === "fuzzy") {
      const { searchPlaces } = await import("@/lib/db/domains/geo") as { searchPlaces: (text: string, limit?: number) => Promise<PlaceCandidate[]> };
      const raw = await searchPlaces(parsed.text);
      if (raw.length > 0) {
        output.candidates = raw.map(candidateToTool);
      }
    }

    return GeoToolOutputSchema.parse(output);
  },
};
