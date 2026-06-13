import type { SystemLoad, GlobalSystemMetrics } from "./types";
import { countActiveDrivers, countHumanOperators, countActiveConversations, getSystemMetricsTotalRevenue, getAvgConversionRate, getAvgEscalationRate, insertSystemMetrics } from "@/lib/db/domains/learning";

export async function getSystemLoad(): Promise<SystemLoad> {
  const [driversAvailable, operatorsAvailable, queueLength] = await Promise.all([
    countActiveDrivers(),
    countHumanOperators(),
    countActiveConversations(Math.floor(Date.now() / 1000) - 3600),
  ]);

  const hour = new Date().getHours();
  const peakTime = (hour >= 8 && hour <= 10) || (hour >= 17 && hour <= 20);

  return { driversAvailable, operatorsAvailable, peakTime, queueLength };
}

export function getAdjustedLoad(load: SystemLoad): {
  highLoad: boolean;
  lowLoad: boolean;
  active: boolean;
} {
  const highLoad = load.driversAvailable < 3 || load.queueLength > 5 || (load.peakTime && load.driversAvailable < 5);
  const lowLoad = load.driversAvailable > 10 && load.queueLength === 0 && !load.peakTime;
  return { highLoad, lowLoad, active: highLoad || lowLoad };
}

export async function computeGlobalMetrics(): Promise<GlobalSystemMetrics> {
  const [totalRevenue, activeDrivers, conversionRate, escalationRate] = await Promise.all([
    getSystemMetricsTotalRevenue(),
    countActiveDrivers(),
    getAvgConversionRate(Math.floor(Date.now() / 1000) - 86400 * 7),
    getAvgEscalationRate(Math.floor(Date.now() / 1000) - 86400),
  ]);
  const fleetUtilization = Math.min(1, activeDrivers / 20);
  const driverLoadBalance = activeDrivers > 0 ? Math.min(1, 10 / activeDrivers) : 0;

  return {
    totalRevenue,
    fleetUtilization,
    driverLoadBalance,
    conversionRate,
    escalationRate,
  };
}

export async function recordSystemMetrics(metrics: GlobalSystemMetrics): Promise<void> {
  await insertSystemMetrics(metrics.totalRevenue, metrics.conversionRate, metrics.fleetUtilization, metrics.escalationRate);
}
