// FASE 6.8: Decision Event Model
// Phase-level events for pipeline visibility.

import type { Intent } from "../types";
import type { PolicyAction } from "../policy/types";

export interface DecisionEvent {
  correlationId: string;
  phase: "core" | "lateral" | "policy" | "router";
  intent: Intent;
  ruleId?: string;
  action?: PolicyAction;
  latencyMs: number;
  success: boolean;
  metadata: Record<string, unknown>;
}

// In-memory event buffer for testing and debugging
const eventBuffer: DecisionEvent[] = [];

export function recordEvent(event: DecisionEvent): void {
  try {
    eventBuffer.push(event);
  } catch {
    // silent fail
  }
}

export function drainEvents(): DecisionEvent[] {
  const copy = [...eventBuffer];
  eventBuffer.length = 0;
  return copy;
}

export function getEvents(): DecisionEvent[] {
  return [...eventBuffer];
}
