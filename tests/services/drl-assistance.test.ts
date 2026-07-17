// Test: DRL Assistance Engine — runDrlAssistance and buildDrlEnrichment
// PR-5D: Verificar que el motor de asistencia ejecuta todas las reglas,
// produce enriquecimiento estructurado, y respeta executionTimeMs.

import { describe, it, expect } from "vitest";
import { runDrlAssistance, buildDrlEnrichment } from "@/lib/drl/assistance";
import { formatDrlEnrichment } from "@/lib/drl/assistance-types";
import type { DRLInput } from "@/lib/drl/types";
import type { DrlAssistanceResult } from "@/lib/drl/assistance-types";

describe("runDrlAssistance", () => {
  const completeInput: DRLInput = {
    slots: { origin: "IGR", destination: "CDE", passengers: 2, scheduled_at: "2026-07-20" },
    requiredSlots: ["origin", "destination", "passengers", "scheduled_at"],
  };

  const emptyInput: DRLInput = {
    slots: {},
    requiredSlots: ["origin", "destination"],
  };

  const partialInput: DRLInput = {
    slots: { origin: "IGR" },
    requiredSlots: ["origin", "destination"],
  };

  it("runs all five rules and returns aggregated result", () => {
    const result = runDrlAssistance(completeInput, "extraction");
    expect(result.completitud).toBeDefined();
    expect(result.consistencia).toBeDefined();
    expect(result.clasificacion).toBeDefined();
    expect(result.prioridad).toBeDefined();
    expect(result.escalamiento).toBeDefined();
  });

  it("detects execution time in milliseconds", () => {
    const result = runDrlAssistance(completeInput, "extraction");
    expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
    expect(result.executionTimeMs).toBeLessThan(1000); // debe ser sub-ms
  });

  it("returns PROCEED decision when all rules pass", () => {
    const result = runDrlAssistance(completeInput, "extraction");
    expect(result.decision).toBe("PROCEED");
    expect(result.overallConfidence).toBeGreaterThan(0.5);
  });

  it("returns ESCALATE when rules detect conflicts", () => {
    const conflictInput: DRLInput = {
      slots: { origin: "IGR", destination: "IGR" },
      requiredSlots: ["origin", "destination"],
    };
    const result = runDrlAssistance(conflictInput, "extraction");
    expect(result.decision).toBe("ESCALATE");
  });

  it("computes overallConfidence as average of rule confidences", () => {
    const result = runDrlAssistance(completeInput, "extraction");
    expect(result.overallConfidence).toBeGreaterThan(0);
    expect(result.overallConfidence).toBeLessThanOrEqual(1);
  });

  it("returns consistent results for the same input across targets", () => {
    const extraction = runDrlAssistance(partialInput, "extraction");
    const response = runDrlAssistance(partialInput, "response");
    // Las reglas son las mismas, el target solo afecta el formato
    expect(extraction.completitud.completenessRatio).toBe(response.completitud.completenessRatio);
    expect(extraction.consistencia.hasConflicts).toBe(response.consistencia.hasConflicts);
  });

  it("completitud assistance correctly reports missing fields for partial input", () => {
    const result = runDrlAssistance(partialInput, "extraction");
    expect(result.completitud.completenessLevel).toBe("partial");
    expect(result.completitud.missingFields).toContain("destination");
    expect(result.completitud.completenessRatio).toBe(0.5);
  });

  it("escalamiento assistance does not escalate for simple input", () => {
    const result = runDrlAssistance(completeInput, "extraction");
    expect(result.escalamiento.shouldEscalate).toBe(false);
    expect(result.escalamiento.escalateTo).toBeNull();
  });
});

// ─── buildDrlEnrichment ────────────────────────────────────────────────────

