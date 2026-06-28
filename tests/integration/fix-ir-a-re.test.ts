// FASE 15.1 — Fix IR_A_RE temporal word boundary
import { describe, it, expect } from "vitest";
import { core } from "@/lib/ai/core";

describe("FASE 15.1 — IR_A_RE temporal word boundary", () => {
  it("T1: 'quiero ir al centro ahora' → destination=centro, fact now:ahora", () => {
    const result = core("quiero ir al centro ahora");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.facts).toContain("now:ahora");
    expect(result.facts).toContain("destination:centro");
  });

  it("T2: 'quiero ir al centro mañana' → destination=centro, fact date:mañana", () => {
    const result = core("quiero ir al centro mañana");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.facts).toContain("date:mañana");
    expect(result.facts).toContain("destination:centro");
  });

  it("T3: 'quiero ir al centro' → destination=centro (sin cambio)", () => {
    const result = core("quiero ir al centro");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.facts).toContain("destination:centro");
  });

  it("T4: 'voy al centro ahora' → destination=centro, fact now:ahora", () => {
    const result = core("voy al centro ahora");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.facts).toContain("now:ahora");
  });

  it("T5: 'quiero ir al centro hoy' → destination=centro", () => {
    const result = core("quiero ir al centro hoy");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.roleLock.destination).not.toContain("hoy");
  });

  it("T6: 'quiero ir al centro después' → destination=centro", () => {
    const result = core("quiero ir al centro después");
    expect(result.roleLock.destination).toBe("centro");
  });

  it("T7: 'quiero ir al centro luego' → destination=centro", () => {
    const result = core("quiero ir al centro luego");
    expect(result.roleLock.destination).toBe("centro");
  });

  it("T8: 'necesito ir al centro esta noche' → destination=centro", () => {
    const result = core("necesito ir al centro esta noche");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.roleLock.destination).not.toContain("noche");
  });

  it("T9: 'estoy en el aeropuerto quiero ir al centro' → ambos slots limpios", () => {
    const result = core("estoy en el aeropuerto quiero ir al centro");
    expect(result.roleLock.origin).toBe("aeropuerto");
    expect(result.roleLock.destination).toBe("centro");
    expect(result.facts).toContain("origin:aeropuerto");
    expect(result.facts).toContain("destination:centro");
  });
});
