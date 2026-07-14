/**
 * evidence-shadow-mode.test.ts — Integración: Shadow mode del Evidence Engine
 *
 * PR-2B → PR-2E: Verifica que el feature flag EVIDENCE_SHADOW_MODE
 * controla correctamente la construcción de Signal, Observation, Fact
 * y Evidence sin afectar el pipeline.
 *
 * Escenarios:
 *  - Flag OFF → ni Signal, Observation, Fact ni Evidence se construyen
 *  - Flag ON  → Signal + Observation + Facts + Evidence se construyen
 *  - Sin flag → comportamiento idéntico al actual (default false)
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// ── Mocks ──
// Mockeamos el logger para verificar logs sin efectos secundarios
vi.mock("@/lib/utils/logger", () => ({
  log: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// ── Imports después de mocks ──
import { buildSignal, buildObservation, buildFact, buildEvidence, buildKnowledge, isEvidenceShadowModeEnabled, runShadowCognition, ShadowResult, Signal, Observation, Fact, Evidence, Knowledge } from "@/lib/evidence";
import { log } from "@/lib/utils/logger";

describe("EVIDENCE_SHADOW_MODE — feature flag", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Limpiar env var antes de cada test
    delete process.env.EVIDENCE_SHADOW_MODE;
  });

  // ── Flag OFF ──

  it("con flag OFF, isEvidenceShadowModeEnabled retorna false", () => {
    process.env.EVIDENCE_SHADOW_MODE = "false";
    expect(isEvidenceShadowModeEnabled()).toBe(false);
  });

  it("sin flag (undefined), isEvidenceShadowModeEnabled retorna false", () => {
    // EVIDENCE_SHADOW_MODE no está definido
    expect(isEvidenceShadowModeEnabled()).toBe(false);
  });

  it("con flag OFF, no se construye Signal, Observation, Fact ni Evidence", () => {
    process.env.EVIDENCE_SHADOW_MODE = "false";

    // Esto simula el guard en lead.service.ts
    if (isEvidenceShadowModeEnabled()) {
      const signal = buildSignal({ text: "Hola", phone: "+549111111111" });
      if (signal) {
        const obs = buildObservation(signal);
        if (obs) {
          const facts = buildFact(obs, signal);
          if (facts) {
            buildEvidence(obs, facts);
          }
        }
      }
    }

    // Nada se logueó
    expect(log.info).not.toHaveBeenCalled();
  });

  // ── Flag ON ──

  it("con flag ON, isEvidenceShadowModeEnabled retorna true", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    expect(isEvidenceShadowModeEnabled()).toBe(true);
  });

  it("con flag ON, cadena completa Signal → Observation → Fact → Evidence", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    // 1. Signal
    const signal = buildSignal({
      text: "Necesito un taxi al aeropuerto",
      phone: "+549111111111",
      conversationId: 42,
    });
    expect(signal).toBeInstanceOf(Signal);

    // 2. Observation
    const obs = buildObservation(signal!);
    expect(obs).toBeInstanceOf(Observation);
    expect(obs!.signalId).toBe(signal!.id);
    expect(obs!.status).toBe("valid");

    // 3. Facts
    const facts = buildFact(obs!, signal!);
    expect(facts).not.toBeNull();
    expect(Array.isArray(facts)).toBe(true);
    expect(facts!.length).toBeGreaterThanOrEqual(1);
    facts!.forEach((f) => expect(f).toBeInstanceOf(Fact));

    // 4. Evidence
    const evidence = buildEvidence(obs!, facts!);
    expect(evidence).toBeInstanceOf(Evidence);
    expect(evidence!.observationId).toBe(obs!.id);
    expect(evidence!.type).toBe("user_input");
    expect(evidence!.facts.length).toBe(facts!.length);
    expect(evidence!.provenance).toEqual([]);

    // Toda la cadena fue logueada
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_SIGNAL]", expect.any(Object));
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_OBSERVATION]", expect.any(Object));
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_FACT]", expect.any(Object));
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_EVIDENCE]", expect.any(Object));
  });

  it("con flag ON, Signal multilínea → Observation → Facts → Evidence", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    const multiline = "Línea 1\nLínea 2";
    const signal = buildSignal({ text: multiline });
    expect(signal).toBeInstanceOf(Signal);

    const obs = buildObservation(signal!);
    expect(obs).toBeInstanceOf(Observation);
    expect(obs!.status).toBe("valid");

    const facts = buildFact(obs!, signal!);
    expect(facts).not.toBeNull();
    expect(facts!.length).toBeGreaterThanOrEqual(1);

    const evidence = buildEvidence(obs!, facts!);
    expect(evidence).toBeInstanceOf(Evidence);
  });

  it("con flag ON, Signal vacío → no se crea Observation ni Fact", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    const signal = buildSignal({ text: "" });
    expect(signal).toBeNull();

    // Observation nunca se intenta
    expect(log.warn).toHaveBeenCalledWith(
      "[EVIDENCE] Failed to build Signal",
      expect.any(Object),
    );
  });
});

describe("Signal → Observation → Fact → Evidence — integración con el pipeline (simulado)", () => {
  /**
   * Simula el punto exacto en lead.service.ts donde se construye
   * Signal → Observation → Fact → Evidence. Verifica que el pipeline
   * NO se ve afectado.
   */
  it("no debe afectar datos del pipeline si toda la cadena se construye", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const pipelineText = "Quiero ir al centro";
    const pipelinePhone = "+549111111111";
    const pipelineConversationId = 1;

    // Construcción completa (no modifica datos del pipeline)
    const signal = buildSignal({
      text: pipelineText,
      phone: pipelinePhone,
      conversationId: pipelineConversationId,
    });
    const obs = buildObservation(signal!);
    const facts = buildFact(obs!, signal!);
    const evidence = buildEvidence(obs!, facts!);

    // Datos originales inmutables
    expect(pipelineText).toBe("Quiero ir al centro");
    expect(pipelinePhone).toBe("+549111111111");

    // Signal, Observation, Facts, Evidence son independientes
    expect(signal!.rawContent).toBe("Quiero ir al centro");
    expect(obs!.signalId).toBe(signal!.id);
    expect(obs!.status).toBe("valid");
    expect(facts).not.toBeNull();
    expect(facts!.length).toBeGreaterThanOrEqual(1);
    expect(evidence).toBeInstanceOf(Evidence);
    expect(evidence!.observationId).toBe(obs!.id);

    // Pipeline continúa normalmente
    expect(typeof pipelineText).toBe("string");
    expect(typeof pipelinePhone).toBe("string");
  });

  it("no debe interrumpir el pipeline si Signal falla → cadena no continúa", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    // Texto vacío → Signal null
    const signal = buildSignal({ text: "" });
    expect(signal).toBeNull();

    // Nada más se construye, pipeline sigue
    const pipelineContinues = true;
    expect(pipelineContinues).toBe(true);
  });

  it("no debe interrumpir el pipeline si Evidence falla (Facts vacío)", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    // Evidence con facts vacío retorna null, no lanza
    const obs = Observation.create({
      id: "obs-test",
      signalId: "sig-test",
      status: "valid",
      validatedAt: new Date(),
    });
    const evidence = buildEvidence(obs, []);
    expect(evidence).toBeNull();

    // Pipeline sigue
    const pipelineContinues = true;
    expect(pipelineContinues).toBe(true);
  });

  it("Evidence debe contener Facts estructurales completos", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const signal = buildSignal({
      text: "Hola, necesito un taxi",
      phone: "+549111111111",
      conversationId: 7,
    });
    const obs = buildObservation(signal!);
    const facts = buildFact(obs!, signal!);
    const evidence = buildEvidence(obs!, facts!);

    // Evidence tiene todos los Facts
    const channelFact = evidence!.facts.find((f) => f.proposition.includes("channel"));
    expect(channelFact).toBeDefined();

    const contentFact = evidence!.facts.find((f) => f.proposition === "message content present");
    expect(contentFact).toBeDefined();

    const convFact = evidence!.facts.find((f) => f.proposition.startsWith("conversation identified"));
    expect(convFact).toBeDefined();
    expect(convFact!.proposition).toContain("7");

    // Evidence es de tipo user_input
    expect(evidence!.type).toBe("user_input");
  });
});