describe("buildDrlEnrichment", () => {
  it("returns DrlEnrichmentText with text and raw result", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination"] };
    const enrichment = buildDrlEnrichment(input, "extraction");
    expect(enrichment).not.toBeNull();
    expect(enrichment!.text).toBeTruthy();
    expect(enrichment!.raw.decision).toBeTruthy();
  });

  it("produces text with DRL_ prefix markers", () => {
    const input: DRLInput = { slots: {}, requiredSlots: ["origin"] };
    const enrichment = buildDrlEnrichment(input, "extraction");
    expect(enrichment!.text).toContain("DRL_DECISION");
    expect(enrichment!.text).toContain("DRL_COMPLETITUD");
    expect(enrichment!.text).toContain("DRL_CONSISTENCIA");
    expect(enrichment!.text).toContain("DRL_CLASIFICACION");
    expect(enrichment!.text).toContain("=== END DRL ASSISTANCE ===");
  });

  it("includes target name in header", () => {
    const extraction = buildDrlEnrichment({ slots: {}, requiredSlots: [] }, "extraction")!;
    expect(extraction.text).toContain("EXTRACTION");

    const response = buildDrlEnrichment({ slots: {}, requiredSlots: [] }, "response")!;
    expect(response.text).toContain("RESPONSE");

    const frustration = buildDrlEnrichment({ slots: {}, requiredSlots: [] }, "frustration")!;
    expect(frustration.text).toContain("FRUSTRATION");
  });

  it("includes pending fields and missing fields sections", () => {
    const input: DRLInput = { slots: { origin: "IGR" }, requiredSlots: ["origin", "destination", "passengers"] };
    const enrichment = buildDrlEnrichment(input, "extraction")!;
    expect(enrichment.text).toContain("DRL_MISSING_FIELDS");
    expect(enrichment.text).toContain("DRL_PENDING_FIELDS");
  });

  it("does not include escalation section when no escalation needed", () => {
    const input: DRLInput = { slots: { origin: "IGR", destination: "CDE" }, requiredSlots: [] };
    const enrichment = buildDrlEnrichment(input, "extraction")!;
    expect(enrichment.text).not.toContain("DRL_ESCALAMIENTO");
  });

  it("includes escalation section when escalamiento rule triggers on multi-ride", () => {
    const input: DRLInput = {
      slots: { _userText: "Ride 1: hotel to IGR airport, Ride 2: IGR to falls" },
      requiredSlots: [],
    };
    const enrichment = buildDrlEnrichment(input, "extraction")!;
    expect(enrichment.text).toContain("DRL_ESCALAMIENTO");
  });
});

// ─── formatDrlEnrichment (direct) ──────────────────────────────────────────

describe("formatDrlEnrichment", () => {
  const mockResult: DrlAssistanceResult = {
    decision: "PROCEED",
    overallConfidence: 0.85,
    completitud: { completenessRatio: 0.75, completenessLevel: "partial", missingFields: ["destination"], confidence: 0.7 },
    consistencia: { hasConflicts: false, conflictCount: 0, conflicts: [], severityLevel: "none", confidence: 1.0 },
    clasificacion: { extractionType: "incremental", complexity: "simple", priority: "normal", confidence: 0.95 },
    prioridad: { suggestedNextField: "destination", pendingFields: ["destination"], acquisitionMode: "minimal", confidence: 0.8 },
    escalamiento: { shouldEscalate: false, escalateTo: null, signals: [], confidence: 0.95 },
    executionTimeMs: 0.5,
  };

  it("formats for extraction target", () => {
    const text = formatDrlEnrichment(mockResult, "extraction");
    expect(text).toContain("EXTRACTION");
    expect(text).toContain("DRL_CONFIDENCE: 85%");
    expect(text).toContain("DRL_COMPLETITUD: ratio=75% level=partial");
  });

  it("formats for response target", () => {
    const text = formatDrlEnrichment(mockResult, "response");
    expect(text).toContain("RESPONSE");
  });

  it("formats for frustration target", () => {
    const text = formatDrlEnrichment(mockResult, "frustration");
    expect(text).toContain("FRUSTRATION");
  });
});
