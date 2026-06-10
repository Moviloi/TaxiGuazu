import { describe, it, expect } from "vitest";
import { getLocationDisplay } from "../src/lib/services/locationDisplay";

describe("locationDisplay", () => {
  it("AIRPORT_IGR → Aeropuerto Internacional de Puerto Iguazú", () => {
    expect(getLocationDisplay("AIRPORT_IGR")).toBe("Aeropuerto Internacional de Puerto Iguazú");
  });

  it("CITY_CENTER_IGUAZU → Centro de Puerto Iguazú", () => {
    expect(getLocationDisplay("CITY_CENTER_IGUAZU")).toBe("Centro de Puerto Iguazú");
  });

  it("unknown ID returns the ID itself as fallback", () => {
    expect(getLocationDisplay("NONEXISTENT_ID")).toBe("NONEXISTENT_ID");
  });

  it("empty string returns empty string", () => {
    expect(getLocationDisplay("")).toBe("");
  });
});
