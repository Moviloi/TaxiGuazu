// ARCHITECTURE NOTE: Tour resolver — separate from tariff-resolver.
// Tours represent round trips and multi-stop tours with waiting time.
// They are resolved independently from one-way tariffs.

import type { TourRow } from "@/lib/db/types";
import { findTour } from "@/lib/db/domains/tours";
import { resolveLocation } from "../geo/location-resolver";

export interface TourMatch {
  matched: boolean;
  tourId: number | null;
  name: string | null;
  tripType: "round_trip" | "tour" | null;
  waitHours: number;
  publicPrice4p: number | null;
  publicPrice6p: number | null;
  driverPrice4p: number | null;
  driverPrice6p: number | null;
  price: number;
  driverPayout: number;
  crossesBorder: boolean;
  waypoints: string[] | null;
  originPlaceId: string | null;
  destinationPlaceId: string | null;
  originZoneId: string | null;
  destinationZoneId: string | null;
}

function buildMatch(row: TourRow, pax: number): TourMatch {
  const price4p = row.price_4p ?? 0;
  const price6p = row.price_6p ?? 0;
  const price = pax > 4 ? price6p : price4p;
  const driverPayout = pax > 4
    ? (row.driver_price_6p ?? price6p)
    : (row.driver_price_4p ?? price4p);
  const waypoints = row.waypoints ? JSON.parse(row.waypoints) as string[] : null;

  return {
    matched: true,
    tourId: row.id,
    name: row.name,
    tripType: row.trip_type,
    waitHours: row.wait_hours,
    publicPrice4p: row.price_4p,
    publicPrice6p: row.price_6p,
    driverPrice4p: row.driver_price_4p,
    driverPrice6p: row.driver_price_6p,
    price,
    driverPayout,
    crossesBorder: (row.crosses_border ?? 0) === 1,
    waypoints,
    originPlaceId: row.origin_place_id,
    destinationPlaceId: row.destination_place_id,
    originZoneId: row.origin_zone_id,
    destinationZoneId: row.destination_zone_id,
  };
}

function notFound(): TourMatch {
  return {
    matched: false,
    tourId: null,
    name: null,
    tripType: null,
    waitHours: 0,
    publicPrice4p: null,
    publicPrice6p: null,
    driverPrice4p: null,
    driverPrice6p: null,
    price: 0,
    driverPayout: 0,
    crossesBorder: false,
    waypoints: null,
    originPlaceId: null,
    destinationPlaceId: null,
    originZoneId: null,
    destinationZoneId: null,
  };
}

/**
 * Resuelve un tour (round_trip o tour con espera) desde un origen dado.
 * El destino se resuelve por place_id o zone_id según el tour registrado.
 */
export async function resolveTour(
  origin: string,
  tripType?: "round_trip" | "tour",
  pax: number = 4,
): Promise<TourMatch> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));
  const originLoc = await resolveLocation(origin);
  const originPlaceId = originLoc.place_id;
  const originZoneId = originLoc.zone_id;

  // Buscar tour activo desde el origen
  const match = await findTour({
    originPlaceId: originPlaceId ?? undefined,
    originZoneId: originZoneId ?? undefined,
    tripType,
  });

  if (match) return buildMatch(match, paxNum);

  return notFound();
}

/**
 * Resuelve un tour desde place_id directamente (sin resolución de texto).
 */
export async function resolveTourByPlaceIds(
  originPlaceId: string,
  tripType?: "round_trip" | "tour",
  pax: number = 4,
): Promise<TourMatch> {
  const paxNum = Math.max(1, Math.min(pax || 1, 6));

  const match = await findTour({
    originPlaceId,
    tripType,
  });

  if (match) return buildMatch(match, paxNum);

  return notFound();
}
