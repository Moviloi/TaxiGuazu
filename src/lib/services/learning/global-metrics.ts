import { getSystemMetricsTotalRevenue, countActiveDrivers, getAvgConversionRate, getAvgEscalationRate, insertSystemMetrics } from "@/lib/db/domains/learning";
import type { GlobalSystemMetrics } from "./types";

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
