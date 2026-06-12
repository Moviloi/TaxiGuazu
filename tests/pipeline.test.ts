import { describe, it, expect, vi } from "vitest";
import { processLead } from "../src/lib/core/pipeline";
import type { ExecutionContext, ExecutionDeps } from "../src/lib/core/pipeline";

function makeExecCtx(overrides: Partial<ExecutionContext> = {}): ExecutionContext {
  return {
    phone: "+54911111111",
    conversationId: 1,
    text: "IGR a Amerian",
    history: [],
    extractionCtx: undefined,
    lang: "es",
    intent: "MOVE",
    ...overrides,
  };
}

function makeDeps(): ExecutionDeps {
  return {
    send: vi.fn().mockResolvedValue(undefined),
    persist: vi.fn().mockResolvedValue(1),
    handler: vi.fn().mockReturnValue({ policy: { finalResponse: "ok", outputSource: "POLICY", needsGeo: false, needsSaveContext: false } }),
    geo: {
      resolveGeoRoute: vi.fn().mockReturnValue({}),
    },
    memory: {
      saveContext: vi.fn().mockResolvedValue(undefined),
    },
    adminNotify: vi.fn().mockResolvedValue(undefined),
  };
}

describe("processLead (handler-based v5.7)", () => {
  it("returns 'completed' when handler policy indicates booking complete (needsGeo=true)", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockReturnValue({ policy: { finalResponse: "Resumen del viaje", outputSource: "POLICY", needsGeo: true, needsSaveContext: true } });
    const ctx = makeExecCtx({
      extractionCtx: { slots: { origin: { value: "IGR", score: 1, reason: "test" }, destination: { value: "Centro", score: 1, reason: "test" } }, overallConfidence: 0.9, workflowState: "collecting_slots", clarifyField: null, askForConfirmation: true },
    });
    const result = await processLead(ctx, deps);
    expect(result).toBe("completed");
  });

  it("returns 'incomplete' when handler policy says incomplete (needsGeo=false)", async () => {
    const deps = makeDeps();
    const result = await processLead(makeExecCtx(), deps);
    expect(result).toBe("incomplete");
  });

  it("sends and persists the handler's finalResponse", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockReturnValue({ policy: { finalResponse: "¿A dónde necesitás ir?", outputSource: "POLICY", needsGeo: false, needsSaveContext: false } });
    await processLead(makeExecCtx({ text: "del aeropuerto" }), deps);
    expect(deps.handler).toHaveBeenCalledWith("del aeropuerto", "RESERVA", expect.any(Object));
    expect(deps.send).toHaveBeenCalledWith("+54911111111", "¿A dónde necesitás ir?");
    expect(deps.persist).toHaveBeenCalledWith(1, "assistant", "¿A dónde necesitás ir?");
  });

  it("runs geo + saveContext when needsGeo=true", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockReturnValue({ policy: { finalResponse: "Resumen", outputSource: "POLICY", needsGeo: true, needsSaveContext: true } });
    const ctx = makeExecCtx({
      extractionCtx: { slots: { origin: { value: "IGR", score: 1, reason: "test" } }, overallConfidence: 0.9, workflowState: "collecting_slots", clarifyField: null, askForConfirmation: false },
      pricing: { final_price: 15000 },
    });
    await processLead(ctx, deps);
    expect(deps.geo.resolveGeoRoute).toHaveBeenCalled();
    expect(deps.memory.saveContext).toHaveBeenCalledWith("+54911111111", expect.objectContaining({
      intent: "MOVE",
      pricing: expect.any(Object),
    }));
  });

  it("calls adminNotify when needsAdminNotify=true", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockReturnValue({ policy: { finalResponse: "🚨 Emergencia", outputSource: "POLICY", needsGeo: false, needsSaveContext: false, needsAdminNotify: true, adminNotifyBody: "EMERGENCY alert" } });
    await processLead(makeExecCtx({ text: "ayuda urgente" }), deps);
    expect(deps.adminNotify).toHaveBeenCalledWith("EMERGENCY alert");
    expect(deps.send).toHaveBeenCalledWith("+54911111111", "🚨 Emergencia");
  });

  it("skips adminNotify when needsAdminNotify is false", async () => {
    const deps = makeDeps();
    await processLead(makeExecCtx(), deps);
    expect(deps.adminNotify).not.toHaveBeenCalled();
  });

  it("handles errors gracefully when handler crashes", async () => {
    const deps = makeDeps();
    deps.handler = vi.fn().mockImplementation(() => { throw new Error("handler crash"); });
    const result = await processLead(makeExecCtx({ text: "sí", intent: "CONFIRM" }), deps);
    expect(result).toBe("error");
  });
});
