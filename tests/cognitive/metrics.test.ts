// PR-5F: Cognitive Metrics — unit tests
// Cobertura: collector, budget, side-effect-free guarantee, event type helpers.

import { getCognitiveMetricsState, resetCognitiveMetricsState, captureEvent, captureBKEEvent, captureDRLEvent, captureLLMEvent, captureFallbackEvent, capturePipelineEvent, startRequest } from "@/lib/cognitive/collector";
import { calculateBudget } from "@/lib/cognitive/budget";
import type { CognitiveEvent, BKEEventDetails, DRLEventDetails, LLMEventDetails, FallbackEventDetails, PipelineEventDetails } from "@/lib/cognitive/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sampleEvents(): CognitiveEvent[] {
  return [
    {
      id: "1",
      stage: "bke_pricing",
      timestamp: 1000,
      durationMs: 50,
      success: true,
      activeFlags: {},
      details: { domain: "pricing", query: "CDE-IGU", resolutionSource: "cache", confidence: 1.0 } as unknown as Record<string, unknown>,
    },
    {
      id: "2",
      stage: "drl_response_assist",
      timestamp: 2000,
      durationMs: 30,
      success: true,
      activeFlags: {},
      details: { rule: "response-asistencia", decision: "PROCEED", confidence: 0.9, executionTimeMs: 30 } as unknown as Record<string, unknown>,
    },
    {
      id: "3",
      stage: "gemini_response",
      timestamp: 3000,
      durationMs: 800,
      success: true,
      activeFlags: {},
      details: { provider: "gemini", model: "gemini-2.0-flash", operation: "respond", isFallback: false } as unknown as Record<string, unknown>,
    },
    {
      id: "4",
      stage: "gemini_extraction",
      timestamp: 4000,
      durationMs: 1200,
      success: false,
      activeFlags: {},
      details: { provider: "gemini", model: "gemini-2.0-flash", operation: "extract", isFallback: false, error: "Rate limit" } as unknown as Record<string, unknown>,
    },
    {
      id: "5",
      stage: "fallback_provider",
      timestamp: 5000,
      durationMs: 2100,
      success: true,
      activeFlags: {},
      details: { from: "gemini", to: "groq", reason: "Rate limit" } as unknown as Record<string, unknown>,
    },
    {
      id: "6",
      stage: "pipeline_handler",
      timestamp: 1500,
      durationMs: 500,
      success: true,
      activeFlags: {},
      details: { pipeline: "handler", intent: "TRANSFER" } as unknown as Record<string, unknown>,
    },
  ];
}

// ─── Collector ───────────────────────────────────────────────────────────────

