// ARCHITECTURE NOTE: Pricing domain. Congelado durante Conversation Core MVP.
// Separa cálculo de tarifas de lógica conversacional. No mover.
import { resolveLocation } from "../geo/location-resolver";
import { resolveTariff } from "./tariff-resolver";
import { applyCommercialRules, type Adjustment } from "./commercial-pricing-engine";
import { getZoneSurcharge } from "@/lib/db/database";

export interface PricingRequest {
  origin: string;
  destination: string;
  passengers: number;
  modality?: string;
  customerPhone?: string;
  dateTime?: Date;
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
    zone_id: string | null;
  };
  destination: {
    place_id: string | null;
    canonical_name: string | null;
    zone_id: string | null;
  };
  level: string;
  source: "standard" | "promotion" | "provider_adjustment" | "package" | "tg_campaign" | "night_surcharge";
  explanation: string[];
}

export function isNightWindow(date: Date): boolean {
  // UTC-3 (Argentina): restar 3 horas de UTC
  const argHour = (date.getUTCHours() - 3 + 24) % 24;
  return argHour >= 22 || argHour < 6;
}

export async function applyNightSurcharge(
  price: number,
  originZoneId: string | null,
  destZoneId: string | null,
  dateTime: Date,
  adjustments: Adjustment[],
  explanation: string[],
): Promise<number> {
  const zoneIds = [originZoneId, destZoneId].filter(Boolean) as string[];
  for (const zoneId of zoneIds) {
    const surcharge = await getZoneSurcharge(zoneId);
    if (surcharge && surcharge.surcharge_pct > 0 && isNightWindow(dateTime)) {
      const amount = Math.round(price * surcharge.surcharge_pct / 100);
      adjustments.push({
        type: "night_surcharge",
        amount,
        reason: surcharge.surcharge_description ?? `Recargo nocturno ${surcharge.surcharge_pct}%`,
        valid_until: null,
      });
      explanation.push(`Recargo nocturno (${surcharge.surcharge_description ?? zoneId}): +$${amount} (${surcharge.surcharge_pct}%)`);
      return price + amount;
    }
  }
  return price;
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
      origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, zone_id: originLoc.zone_id },
      destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, zone_id: destLoc.zone_id },
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
      origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, zone_id: originLoc.zone_id },
      destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, zone_id: destLoc.zone_id },
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

  // 3.5 Apply night surcharge if applicable
  const dateTime = req.dateTime ?? new Date();
  const adjustments: Adjustment[] = [];
  const surchargedPrice = await applyNightSurcharge(
    match.price,
    originLoc.zone_id,
    destLoc.zone_id,
    dateTime,
    adjustments,
    explanation,
  );

  // 4. Apply commercial rules
  const commercial = await applyCommercialRules({
    base_price,
    preliminary_price: surchargedPrice,
    tariff_id: match.tariffId,
    origin_place_id: originLoc.place_id,
    destination_place_id: destLoc.place_id,
    origin_zone_id: originLoc.zone_id,
    destination_zone_id: destLoc.zone_id,
    passenger_count: pax,
    modality: req.modality ?? null,
  });

  explanation.push(...commercial.explanation);
  explanation.push(`Precio final: $${commercial.final_price}`);

  return {
    base_price: commercial.base_price,
    markup: commercial.markup,
    adjustments: [...adjustments, ...commercial.adjustments],
    final_price: commercial.final_price,
    tariff_id: match.tariffId,
    origin: { place_id: originLoc.place_id, canonical_name: originLoc.canonical_name, zone_id: originLoc.zone_id },
    destination: { place_id: destLoc.place_id, canonical_name: destLoc.canonical_name, zone_id: destLoc.zone_id },
    level: match.level,
    source: adjustments.length > 0 ? "night_surcharge" : commercial.source,
    explanation,
  };
}


