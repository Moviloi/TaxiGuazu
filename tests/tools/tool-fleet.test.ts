// Tests de contrato para FleetTool
// Tests de equivalencia: tool-fleet vs fleet-validation (solo mock DB)

import { describe, it, expect, vi, beforeEach } from "vitest";
import { FleetToolInputSchema, FleetToolOutputSchema, fleetTool } from "@/lib/services/dispatch/tool-fleet";
import { ensureFleetCanHandle } from "@/lib/services/dispatch/fleet-validation";

// ── Mock SOLO la capa DB (drivers, disponibilidad) ──
// No mockeamos fleet-validation ni tool-fleet — testeamos ambos lados reales.
const mockValidateFleetCanHandle = vi.fn();
const mockGetMaxFleetCapacity = vi.fn();
const mockInsertMessage = vi.fn();

vi.mock("@/lib/db/database", async (importOriginal) => {
  const actual: any = await importOriginal();
  return {
    ...actual,
    validateFleetCanHandle: (...args: any[]) => mockValidateFleetCanHandle(...args),
    getMaxFleetCapacity: (...args: any[]) => mockGetMaxFleetCapacity(...args),
    insertMessage: (...args: any[]) => mockInsertMessage(...args),
  };
});

// Side effects que fleet-validation dispara al rechazar — los silenciamos
vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn(),
}));

vi.mock("@/lib/services/admin/admin.service", () => ({
  notifyAdmin: vi.fn(),
}));

vi.mock("@/lib/ai/response-builder", () => ({
  buildFleetCapacityMessage: vi.fn(() => "[mock] sin capacidad disponible"),
  buildFleetTariffMessage: vi.fn(() => "[mock] sin tarifa disponible"),
}));

vi.mock("@/lib/services/pricing/tariff-resolver", () => ({
  resolveTariff: vi.fn(),
}));

// ── Contract validation (schema puro, no necesita mocks) ──

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

// ── Equivalence: tool-fleet vs fleet-validation (ambos reales, solo DB mockeada) ──

describe("FleetTool — equivalence with fleet-validation (real implementations, DB mocked)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("both return available=true and same maxCapacity when fleet can handle", async () => {
    // DB dice: flota puede manejar hasta 6 pasajeros
    mockValidateFleetCanHandle.mockResolvedValue({ ok: true, max: 6 });
    mockGetMaxFleetCapacity.mockResolvedValue(6);

    const toolResult = await fleetTool.checkAvailability({ passengers: 4 });
    // Llamamos también ensureFleetCanHandle directo y comparamos equivalencia
    const directResult = await ensureFleetCanHandle(4, {
      phone: "", convId: 0, origin: "", destination: "", source: "test",
    });

    // Equivalencias explícitas (sin "as any"):
    expect(toolResult.available).toBe(directResult.ok);
    expect(toolResult.maxCapacity).toBe(directResult.maxCapacity);
    // Cuando ok=true, constraints debe ser vacío
    expect(toolResult.constraints).toHaveLength(0);
    // fleet-validation devolvió ok y no rejected
    expect(directResult.rejected).toBe(false);
  });

  it("both return available=false and same maxCapacity when capacity exceeded", async () => {
    // DB dice: capacidad máxima es 4, pero pedimos 6
    mockValidateFleetCanHandle.mockResolvedValue({ ok: false, max: 4 });
    mockGetMaxFleetCapacity.mockResolvedValue(4);

    const toolResult = await fleetTool.checkAvailability({ passengers: 6 });
    const directResult = await ensureFleetCanHandle(6, {
      phone: "", convId: 0, origin: "", destination: "", source: "test",
    });

    // Equivalencias:
    expect(toolResult.available).toBe(directResult.ok); // ambos false
    expect(toolResult.maxCapacity).toBe(directResult.maxCapacity); // ambos 4
    // Tool marca constraints cuando no available
    expect(toolResult.constraints.length).toBeGreaterThan(0);
    expect(toolResult.constraints[0]).toContain("capacity_insufficient");
    expect(directResult.rejected).toBe(true);
    expect(directResult.reason).toBe("no_capacity");
  });

  it("both return maxCapacity=null and available=false when no fleet configured", async () => {
    // DB dice: no hay flota configurada (max=null)
    mockValidateFleetCanHandle.mockResolvedValue({ ok: false, max: null });
    mockGetMaxFleetCapacity.mockResolvedValue(null);

    const toolResult = await fleetTool.checkAvailability({ passengers: 3 });
    const directResult = await ensureFleetCanHandle(3, {
      phone: "", convId: 0, origin: "", destination: "", source: "test",
    });

    // Equivalencias:
    expect(toolResult.available).toBe(directResult.ok); // ambos false
    expect(toolResult.maxCapacity).toBe(directResult.maxCapacity); // ambos null
    expect(toolResult.maxCapacity).toBeNull();
    expect(toolResult.constraints.length).toBeGreaterThan(0);
    expect(directResult.rejected).toBe(true);
    expect(directResult.reason).toBe("no_fleet");
  });
});