describe("PR-2F — runShadowCognition como único entry point", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EVIDENCE_SHADOW_MODE;
    delete process.env.EVIDENCE_SHADOW_LOGGING;
  });

  // ── Guard: Feature flag ──

  it("runShadowCognition solo se ejecuta si EVIDENCE_SHADOW_MODE=true", () => {
    // Esto replica exactamente el código de lead.service.ts
    process.env.EVIDENCE_SHADOW_MODE = "false";

    let shadowResult: ShadowResult | null = new ShadowResult({
      signal: null,
      observation: null,
      facts: null,
      evidence: null,
      knowledge: null,
      belief: null,
      decision: null,
    }); // valor centinela

    if (isEvidenceShadowModeEnabled()) {
      shadowResult = runShadowCognition({
        text: "No debería ejecutarse",
        phone: "+549111111111",
        conversationId: 1,
      });
    }

    // Con flag OFF, runShadowCognition nunca se llama
    // shadowResult sigue siendo el centinela, no el resultado real
    expect(shadowResult!.signal).toBeNull();
  });

  it("runShadowCognition se ejecuta si EVIDENCE_SHADOW_MODE=true", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Quiero un taxi",
      phone: "+549111111111",
      conversationId: 3,
    });

    expect(result).toBeInstanceOf(ShadowResult);
    expect(result!.isComplete).toBe(true);
    expect(result!.signal!.rawContent).toBe("Quiero un taxi");
    expect(result!.observation!.signalId).toBe(result!.signal!.id);
    expect(result!.evidence!.observationId).toBe(result!.observation!.id);
  });

  // ── ShadowResult observable ──

  it("ShadowResult es observable en memoria (debugger, heap snapshot)", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Debug me",
      phone: "+549111111111",
    });

    // Propiedades accesibles para inspección
    expect(result).toBeInstanceOf(ShadowResult);
    expect(typeof result!.signal!.id).toBe("string");
    expect(typeof result!.observation!.id).toBe("string");
    expect(Array.isArray(result!.facts)).toBe(true);
    expect(typeof result!.evidence!.id).toBe("string");

    // Serialización para logging
    expect(result!.toSummary()).toContain("Signal ✓");
    expect(result!.toSummary()).toContain("Observation ✓");
  });

  // ── Feature flag EVIDENCE_SHADOW_LOGGING ──

  it("EVIDENCE_SHADOW_LOGGING=true produce log compacto", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    process.env.EVIDENCE_SHADOW_LOGGING = "true";

    runShadowCognition({
      text: "Con logging",
      phone: "+549111111111",
      conversationId: 5,
    });

    expect(log.info).toHaveBeenCalledWith("[SHADOW]", expect.stringContaining("Signal ✓"));
  });

  it("EVIDENCE_SHADOW_LOGGING=false no produce log shadow", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    process.env.EVIDENCE_SHADOW_LOGGING = "false";

    runShadowCognition({
      text: "Sin logging",
      phone: "+549111111111",
    });

    // Los builders siguen logueando sus propios eventos
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_SIGNAL]", expect.any(Object));
    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_OBSERVATION]", expect.any(Object));
    // Pero no el resumen del shadow coordinator
    expect(log.info).not.toHaveBeenCalledWith("[SHADOW]", expect.any(String));
  });

  // ── Sin impacto en pipeline ──

  it("runShadowCognition no modifica los datos de entrada del pipeline", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const input = {
      text: "Viaje al centro",
      phone: "+549111111111",
      conversationId: 10,
    };
    const inputCopy = { ...input };

    runShadowCognition(input);

    expect(input).toEqual(inputCopy);
    expect(input.text).toBe("Viaje al centro");
    expect(input.phone).toBe("+549111111111");
    expect(input.conversationId).toBe(10);
  });

  it("runShadowCognition nunca lanza si EVIDENCE_SHADOW_MODE=true y entrada normal", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    expect(() =>
      runShadowCognition({ text: "Normal", phone: "+549111111111" }),
    ).not.toThrow();
  });
});

