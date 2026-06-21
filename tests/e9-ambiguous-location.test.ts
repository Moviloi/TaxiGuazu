import { describe, it, expect } from "vitest";
import { policyAhora } from "@/lib/ai/policy-ahora";
import { policyReserva } from "@/lib/ai/policy-reserva";
import { inferMissingFieldFromCore, buildAmbiguousLocationConfirm } from "@/lib/ai/response-builder";
import type { FinalDecision } from "@/lib/ai/types";

function makeAhoraDecision(overrides: Partial<{
  decision: "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";
  facts: string[];
  confidence: number;
}> = {}): FinalDecision {
  return {
    decision: overrides.decision ?? "CLARIFY",
    mode: "AHORA",
    core: {
      intent: "NOW",
      facts: overrides.facts ?? ["now:ahora", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
      confidence: overrides.confidence ?? 0.8,
      slotStability: { origin: "ambiguous", destination: "ambiguous" },
      roleLock: { origin: null, destination: null },
    },
    reason: "test",
  };
}

function makeReservaDecision(overrides: Partial<{
  decision: "EXECUTE" | "ANSWER" | "CLARIFY" | "SAFE_FALLBACK";
  facts: string[];
  confidence: number;
}> = {}): FinalDecision {
  return {
    decision: overrides.decision ?? "CLARIFY",
    mode: "RESERVA",
    core: {
      intent: "BOOKING",
      facts: overrides.facts ?? ["booking:reservar", "origin:hotel", "destination:aeropuerto", "location_ambiguous:true"],
      confidence: overrides.confidence ?? 0.8,
      slotStability: { origin: "ambiguous", destination: "ambiguous" },
      roleLock: { origin: null, destination: null },
    },
    reason: "test",
  };
}

// T1: "aeropuerto al centro" → No preguntar "desde dónde", pedir confirmación de entidad
describe("T1: Ambiguous location → ask for confirmation, not 'desde dónde'", () => {
  it("AHORA: origin+dest present + location_ambiguous → buildAmbiguousLocationConfirm", () => {
    const res = policyAhora(makeAhoraDecision({
      facts: ["now:ahora", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "centro", score: 0.6, reason: "ambiguous_term" },
        },
        overallConfidence: 0.4,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.decision).toBe("CLARIFY");
    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("Aeropuerto de Iguazú");
    expect(res.finalResponse).toContain("centro");
    expect(res.finalResponse).not.toContain("desde dónde");
    expect(res.finalResponse).not.toContain("hora");
  });

  it("RESERVA: origin+dest present + location_ambiguous → buildAmbiguousLocationConfirm", () => {
    const res = policyReserva(makeReservaDecision({
      facts: ["booking:reservar", "origin:hotel", "destination:aeropuerto", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Hotel Amerian", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
        },
        overallConfidence: 0.4,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("Hotel Amerian");
    expect(res.finalResponse).toContain("Aeropuerto de Iguazú");
    expect(res.finalResponse).not.toContain("desde dónde");
  });
});

// T2: "IGR al centro de Puerto Iguazú" → Puede avanzar a pricing si tariff resolver confirma
describe("T2: Specific locations → can proceed to pricing", () => {
  it("AHORA: specific origin+dest + ANSWER → shows price", () => {
    const res = policyAhora({
      decision: "ANSWER",
      mode: "AHORA",
      core: {
        intent: "COMMERCIAL",
        facts: ["commercial:precio", "origin:aeropuerto iguazu", "destination:centro de puerto iguazu"],
        confidence: 0.8,
        slotStability: { origin: "locked", destination: "locked" },
        roleLock: { origin: "Aeropuerto de Iguazú", destination: "Centro de Puerto Iguazú" },
      },
      reason: "test",
    }, {
      extraction: {
        slots: {
          origin: { value: "Aeropuerto de Iguazú", score: 1.0, reason: "exact_alias_match" },
          destination: { value: "Centro de Puerto Iguazú", score: 1.0, reason: "exact_alias_match" },
        },
        overallConfidence: 0.9,
        conversationalState: "idle",
        clarifyField: null,
        askForConfirmation: false,
        tariff: { matched: true, price: 15000, canonicalOrigin: "IGR", canonicalDestination: "Centro" },
      },
    });

    expect(res.finalResponse).toContain("$15000");
  });
});

// T3: "quiero taxi" → Solicitar origen/destino
describe("T3: No locations → ask for origin/destination", () => {
  it("AHORA: no origin, no dest → ask for origin", () => {
    const res = policyAhora(makeAhoraDecision({
      facts: ["now:ahora"],
    }), {
      extraction: {
        slots: {},
        overallConfidence: 0.0,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.decision).toBe("CLARIFY");
    expect(res.finalResponse).toContain("desde dónde");
  });

  it("RESERVA: no origin, no dest → ask for origin", () => {
    const res = policyReserva(makeReservaDecision({
      facts: ["booking:reservar"],
    }), {
      extraction: {
        slots: {},
        overallConfidence: 0.0,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.finalResponse.toLowerCase()).toContain("desde dónde");
  });
});

// T4: Reserva: "hotel al aeropuerto mañana" → No romper RESERVA
describe("T4: RESERVA with ambiguous locations + time → don't break RESERVA flow", () => {
  it("RESERVA: ambiguous origin+dest + scheduled_at → acknowledge + ask time", () => {
    const res = policyReserva(makeReservaDecision({
      decision: "CLARIFY",
      facts: ["booking:reservar", "origin:hotel", "destination:aeropuerto", "date:mañana", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Hotel Amerian", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
          scheduled_at: { value: "2026-06-22", score: 0.8, reason: "relative_date_computed" },
        },
        overallConfidence: 0.5,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.mode).toBe("RESERVA");
    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("Hotel Amerian");
    expect(res.finalResponse).toContain("Aeropuerto de Iguazú");
  });
});

// T5: AHORA: "aeropuerto al centro ahora" → Mantener modo AHORA
describe("T5: AHORA with ambiguous locations → maintain AHORA mode", () => {
  it("AHORA: ambiguous origin+dest + urgency → mode stays AHORA", () => {
    const res = policyAhora(makeAhoraDecision({
      facts: ["now:ahora", "urgency:ahora", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "centro", score: 0.6, reason: "ambiguous_term" },
        },
        overallConfidence: 0.4,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.mode).toBe("AHORA");
    expect(res.decision).toBe("CLARIFY");
    expect(res.finalResponse).toContain("confirmar");
  });
});

// E9-EXECUTE-1: EXECUTE + ambiguous locations + no extraction → contextual confirmation
describe("E9-EXECUTE-1: EXECUTE with ambiguous locations, no extraction", () => {
  it("RESERVA EXECUTE: origin+dest+location_ambiguous → buildAmbiguousLocationConfirm", () => {
    const res = policyReserva(makeReservaDecision({
      decision: "EXECUTE",
      facts: ["action:quiero", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
    }), {});  // no extraction

    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("aeropuerto");
    expect(res.finalResponse).toContain("centro");
    expect(res.finalResponse).not.toContain("¿Qué lugar específico");
  });
});

// E9-EXECUTE-2: EXECUTE + ambiguous locations + extraction present → contextual confirmation
describe("E9-EXECUTE-2: EXECUTE with ambiguous locations, extraction present", () => {
  it("RESERVA EXECUTE: origin+dest+location_ambiguous + extraction → buildAmbiguousLocationConfirm", () => {
    const res = policyReserva(makeReservaDecision({
      decision: "EXECUTE",
      facts: ["booking:reservar", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "Centro de Puerto Iguazú", score: 0.6, reason: "ambiguous_term" },
        },
        overallConfidence: 0.4,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("Aeropuerto de Iguazú");
    expect(res.finalResponse).toContain("Centro de Puerto Iguazú");
    expect(res.finalResponse).not.toContain("¿Qué lugar específico");
  });
});

// E9-EXECUTE-3: EXECUTE + only origin + ambiguous → ask for missing destination
describe("E9-EXECUTE-3: EXECUTE with only origin, ambiguous → ask for destination", () => {
  it("RESERVA EXECUTE: origin+location_ambiguous (no dest) → ask for destination", () => {
    const res = policyReserva(makeReservaDecision({
      decision: "EXECUTE",
      facts: ["booking:reservar", "origin:aeropuerto", "location_ambiguous:true"],
    }), {});

    expect(res.finalResponse.toLowerCase()).toContain("a dónde necesitás ir");
    expect(res.finalResponse).not.toContain("confirmar");
  });
});

// E9-FLOW-1: Full integration — real facts from "estoy en el aeropuerto quiero ir al centro"
describe("E9-FLOW-1: Full flow — real facts through RESERVA EXECUTE", () => {
  it("facts: action:quiero + origin:aeropuerto + destination:centro + location_ambiguous → confirmación contextual", () => {
    const res = policyReserva(makeReservaDecision({
      decision: "EXECUTE",
      facts: ["action:quiero", "origin:aeropuerto", "destination:centro", "location_ambiguous:true"],
    }), {
      extraction: {
        slots: {
          origin: { value: "Aeropuerto de Iguazú", score: 0.6, reason: "ambiguous_term" },
          destination: { value: "Centro de Puerto Iguazú", score: 0.6, reason: "ambiguous_term" },
        },
        overallConfidence: 0.4,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      },
    });

    expect(res.mode).toBe("RESERVA");
    expect(res.finalResponse).toContain("confirmar");
    expect(res.finalResponse).toContain("Aeropuerto de Iguazú");
    expect(res.finalResponse).toContain("Centro de Puerto Iguazú");
    expect(res.finalResponse).not.toContain("¿Qué lugar específico");
  });
});

// inferMissingFieldFromCore priority tests
describe("inferMissingFieldFromCore priority", () => {
  it("origin missing → return 'origin' (even if location_ambiguous)", () => {
    const decision: FinalDecision = {
      decision: "CLARIFY",
      mode: "AHORA",
      core: {
        intent: "NOW",
        facts: ["location_ambiguous:true", "destination:centro"],
        confidence: 0.5,
        slotStability: { origin: "open", destination: "locked" },
        roleLock: { origin: null, destination: null },
      },
      reason: "test",
    };
    expect(inferMissingFieldFromCore(decision)).toBe("origin");
  });

  it("destination missing → return 'destination' (even if location_ambiguous)", () => {
    const decision: FinalDecision = {
      decision: "CLARIFY",
      mode: "AHORA",
      core: {
        intent: "NOW",
        facts: ["location_ambiguous:true", "origin:aeropuerto"],
        confidence: 0.5,
        slotStability: { origin: "locked", destination: "open" },
        roleLock: { origin: null, destination: null },
      },
      reason: "test",
    };
    expect(inferMissingFieldFromCore(decision)).toBe("destination");
  });

  it("both present + location_ambiguous → return 'location_ambiguous'", () => {
    const decision: FinalDecision = {
      decision: "CLARIFY",
      mode: "AHORA",
      core: {
        intent: "NOW",
        facts: ["location_ambiguous:true", "origin:aeropuerto", "destination:centro"],
        confidence: 0.5,
        slotStability: { origin: "ambiguous", destination: "ambiguous" },
        roleLock: { origin: null, destination: null },
      },
      reason: "test",
    };
    expect(inferMissingFieldFromCore(decision)).toBe("location_ambiguous");
  });

  it("both present + no ambiguity + no time → return 'time'", () => {
    const decision: FinalDecision = {
      decision: "CLARIFY",
      mode: "RESERVA",
      core: {
        intent: "BOOKING",
        facts: ["origin:aeropuerto", "destination:centro"],
        confidence: 0.8,
        slotStability: { origin: "locked", destination: "locked" },
        roleLock: { origin: null, destination: null },
      },
      reason: "test",
    };
    expect(inferMissingFieldFromCore(decision)).toBe("time");
  });

  it("all present → return null", () => {
    const decision: FinalDecision = {
      decision: "CLARIFY",
      mode: "RESERVA",
      core: {
        intent: "BOOKING",
        facts: ["origin:aeropuerto", "destination:centro", "time:8am", "passengers:2"],
        confidence: 0.9,
        slotStability: { origin: "locked", destination: "locked" },
        roleLock: { origin: null, destination: null },
      },
      reason: "test",
    };
    expect(inferMissingFieldFromCore(decision)).toBeNull();
  });
});

// buildAmbiguousLocationConfirm tests
describe("buildAmbiguousLocationConfirm", () => {
  it("Spanish: includes both locations and asks for confirmation", () => {
    const msg = buildAmbiguousLocationConfirm("Aeropuerto de Iguazú", "centro", "es");
    expect(msg).toContain("Aeropuerto de Iguazú");
    expect(msg).toContain("centro");
    expect(msg).toContain("confirmar");
  });

  it("English: includes both locations and asks for confirmation", () => {
    const msg = buildAmbiguousLocationConfirm("Iguazú Airport", "city centre", "en");
    expect(msg).toContain("Iguazú Airport");
    expect(msg).toContain("city centre");
    expect(msg).toContain("confirm");
  });

  it("Portuguese: includes both locations and asks for confirmation", () => {
    const msg = buildAmbiguousLocationConfirm("Aeroporto de Iguaçu", "centro", "pt");
    expect(msg).toContain("Aeroporto de Iguaçu");
    expect(msg).toContain("centro");
    expect(msg).toContain("confirmar");
  });
});
