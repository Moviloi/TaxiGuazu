// HUB DISCOUNT — pricing engine for multi-ride trips.
//
// Detects hubs (places appearing as origin AND destination in different legs),
// looks up round_trip prices in tours table, applies discount per segment.
//
// Regla de negocio:
//   Si existe round_trip entre A y B (en tours) → cada tramo A→B o B→A
//   en multi-ride cuesta round_trip_price / 2.
//   Si NO existe round_trip → cae a precio one_way (tariff normal).
//
// Auto-aprendizaje: si hubo descuento y no existía el tour, se inserta
// un nuevo registro en tours para futuras consultas.

import type { MultiRideBreakdown } from "@/lib/db/types";
import { resolveLocationToPlaceId } from "@/lib/services/geo/location-resolver";
import { resolveTariffByPlaceIds } from "@/lib/services/pricing/tariff-resolver";
import { findRoundTripBetween, insertTour } from "@/lib/db/domains/tours";
import { getPlaceZone } from "@/lib/db/domains/geo";
import { log } from "@/lib/utils/logger";

/** Factor de descuento para auto-learn: round_trip_price = oneWayPrice * 2 * DISCOUNT_FACTOR */
const DEFAULT_DISCOUNT_FACTOR = 0.9;

export interface LegPricingInput {
  seq: number;
  origin: string;       // raw text from user
  destination: string;  // raw text from user
  time: string | null;
}

export interface LegPricingResult {
  seq: number;
  origin: string;
  destination: string;
  time: string | null;
  oneWayPrice: number;
  discountedPrice: number;
  saving: number;
  hub: string | null;       // place_id del hub que tocó este leg (null si no aplica)
  roundTripId: number | null; // tour id usado (null si no se usó round_trip)
}

/**
 * Identifica hubs en un conjunto de legs.
 * Hub = lugar que aparece como origin en ≥1 leg Y como destination en ≥1 leg diferente.
 */
function detectHubs(legs: LegPricingInput[]): Set<string> {
  const asOrigin = new Set<string>();
  const asDest = new Set<string>();

  for (const leg of legs) {
    const oNorm = leg.origin.toLowerCase().trim();
    const dNorm = leg.destination.toLowerCase().trim();
    asOrigin.add(oNorm);
    asDest.add(dNorm);
  }

  // Hub: lugar que está TANTO en origins como en destinations
  const hubs = new Set<string>();
  for (const o of asOrigin) {
    if (asDest.has(o)) {
      hubs.add(o);
    }
  }

  return hubs;
}

/**
 * Resuelve el place_id para un texto de ubicación.
 * Cache con TTL para evitar resolver el mismo lugar múltiples veces
 * sin retener datos stale para siempre (P1-05).
 */
interface CacheEntry {
  value: string | null;
  timestamp: number;
}
const placeIdCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos

/** Normaliza texto: lowercase + trim + remove accents para key del cache */
function normalizeCacheKey(text: string): string {
  return text.toLowerCase().trim().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

async function resolvePlaceId(text: string): Promise<string | null> {
  const key = normalizeCacheKey(text);
  const entry = placeIdCache.get(key);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL_MS) {
    return entry.value;
  }
  const id = await resolveLocationToPlaceId(text);
  placeIdCache.set(key, { value: id, timestamp: Date.now() });
  return id;
}

/**
 * Precia un array de legs aplicando hub discount.
 *
 * @param legs - Los tramos del viaje multi-ride
 * @param passengers - Cantidad de pasajeros
 * @returns Breakdown con precios por leg y totales
 */
