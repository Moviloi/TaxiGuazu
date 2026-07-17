import { describe, it, expect, beforeEach } from "vitest";
import { DRLEngine, getDRLEngine } from "@/lib/drl";
import {
  completitudRule,
  consistenciaRule,
  clasificacionRule,
  suficienciaRule,
  escalamientoRule,
} from "@/lib/drl";
import { isDrlEnabled } from "@/config/feature-flags";

describe("DRLEngine", () => {
  beforeEach(() => {
    DRLEngine.resetInstance();
    delete process.env.DRL_ENABLED;
  });

  it("singleton — getInstance returns the same instance", () => {
    const a = DRLEngine.getInstance();
    const b = DRLEngine.getInstance();
    expect(a).toBe(b);
  });

  it("shorthand — getDRLEngine returns singleton", () => {
    expect(getDRLEngine()).toBe(DRLEngine.getInstance());
  });

  it("disabled by default", () => {
    const engine = DRLEngine.getInstance();
    expect(engine.enabled).toBe(false);
  });

  it("enabled when DRL_ENABLED=true", () => {
    process.env.DRL_ENABLED = "true";
    const engine = new DRLEngine();
    expect(engine.enabled).toBe(true);
  });

  it("isDrlEnabled reads env var", () => {
    expect(isDrlEnabled()).toBe(false);
    process.env.DRL_ENABLED = "true";
    expect(isDrlEnabled()).toBe(true);
  });

  it("evaluate returns null when disabled", async () => {
    const engine = DRLEngine.getInstance();
    const result = await engine.evaluate({
      slots: { origin: "IGR" },
      requiredSlots: ["origin", "destination"],
    });
    expect(result).toBeNull();
  });

  it("registerRule and getRegisteredRules", () => {
    process.env.DRL_ENABLED = "true";
    const engine = new DRLEngine();

    expect(engine.getRegisteredRules()).toEqual([]);

    engine.registerRule("completitud", completitudRule);
    engine.registerRule("consistencia", consistenciaRule);

    const rules = engine.getRegisteredRules();
    expect(rules).toContain("completitud");
    expect(rules).toContain("consistencia");
    expect(rules.length).toBe(2);
  });

  it("evaluate returns PROCEED when all rules pass", async () => {
    process.env.DRL_ENABLED = "true";
    const engine = new DRLEngine();
    engine.registerRule("completitud", completitudRule);
    engine.registerRule("consistencia", consistenciaRule);

    const decision = await engine.evaluate({
      slots: { origin: "IGR", destination: "Centro" },
      requiredSlots: ["origin", "destination"],
    });

    expect(decision).not.toBeNull();
    expect(decision!.decision).toBe("PROCEED");
    expect(decision!.ruleResults.length).toBe(2);
    expect(decision!.context.completenessRatio).toBe(1);
  });

  it("evaluate returns default PROCEED when no rules registered", async () => {
    process.env.DRL_ENABLED = "true";
    const engine = new DRLEngine();

    const decision = await engine.evaluate({
      slots: {},
      requiredSlots: [],
    });

    expect(decision).not.toBeNull();
    expect(decision!.decision).toBe("PROCEED");
    expect(decision!.ruleResults).toEqual([]);
  });

  it("all five rule stubs return expected structure", () => {
    // PR-5D: Reemplazamos stubs por implementaciones reales. Los valores de
    // confidence ahora varían según la lógica real de cada regla.
    const input = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination"] };

    const results = [
      completitudRule(input),
      consistenciaRule(input),
      clasificacionRule(input),
      suficienciaRule(input),
      escalamientoRule(input),
    ];

    expect(results.length).toBe(5);
    for (const r of results) {
      expect(r).not.toBeNull();
      expect(r!.ruleFamily).toBeTruthy();
      expect(r!.ruleName).toBeTruthy();
      // Reglas reales: confidence varía según lógica interna
      expect(r!.confidence).toBeGreaterThanOrEqual(0);
      expect(r!.confidence).toBeLessThanOrEqual(1);
    }

    // Verificaciones específicas de las implementaciones reales:
    const completitud = completitudRule(input)!;
    expect(completitud.passed).toBe(true); // partial — 1/2 slots presentes, aún operable
    expect(completitud.decision).toBe("PROCEED");
    expect(completitud.details?.completenessLevel).toBe("partial");

    const consistencia = consistenciaRule(input)!;
    expect(consistencia.passed).toBe(true); // sin conflictos detectados
    expect(consistencia.decision).toBe("PROCEED");

    const clasificacion = clasificacionRule(input)!;
    expect(clasificacion.passed).toBe(true);
    expect(clasificacion.details?.extractionType).toBe("incremental");

    const suficiencia = suficienciaRule(input)!;
    expect(suficiencia.passed).toBe(true); // stub backward compat
    expect(suficiencia.decision).toBe("PROCEED");

    const escalamiento = escalamientoRule(input)!;
    expect(escalamiento.passed).toBe(true); // complejidad simple
    expect(escalamiento.decision).toBe("PROCEED");
  });

  it("DRL module imports are valid", async () => {
    const drl = await import("@/lib/drl");
    expect(typeof drl.DRLEngine).toBe("function");
    expect(typeof drl.getDRLEngine).toBe("function");
    expect(typeof drl.completitudRule).toBe("function");
    expect(typeof drl.consistenciaRule).toBe("function");
    expect(typeof drl.clasificacionRule).toBe("function");
    expect(typeof drl.suficienciaRule).toBe("function");
    expect(typeof drl.escalamientoRule).toBe("function");
  });
});
