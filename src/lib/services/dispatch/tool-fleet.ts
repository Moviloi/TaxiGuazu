// Tool Fleet — contrato estable para verificación de disponibilidad de flota.
// Parte de AIT-023 (P1-tools). Wrapper alrededor de fleet-validation.ts.
// Consumido por el orquestador vía interfaz tipada.

import { z } from "zod";
import { ensureFleetCanHandle } from "./fleet-validation";

// ── Tipos de entrada ──

export const FleetToolInputSchema = z.object({
  passengers: z.number().int().min(1).max(12),
  originZoneId: z.string().optional(),
  country: z.enum(["AR", "BR", "PY"]).optional(),
});
export type FleetToolInput = z.infer<typeof FleetToolInputSchema>;

// ── Tipos de salida ──

export const FleetToolOutputSchema = z.object({
  available: z.boolean(),
  maxCapacity: z.number().int().nullable(),
  constraints: z.array(z.string()).default([]),
});
export type FleetToolOutput = z.infer<typeof FleetToolOutputSchema>;

// ── Interfaz del tool ──

export interface FleetTool {
  checkAvailability(input: FleetToolInput): Promise<FleetToolOutput>;
}

// ── Implementación concreta ──

export const fleetTool: FleetTool = {
  async checkAvailability(input: FleetToolInput): Promise<FleetToolOutput> {
    const parsed = FleetToolInputSchema.parse(input);
    const result = await ensureFleetCanHandle(parsed.passengers, {
      phone: "",
      convId: 0,
      origin: "",
      destination: "",
      source: "tool-fleet",
    });

    return FleetToolOutputSchema.parse({
      available: result.ok,
      maxCapacity: result.maxCapacity,
      constraints: result.ok ? [] : [`capacity_insufficient: max=${result.maxCapacity}, requested=${parsed.passengers}`],
    });
  },
};
