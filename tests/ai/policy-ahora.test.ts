import { describe, it, expect } from "vitest";
import { policyAhora } from "@/lib/ai/policy-ahora";
import type { FinalDecision, Intent } from "@/lib/ai/types";

function makeDecision(overrides: Partial<{
  decision: "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";
  intent: Intent;
  facts: string[];
  confidence: number;
}> = {}): FinalDecision {
  return {
    decision: overrides.decision ?? "EXECUTE",
    mode: "AHORA",
    core: {
      intent: overrides.intent ?? "NOW",
      facts: overrides.facts ?? ["now:ahora"],
      confidence: overrides.confidence ?? 0.9,
      slotStability: { origin: "open", destination: "open" },
      roleLock: { origin: null, destination: null },
    },
    reason: "test",
  };
}

describe("policyAhora — lateral intents", () => {
  it("Caso 1: EMERGENCY → needsAdminNotify=true, respuesta específica", () => {
    const decision = makeDecision({
      intent: "EMERGENCY",
      facts: ["emergency:ayuda"],
    });
    const result = policyAhora(decision, {
      lang: "es",
      phone: "+549111111",
      userText: "ayuda estoy varado",
    });

    expect(result.needsAdminNotify).toBe(true);
    expect(result.adminNotifyBody).toBeDefined();
    expect(result.adminNotifyBody!).toContain("EMERGENCIA");
    expect(result.adminNotifyBody!).toContain("+549111111");
    expect(result.adminNotifyBody!).toContain("ayuda estoy varado");
    expect(result.finalResponse).toBe(
      "🚨 Estamos notificando a nuestro equipo. Un operador te va a contactar urgente.",
    );
    expect(result.decision).toBe("EXECUTE");
    expect(result.mode).toBe("AHORA");
  });

  it("Caso 2: RESCHEDULE → needsAdminNotify=true, respuesta específica", () => {
    const decision = makeDecision({
      intent: "RESCHEDULE",
      facts: [],
    });
    const result = policyAhora(decision, {
      lang: "es",
      phone: "+549111111",
      userText: "quiero cambiar el horario",
    });

    expect(result.needsAdminNotify).toBe(true);
    expect(result.adminNotifyBody).toBeDefined();
    expect(result.adminNotifyBody!).toContain("REPROGRAMACIÓN");
    expect(result.adminNotifyBody!).toContain("+549111111");
    expect(result.finalResponse).toBe(
      "Entendido. Un operador va a revisar tu reserva y te contacta para reprogramar.",
    );
    expect(result.decision).toBe("EXECUTE");
    expect(result.mode).toBe("AHORA");
  });

  it("Caso 3: NOW normal → needsAdminNotify=false, sin regresión", () => {
    const decision = makeDecision({
      intent: "NOW",
      facts: ["now:ahora"],
    });
    const result = policyAhora(decision, { lang: "es" });

    expect(result.needsAdminNotify).toBeUndefined();
    expect(result.adminNotifyBody).toBeUndefined();
    expect(result.finalResponse).toBe("Buscando chofer disponible para tu viaje. Te avisamos cuando alguien tome el servicio.");
    expect(result.decision).toBe("EXECUTE");
    expect(result.mode).toBe("AHORA");
  });

  it("Caso 3b: CLARIFY + NOW → needsAdminNotify=false, sin regresión", () => {
    const decision = makeDecision({
      decision: "CLARIFY",
      intent: "GREETING",
      facts: [],
    });
    const result = policyAhora(decision);

    expect(result.needsAdminNotify).toBeUndefined();
    expect(result.decision).toBe("CLARIFY");
    expect(result.mode).toBe("AHORA");
    expect(result.requiresUserInput).toBe(true);
  });
});
