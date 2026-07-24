import { describe, it, expect } from "vitest";
import { resolveGeoRoute } from "@/lib/services/geo/location-resolver";

describe("geoEngine", () => {
  // RF-09: resolveGeoRoute ahora usa heurística de palabras clave + DB (cuando disponible).
  // En unit tests sin DB, la heurística clasifica lugares conocidos por keyword.

  it("Aeropuerto IGR → Centro → airport to city center", async () => {
    const r = await resolveGeoRoute({ origin: "Aeropuerto IGR", destination: "Centro" });
    expect(r.originZone).toBe("Z_AIRPORT");
    expect(r.destinationZone).toBe("Z_CITY_CORE");
    // Airport → city core tiene proximity 0.65 (de _pairBase)
    expect(r.routeType).toBe("SHORT"); // prox >= 0.6
    expect(r.proximityScore).toBeGreaterThanOrEqual(0.6);
  });

  it("Aeropuerto IGR → Selva Iryapú → airport to hotel zone", async () => {
    const r = await resolveGeoRoute({ origin: "Aeropuerto IGR", destination: "Selva Iryapú" });
    expect(r.originZone).toBe("Z_AIRPORT");
    expect(r.destinationZone).toBe("Z_HOTEL_ZONE");
    // Airport → hotel zone: proximity 0.55 + corridor bonus 0.15 = 0.7 → SHORT
    expect(r.routeType).toBe("SHORT");
  });

  it("Aduana → Centro → border to city core", async () => {
    const r = await resolveGeoRoute({ origin: "Aduana", destination: "Centro" });
    expect(r.originZone).toBe("Z_BORDER");
    expect(r.destinationZone).toBe("Z_CITY_CORE");
    // Border → city core: _pairBase 0.35, roadAccess 0.4 (border) → 0.35 * 0.7 = 0.245 → LONG
    expect(r.routeType).toBe("LONG");
  });

  it("Hotel Mabu → Aeropuerto → hotel to airport (different zones)", async () => {
    const r = await resolveGeoRoute({ origin: "Hotel Mabu", destination: "Aeropuerto IGR" });
    expect(r.originZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationZone).toBe("Z_AIRPORT");
    // Hotel → airport: _pairBase 0.55 + corridor 0.15 = 0.7 → SHORT
    expect(r.routeType).toBe("SHORT");
  });

  it("Hotel → Hotel (misma keyword) → misma zona (SHORT)", async () => {
    const r = await resolveGeoRoute({ origin: "Hotel Mabu", destination: "Hotel Amerian" });
    expect(r.originZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationZone).toBe("Z_HOTEL_ZONE");
    expect(r.routeType).toBe("SHORT");
  });

  it("Aduana → Cataratas → border to landmark (no keyword match)", async () => {
    const r = await resolveGeoRoute({ origin: "Aduana", destination: "Cataratas" });
    expect(r.originZone).toBe("Z_BORDER");
    // "Cataratas" no matchea ningún keyword → queda null → será Z_LANDMARK en computeProximity
    expect(r.destinationZone).toBeNull();
    // Sin destinationZone → prox = 0.3 → MEDIUM
    expect(r.routeType).toBe("MEDIUM");
  });

  it("null slots → null zones + MEDIUM", async () => {
    const r = await resolveGeoRoute({ origin: null, destination: null });
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
    expect(r.proximityScore).toBe(0.3);
  });

  it("empty slots → null zones", async () => {
    const r = await resolveGeoRoute({});
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
  });

  it("unknown places → fallback keyword match", async () => {
    const r = await resolveGeoRoute({ origin: "LugarInexistenteXYZ", destination: "OtroLugarInexistente" });
    // Ninguno matchea keywords → ambos null → routeType MEDIUM, prox 0.3
    expect(r.originZone).toBeNull();
    expect(r.destinationZone).toBeNull();
    expect(r.routeType).toBe("MEDIUM");
    expect(r.proximityScore).toBe(0.3);
  });

  it("Resort Selva → hotel zone, Centro → city core", async () => {
    const r = await resolveGeoRoute({ origin: "Resort Selva", destination: "Centro" });
    expect(r.originZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationZone).toBe("Z_CITY_CORE");
  });

  it("Posada → hotel zone", async () => {
    const r = await resolveGeoRoute({ origin: "Posada de la Selva", destination: "Aeropuerto" });
    expect(r.originZone).toBe("Z_HOTEL_ZONE");
    expect(r.destinationZone).toBe("Z_AIRPORT");
  });
});
