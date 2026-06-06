// Trip Outcome Tracker — records real vs estimated fare outcomes per route.
// Fase 8: provides the signal for controlled weight adjustment.

export interface TripOutcome {
  routeKey: string;
  estimatedFare: number;
  finalFare: number;
  humanOverride: boolean;
  timestamp: number;
}

const outcomes: TripOutcome[] = [];

const MAX_OUTCOMES = 500;

export function recordOutcome(outcome: TripOutcome): void {
  outcomes.push(outcome);
  if (outcomes.length > MAX_OUTCOMES) {
    outcomes.splice(0, outcomes.length - MAX_OUTCOMES);
  }
}

export function getOutcomes(routeKey: string): TripOutcome[] {
  return outcomes.filter((o) => o.routeKey === routeKey);
}

export function getRecentOutcomes(routeKey: string, count: number = 10): TripOutcome[] {
  return getOutcomes(routeKey).slice(-count);
}

export function getAllOutcomes(): TripOutcome[] {
  return [...outcomes];
}

export function clearOutcomes(): void {
  outcomes.length = 0;
}

export function getOutcomeCount(): number {
  return outcomes.length;
}
