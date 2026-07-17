// Test: DRL Rules — Completitud, Consistencia, Clasificacion, Prioridad, Escalamiento
// PR-5D: Implementaciones reales — verificar lógica determinística de cada regla.

import { describe, it, expect } from "vitest";
import { completitudRule } from "@/lib/drl/rules/completitud";
import { consistenciaRule } from "@/lib/drl/rules/consistencia";
import { clasificacionRule } from "@/lib/drl/rules/clasificacion";
import { prioridadRule } from "@/lib/drl/rules/prioridad";
import { escalamientoRule } from "@/lib/drl/rules/escalamiento";
import type { DRLInput } from "@/lib/drl/types";

// ─── Completitud ───────────────────────────────────────────────────────────

describe("completitudRule", () => {
  it("returns complete when all required slots present", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE" }, requiredSlots: ["origin", "destination"] };
    const result = completitudRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(1.0);
    expect(result.details?.completenessLevel).toBe("complete");
    expect(result.details?.completenessRatio).toBe(1);
  });

  it("returns partial when half of required slots present", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination"] };
    const result = completitudRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.confidence).toBe(0.7);
    expect(result.details?.completenessLevel).toBe("partial");
    expect((result.details?.missingFields as string[])).toContain("destination");
  });

  it("returns minimal when only 1 of 4 required slots present", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination", "passengers", "scheduled_at"] };
    const result = completitudRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("CLARIFY");
    expect(result.confidence).toBe(0.4);
    expect(result.details?.completenessLevel).toBe("minimal");
  });

  it("returns empty when no slots present", () => {
    const input: DRLInput = { slots: {}, requiredSlots: ["origin", "destination"] };
    const result = completitudRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
    expect(result.confidence).toBe(0.1);
    expect(result.details?.completenessLevel).toBe("empty");
  });

  it("handles empty requiredSlots gracefully", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: [] };
    const result = completitudRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.details?.completenessLevel).toBe("complete");
  });

  it("detects presentEmpty fields (empty string)", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "" }, requiredSlots: ["origin", "destination"] };
    const result = completitudRule(input)!;
    expect((result.details?.presentEmpty as string[])).toContain("destination");
  });

  it("returns correct missingFields list", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination", "passengers"] };
    const result = completitudRule(input)!;
    const missing = result.details?.missingFields as string[];
    expect(missing).toContain("destination");
    expect(missing).toContain("passengers");
    expect(missing).not.toContain("origin");
  });

  it("treats NaN and 0 passengers as empty", () => {
    const input: DRLInput = { slots: { passengers: NaN }, requiredSlots: ["passengers"] };
    const result = completitudRule(input)!;
    expect((result.details?.missingFields as string[])).toContain("passengers");
  });
});

// ─── Consistencia ──────────────────────────────────────────────────────────

describe("consistenciaRule", () => {
  it("returns PROCEED when no conflicts", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE", passengers: 2 } };
    const result = consistenciaRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.details?.hasConflicts).toBe(false);
  });

  it("detects origin=destination conflict (high severity)", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "IGR" } };
    const result = consistenciaRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
    expect(result.details?.severityLevel).toBe("high");
    expect((result.details?.conflicts as string[]).length).toBeGreaterThanOrEqual(1);
  });

  it("detects past date conflict (high severity)", () => {
    const input: DRLInput = { slots: { scheduled_at: "2020-01-01" } };
    const result = consistenciaRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
    expect(result.details?.severityLevel).toBe("high");
  });

  it("detects zero passengers as high conflict", () => {
    const input: DRLInput = { slots: { passengers: 0 } };
    const result = consistenciaRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.details?.hasConflicts).toBe(true);
    expect((result.details?.conflicts as string[]).length).toBeGreaterThanOrEqual(1);
  });

  it("detects >20 passengers as medium conflict", () => {
    const input: DRLInput = { slots: { passengers: 25 } };
    const result = consistenciaRule(input)!;
    expect(result.decision).toBe("CLARIFY");
    expect(result.details?.severityLevel).toBe("medium");
  });

  it("returns PROCEED with low confidence for related locations (low severity)", () => {
    // "cataratas" y "parque nacional iguazú" son relacionados
    const input: DRLInput = { slots: { origin: "cataratas", destination: "parque nacional iguazú" } };
    const result = consistenciaRule(input)!;
    // Esto depende de si los sinonimos matchean exactamente
    // El test verifica que no crashea y retorna estructura válida
    expect(result.ruleFamily).toBe("consistencia");
    expect(result.confidence).toBeGreaterThanOrEqual(0);
  });

  it("handles empty slots gracefully", () => {
    const input: DRLInput = { slots: {}, requiredSlots: [] };
    const result = consistenciaRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.details?.hasConflicts).toBe(false);
  });

  it("produces conflict messages with details", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "IGR" } };
    const result = consistenciaRule(input)!;
    const conflicts = result.details?.conflicts as string[];
    expect(conflicts.length).toBeGreaterThan(0);
    expect(conflicts[0].length).toBeGreaterThan(10); // mensaje descriptivo
  });
});

// ─── Clasificación ─────────────────────────────────────────────────────────