export async function priceMultiRideLegs(
  legs: LegPricingInput[],
  passengers: number,
): Promise<MultiRideBreakdown> {
  if (!legs || legs.length === 0) {
    return {
      legs: [],
      totalOneWay: 0,
      totalDiscounted: 0,
      totalSaving: 0,
      hubs: [],
    };
  }

  // 1. Detectar hubs a nivel textual
  const rawHubs = detectHubs(legs);
  const hubPlaceIds = new Map<string, string>(); // raw text → place_id

  for (const rawHub of rawHubs) {
    const pid = await resolvePlaceId(rawHub);
    if (pid) hubPlaceIds.set(rawHub, pid);
  }

  // 2. Preciar cada leg
  const results: LegPricingResult[] = [];
  let totalOneWay = 0;
  let totalDiscounted = 0;

  for (const leg of legs) {
    const originPid = await resolvePlaceId(leg.origin);
    const destPid = await resolvePlaceId(leg.destination);

    // One-way price from standard tariff
    let oneWayPrice = 0;
    if (originPid && destPid) {
      const tariff = await resolveTariffByPlaceIds(originPid, destPid, passengers);
      oneWayPrice = tariff.price;
    }
    if (oneWayPrice <= 0) oneWayPrice = 0; // fallback safe

    // Check if this leg touches a hub
    let discountedPrice = oneWayPrice;
    let saving = 0;
    let hub: string | null = null;
    let roundTripId: number | null = null;

    // Does this leg touch any hub? (origin or destination is a hub)
    for (const [rawHub, hubPid] of hubPlaceIds) {
      const legTouchesHub =
        leg.origin.toLowerCase().trim() === rawHub ||
        leg.destination.toLowerCase().trim() === rawHub;

      if (!legTouchesHub || !originPid || !destPid) continue;

      // Determine the "other end" of this leg (the non-hub place)
      const otherPid = leg.origin.toLowerCase().trim() === rawHub ? destPid : originPid;

      if (!otherPid) continue;

      // Look up round_trip in tours between hub and the other end
      const tour = await findRoundTripBetween(hubPid, otherPid);

      if (tour) {
        const roundTripPrice = passengers > 4
          ? (tour.price_6p ?? tour.price_4p ?? 0)
          : (tour.price_4p ?? tour.price_6p ?? 0);

        if (roundTripPrice > 0) {
          discountedPrice = roundTripPrice / 2;
          saving = oneWayPrice - discountedPrice;
          hub = hubPid;
          roundTripId = tour.id;
        }
      } else {
        // Auto-learn: round_trip no existe → crearlo para futuras consultas
        log.info("[HUB_DISCOUNT] auto-learn: creating round_trip", {
          hub: hubPid,
          other: otherPid,
          route: `${leg.origin} → ${leg.destination}`,
        });
        try {
          const tariff4p = await resolveTariffByPlaceIds(hubPid, otherPid, 4);
          const tariff6p = await resolveTariffByPlaceIds(hubPid, otherPid, 6);
          const price4p = tariff4p.publicPrice4p ?? tariff4p.price;
          const price6p = tariff6p.publicPrice6p ?? tariff6p.price;
          const driverPrice4p = tariff4p.driverPrice4p ?? Math.round(price4p * 0.6);
          const driverPrice6p = tariff6p.driverPrice6p ?? Math.round(price6p * 0.6);

          const hubZone = await getPlaceZone(hubPid);
          const otherZone = await getPlaceZone(otherPid);

          const newId = await insertTour({
            name: `${leg.origin} ↔ ${leg.destination} (ida y vuelta)`,
            trip_type: "round_trip",
            origin_place_id: hubPid,
            destination_place_id: otherPid,
            origin_zone_id: hubZone?.zone_id ?? null,
            destination_zone_id: otherZone?.zone_id ?? null,
            wait_hours: 2,
            price_4p: Math.round(price4p * 2 * DEFAULT_DISCOUNT_FACTOR),
            price_6p: Math.round(price6p * 2 * DEFAULT_DISCOUNT_FACTOR),
            driver_price_4p: Math.round(driverPrice4p * 2 * DEFAULT_DISCOUNT_FACTOR),
            driver_price_6p: Math.round(driverPrice6p * 2 * DEFAULT_DISCOUNT_FACTOR),
            crosses_border: 1, // default asumiendo multi-ride cruza frontera
          });
          if (newId) {
            log.info("[HUB_DISCOUNT] auto-learn: created tour id=" + newId);
          }
        } catch (e) {
          log.warn("[HUB_DISCOUNT] auto-learn failed: " + (e instanceof Error ? e.message : String(e)));
        }
      }

      break; // Solo aplicamos el primer hub que toque este leg
    }

    // Ensure we don't go below zero
    discountedPrice = Math.max(0, discountedPrice);
    saving = oneWayPrice - discountedPrice;

    totalOneWay += oneWayPrice;
    totalDiscounted += discountedPrice;

    results.push({
      seq: leg.seq,
      origin: leg.origin,
      destination: leg.destination,
      time: leg.time,
      oneWayPrice,
      discountedPrice,
      saving: Math.max(0, saving),
      hub,
      roundTripId,
    });
  }

  return {
    legs: results,
    totalOneWay,
    totalDiscounted,
    totalSaving: Math.max(0, totalOneWay - totalDiscounted),
    hubs: Array.from(hubPlaceIds.values()),
  };
}

export { detectHubs };
