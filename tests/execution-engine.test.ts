import { describe, it, expect, vi } from "vitest";
import { executeDecision } from "../src/lib/services/executionEngine";
import type { Decision } from "../src/lib/core/types";

function makeDecision(action: Decision["action"], message = ""): Decision {
  return { action, message };
}

function makeDeps() {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    persist: vi.fn().mockResolvedValue(1),
    handler: vi.fn().mockReturnValue({ policy: { finalResponse: "ok", outputSource: "POLICY" } }),
    geo: {
      resolveGeoRoute: vi.fn().mockReturnValue({ originZone: "Z_AIRPORT", destinationZone: "Z_CITY_CORE", routeType: "airport_to_city", proximityScore: 0.9 }),
    },
    memory: {
      saveContext: vi.fn().mockResolvedValue(undefined),
    },
    guard: vi.fn(),
  };
}

function makeCtx(overrides = {}) {
  return {
    phone: "+54912345678",
    conversationId: 1,
    text: "IGR a Amerian",
    history: [],
    customerName: undefined,
    extractionCtx: undefined,
    lang: "es",
    intent: "MOVE",
    ...overrides,
  };
}

describe("executeDecision — simple message actions", () => {
  it("INFO_PRICE → sends message and persists", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("INFO_PRICE", "Cuesta $15000"), makeCtx(), deps);
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "Cuesta $15000");
    expect(deps.persist).toHaveBeenCalledWith(1, "assistant", "Cuesta $15000");
    expect(deps.handler).not.toHaveBeenCalled();
  });

  it("ASK_ORIGIN → sends message only", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("ASK_ORIGIN", "¿Desde dónde salís?"), makeCtx(), deps);
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "¿Desde dónde salís?");
    expect(deps.geo.resolveGeoRoute).not.toHaveBeenCalled();
  });

  it("ASK_DESTINATION → sends message only", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("ASK_DESTINATION", "¿A dónde necesitás ir?"), makeCtx(), deps);
    expect(deps.send).toHaveBeenCalled();
  });

  it("CLARIFY → sends message only", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("CLARIFY", "No estoy seguro"), makeCtx(), deps);
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "No estoy seguro");
    expect(deps.memory.saveContext).not.toHaveBeenCalled();
  });

  it("CONFIRM → sends message only", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("CONFIRM", "¿Confirmás el viaje?"), makeCtx(), deps);
    expect(deps.send).toHaveBeenCalled();
    expect(deps.handler).not.toHaveBeenCalled();
  });
});

describe("executeDecision — CONFIRM_ROUTE", () => {
  it("dispatches to handler and sends response", async () => {
    const deps = makeDeps();
    await executeDecision(
      makeDecision("CONFIRM_ROUTE"),
      makeCtx({ text: "sí", extractionCtx: { slots: { origin: "IGR" } } }),
      deps,
    );
    expect(deps.handler).toHaveBeenCalledWith("sí", "RESERVA", expect.any(Object));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "ok");
    expect(deps.persist).toHaveBeenCalledWith(1, "assistant", "ok");
    expect(deps.geo.resolveGeoRoute).not.toHaveBeenCalled();
  });
});

describe("executeDecision — FINAL pipeline", () => {
  it("runs geo → handler → memory", async () => {
    const deps = makeDeps();
    const ctx = makeCtx({ intent: "MOVE", extractionCtx: { slots: { origin: "IGR", destination: "Amerian" } } });
    await executeDecision(makeDecision("FINAL"), ctx, deps);

    // GEO
    expect(deps.geo.resolveGeoRoute).toHaveBeenCalled();

    // HANDLER
    expect(deps.handler).toHaveBeenCalled();
    expect(deps.guard).toHaveBeenCalledWith("POLICY");

    // SEND + PERSIST
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "ok");
    expect(deps.persist).toHaveBeenCalledWith(1, "assistant", "ok");

    // MEMORY
    expect(deps.memory.saveContext).toHaveBeenCalledWith("+54912345678", expect.objectContaining({
      intent: "MOVE",
      slots: expect.any(Object),
    }));
  });

  it("does not call geo/handler for non-FINAL actions", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("CLARIFY", "test"), makeCtx(), deps);
    expect(deps.geo.resolveGeoRoute).not.toHaveBeenCalled();
    expect(deps.handler).not.toHaveBeenCalled();
    expect(deps.memory.saveContext).not.toHaveBeenCalled();
  });

  it("handles empty extractionCtx gracefully", async () => {
    const deps = makeDeps();
    await executeDecision(makeDecision("FINAL"), makeCtx({ extractionCtx: undefined }), deps);
    expect(deps.geo.resolveGeoRoute).toHaveBeenCalledWith({});
  });
});

