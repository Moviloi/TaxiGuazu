// F8: POLICY SIMULATION & GUARDRAILS — frozen (FASE A). Pipeline experimental F7→F8→F9.
// FUTURE RESPONSIBILITY: Simular políticas y aplicar guardrails de decisión.
// CURRENT STATUS: Cableado en lead.service.ts como pipeline bloqueado. No modificar.
// MIGRATION NOTE: F8 usa f9-error para logging. Todo el pipeline se desbloquea junto.

import { getDbInstance } from "@/lib/db/database";
import type { GlobalSystemMetrics } from "./f8-types";

export async function computeGlobalMetrics(): Promise<GlobalSystemMetrics> {
  const revenueRs = await getDbInstance().execute(
    "SELECT COALESCE(SUM(revenue_total), 0) as total FROM system_metrics",
  );
  const driverRs = await getDbInstance().execute(
    "SELECT COUNT(*) as active FROM drivers WHERE status = 'active'",
  );
  const conversionRs = await getDbInstance().execute(
    "SELECT AVG(conversion) as rate FROM policy_results WHERE timestamp > ?",
    [Math.floor(Date.now() / 1000) - 86400 * 7],
  );
  const escalationRs = await getDbInstance().execute(
    "SELECT AVG(escalation_rate) as rate FROM system_metrics WHERE recorded_at > ?",
    [Math.floor(Date.now() / 1000) - 86400],
  );

  const totalRevenue = Number((revenueRs.rows[0] as any)?.total ?? 0);
  const activeDrivers = Number((driverRs.rows[0] as any)?.active ?? 0);
  const conversionRate = Number((conversionRs.rows[0] as any)?.rate ?? 0);
  const escalationRate = Number((escalationRs.rows[0] as any)?.rate ?? 0);
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
  await getDbInstance().execute({
    sql: "INSERT INTO system_metrics (revenue_total, conversion_rate, load_factor, escalation_rate, recorded_at) VALUES (?, ?, ?, ?, unixepoch())",
    args: [metrics.totalRevenue, metrics.conversionRate, metrics.fleetUtilization, metrics.escalationRate],
  });
}