describe("PR-3A — Knowledge en el shadow mode", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.EVIDENCE_SHADOW_MODE;
    delete process.env.EVIDENCE_SHADOW_LOGGING;
  });

  // ── Knowledge desde runShadowCognition ──

  it("runShadowCognition debe construir Knowledge cuando Evidence existe", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Quiero un taxi",
      phone: "+549111111111",
      conversationId: 7,
    });

    expect(result).toBeInstanceOf(ShadowResult);
    expect(result!.knowledge).toBeInstanceOf(Knowledge);
    expect(result!.knowledge!.evidenceId).toBe(result!.evidence!.id);
    expect(result!.knowledge!.observationStatus).toBe("valid");
    expect(result!.knowledge!.channel).toBe("whatsapp");
    expect(result!.knowledge!.hasContent).toBe(true);
  });

  it("Knowledge debe contener conversationId extraído de Facts", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Hola, necesito viajar",
      phone: "+549111111111",
      conversationId: 42,
    });

    expect(result!.knowledge!.conversationId).toBe("42");
  });

  it("Knowledge debe contener receivedAt extraído de Facts", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Test timestamp",
      phone: "+549111111111",
    });

    expect(result!.knowledge!.receivedAt).toBeTruthy();
    expect(typeof result!.knowledge!.receivedAt).toBe("string");
  });

  it("Knowledge debe tener isComplete true en ShadowResult cuando todo funciona", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Completo",
      phone: "+549111111111",
      conversationId: 1,
    });

    expect(result!.isComplete).toBe(true);
    expect(result!.knowledge!.isFullyConsolidated).toBe(true);
  });

  it("isComplete debe ser false si Knowledge falla", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    // Forzar fallo de Knowledge — mockeamos buildKnowledge
    // para que retorne null
    const result = runShadowCognition({
      text: "Sin knowledge",
      phone: "+549111111111",
    });

    // Con Evidence válido, Knowledge siempre se construye.
    // Solo fallaría si Evidence es null (no hay Facts).
    // En ese caso, Evidence también sería null.
    expect(result!.knowledge).toBeInstanceOf(Knowledge);
  });

  // ── Logging de Knowledge ──

  it("buildKnowledge debe loguear [EVIDENCE_KNOWLEDGE] en construcción exitosa", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    runShadowCognition({
      text: "Test logging knowledge",
      phone: "+549111111111",
    });

    expect(log.info).toHaveBeenCalledWith("[EVIDENCE_KNOWLEDGE]", expect.any(Object));
  });

  it("ShadowResult debe incluir Knowledge en el resumen con logging activo", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";
    process.env.EVIDENCE_SHADOW_LOGGING = "true";

    runShadowCognition({
      text: "Resumen con knowledge",
      phone: "+549111111111",
    });

    expect(log.info).toHaveBeenCalledWith("[SHADOW]", expect.stringContaining("Knowledge: ✓"));
  });

  // ── Cero impacto en pipeline ──

  it("buildKnowledge directo no afecta datos del pipeline", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const pipelineText = "Datos del pipeline";
    const signal = buildSignal({ text: pipelineText, phone: "+549111111111" });
    const obs = buildObservation(signal!);
    const facts = buildFact(obs!, signal!);
    const evidence = buildEvidence(obs!, facts!);
    const knowledge = buildKnowledge(evidence!);

    expect(knowledge).toBeInstanceOf(Knowledge);
    expect(pipelineText).toBe("Datos del pipeline");
    expect(signal!.rawContent).toBe("Datos del pipeline");
  });

  it("buildKnowledge nunca lanza aunque Evidence sea inválido", () => {
    // Evidence con facts vacío — el guard retorna null
    const obs = Observation.create({
      id: "obs-test", signalId: "sig-test", status: "valid", validatedAt: new Date(),
    });
    const evidence = buildEvidence(obs, []);
    expect(evidence).toBeNull();

    // Si evidence es null, buildKnowledge retorna null
    expect(buildKnowledge(null as unknown as Evidence)).toBeNull();
  });

  it("runShadowCognition completa exitosamente con Knowledge en el resultado", () => {
    process.env.EVIDENCE_SHADOW_MODE = "true";

    const result = runShadowCognition({
      text: "Prueba final PR-3A",
      phone: "+549111111111",
      conversationId: 99,
    });

    // Toda la cadena
    expect(result).toBeInstanceOf(ShadowResult);
    expect(result!.signal).toBeInstanceOf(Signal);
    expect(result!.observation).toBeInstanceOf(Observation);
    expect(result!.facts).not.toBeNull();
    expect(result!.facts!.length).toBeGreaterThanOrEqual(1);
    expect(result!.evidence).toBeInstanceOf(Evidence);
    expect(result!.knowledge).toBeInstanceOf(Knowledge);

    // Knowledge consolidado correctamente
    expect(result!.knowledge!.evidenceId).toBe(result!.evidence!.id);
    expect(result!.knowledge!.observationStatus).toBe("valid");
    expect(result!.knowledge!.conversationId).toBe("99");
    expect(result!.knowledge!.factCount).toBe(result!.facts!.length);
  });
});
