import { resolveLocation } from "./location-resolver";
import { resolveTariff, resolveTariffByPlaceIds } from "./tariff-resolver";
import { applyCommercialRules, type Adjustment } from "./commercial-pricing-engine";

export interface PricingRequest {
  origin: string;
  destination: string;
  passengers: number;
  modality?: string;
  customerPhone?: string;
}

export interface PricingResult {
  base_price: number;
  markup: number;
  adjustments: Adjustment[];
  final_price: number;
  tariff_id: number | null;
  origin: {
    place_id: string | null;
    canonical_name: string | null;
    operational_zone: string | null;
  };
  destination: {
    place_id: string | null;
    canonical_name: string | null;
    operational_zone: string | null;
  };
  level: string;
  source: "standard" | "promotion" | "provider_adjustment" | "package" | "tg_campaign";
  explanation: string[];
}

export async function calculatePrice(req: PricingRequest): Promise<PricingResult> {
  const pax = Math.max(1, Math.min(req.passengers || 1, 6));
  const explanation: string[] = [];

  // 1. Resolve locations
  const originLoc = await resolveLocation(req.origin);
  const destLoc = await resolveLocation(req.destination);

  explanation.push(`Origen: ${originLoc.canonical_name ?? req.origin} (${originLoc.confidence})`);
  explanation.push(`Destino: ${destLoc.canonical_name ?? req.destination} (${destLoc.confidence})`);

  if (!originLoc.place_id || !destLoc.place_id) {
    return {
      base_price: 0,
      markup: 0,
      adjustments: [],
      final_price: 0,
      tariff_id: null,
      origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, operational_zone: originLoc.operational_zone },
      destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, operational_zone: destLoc.operational_zone },
      level: "not_found",
      source: "standard",
      explanation: [...explanation, "No se pudo resolver una o ambas ubicaciones"],
    };
  }

  // 2. Resolve tariff
  const match = await resolveTariff(req.origin, req.destination, pax);

  if (!match.matched || !match.tariffId) {
    return {
      base_price: 0,
      markup: 0,
      adjustments: [],
      final_price: 0,
      tariff_id: null,
      origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, operational_zone: originLoc.operational_zone },
      destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, operational_zone: destLoc.operational_zone },
      level: match.level,
      source: "standard",
      explanation: [...explanation, `Sin tarifa para esta ruta (${match.level})`],
    };
  }

  explanation.push(`Tarifa encontrada: nivel ${match.level}, id=${match.tariffId}`);

  // 3. Base price = provider cost, preliminary price = base + TG markup
  const base_price = match.piso;
  const preliminary_price = match.price;
  const markup = preliminary_price - base_price;
  explanation.push(`Base price (costo proveedor): $${base_price}`);
  explanation.push(`Markup TaxiGuazú: $${markup}`);

  // 4. Apply commercial rules
  const commercial = await applyCommercialRules({
    base_price,
    preliminary_price,
    tariff_id: match.tariffId,
    origin_place_id: originLoc.place_id,
    destination_place_id: destLoc.place_id,
    origin_zone_id: originLoc.operational_zone,
    destination_zone_id: destLoc.operational_zone,
    passenger_count: pax,
    modality: req.modality ?? null,
  });

  explanation.push(...commercial.explanation);
  explanation.push(`Precio final: $${commercial.final_price}`);

  return {
    base_price: commercial.base_price,
    markup: commercial.markup,
    adjustments: commercial.adjustments,
    final_price: commercial.final_price,
    tariff_id: match.tariffId,
    origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, operational_zone: originLoc.operational_zone },
    destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, operational_zone: destLoc.operational_zone },
    level: match.level,
    source: commercial.source,
    explanation,
  };
}

export async function calculatePriceByPlaceIds(
  originPlaceId: string,
  destinationPlaceId: string,
  passengers: number,
): Promise<PricingResult> {
  const pax = Math.max(1, Math.min(passengers || 1, 6));
  const explanation: string[] = [];

  const match = await resolveTariffByPlaceIds(originPlaceId, destinationPlaceId, pax);

  if (!match.matched || !match.tariffId) {
    return {
      base_price: 0,
      markup: 0,
      adjustments: [],
      final_price: 0,
      tariff_id: null,
      origin: { place_id: originPlaceId, canonical_name: null, operational_zone: match.originZoneId },
      destination: { place_id: destinationPlaceId, canonical_name: null, operational_zone: match.destinationZoneId },
      level: match.level,
      source: "standard",
      explanation: [...explanation, `Sin tarifa para place IDs (${match.level})`],
    };
  }

  explanation.push(`Tarifa encontrada: nivel ${match.level}, id=${match.tariffId}`);

  const base_price = match.piso;
  const preliminary_price = match.price;

  const commercial = await applyCommercialRules({
    base_price,
    preliminary_price,
    tariff_id: match.tariffId,
    origin_place_id: originPlaceId,
    destination_place_id: destinationPlaceId,
    origin_zone_id: match.originZoneId,
    destination_zone_id: match.destinationZoneId,
    passenger_count: pax,
    modality: null,
  });

  return {
    base_price: commercial.base_price,
    markup: commercial.markup,
    adjustments: commercial.adjustments,
    final_price: commercial.final_price,
    tariff_id: match.tariffId,
    origin: { place_id: originPlaceId, canonical_name: null, operational_zone: match.originZoneId },
    destination: { place_id: destinationPlaceId, canonical_name: null, operational_zone: match.destinationZoneId },
    level: match.level,
    source: commercial.source,
    explanation: [...explanation, ...commercial.explanation],
  };
}
