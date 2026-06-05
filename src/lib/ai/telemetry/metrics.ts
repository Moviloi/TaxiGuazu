// FASE 6.8: Metrics Engine
// Counters and histograms per rule, action, and pipeline phase.

import { metrics } from "@opentelemetry/api";

let initialized = false;
let meter: ReturnType<typeof metrics.getMeter>;

function ensureMeter() {
  if (initialized) return;
  initialized = true;
  meter = metrics.getMeter("decision-engine");
}

export function recordRuleHit(ruleId: string): void {
  try {
    ensureMeter();
    const counter = meter.createCounter("rule_hit_total", {
      description: "Total hits per policy rule",
    });
    counter.add(1, { ruleId });
  } catch {
    // silent fail
  }
}

export function recordRuleLatency(ruleId: string, latencyMs: number): void {
  try {
    ensureMeter();
    const histogram = meter.createHistogram("rule_latency_ms", {
      description: "Latency per rule evaluation",
      unit: "ms",
    });
    histogram.record(latencyMs, { ruleId });
  } catch {
    // silent fail
  }
}

export function recordActionDistribution(action: string): void {
  try {
    ensureMeter();
    const counter = meter.createCounter("policy_action_total", {
      description: "Distribution of selected policy actions",
    });
    counter.add(1, { action });
  } catch {
    // silent fail
  }
}
