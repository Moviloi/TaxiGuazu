// Tests de contrato para PricingTool

import { describe, it, expect } from "vitest";
import { PricingToolInputSchema, PricingToolOutputSchema } from "@/lib/services/pricing/tool-pricing";

describe("PricingTool — contract validation", () => {
  it("rejects missing origin", () => {
    expect(() => PricingToolInputSchema.parse({ destination: "centro", passengers: 2 })).toThrow();
  });

  it("rejects passengers=0", () => {
    expect(() => PricingToolInputSchema.parse({ origin: "aeropuerto", destination: "centro", passengers: 0 })).toThrow();
  });

  it("rejects passengers>6", () => {
    expect(() => PricingToolInputSchema.parse({ origin: "aeropuerto", destination: "centro", passengers: 7 })).toThrow();
  });

  it("accepts valid input", () => {
    const input = PricingToolInputSchema.parse({ origin: "Aeropuerto IGR", destination: "Centro", passengers: 2 });
    expect(input.passengers).toBe(2);
  });

  it("output schema validates pricing result", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 60000,
      basePrice: 50000,
      currency: "ARS",
      tariffId: 42,
      level: "place_place",
      origin: { canonicalName: "Aeropuerto IGR" },
      destination: { canonicalName: "Centro" },
    });
    expect(output.finalPrice).toBe(60000);
    expect(output.currency).toBe("ARS");
  });

  it("output schema validates result with adjustments", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 54000,
      basePrice: 60000,
      currency: "ARS",
      tariffId: 42,
      level: "place_place",
      origin: { canonicalName: "Aeropuerto IGR" },
      destination: { canonicalName: "Centro" },
      adjustments: [{ type: "promotion", amount: -6000, description: "10% descuento" }],
    });
    expect(output.adjustments).toHaveLength(1);
  });

  it("output schema validates not_found pricing", () => {
    const output = PricingToolOutputSchema.parse({
      finalPrice: 0,
      basePrice: 0,
      currency: "ARS",
      tariffId: null,
      level: "not_found",
      origin: { canonicalName: "" },
      destination: { canonicalName: "" },
    });
    expect(output.finalPrice).toBe(0);
    expect(output.tariffId).toBeNull();
  });
});
