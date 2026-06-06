import { describe, it, expect } from "vitest";
import { classifyIntent } from "../src/lib/services/semanticCoreEngine";

describe("intentClassifier", () => {
  // MOVE
  it("IGR a Amerian → MOVE (complete slots)", () => {
    const r = classifyIntent("IGR a Amerian", { origin: "IGR", destination: "Amerian" });
    expect(r.intent).toBe("MOVE");
  });

  it("necesito un taxi del aeropuerto al centro → MOVE (travel verbs + slots)", () => {
    const r = classifyIntent("necesito un taxi del aeropuerto al centro", { origin: "Aeropuerto", destination: "Centro" });
    expect(r.intent).toBe("MOVE");
  });

  it("quiero ir al centro → MOVE (travel verb + destination slot)", () => {
    const r = classifyIntent("quiero ir al centro", { destination: "Centro" });
    expect(r.intent).toBe("MOVE");
  });

  it("estoy en el aeropuerto, llevame a la terminal → MOVE (travel verb + both slots)", () => {
    const r = classifyIntent("estoy en el aeropuerto, llevame a la terminal", { origin: "Aeropuerto", destination: "Terminal" });
    expect(r.intent).toBe("MOVE");
  });

  // INFO
  it("cuánto cuesta al centro → INFO", () => {
    const r = classifyIntent("cuánto cuesta al centro", { destination: "Centro" });
    expect(r.intent).toBe("INFO");
  });

  it("precio del traslado IGR a Amerian → INFO", () => {
    const r = classifyIntent("precio del traslado IGR a Amerian", { origin: "IGR", destination: "Amerian" });
    expect(r.intent).toBe("INFO");
  });

  it("me das una tarifa → INFO", () => {
    const r = classifyIntent("me das una tarifa", {});
    expect(r.intent).toBe("INFO");
  });

  // CONFIRM
  it("sí → CONFIRM", () => {
    const r = classifyIntent("sí", {});
    expect(r.intent).toBe("CONFIRM");
  });

  it("dale → CONFIRM", () => {
    const r = classifyIntent("dale", {});
    expect(r.intent).toBe("CONFIRM");
  });

  // AMBIGUOUS
  it("al aeropuerto → AMBIGUOUS (destination only, no verb)", () => {
    const r = classifyIntent("al aeropuerto", { destination: "Aeropuerto" });
    expect(r.intent).toBe("AMBIGUOUS");
  });

  it("al centro → AMBIGUOUS (destination only, no verb)", () => {
    const r = classifyIntent("al centro", { destination: "Centro" });
    expect(r.intent).toBe("AMBIGUOUS");
  });

  it("al aeropuerto → AMBIGUOUS (origin only, no verb)", () => {
    const r = classifyIntent("al aeropuerto", { origin: "Aeropuerto" });
    expect(r.intent).toBe("AMBIGUOUS");
  });

  it("hola → AMBIGUOUS (no slots, no intent)", () => {
    const r = classifyIntent("hola", {});
    expect(r.intent).toBe("AMBIGUOUS");
  });
});