describe("executeDecision — CONFIRM_INTERPRETATION", () => {
  it("sends message with origin/dest only, no geo", async () => {
    const deps = makeDeps();
    const ctx = makeCtx({
      extractionCtx: { slots: { origin: { value: "Aeropuerto IGR" }, destination: { value: "Centro" } } },
    });
    await executeDecision(makeDecision("CONFIRM_INTERPRETATION"), ctx, deps);

    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("Entendí"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("Aeropuerto IGR"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("Centro"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("¿Es correcto?"));
    expect(deps.geo.resolveGeoRoute).not.toHaveBeenCalled();
    expect(deps.memory.saveContext).not.toHaveBeenCalled();
    expect(deps.handler).not.toHaveBeenCalled();
  });
});

describe("executeDecision — BOOKING_SUMMARY", () => {
  it("runs geo, sends summary with datetime and fare from pricing", async () => {
    const deps = makeDeps();
    const ctx = makeCtx({
      pricing: { final_price: 15000 },
      extractionCtx: {
        slots: {
          origin: { value: "Aeropuerto IGR" },
          destination: { value: "Centro" },
          scheduled_at: { value: "2026-06-08T15:30:00.000Z" },
        },
      },
    });
    await executeDecision(makeDecision("BOOKING_SUMMARY"), ctx, deps);

    expect(deps.geo.resolveGeoRoute).toHaveBeenCalled();
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("Aeropuerto IGR"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("Centro"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("$15.000"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("chofer"));
    expect(deps.send).toHaveBeenCalledWith("+54912345678", expect.stringContaining("De acuerdo"));
    expect(deps.memory.saveContext).toHaveBeenCalled();
    expect(deps.handler).not.toHaveBeenCalled();
  });

  it("formats scheduled_at date in es-AR locale", async () => {
    const deps = makeDeps();
    const ctx = makeCtx({
      pricing: { final_price: 15000 },
      extractionCtx: {
        slots: {
          origin: { value: "Aeropuerto IGR" },
          destination: { value: "Centro" },
          scheduled_at: { value: "2026-06-08T15:30:00.000Z" },
        },
      },
    });
    await executeDecision(makeDecision("BOOKING_SUMMARY"), ctx, deps);

    const sentMsg = deps.send.mock.calls.find((c: any[]) => c[0] === "+54912345678")?.[1] ?? "";
    expect(sentMsg).toContain("Fecha");
    expect(sentMsg).not.toContain("2026-06-08T15:30");
  });

  it("shows — when pricing is not available", async () => {
    const deps = makeDeps();
    const ctx = makeCtx({
      extractionCtx: {
        slots: {
          origin: { value: "Aeropuerto IGR" },
          destination: { value: "Centro" },
        },
      },
    });
    await executeDecision(makeDecision("BOOKING_SUMMARY"), ctx, deps);
    const sentMsg = deps.send.mock.calls.find((c: any[]) => c[0] === "+54912345678")?.[1] ?? "";
    expect(sentMsg).toContain("$—");
  });
});

describe("executeDecision — driverOps (shift-end prompt)", () => {
  it("triggers shift-end prompt when driver is on shift", async () => {
    const deps = makeDeps();
    deps.driverOps = {
      getDriverByPhone: vi.fn().mockResolvedValue({ phone: "+54912345678", shift: "day" }),
      getConversationByPhone: vi.fn().mockResolvedValue({ id: 1 }),
      buildShiftEndPrompt: vi.fn().mockReturnValue("⚠️ Tu turno termina en 15 min."),
    };

    await executeDecision(makeDecision("FINAL"), makeCtx(), deps);

    expect(deps.driverOps.getDriverByPhone).toHaveBeenCalledWith("+54912345678");
    expect(deps.driverOps.buildShiftEndPrompt).toHaveBeenCalledWith("day");
    expect(deps.send).toHaveBeenCalledWith("+54912345678", "⚠️ Tu turno termina en 15 min.");
  });

  it("does not crash when driverOps is undefined", async () => {
    const deps = makeDeps();
    delete deps.driverOps;
    await expect(executeDecision(makeDecision("FINAL"), makeCtx(), deps)).resolves.toBeUndefined();
  });

  it("does not trigger shift prompt for non-driver users", async () => {
    const deps = makeDeps();
    deps.driverOps = {
      getDriverByPhone: vi.fn().mockResolvedValue(null),
      getConversationByPhone: vi.fn(),
      buildShiftEndPrompt: vi.fn(),
    };

    await executeDecision(makeDecision("FINAL"), makeCtx(), deps);

    expect(deps.driverOps.getDriverByPhone).toHaveBeenCalled();
    expect(deps.driverOps.buildShiftEndPrompt).not.toHaveBeenCalled();
  });
});
