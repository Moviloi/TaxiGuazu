// Tool Dispatch — contrato estable para asignación de viajes.
// Parte de AIT-022 (P1-tools). Wrapper alrededor de dispatch.service.ts.
// Consumido por el orquestador vía interfaz tipada.

import { z } from "zod";
import { executeDispatch } from "./dispatch.service";
import type { TripRow } from "@/lib/db/types";

// ── Tipos de entrada ──

export const DispatchToolInputSchema = z.object({
  trip: z.object({
    trip_id: z.string(),
    client_phone: z.string(),
    origin: z.string().nullable(),
    destination: z.string().nullable(),
    price_base: z.number().nullable(),
    passengers: z.number().nullable(),
    scheduled_at: z.number().nullable(),
  }).passthrough(), // TripRow tiene más campos, permitirlos
  conversationId: z.number().int(),
  phone: z.string(),
  urgency: z.string().default("normal"),
  passengers: z.number().int().min(1).max(12).default(1),
});
export type DispatchToolInput = z.infer<typeof DispatchToolInputSchema>;

// ── Tipos de salida ──

export const DispatchToolOutputSchema = z.object({
  status: z.enum(["NO_DRIVERS", "OFFERED", "BROADCASTED"]),
  offersSent: z.number().int(),
  level: z.enum(["nivel_1", "nivel_2", "nivel_3", "waiting_driver"]).optional(),
});
export type DispatchToolOutput = z.infer<typeof DispatchToolOutputSchema>;

// ── Mapper explícito: DispatchToolInput → TripRow (sin casts) ──

function toTripRow(trip: DispatchToolInput["trip"]): TripRow {
  return {
    trip_id: trip.trip_id,
    client_phone: trip.client_phone,
    origin: trip.origin,
    destination: trip.destination,
    price_base: trip.price_base,
    passengers: trip.passengers,
    scheduled_at: trip.scheduled_at,
    // defaults seguros — el dispatch.service.ts completa según el flujo
    status: null,
    assigned_driver_phone: null,
    created_at: null,
    updated_at: null,
    confirmed_at: null,
    contact_shared_at: null,
    commission_amount: null,
    commission_paid: null,
    comision_declarada: null,
    driver_payout: null,
    flight_number: null,
    hotel_destination: null,
    survey_sent: null,
    post_trip_response: null,
    tariff_id: null,
    piso_base: null,
    garantizado_base: null,
    trip_phase: null,
    closure_reason: null,
  };
}

// ── Interfaz del tool ──

export interface DispatchTool {
  dispatchTrip(input: DispatchToolInput): Promise<DispatchToolOutput>;
}

// ── Implementación concreta ──

export const dispatchTool: DispatchTool = {
  async dispatchTrip(input: DispatchToolInput): Promise<DispatchToolOutput> {
    const parsed = DispatchToolInputSchema.parse(input);
    const result = await executeDispatch({
      conversationId: parsed.conversationId,
      phone: parsed.phone,
      trip: toTripRow(parsed.trip),
      urgency: parsed.urgency,
      passengers: parsed.passengers,
    });
    return DispatchToolOutputSchema.parse({
      status: result.status,
      offersSent: result.offersSent,
    });
  },
};
