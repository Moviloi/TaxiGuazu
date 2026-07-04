// Tests de contrato para FleetTool

import { describe, it, expect } from "vitest";
import { FleetToolInputSchema, FleetToolOutputSchema } from "@/lib/services/dispatch/tool-fleet";

describe("FleetTool — contract validation", () => {
  it("rejects passengers=0", () => {
    expect(() => FleetToolInputSchema.parse({ passengers: 0 })).toThrow();
  });

  it("rejects passengers>12", () => {
    expect(() => FleetToolInputSchema.parse({ passengers: 13 })).toThrow();
  });

  it("accepts valid input with country", () => {
    const input = FleetToolInputSchema.parse({ passengers: 4, country: "AR" });
    expect(input.passengers).toBe(4);
    expect(input.country).toBe("AR");
  });

  it("accepts valid input with origin zone", () => {
    const input = FleetToolInputSchema.parse({ passengers: 2, originZoneId: "ZONE_IGR_AIRPORT" });
    expect(input.originZoneId).toBe("ZONE_IGR_AIRPORT");
  });

  it("output schema validates available fleet", () => {
    const output = FleetToolOutputSchema.parse({ available: true, maxCapacity: 6, constraints: [] });
    expect(output.available).toBe(true);
    expect(output.maxCapacity).toBe(6);
  });

  it("output schema validates unavailable fleet", () => {
    const output = FleetToolOutputSchema.parse({
      available: false,
      maxCapacity: 4,
      constraints: ["capacity_insufficient: max=4, requested=6"],
    });
    expect(output.available).toBe(false);
    expect(output.constraints).toHaveLength(1);
  });
});
