// Tests de contrato para DispatchTool

import { describe, it, expect } from "vitest";
import { DispatchToolInputSchema, DispatchToolOutputSchema } from "@/lib/services/dispatch/tool-dispatch";

describe("DispatchTool — contract validation", () => {
  const validTrip = {
    trip_id: "trip_123",
    client_phone: "+549111111",
    origin: "Aeropuerto IGR",
    destination: "Centro",
    price_base: 60000,
    passengers: 2,
    scheduled_at: Math.floor(Date.now() / 1000),
  };

  it("rejects missing trip", () => {
    expect(() => DispatchToolInputSchema.parse({ conversationId: 1, phone: "+549111111" })).toThrow();
  });

  it("rejects negative passengers", () => {
    expect(() => DispatchToolInputSchema.parse({
      trip: validTrip, conversationId: 1, phone: "+549111111", passengers: -1,
    })).toThrow();
  });

  it("accepts valid input with defaults", () => {
    const input = DispatchToolInputSchema.parse({ trip: validTrip, conversationId: 1, phone: "+549111111" });
    expect(input.urgency).toBe("normal");
    expect(input.passengers).toBe(1); // default
  });

  it("output schema validates OFFERED", () => {
    const output = DispatchToolOutputSchema.parse({ status: "OFFERED", offersSent: 1 });
    expect(output.status).toBe("OFFERED");
  });

  it("output schema validates BROADCASTED", () => {
    const output = DispatchToolOutputSchema.parse({ status: "BROADCASTED", offersSent: 5 });
    expect(output.offersSent).toBe(5);
  });

  it("output schema validates NO_DRIVERS", () => {
    const output = DispatchToolOutputSchema.parse({ status: "NO_DRIVERS", offersSent: 0 });
    expect(output.status).toBe("NO_DRIVERS");
  });
});
