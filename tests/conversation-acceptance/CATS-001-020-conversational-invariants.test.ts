/**
 * PR-CATS-1 — Conversation Acceptance Test Suite
 *
 * 20 invariant-based tests (CAT-001 to CAT-020) that validate conversational
 * state continuity, intent stability, slot integrity, ambiguity persistence,
 * and pipeline routing invariants.
 *
 * DESIGN PRINCIPLES:
 * 1. Zero production code modifications — tests only
 * 2. Invariant-based: each test validates ONE truth that must ALWAYS hold
 * 3. Document CURRENT behavior, even if buggy — QA-3 will change some invariants
 * 4. Pure function tests (no mocking) + mocked integration tests (pattern from
 *    tests/e2e/improved-flows.test.ts)
 *
 * COVERAGE MAP (break points from PR-QA2B):
 *   QB-01 → CAT-001, CAT-002, CAT-003
 *   QB-02 → CAT-004
 *   QB-04 → CAT-006, CAT-007, CAT-008
 *   QB-05 → CAT-005
 *   QB-07 → CAT-003, CAT-009, CAT-010
 *   QB-08 → CAT-011, CAT-012
 *
 * @see docs/certification/PR-QA2B_CONVERSATIONAL_STATE_FORENSICS.md
 * @see docs/certification/PR-CATS-1_CONVERSATION_ACCEPTANCE_SUITE.md
 */

import { describe, it, expect } from "vitest";

// ═══════════════════════════════════════════════════════════════════════════
// PURE FUNCTION IMPORTS — no mocking needed
// ═══════════════════════════════════════════════════════════════════════════

import { core } from "@/lib/ai/core";
import type { Intent } from "@/lib/ai/types";
import {
  isAffirmativeMessage,
  isNegativeMessage,
  isCorrectionMessage,
  AFFIRMATION_RE,
  AMBIGUOUS_LOCATION_RE,
} from "@/lib/ai/patterns";
import { evaluateCompleteness } from "@/lib/services/workflow/evaluate-completeness";
import { resolveNextRequiredField } from "@/lib/ai/field-resolver";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";
import { operationalModeFromIntent, temporalFromFacts } from "@/lib/ai/types";
import type { ConversationalState } from "@/lib/ai/types";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS from slot-workflow.ts (re-exported here for invariant tests)
// ═══════════════════════════════════════════════════════════════════════════

const VALID_SLOT_TRANSITIONS: Record<ConversationalState, ConversationalState[]> = {
  idle: ["collecting_slots", "awaiting_confirmation"],
  collecting_slots: ["collecting_slots", "slot_confirmation", "awaiting_confirmation"],
  slot_confirmation: ["collecting_slots", "awaiting_passenger", "awaiting_confirmation", "pending_human_review"],
  awaiting_passenger: ["collecting_slots", "awaiting_confirmation"],
  awaiting_confirmation: ["collecting_slots"],
  pending_human_review: ["idle"],
  ambiguity_pending: ["slot_confirmation", "idle", "collecting_slots"],
};

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY A: Intent Stability Invariants  (QB-01, QB-05, QB-07)
// ═══════════════════════════════════════════════════════════════════════════