describe("CognitiveMetricsCollector", () => {
  beforeEach(() => {
    resetCognitiveMetricsState();
  });

  it("captures an event and returns it via getState", () => {
    const details: BKEEventDetails = { domain: "pricing", query: "CDE-IGU", resolutionSource: "backend", confidence: 1.0 };
    captureEvent("bke_pricing", 42, true, details as unknown as Record<string, unknown>);

    const state = getCognitiveMetricsState();
    expect(state.events.length).toBe(1);
    expect(state.events[0].stage).toBe("bke_pricing");
    expect(state.events[0].durationMs).toBe(42);
    expect(state.events[0].success).toBe(true);
    expect(state.totalEventsCaptured).toBe(1);
  });

  it("assigns unique id and timestamp to each event", () => {
    captureEvent("bke_pricing", 10, true, { domain: "pricing", query: "a", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>);
    captureEvent("bke_pricing", 20, true, { domain: "pricing", query: "b", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>);

    const state = getCognitiveMetricsState();
    expect(state.events.length).toBe(2);
    expect(state.events[0].id).not.toBe(state.events[1].id);
    expect(state.events[0].timestamp).toBeLessThanOrEqual(state.events[1].timestamp);
    expect(state.totalEventsCaptured).toBe(2);
  });

  it("captures multiple event types via helpers", () => {
    captureBKEEvent(10, true, { domain: "entity", query: "test", resolutionSource: "catalog", confidence: 0.9 });
    captureDRLEvent(20, true, { rule: "comprehension-resolver", decision: "PROCEED", confidence: 0.8, executionTimeMs: 20 });
    captureLLMEvent(500, true, { provider: "groq", model: "llama-3.3-70b-versatile", operation: "respond", isFallback: true });
    captureFallbackEvent(2000, true, { from: "gemini", to: "groq", reason: "rate_limit" });
    capturePipelineEvent(300, true, { pipeline: "extraction", intent: "TRANSFER" });

    const state = getCognitiveMetricsState();
    expect(state.events.length).toBe(5);
    expect(state.events.filter(e => e.stage.startsWith("bke")).length).toBe(1);
    expect(state.events.filter(e => e.stage.startsWith("drl")).length).toBe(1);
    expect(state.events.filter(e => e.stage.startsWith("groq")).length).toBe(1);
    expect(state.events.filter(e => e.stage.startsWith("fallback")).length).toBe(1);
    expect(state.events.filter(e => e.stage.startsWith("pipeline")).length).toBe(1);
  });

  it("limits event buffer to 10k", () => {
    for (let i = 0; i < 10_050; i++) {
      captureBKEEvent(1, true, { domain: "pricing", query: "overflow", resolutionSource: "test", confidence: 0.5 });
    }
    const state = getCognitiveMetricsState();
    expect(state.events.length).toBeLessThanOrEqual(10_000);
    expect(state.totalEventsCaptured).toBe(10_050);
  });

  it("tracks requests via startRequest / endRequest", () => {
    startRequest("test-session", "test-session-id");
    const state = getCognitiveMetricsState();
    expect(state.requests.length).toBe(1);
  });

  it("resets state correctly", () => {
    captureBKEEvent(10, true, { domain: "entity", query: "test", resolutionSource: "test", confidence: 0.5 });
    resetCognitiveMetricsState();
    const state = getCognitiveMetricsState();
    expect(state.events.length).toBe(0);
    expect(state.totalEventsCaptured).toBe(0);
    expect(state.requests.length).toBe(0);
    expect(state.lastResetAt).toBeGreaterThan(0);
  });

  it("is side-effect-free: capturing does not throw", () => {
    expect(() => captureEvent("bke_pricing", 10, true, { domain: "pricing", query: "test", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>)).not.toThrow();
    expect(() => captureBKEEvent(10, true, { domain: "pricing", query: "test", resolutionSource: "cache", confidence: 0.5 })).not.toThrow();
    expect(() => captureDRLEvent(10, true, { rule: "comprehension-test", decision: "PROCEED", confidence: 0.5, executionTimeMs: 10 })).not.toThrow();
    expect(() => captureLLMEvent(10, true, { provider: "gemini", model: "test", operation: "respond", isFallback: false })).not.toThrow();
    expect(() => captureFallbackEvent(10, true, { from: "gemini", to: "groq", reason: "test" })).not.toThrow();
    expect(() => capturePipelineEvent(10, true, { pipeline: "handler", intent: "TEST" })).not.toThrow();
  });
});

// ─── Budget ──────────────────────────────────────────────────────────────────

describe("CognitiveBudget", () => {
  it("calculates budget from events", () => {
    const events = sampleEvents();
    const budget = calculateBudget(events);

    expect(budget.bkeHits).toBe(1);
    expect(budget.drlDecisions).toBe(1);
    expect(budget.groqCalls).toBe(0);  // no groq events in sample
    expect(budget.geminiCalls).toBe(2); // one success, one failure
    // llmEscalations = gemini_* = 2 + fallback_provider = 1 = 3
    expect(budget.llmEscalations).toBe(3);
  });

  it("calculates bkeResolutionRate", () => {
    const events = sampleEvents();
    const budget = calculateBudget(events);
    expect(budget.bkeResolutionRate).toBe(100); // 1/1 success → 100%
  });

  it("calculates drlResolutionRate", () => {
    const events = sampleEvents();
    const budget = calculateBudget(events);
    expect(budget.drlResolutionRate).toBe(100); // 1/1 success → 100%
  });

  it("filters by time range", () => {
    const events = sampleEvents();
    const budgetAfter3k = calculateBudget(events, 3500);
    expect(budgetAfter3k.bkeHits).toBe(0); // bke at 1000
    expect(budgetAfter3k.drlDecisions).toBe(0); // drl at 2000
    expect(budgetAfter3k.geminiCalls).toBe(1); // only gemini_extraction at 4000

    const budgetBefore5k = calculateBudget(events, undefined, 5000);
    expect(budgetBefore5k.bkeHits).toBe(1);
    expect(budgetBefore5k.geminiCalls).toBe(2); // gemini_response at 3000 + gemini_extraction at 4000

    const budgetRange = calculateBudget(events, 1500, 4500);
    expect(budgetRange.bkeHits).toBe(0); // bke at 1000 excluded
    expect(budgetRange.drlDecisions).toBe(1); // drl at 2000 included
    expect(budgetRange.geminiCalls).toBe(2); // gemini_response at 3000 + gemini_extraction at 4000
  });

  it("calculates latency percentiles", () => {
    const events: CognitiveEvent[] = [];
    for (let i = 0; i < 100; i++) {
      events.push({
        id: `lat-${i}`,
        stage: "gemini_response",
        timestamp: 1000 + i,
        durationMs: i + 1,
        success: true,
        activeFlags: {},
        details: { provider: "gemini", model: "test", operation: "respond", isFallback: false } as unknown as Record<string, unknown>,
      });
    }
    const budget = calculateBudget(events);
    // avg = Math.round(5050/100) = Math.round(50.5) = 51
    expect(budget.latencyByLevel.gemini.avg).toBe(51);
    // p50 from sorted 1..100 = index Math.ceil(0.5*100)-1 = 50-1 = 49 → value 50
    expect(budget.latencyByLevel.gemini.p50).toBe(50);
    expect(budget.latencyByLevel.gemini.p95).toBe(95);
    expect(budget.latencyByLevel.gemini.max).toBe(100);
    expect(budget.latencyByLevel.gemini.count).toBeUndefined(); // not in type
  });

  it("computes stageBreakdown from pipeline events", () => {
    const events: CognitiveEvent[] = [
      {
        id: "p1",
        stage: "pipeline_handler",
        timestamp: 1000,
        durationMs: 500,
        success: true,
        activeFlags: {},
        details: { pipeline: "handler", intent: "TRANSFER" } as unknown as Record<string, unknown>,
      },
      {
        id: "p2",
        stage: "pipeline_extraction",
        timestamp: 2000,
        durationMs: 800,
        success: true,
        activeFlags: {},
        details: { pipeline: "extraction" } as unknown as Record<string, unknown>,
      },
      {
        id: "p3",
        stage: "pipeline_comprehension",
        timestamp: 3000,
        durationMs: 300,
        success: true,
        activeFlags: {},
        details: { pipeline: "comprehension" } as unknown as Record<string, unknown>,
      },
    ];
    const budget = calculateBudget(events);
    expect(budget.stageBreakdown).toBeDefined();
    expect(Object.keys(budget.stageBreakdown)).toContain("pipeline_handler");
    expect(Object.keys(budget.stageBreakdown)).toContain("pipeline_extraction");
    expect(budget.stageBreakdown.pipeline_handler.calls).toBe(1);
    expect(budget.stageBreakdown.pipeline_extraction.avgLatencyMs).toBe(800);
  });

  it("handles empty events", () => {
    const budget = calculateBudget([]);
    expect(budget.bkeHits).toBe(0);
    expect(budget.drlDecisions).toBe(0);
    expect(budget.geminiCalls).toBe(0);
    expect(budget.groqCalls).toBe(0);
    expect(budget.llmEscalations).toBe(0);
    expect(budget.bkeResolutionRate).toBe(0);
    expect(budget.drlResolutionRate).toBe(0);
    expect(Object.keys(budget.latencyByLevel).length).toBe(6); // all 6 levels present
    expect(Object.keys(budget.stageBreakdown).length).toBe(0);
  });

  it("classifies LLM events correctly by provider", () => {
    const events: CognitiveEvent[] = [
      {
        id: "g1",
        stage: "gemini_response",
        timestamp: 1000,
        durationMs: 100,
        success: true,
        activeFlags: {},
        details: { provider: "gemini", model: "gemini-2.0-flash", operation: "respond", isFallback: false } as unknown as Record<string, unknown>,
      },
      {
        id: "g2",
        stage: "gemini_extraction",
        timestamp: 2000,
        durationMs: 200,
        success: false,
        activeFlags: {},
        details: { provider: "gemini", model: "gemini-2.0-flash", operation: "extract", isFallback: false, error: "timeout" } as unknown as Record<string, unknown>,
      },
      {
        id: "gr1",
        stage: "groq_response",
        timestamp: 3000,
        durationMs: 150,
        success: true,
        activeFlags: {},
        details: { provider: "groq", model: "llama-3.3-70b-versatile", operation: "respond", isFallback: true } as unknown as Record<string, unknown>,
      },
    ];
    const budget = calculateBudget(events);
    expect(budget.geminiCalls).toBe(2); // one success + one failure
    expect(budget.groqCalls).toBe(1);
    // llmEscalations = gemini (2) + groq (1 = isFallback) = 3
    expect(budget.llmEscalations).toBe(3);
  });

  it("detects fallback chains correctly", () => {
    const events: CognitiveEvent[] = [
      {
        id: "f1",
        stage: "gemini_response",
        timestamp: 1000,
        durationMs: 500,
        success: false,
        activeFlags: {},
        details: { provider: "gemini", model: "gemini-2.0-flash", operation: "respond", isFallback: false, error: "rate_limit" } as unknown as Record<string, unknown>,
      },
      {
        id: "f2",
        stage: "fallback_provider",
        timestamp: 1001,
        durationMs: 1500,
        success: true,
        activeFlags: {},
        details: { from: "gemini", to: "groq", reason: "rate_limit" } as unknown as Record<string, unknown>,
      },
      {
        id: "f3",
        stage: "groq_response",
        timestamp: 1500,
        durationMs: 300,
        success: true,
        activeFlags: {},
        details: { provider: "groq", model: "llama-3.3-70b-versatile", operation: "respond", isFallback: true } as unknown as Record<string, unknown>,
      },
    ];
    const budget = calculateBudget(events);
    expect(budget.geminiCalls).toBe(1);
    expect(budget.groqCalls).toBe(1);
    // llmEscalations = gemini (1) + fallback_provider (1) + groq with isFallback (1) = 3
    expect(budget.llmEscalations).toBe(3);
    expect(budget.bkeHits).toBe(0);
  });
});

// ─── Side-effect-free guarantee ─────────────────────────────────────────────

describe("Cognitive Metrics side-effect-free", () => {
  beforeEach(() => {
    resetCognitiveMetricsState();
  });

  it("does not throw when called with invalid event stages", () => {
    expect(() => captureEvent("invalid" as any, 10, true, {} as any)).not.toThrow();
  });

  it("does not throw on extreme values", () => {
    expect(() => captureEvent("bke_pricing", -1, true, { domain: "pricing", query: "t", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>)).not.toThrow();
    expect(() => captureEvent("bke_pricing", Infinity, true, { domain: "pricing", query: "t", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>)).not.toThrow();
    expect(() => captureEvent("bke_pricing", NaN, true, { domain: "pricing", query: "t", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>)).not.toThrow();
  });

  it("does not mutate the original details object", () => {
    const details: BKEEventDetails = { domain: "pricing", query: "test", resolutionSource: "cache", confidence: 0.9 };
    const frozen = Object.freeze({ ...details });
    expect(() => captureEvent("bke_pricing", 10, true, frozen as unknown as Record<string, unknown>)).not.toThrow();
    expect(frozen.domain).toBe("pricing");
  });

  it("is idempotent on reset", () => {
    resetCognitiveMetricsState();
    resetCognitiveMetricsState();
    const state = getCognitiveMetricsState();
    expect(state.events.length).toBe(0);
    expect(state.totalEventsCaptured).toBe(0);
  });
});

// ─── Budget edge cases ──────────────────────────────────────────────────────

describe("Budget edge cases", () => {
  it("handles events with extreme durations", () => {
    const events: CognitiveEvent[] = [
      {
        id: "1",
        stage: "bke_pricing",
        timestamp: 1000,
        durationMs: undefined as unknown as number,
        success: true,
        activeFlags: {},
        details: { domain: "pricing", query: "t", resolutionSource: "test", confidence: 0.5 } as unknown as Record<string, unknown>,
      },
    ];
    const budget = calculateBudget(events);
    expect(budget.totalLatency).toBeUndefined(); // totalLatency not in CognitiveBudget type
    expect(budget.bkeHits).toBe(1);
  });

  it("handles events where no LLM events exist but pipeline events do", () => {
    const events: CognitiveEvent[] = [
      {
        id: "p1",
        stage: "pipeline_handler",
        timestamp: 1000,
        durationMs: 200,
        success: true,
        activeFlags: {},
        details: { pipeline: "handler", intent: "TRANSFER" } as unknown as Record<string, unknown>,
      },
    ];
    const budget = calculateBudget(events);
    expect(budget.bkeHits).toBe(0);
    expect(budget.geminiCalls).toBe(0);
    expect(budget.stageBreakdown.pipeline_handler.calls).toBe(1);
  });
});
