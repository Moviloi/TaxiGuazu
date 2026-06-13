import { describe, it, expect } from "vitest";
import { regexExtractSlots } from "../src/lib/services/regex-extractor";

describe("regexExtractSlots", () => {
  it("CASE 1: estoy en el aeropuerto quiero ir al centro", () => {
    const result = regexExtractSlots("estoy en el aeropuerto quiero ir al centro");
    expect(result?.origin).toBe("el aeropuerto");
    expect(result?.destination).toBe("centro");
  });

  it("CASE 2: estoy en el aeropuerto y quiero ir al centro", () => {
    const result = regexExtractSlots("estoy en el aeropuerto y quiero ir al centro");
    expect(result?.origin).toBe("el aeropuerto");
    expect(result?.destination).toBe("centro");
  });

  it("CASE 3: estoy en el aeropuerto, quiero ir al centro", () => {
    const result = regexExtractSlots("estoy en el aeropuerto, quiero ir al centro");
    expect(result?.origin).toBe("el aeropuerto");
    expect(result?.destination).toBe("centro");
  });

  it("CASE 4: salgo del amerian y voy al aeropuerto", () => {
    const result = regexExtractSlots("salgo del amerian y voy al aeropuerto");
    expect(result?.origin).toBe("amerian");
    expect(result?.destination).toBe("aeropuerto");
  });

  it("CASE 5: estoy en cataratas necesito ir a foz", () => {
    const result = regexExtractSlots("estoy en cataratas necesito ir a foz");
    expect(result?.origin).toBe("cataratas");
    expect(result?.destination).toBe("foz");
  });

  it("CASE 6: estoy en el melia para ir al centro", () => {
    const result = regexExtractSlots("estoy en el melia para ir al centro");
    expect(result?.origin).toBe("el melia");
    expect(result?.destination).toBe("centro");
  });

  it("del aeropuerto standalone origin", () => {
    const result = regexExtractSlots("del aeropuerto");
    expect(result?.origin).toBe("aeropuerto");
    expect(result?.destination).toBeNull();
  });

  it("al centro standalone destination", () => {
    const result = regexExtractSlots("al centro");
    expect(result?.origin).toBeNull();
    expect(result?.destination).toBe("centro");
  });

  it("a foz standalone destination", () => {
    const result = regexExtractSlots("a foz");
    expect(result?.origin).toBeNull();
    expect(result?.destination).toBe("foz");
  });

  it("estoy en casa voy al centro", () => {
    const result = regexExtractSlots("estoy en casa voy al centro");
    expect(result?.origin).toBe("casa");
    expect(result?.destination).toBe("centro");
  });

  it("no match returns null", () => {
    const result = regexExtractSlots("hola");
    expect(result).toBeNull();
  });

  it("desde el centro origin", () => {
    const result = regexExtractSlots("desde el centro");
    expect(result?.origin).toBe("el centro");
    expect(result?.destination).toBeNull();
  });

  it("salgo del amerian standalone origin", () => {
    const result = regexExtractSlots("salgo del amerian");
    expect(result?.origin).toBe("amerian");
    expect(result?.destination).toBeNull();
  });

  it("voy al aeropuerto IGR destination with airport code", () => {
    const result = regexExtractSlots("voy al aeropuerto IGR");
    expect(result?.destination).toBe("aeropuerto IGR");
  });

  it("estoy en la avenida — does not falsely match 'a' as dest marker", () => {
    const result = regexExtractSlots("estoy en la avenida");
    expect(result?.origin).toBe("la avenida");
    expect(result?.destination).toBeNull();
  });

  it("CASO 6 WhatsApp: del aeropuerto al centro", () => {
    const result = regexExtractSlots("del aeropuerto al centro");
    expect(result?.origin).toBe("aeropuerto");
    expect(result?.destination).toBe("centro");
  });

  it("El aeropuerto IGR with capital E", () => {
    const result = regexExtractSlots("El aeropuerto IGR");
    expect(result?.origin).toBe("IGR");
  });

  it("aeropuerto igu (lowercase) does not match as airport code", () => {
    const result = regexExtractSlots("aeropuerto igu");
    expect(result).toBeNull();
  });

  it("AEROPUERTO IGR all caps", () => {
    const result = regexExtractSlots("AEROPUERTO IGR");
    expect(result?.origin).toBe("IGR");
  });

  it("estoy en aeropuerto IGR quiero ir al centro", () => {
    const result = regexExtractSlots("estoy en aeropuerto IGR quiero ir al centro");
    expect(result?.origin).toBe("IGR");
    expect(result?.destination).toBe("centro");
  });
});