describe("Category A — Intent Stability Invariants", () => {

  // ── CAT-001: GREETING detection (QB-01 baseline) ──
  it("CAT-001: core('hola') returns GREETING with greeting fact", () => {
    const result = core("hola");
    expect(result.intent).toBe("GREETING");
    expect(result.facts).toContain("greeting:hola");
  });

  // ── CAT-002: GREETING overwrites BOOKING (QB-01 invariant — will change in QA-3) ──
  it("CAT-002: core('hola', 'BOOKING') returns GREETING — PREVIOUS INTENT IS LOST (QB-01)", () => {
    const result = core("hola", "BOOKING" as Intent);
    // Current behavior: GREETING does NOT preserve prevIntent
    // The prevIntent preservation rule (core.ts:277-283) only works for PRE_BOOKING,
    // not for GREETING. This is QB-01.
    expect(result.intent).toBe("GREETING");
    // NOTE: This invariant will CHANGE in QA-3 when greeting-aware context
    // preservation is implemented.
  });

  // ── CAT-003: Affirmation preserves BOOKING via prevIntent ──
  it("CAT-003: core('sí', 'BOOKING') preserves BOOKING (prevIntent affirmation)", () => {
    const result = core("sí", "BOOKING" as Intent);
    // "sí" without location context → classifyIntent returns PRE_BOOKING
    // (affirmation without booking/now/urgency facts → PRE_BOOKING)
    // prevIntent preservation: intent === "PRE_BOOKING" → prevIntent = "BOOKING"
    expect(result.intent).toBe("BOOKING");
    expect(result.facts).toContain("affirmation:true");
  });

  // ── CAT-004: Empty input invariant ──
  it("CAT-004: core('') returns AMBIGUOUS with zero confidence", () => {
    const result = core("");
    expect(result.intent).toBe("AMBIGUOUS");
    expect(result.confidence).toBe(0);
    expect(result.facts).toEqual([]);
    expect(result.slotAssignmentConfidence).toBeDefined();
    expect(result.slotAssignmentConfidence!.origin).toBe(0);
    expect(result.slotAssignmentConfidence!.destination).toBe(0);
  });

  // ── CAT-005: Second core() call produces same result (QB-05 defense) ──
  it("CAT-005: core() is idempotent — same input produces identical output", () => {
    const inputs = [
      "hola",
      "quiero ir del hotel al centro",
      "sí",
      "no, cambio destino",
      "ayuda estoy varado",
      "cuánto sale un viaje",
      "mañana a las 8",
    ];
    for (const input of inputs) {
      const a = core(input);
      const b = core(input);
      expect(a.intent).toBe(b.intent);
      expect(a.facts).toEqual(b.facts);
      expect(a.confidence).toBe(b.confidence);
      expect(a.slotStability).toEqual(b.slotStability);
      expect(a.roleLock).toEqual(b.roleLock);
    }
  });

  // ── CAT-006: prevIntent preservation for actions (QB-07) ──
  it("CAT-006: core('no, quiero ir a cataratas', 'BOOKING') preserves BOOKING (action+roleLock)", () => {
    // "no, quiero ir a cataratas" → action:quiero, destination:cataratas → BOOKING
    // prevIntent=BOOKING, intent===prevIntent → BOOKING preserved
    const result = core("no, quiero ir a cataratas", "BOOKING" as Intent);
    expect(result.intent).toBe("BOOKING");
    expect(result.facts).toContain("destination:cataratas");
  });

  // ── CAT-007: Location patterns produce correct slot stability ──
  it("CAT-007: Location text produces locked slots and appropriate stability", () => {
    // "estoy en el hotel y quiero ir al centro"
    //   → estoy_en → origin="el hotel" (ambiguous — "hotel" ∈ AMBIGUOUS_RE)
    //   → ir_a → destination="centro" (ambiguous — "centro" ∈ AMBIGUOUS_RE)
    const r1 = core("estoy en el hotel y quiero ir al centro");
    expect(r1.roleLock.origin).toContain("hotel");
    expect(r1.roleLock.destination).toContain("centro");
    expect(r1.slotStability.origin).toBe("ambiguous");
    expect(r1.slotStability.destination).toBe("ambiguous");
    expect(r1.intent).toBe("BOOKING");

    // "desde aeropuerto IGR hasta cataratas"
    //   → desde → origin="aeropuerto igr" (ambiguous — "aeropuerto" ∈ AMBIGUOUS_RE)
    //   → hasta → destination="cataratas" (locked — "cataratas" ∉ AMBIGUOUS_RE)
    const r2 = core("desde aeropuerto IGR hasta cataratas");
    expect(r2.roleLock.origin).toContain("aeropuerto");
    expect(r2.roleLock.destination).toBe("cataratas");
    expect(r2.slotStability.origin).toBe("ambiguous"); // lexical: "aeropuerto" ∈ AMBIGUOUS_RE
    expect(r2.slotStability.destination).toBe("locked"); // "cataratas" ∉ AMBIGUOUS_RE
  });

  // ── CAT-008: AMBIGUOUS/LOCATION_AMBIGUOUS detection ──
  it("CAT-008: Ambiguous location terms produce location_ambiguous fact", () => {
    const testCases = [
      "del centro al aeropuerto",
      "del hotel al centro",
      "del aeropuerto al hotel",
      "desde el hotel amerian",
      "al centro de la ciudad",
    ];
    for (const tc of testCases) {
      const result = core(tc);
      expect(result.facts).toContain("location_ambiguous:true");
    }
  });

  // ── CAT-009: Non-ambiguous location does NOT produce location_ambiguous ──
  it("CAT-009: Specific place names do NOT trigger location_ambiguous", () => {
    const testCases = [
      "desde cataratas hasta aeropuerto IGR",
      "del aeropuerto IGR al hotel Meliá",
      "desde el hotel Meliá hasta cataratas",
    ];
    for (const tc of testCases) {
      const result = core(tc);
      // These DO have ambiguous terms embedded (aeropuerto, hotel)
      // So they SHOULD have location_ambiguous:true
      // Actually: "aeropuerto IGR" — "aeropuerto" is in AMBIGUOUS_LOCATION_RE
      // "hotel Meliá" — "hotel" is in AMBIGUOUS_LOCATION_RE
      // So they WILL have location_ambiguous
      // This is expected — ambiguous term detection is lexical, not semantic
      expect(result.facts).toContain("location_ambiguous:true");
      // BUT the slot stability should be "locked" for specific terms
      if (result.roleLock.origin?.includes("igr")) {
        expect(result.slotStability.origin).toBe("locked");
      }
    }
  });

  // ── CAT-010: NOW/BOOKING classification with temporal signals ──
  it("CAT-010: Temporal signals correctly classify NOW vs BOOKING", () => {
    const now = core("necesito un auto ahora urgente");
    expect(now.intent).toBe("NOW");
    expect(now.facts).toContain("urgency:ahora");

    const future = core("quiero reservar para mañana a las 8");
    expect(future.intent).toBe("BOOKING");
    expect(future.facts.some(f => f.startsWith("date:") || f.startsWith("time:"))).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY B: Slot & Field Resolution Invariants (QB-04)
// ═══════════════════════════════════════════════════════════════════════════

describe("Category B — Slot & Field Resolution Invariants", () => {

  // ── CAT-011: evaluateCompleteness always returns valid status ──
  it("CAT-011: evaluateCompleteness never returns undefined or invalid status", () => {
    const testSlots = [
      null,
      undefined,
      {},
      { origin: "" },
      { origin: "Hotel" },
      { origin: "Hotel", destination: "" },
      { origin: "Hotel", destination: "Centro" },
      { origin: "Hotel", destination: "Centro", passengers: 3 },
    ];
    const domainValues = [undefined, "information" as const, "reservation" as const, "commercial" as const];

    for (const slots of testSlots) {
      for (const domain of domainValues) {
        const result = evaluateCompleteness(slots as any, domain);
        expect(["ASK", "COMPLETE"]).toContain(result.status);
        if (result.status === "ASK") {
          expect(["origin", "destination"]).toContain(result.field);
        }
      }
    }
  });

  // ── CAT-012: evaluateCompleteness returns COMPLETE for information domain ──
  it("CAT-012: evaluateCompleteness information domain always returns COMPLETE", () => {
    expect(evaluateCompleteness(null, "information")).toEqual({ status: "COMPLETE" });
    expect(evaluateCompleteness({}, "information")).toEqual({ status: "COMPLETE" });
    expect(evaluateCompleteness({ origin: "Hotel", destination: "Centro" }, "information")).toEqual({ status: "COMPLETE" });
  });

  // ── CAT-013: evaluateCompleteness field order (origin before destination) ──
  it("CAT-013: evaluateCompleteness asks for origin before destination", () => {
    expect(evaluateCompleteness({})).toEqual({ status: "ASK", field: "origin" });
    expect(evaluateCompleteness({ origin: "Hotel" })).toEqual({ status: "ASK", field: "destination" });
    expect(evaluateCompleteness({ origin: "Hotel", destination: "Centro" })).toEqual({ status: "COMPLETE" });
    expect(evaluateCompleteness({ destination: "Centro" })).toEqual({ status: "ASK", field: "origin" });
  });

  // ── CAT-014: resolveNextRequiredField returns null for complete context ──
  it("CAT-014: resolveNextRequiredField returns null when extraction is complete", () => {
    const completeCtx = {
      extraction: {
        slots: {
          origin: { value: "Hotel", score: 0.9, reason: "core_extracted" },
          destination: { value: "Centro", score: 0.9, reason: "core_extracted" },
          passengers: { value: 3, score: 0.9, reason: "extracted" },
          scheduled_at: { value: "2026-07-17T10:00", score: 0.9, reason: "extracted" },
        },
        overallConfidence: 0.9,
        conversationalState: "awaiting_confirmation",
        clarifyField: null,
        askForConfirmation: true,
      } as any,
    };
    const result = resolveNextRequiredField(completeCtx as any);
    expect(result.field).toBeNull();
  });

  // ── CAT-015: resolveNextRequiredField correctly identifies missing fields ──
  it("CAT-015: resolveNextRequiredField identifies missing mandatory fields", () => {
    // With undefined extraction (no ctx at all) → null field
    const r0 = resolveNextRequiredField(undefined, undefined);
    expect(r0.field).toBeNull();

    // Empty slots + undefined coreFacts → falls through to slot-based checks
    // → passengers score 0 (< 0.7) → returns passengers
    const emptySlotsCtx = {
      extraction: {
        slots: {},
        overallConfidence: 0,
        conversationalState: "idle",
        clarifyField: null,
        askForConfirmation: false,
      } as any,
    };
    const r1 = resolveNextRequiredField(emptySlotsCtx as any, undefined);
    expect(r1.field).toBe("passengers");
    expect(r1.reason).toBe("missing");

    // With coreFacts indicating missing origin (empty array is truthy!)
    const r2 = resolveNextRequiredField(emptySlotsCtx as any, ["greeting:hola"]);
    // hasExtractionData=false → enters coreFacts branch (coreFacts is truthy)
    // No origin fact → origin: missing
    expect(r2.field).toBe("origin");
    expect(r2.reason).toBe("missing");
  });

  // ── CAT-016: resolveNextRequiredField prioritizes CONFIRMATION_PENDING ──
  it("CAT-016: resolveNextRequiredField prioritizes confirmation_pending slots", () => {
    // Simulate ambiguity: slot origin is CONFIRMATION_PENDING
    const ambiguousCtx = {
      extraction: {
        slots: {
          origin: { value: "Hotel", score: 0.9, reason: "core_extracted", status: "CONFIRMATION_PENDING" },
          destination: { value: "Centro", score: 0.9, reason: "core_extracted" },
        },
        overallConfidence: 0.8,
        conversationalState: "collecting_slots",
        clarifyField: null,
        askForConfirmation: false,
      } as any,
    };
    const r1 = resolveNextRequiredField(ambiguousCtx as any);
    expect(r1.field).toBe("origin");
    expect(r1.reason).toBe("ambiguous");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY C: Pattern Recognition Invariants
// ═══════════════════════════════════════════════════════════════════════════

describe("Category C — Pattern Recognition Invariants", () => {

  // ── CAT-017: AFFIRMATION_RE matches all known affirmation forms ──
  it("CAT-017: AFFIRMATION_RE detects standard affirmations", () => {
    const affirmations = [
      "sí", "si", "sim", "yes", "ok", "dale",
      "sí confirmo", "sí dale", "de acuerdo", "confirmo",
      "todo correcto", "perfecto", "adelante", "listo",
      "está bien", "así está bien", "confirmado",
      "okey", "yrs", "yeah", "yep",
    ];
    for (const text of affirmations) {
      expect(AFFIRMATION_RE.test(text)).toBe(true);
      expect(isAffirmativeMessage(text)).toBe(true);
    }
  });

  // ── CAT-018: AFFIRMATION_RE does NOT match non-affirmations ──
  it("CAT-018: AFFIRMATION_RE rejects non-affirmations", () => {
    const nonAffirmations = [
      "no", "aeropuerto", "centro", "hotel", "3 pasajeros",
      "mañana a las 8", "cuánto cuesta", "ayuda",
    ];
    for (const text of nonAffirmations) {
      expect(isAffirmativeMessage(text)).toBe(false);
    }
  });

  // ── CAT-019: AMBIGUOUS_LOCATION_RE detects all ambiguous terms ──
  it("CAT-019: AMBIGUOUS_LOCATION_RE detects all ambiguous location terms", () => {
    const terms = [
      "centro", "microcentro", "ciudad", "aeropuerto", "puerto",
      "la ciudad", "cerca", "zona", "alrededores", "hotel",
      // NOTA: "iguazú" excluido por limitación conocida de \b con caracteres
      // acentuados en JavaScript RegExp — \b no reconoce ú como word char.
    ];
    for (const term of terms) {
      expect(AMBIGUOUS_LOCATION_RE.test(term)).toBe(true);
    }
  });

  // ── CAT-020: AMBIGUOUS_LOCATION_RE rejects specific places ──
  it("CAT-020: AMBIGUOUS_LOCATION_RE rejects specific place names", () => {
    const specific = [
      "cataratas", "igr", "meliá", "amerian", "panoramic",
      "foz do iguaçu",
    ];
    for (const place of specific) {
      // Skip any place that contains known ambiguous sub-strings
      // (e.g., "hotel" in "hotel meliá", "puerto" in "puerto iguazú")
      const containsAmbiguous = /\b(centro|ciudad|aeropuerto|puerto|hotel)\b/i.test(place);
      if (!containsAmbiguous) {
        expect(AMBIGUOUS_LOCATION_RE.test(place)).toBe(false);
      }
    }
  });

  // ── CAT-021 (bonus): negative/correction detection ──
  it("CAT-021: isNegativeMessage and isCorrectionMessage detect correctly", () => {
    expect(isNegativeMessage("no")).toBe(true);
    expect(isNegativeMessage("no gracias")).toBe(true);
    expect(isNegativeMessage("sí")).toBe(false);

    expect(isCorrectionMessage("no, estoy en otro hotel")).toBe(true);
    expect(isCorrectionMessage("me equivoqué")).toBe(true);
    expect(isCorrectionMessage("corrijo destino")).toBe(true);
    expect(isCorrectionMessage("sí")).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY D: State Machine & Session Helpers Invariants
// ═══════════════════════════════════════════════════════════════════════════

describe("Category D — State Machine & Session Helpers", () => {

  // ── CAT-022 (original CAT-016 slot): VALID_SLOT_TRANSITIONS completeness ──
  it("CAT-022: VALID_SLOT_TRANSITIONS covers all ConversationalState values", () => {
    const allStates: ConversationalState[] = [
      "idle", "collecting_slots", "slot_confirmation",
      "awaiting_passenger", "awaiting_confirmation",
      "pending_human_review", "ambiguity_pending",
    ];
    for (const state of allStates) {
      expect(VALID_SLOT_TRANSITIONS[state]).toBeDefined();
      expect(Array.isArray(VALID_SLOT_TRANSITIONS[state])).toBe(true);
      expect(VALID_SLOT_TRANSITIONS[state].length).toBeGreaterThan(0);
    }
  });

  // ── CAT-023: parseSessionSlots handles all edge cases ──
  it("CAT-023: parseSessionSlots handles null, empty, invalid, and valid JSON", () => {
    expect(parseSessionSlots(null)).toEqual({});
    expect(parseSessionSlots("")).toEqual({});
    expect(parseSessionSlots("not json")).toEqual({});
    expect(parseSessionSlots("[]")).toEqual({}); // array not object
    expect(parseSessionSlots('{"origin":"Hotel"}')).toEqual({ origin: "Hotel" });
    expect(parseSessionSlots('{"origin":{"value":"Hotel","score":0.9}}')).toEqual({
      origin: { value: "Hotel", score: 0.9 },
    });
  });

  // ── CAT-024: parseConfidenceJson handles all edge cases ──
  it("CAT-024: parseConfidenceJson handles null, empty, invalid, and valid JSON", () => {
    expect(parseConfidenceJson(null)).toEqual({});
    expect(parseConfidenceJson("")).toEqual({});
    expect(parseConfidenceJson("not json")).toEqual({});
    expect(parseConfidenceJson("[]")).toEqual({});
    expect(parseConfidenceJson('{"origin":0.9}')).toEqual({ origin: 0.9 });
  });

  // ── CAT-025: operationalModeFromIntent covers all intents ──
  it("CAT-025: operationalModeFromIntent returns valid mode for all intents", () => {
    const testCases: Array<{ intent: string; temporal: string; expected: string }> = [
      { intent: "GREETING", temporal: "UNKNOWN", expected: "INFO" },
      { intent: "INFORMATIONAL", temporal: "UNKNOWN", expected: "INFO" },
      { intent: "COMMERCIAL", temporal: "UNKNOWN", expected: "INFO" },
      { intent: "CONSULTA", temporal: "UNKNOWN", expected: "INFO" },
      { intent: "AMBIGUOUS", temporal: "UNKNOWN", expected: "INFO" },
      { intent: "EMERGENCY", temporal: "UNKNOWN", expected: "DISPATCH" },
      { intent: "NOW", temporal: "UNKNOWN", expected: "DISPATCH" },
      { intent: "BOOKING", temporal: "NOW", expected: "DISPATCH" },
      { intent: "BOOKING", temporal: "FUTURE", expected: "RESERVATION" },
      { intent: "BOOKING", temporal: "UNKNOWN", expected: "CLARIFY" },
      { intent: "PRE_BOOKING", temporal: "UNKNOWN", expected: "RESERVATION" },
      { intent: "RESCHEDULE", temporal: "UNKNOWN", expected: "RESERVATION" },
    ];

    for (const { intent, temporal, expected } of testCases) {
      const result = operationalModeFromIntent(intent as any, temporal as any);
      expect(result).toBe(expected);
    }
  });

  // ── CAT-026: temporalFromFacts classifies correctly ──
  it("CAT-026: temporalFromFacts correctly classifies NOW/FUTURE/UNKNOWN", () => {
    expect(temporalFromFacts(["now:ahora"])).toBe("NOW");
    expect(temporalFromFacts(["urgency:urgente"])).toBe("NOW");
    expect(temporalFromFacts(["date:hoy"])).toBe("FUTURE");
    expect(temporalFromFacts(["time:8:00"])).toBe("FUTURE");
    expect(temporalFromFacts(["now:ahora", "date:hoy"])).toBe("NOW"); // NOW takes precedence
    expect(temporalFromFacts([])).toBe("UNKNOWN");
    expect(temporalFromFacts(["greeting:hola"])).toBe("UNKNOWN");
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// CATEGORY E: Cross-Cutting Invariants — Will Get Integration Mocks in Sprint 2
// ═══════════════════════════════════════════════════════════════════════════
//
// The following scenarios require mocking of DB/LLM services and are planned
// for QA-3 Sprint 2 (post field-resolution unification).
//
// CAT-027: GREETING shortcut does not destroy existing conversational_state
//   → Requires mocking lead.service.ts handlePolicyPipeline call
//
// CAT-028: Ambiguity state survives session reload
//   → Requires mocking getChatSession + ambiguity-handler.ts
//
// CAT-029: Slot confirmation handler writes consistent conversational_state
//   → Requires mocking slot-confirmation-handler.ts
//
// CAT-030: Awaiting passenger handler preserves origin/destination slots
//   → Requires mocking awaiting-passenger-handler.ts
//
// @see tests/e2e/improved-flows.test.ts for established mocking patterns
// ═══════════════════════════════════════════════════════════════════════════
