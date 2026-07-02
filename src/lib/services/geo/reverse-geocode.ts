// REVERSE GEOCODING — coordenadas GPS → dirección legible.
// Usa Nominatim (OpenStreetMap) — gratuito, sin API key.
//
// Política de uso:
// - User-Agent header obligatorio
// - Máximo 1 request/segundo (rate limiting interno)
// - Atribución a OpenStreetMap (ver término legal)
//
// FUT-03: Soporte para mensajes de ubicación GPS de WhatsApp.

import { log } from "@/lib/utils/logger";

const NOMINATIM_URL = "https://nominatim.openstreetmap.org/reverse";
const USER_AGENT = "TaxiGuazuBot/1.0 (conversational-agent)";
const MIN_INTERVAL_MS = 1100; // 1.1s entre requests para respetar rate limit

let lastRequestTime = 0;

/**
 * Espera el tiempo necesario para respetar el rate limit de Nominatim.
 */
async function rateLimitWait(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    const wait = MIN_INTERVAL_MS - elapsed;
    await new Promise((resolve) => setTimeout(resolve, wait));
  }
  lastRequestTime = Date.now();
}

/**
 * Convierte coordenadas GPS a una dirección legible usando Nominatim (OSM).
 * @param lat Latitud
 * @param lon Longitud
 * @returns Dirección legible, ej: "Av. Brasil 1234, Puerto Iguazú"
 *          Fallback: "Ubicación: {lat}, {lon}" si la API falla
 */
export async function reverseGeocode(lat: number, lon: number): Promise<string> {
  try {
    await rateLimitWait();

    const params = new URLSearchParams({
      lat: String(lat),
      lon: String(lon),
      format: "json",
      "accept-language": "es",
      zoom: "16", // street-level detail
    });

    const response = await fetch(`${NOMINATIM_URL}?${params}`, {
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "application/json",
      },
      signal: AbortSignal.timeout(5000), // 5s timeout
    });

    if (!response.ok) {
      log.warn(`[GEOCODE] Nominatim error: ${response.status} ${response.statusText}`);
      return `Ubicación: ${lat}, ${lon}`;
    }

    const data = await response.json() as { display_name?: string; name?: string; address?: Record<string, string> };

    if (data.display_name) {
      // display_name es la dirección completa, ej:
      // "Aeropuerto Internacional Cataratas del Iguazú, Ruta 101, Puerto Iguazú, Departamento Iguazú, Misiones, Argentina"
      // Acortar a una versión más legible: primeros 2-3 componentes significativos
      const parts = data.display_name.split(",").map((p: string) => p.trim());
      const short = parts.slice(0, 3).join(", ");
      log.info(`[GEOCODE] Resuelto: ${short}`);
      return short;
    }

    // Fallback si Nominatim devuelve respuesta sin display_name
    return `Ubicación: ${lat}, ${lon}`;
  } catch (error) {
    log.warn("[GEOCODE] Error en reverseGeocode:", error);
    return `Ubicación: ${lat}, ${lon}`;
  }
}
