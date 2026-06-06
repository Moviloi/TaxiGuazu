// Fare Learning Engine — adjusts zone/proximity/border weights from historical trip outcomes.
// Fase 8: controlled feedback loop — no ML, just deterministic weight tuning.

import { recordOutcome, getAllOutcomes, type TripOutcome } from "@/lib/services/tripOutcomeTracker";

export interface LearningWeights {
  zoneAdjustments: Record<string, number>;
  proximityCalibration: number;
  borderSensitivity: number;
}

const ADJUSTMENT_RATE = 0.03;
const MIN_ADJUSTMENT = 0.9;
const MAX_ADJUSTMENT = 1.15;
const DEFAULT_PROXIMITY_CALIBRATION = 1.0;
const DEFAULT_BORDER_SENSITIVITY = 1.0;

export function buildRouteKey(originZone: string | null, destinationZone: string | null): string {
  return `${originZone ?? "?"}→${destinationZone ?? "?"}`;
}

function computeError(estimated: number, actual: number): number {
  if (estimated === 0) return 0;
  return (actual - estimated) / estimated;
}

export function observe(
  estimatedFare: number,
  finalFare: number,
  routeKey: string,
  humanOverride: boolean,
): void {
  recordOutcome({
    routeKey,
    estimatedFare,
    finalFare,
    humanOverride,
    timestamp: Date.now(),
  });
}

export function computeWeights(): LearningWeights {
  const allOutcomes = getAllRecentByRoute();
  const zoneAdjustments: Record<string, number> = {};

  for (const [route, routeOutcomes] of Object.entries(allOutcomes)) {
    if (routeOutcomes.length < 2) continue;

    const errors = routeOutcomes.map((o) => computeError(o.estimatedFare, o.finalFare));
    const meanError = errors.reduce((a, b) => a + b, 0) / errors.length;

    // Only adjust if error exceeds ±5% threshold
    if (Math.abs(meanError) < 0.05) continue;

    const adjustment = 1 + meanError * ADJUSTMENT_RATE * 10;
    zoneAdjustments[route] = Math.max(MIN_ADJUSTMENT, Math.min(MAX_ADJUSTMENT, adjustment));
  }

  // Proximity calibration: check if errors correlate with proximity score
  const proximityCalibration = computeProximityCalibration(allOutcomes);

  // Border sensitivity: if humans frequently override border routes, reduce penalty
  const borderSensitivity = computeBorderSensitivity(allOutcomes);

  return { zoneAdjustments, proximityCalibration, borderSensitivity };
}

export function applyWeights(
  basePrice: number,
  routeKey: string,
  weights: LearningWeights,
): number {
  let price = basePrice;

  const zoneAdj = weights?.zoneAdjustments?.[routeKey];
  if (zoneAdj) {
    price = Math.round(price * zoneAdj);
  }

  return price;
}

// ── Internal helpers ──

function getAllRecentByRoute(): Record<string, TripOutcome[]> {
  const grouped: Record<string, TripOutcome[]> = {};
  const all = getAllRecentOutcomes();
  for (const o of all) {
    if (!grouped[o.routeKey]) grouped[o.routeKey] = [];
    grouped[o.routeKey].push(o);
  }
  return grouped;
}

function getAllRecentOutcomes(maxPerRoute: number = 20): TripOutcome[] {
  const recent: TripOutcome[] = [];
  const seen: Record<string, number> = {};
  const all = [...getAllOutcomes()].reverse();
  for (const o of all) {
    if ((seen[o.routeKey] ?? 0) >= maxPerRoute) continue;
    seen[o.routeKey] = (seen[o.routeKey] ?? 0) + 1;
    recent.push(o);
  }
  return recent;
}

function computeProximityCalibration(allOutcomes: Record<string, TripOutcome[]>): number {
  let totalError = 0;
  let count = 0;
  for (const outcomes of Object.values(allOutcomes)) {
    for (const o of outcomes) {
      totalError += Math.abs(computeError(o.estimatedFare, o.finalFare));
      count++;
    }
  }
  if (count < 5) return DEFAULT_PROXIMITY_CALIBRATION;
  const meanAbsError = totalError / count;
  if (meanAbsError < 0.1) return 0.95;  // over-estimating → reduce proximity impact
  if (meanAbsError > 0.25) return 1.05; // under-estimating → increase
  return DEFAULT_PROXIMITY_CALIBRATION;
}

function computeBorderSensitivity(allOutcomes: Record<string, TripOutcome[]>): number {
  let borderOverrides = 0;
  let borderTotal = 0;
  for (const [route, outcomes] of Object.entries(allOutcomes)) {
    if (!route.includes("Z_BORDER")) continue;
    for (const o of outcomes) {
      borderTotal++;
      if (o.humanOverride) borderOverrides++;
    }
  }
  if (borderTotal < 3) return DEFAULT_BORDER_SENSITIVITY;
  const overrideRate = borderOverrides / borderTotal;
  if (overrideRate > 0.5) return 0.85;  // reduce border penalty sensitivity
  if (overrideRate < 0.2) return 1.0;
  return DEFAULT_BORDER_SENSITIVITY;
}