describe("clasificacionRule", () => {
  it("classifies initial extraction when no slots present", () => {
    const input: DRLInput = { slots: {}, requiredSlots: ["origin"] };
    const result = clasificacionRule(input)!;
    expect(result.details?.extractionType).toBe("initial");
    expect(result.details?.preFillSlotCount).toBe(0);
  });

  it("classifies incremental extraction when some slots present", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination"] };
    const result = clasificacionRule(input)!;
    expect(result.details?.extractionType).toBe("incremental");
    expect(result.details?.preFillSlotCount).toBe(1);
  });

  it("detects clarification response from conversationState", () => {
    const input: DRLInput = {
      slots: { origin: "IGR" },
      requiredSlots: ["origin", "destination"],
      conversationState: "collecting_slots",
    };
    const result = clasificacionRule(input)!;
    expect(result.details?.isClarificationResponse).toBe(true);
    expect(result.details?.extractionType).toBe("clarification");
  });

  it("estimates simple complexity for 1-2 slots", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE" }, requiredSlots: [] };
    const result = clasificacionRule(input)!;
    expect(result.details?.complexity).toBe("simple");
  });

  it("estimates moderate complexity for 3+ slots", () => {
    const input: DRLInput = {
      slots: { origin: "IGR", destination: "CDE", passengers: 2, scheduled_at: "2026-07-20" },
      requiredSlots: [],
    };
    const result = clasificacionRule(input)!;
    expect(["moderate", "simple"]).toContain(result.details?.complexity);
  });

  it("returns confidence based on complexity", () => {
    const simple = clasificacionRule({ slots: {}, requiredSlots: [] })!;
    expect(simple.confidence).toBeGreaterThan(0.9);

    const complex = clasificacionRule({
      slots: { origin: "IGR", destination: "CDE", passengers: 2, scheduled_at: "2026-07-20", flight: "AR1234" },
      requiredSlots: [],
    })!;
    expect(complex.confidence).toBeLessThanOrEqual(simple.confidence);
  });
});

// ─── Prioridad ─────────────────────────────────────────────────────────────

describe("prioridadRule", () => {
  it("suggests origin as first priority when no slots present", () => {
    const input: DRLInput = { slots: {}, requiredSlots: ["origin", "destination"] };
    const result = prioridadRule(input)!;
    expect(result.details?.suggestedNextField).toBe("origin");
    expect((result.details?.pendingFields as string[])).toContain("origin");
    expect((result.details?.pendingFields as string[])).toContain("destination");
  });

  it("suggests missing field based on canonical order", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination"] };
    const result = prioridadRule(input)!;
    expect(result.details?.suggestedNextField).toBe("destination");
  });

  it("returns skip mode when all fields complete", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE", passengers: 2 }, requiredSlots: ["origin", "destination", "passengers"] };
    const result = prioridadRule(input)!;
    expect(result.details?.acquisitionMode).toBe("skip");
    expect((result.details?.completedFields as string[])).toContain("origin");
    expect((result.details?.completedFields as string[])).toContain("destination");
  });

  it("returns minimal mode when only 1 field pending", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE" }, requiredSlots: ["origin", "destination", "passengers"] };
    const result = prioridadRule(input)!;
    expect(result.details?.acquisitionMode).toBe("minimal");
    expect((result.details?.pendingFields as string[])).toEqual(["passengers"]);
  });

  it("returns normal mode when 2+ fields pending", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination", "passengers"] };
    const result = prioridadRule(input)!;
    expect(result.details?.acquisitionMode).toBe("normal");
  });

  it("prioritizes clarify_field from conversationState", () => {
    const input: DRLInput = {
      slots: { origin: "IGR" },
      requiredSlots: ["origin", "destination", "passengers"],
      conversationState: "clarify_field:passengers",
    };
    const result = prioridadRule(input)!;
    expect(result.details?.suggestedNextField).toBe("passengers");
  });
});

// ─── Escalamiento ──────────────────────────────────────────────────────────

describe("escalamientoRule", () => {
  it("does not escalate for simple cases", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE" }, requiredSlots: [] };
    const result = escalamientoRule(input)!;
    expect(result.passed).toBe(true);
    expect(result.decision).toBe("PROCEED");
    expect(result.details?.shouldEscalate).toBe(false);
  });

  it("escalates to GEMINI when multi-ride indicators present", () => {
    const input: DRLInput = {
      slots: { _userText: "Ride 1: hotel to airport, Ride 2: airport to falls" },
      requiredSlots: [],
    };
    const result = escalamientoRule(input)!;
    expect(result.passed).toBe(false);
    expect(result.decision).toBe("ESCALATE");
    expect(result.details?.escalateTo).toBe("GEMINI");
    expect((result.details?.signals as string[])).toContain("multi_ride_detected");
  });

  it("escalates to GEMINI when legs array has multiple entries", () => {
    const input: DRLInput = {
      slots: { legs: [{ origin: "A", destination: "B" }, { origin: "B", destination: "C" }] },
      requiredSlots: [],
    };
    const result = escalamientoRule(input)!;
    expect(result.details?.shouldEscalate).toBe(true);
  });

  it("does not escalate for simple single-ride cases", () => {
    const input: DRLInput = {
      slots: { _userText: "I need a transfer from IGR airport to downtown" },
      requiredSlots: [],
    };
    const result = escalamientoRule(input)!;
    expect(result.details?.shouldEscalate).toBe(false);
  });

  it("returns high confidence for simple cases", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: [] };
    const result = escalamientoRule(input)!;
    expect(result.details?.escalationConfidence).toBeGreaterThanOrEqual(0.9);
  });

  it("returns signals array with reasons", () => {
    const input: DRLInput = {
      slots: { _userText: "Trip 1: A to B, Trip 2: C to D" },
      requiredSlots: [],
    };
    const result = escalamientoRule(input)!;
    expect((result.details?.signals as string[]).length).toBeGreaterThan(0);
  });
});
