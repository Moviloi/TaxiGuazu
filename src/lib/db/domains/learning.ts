import { getDb } from "../core/connection";
import type { DbExecutor } from "../core/connection";

// ========== learning_weights ==========

export async function getLearningWeight(key: string): Promise<number> {
  try {
    const rs = await getDb().execute({
      sql: "SELECT value FROM learning_weights WHERE key = ?",
      args: [key],
    });
    const row = rs.rows[0] as unknown as { value: number } | undefined;
    return row?.value ?? 0;
  } catch {
    return 0;
  }
}

export async function setLearningWeight(key: string, value: number): Promise<void> {
  await getDb().execute({
    sql: "INSERT OR REPLACE INTO learning_weights (key, value, updated_at) VALUES (?, ?, unixepoch())",
    args: [key, value],
  });
}

// ========== conversion_outcomes ==========

export async function insertConversionOutcome(
  sessionId: string, entity: string, intent: string,
  successScore: number, opportunityType: string,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO conversion_outcomes (session_id, entity, intent, success_score, opportunity_type, timestamp) VALUES (?, ?, ?, ?, ?, unixepoch())",
    args: [sessionId, entity, intent, successScore, opportunityType],
  });
}

// ========== f9_events ==========

export async function insertF9Event(event: {
  sessionId: string; type: string; entity?: string | null; intent?: string | null;
  predictedValue?: number | null; actualValue?: number | null;
  revenue?: number | null; timestamp: number; source: string;
}): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO f9_events (session_id, type, entity, intent, predicted_value, actual_value, revenue, timestamp, source) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
    args: [
      event.sessionId, event.type, event.entity ?? null, event.intent ?? null,
      event.predictedValue ?? null, event.actualValue ?? null,
      event.revenue ?? null, event.timestamp, event.source,
    ],
  });
}

// ========== f9_error_log ==========

export async function insertF9ErrorLog(component: string, message: string, stack: string | null): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO f9_error_log (component, error, stack, created_at) VALUES (?, ?, ?, unixepoch())",
    args: [component, message, stack],
  });
}

// ========== f9_drift_log ==========

export async function insertF9DriftLog(
  metric: string, entity: string, driftValue: number,
  severity: string, sessionId?: string, policyId?: string,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO f9_drift_log (metric, entity, drift_value, severity, session_id, policy_id, timestamp) VALUES (?, ?, ?, ?, ?, ?, unixepoch())",
    args: [metric, entity, driftValue, severity, sessionId ?? null, policyId ?? null],
  });
}

// ========== f9_admin_commands ==========

export async function insertF9AdminCommand(commandText: string, parsedAction: string, author: string): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO f9_admin_commands (command_text, parsed_action, author, timestamp) VALUES (?, ?, ?, unixepoch())",
    args: [commandText, parsedAction, author],
  });
}

// ========== conversation_events ==========

export async function insertConversationEvent(
  sessionId: string, eventType: string,
  metadata: Record<string, unknown> | null,
  executor?: DbExecutor,
): Promise<void> {
  const db = executor ?? getDb();
  await db.execute({
    sql: "INSERT INTO conversation_events (session_id, event_type, metadata, timestamp) VALUES (?, ?, ?, unixepoch())",
    args: [sessionId, eventType, metadata ? JSON.stringify(metadata) : null],
  });
}

// ========== decision_log ==========

export async function insertDecisionLog(entry: {
  sessionId: string;
  selectedOpportunity: string;
  candidateOpportunities: string;
  utilityScore: number;
  loadAdjusted: boolean;
  policyOverride: boolean;
  guardrails: string;
  policies: string;
}): Promise<void> {
  await getDb().execute({
    sql: `INSERT INTO decision_log
      (session_id, selected_opportunity, candidate_opportunities, utility_score, load_adjusted, policy_override, guardrails, policies)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    args: [
      entry.sessionId,
      entry.selectedOpportunity,
      entry.candidateOpportunities,
      entry.utilityScore,
      entry.loadAdjusted ? 1 : 0,
      entry.policyOverride ? 1 : 0,
      entry.guardrails,
      entry.policies,
    ],
  });
}

// ========== simulations ==========

export async function insertSimulation(
  sessionId: string, opportunityLabel: string,
  predictedConversion: number, predictedRevenue: number, risk: string,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO simulations (session_id, opportunity_id, predicted_conversion, predicted_revenue, risk) VALUES (?, ?, ?, ?, ?)",
    args: [sessionId, opportunityLabel, predictedConversion, predictedRevenue, risk],
  });
}

// ========== policy_results ==========

export async function insertPolicyResult(
  policyId: string, variant: string | null,
  revenue: number, conversion: boolean,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO policy_results (policy_id, variant, revenue, conversion, timestamp) VALUES (?, ?, ?, ?, unixepoch())",
    args: [policyId, variant, revenue, conversion ? 1 : 0],
  });
}

export async function getWinningPolicyVariant(
  experimentId: string,
): Promise<{ variantId: string; score: number } | null> {
  const rs = await getDb().execute({
    sql: `SELECT variant, AVG(revenue) as avg_revenue, AVG(conversion) as avg_conversion,
       COUNT(*) as trials
     FROM policy_results
     WHERE policy_id = ?
     GROUP BY variant
     ORDER BY (AVG(revenue) * 0.6 + AVG(conversion) * 0.4) DESC
     LIMIT 1`,
    args: [experimentId],
  });
  const row = rs.rows[0] as unknown as { variant: string; avg_revenue: number; avg_conversion: number; trials: number } | undefined;
  if (!row || row.trials < 10) return null;
  const score = row.avg_revenue * 0.6 + row.avg_conversion * 0.4;
  return { variantId: row.variant, score };
}

// ========== system_metrics ==========

export async function getSystemMetricsTotalRevenue(): Promise<number> {
  const rs = await getDb().execute(
    "SELECT COALESCE(SUM(revenue_total), 0) as total FROM system_metrics",
  );
  return Number((rs.rows[0] as any)?.total ?? 0);
}

export async function insertSystemMetrics(
  totalRevenue: number, conversionRate: number,
  loadFactor: number, escalationRate: number,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO system_metrics (revenue_total, conversion_rate, load_factor, escalation_rate, recorded_at) VALUES (?, ?, ?, ?, unixepoch())",
    args: [totalRevenue, conversionRate, loadFactor, escalationRate],
  });
}

// ========== aggregated queries ==========

export async function countActiveDrivers(): Promise<number> {
  const rs = await getDb().execute(
    "SELECT COUNT(*) as c FROM drivers WHERE status = 'active'",
  );
  return Number((rs.rows[0] as any)?.c ?? 0);
}

export async function getAvgConversionRate(sinceTimestamp: number): Promise<number> {
  const rs = await getDb().execute({
    sql: "SELECT AVG(conversion) as rate FROM policy_results WHERE timestamp > ?",
    args: [sinceTimestamp],
  });
  return Number((rs.rows[0] as any)?.rate ?? 0);
}

export async function getAvgEscalationRate(sinceTimestamp: number): Promise<number> {
  const rs = await getDb().execute({
    sql: "SELECT AVG(escalation_rate) as rate FROM system_metrics WHERE recorded_at > ?",
    args: [sinceTimestamp],
  });
  return Number((rs.rows[0] as any)?.rate ?? 0);
}

// ========== conversation_f4_log ==========

export async function insertF4Log(
  sessionId: string, score: number, state: string, reason: string | null,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO conversation_f4_log (session_id, score, state, reason) VALUES (?, ?, ?, ?)",
    args: [sessionId, score, state, reason],
  });
}

// ========== housekeeping_log ==========

export async function insertHousekeepingLog(
  job: string, rowsDeleted: number, durationMs: number,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT INTO housekeeping_log (job, rows_deleted, duration_ms) VALUES (?, ?, ?)",
    args: [job, rowsDeleted, durationMs],
  });
}

// ========== chat_session helpers ==========

export async function updateChatSessionComprehension(
  phone: string, f4State: string, comprehensionScore: number,
): Promise<void> {
  await getDb().execute({
    sql: "UPDATE chat_sessions SET f4_state = ?, comprehension_score = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [f4State, comprehensionScore, phone],
  });
}

export async function setChatSessionEscalationReason(phone: string, reason: string): Promise<void> {
  await getDb().execute({
    sql: "UPDATE chat_sessions SET escalation_reason = ?, updated_at = unixepoch() WHERE phone = ?",
    args: [reason, phone],
  });
}

// ========== conversation system-load queries ==========

export async function countHumanOperators(): Promise<number> {
  const rs = await getDb().execute(
    "SELECT COUNT(*) as c FROM conversations WHERE mode = 'HUMAN' AND taken_by_human = 1",
  );
  return Number((rs.rows[0] as any)?.c ?? 0);
}

// ========== policies ==========

export async function getAllPolicies(): Promise<{
  id: string; name: string; priority: number; condition: string;
  action: string; params: string; active: number;
}[]> {
  const rs = await getDb().execute(
    "SELECT id, name, priority, condition, action, params, active FROM policies ORDER BY priority DESC",
  );
  return rs.rows as unknown as {
    id: string; name: string; priority: number; condition: string;
    action: string; params: string; active: number;
  }[];
}

export async function insertOrIgnorePolicy(
  id: string, name: string, priority: number,
  condition: string, action: string, params: string, active: boolean,
): Promise<void> {
  await getDb().execute({
    sql: "INSERT OR IGNORE INTO policies (id, name, priority, condition, action, params, active) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [id, name, priority, condition, action, params, active ? 1 : 0],
  });
}

export async function countActiveConversations(sinceTimestamp: number): Promise<number> {
  const rs = await getDb().execute({
    sql: "SELECT COUNT(*) as c FROM conversations WHERE mode = 'AI' AND taken_by_human = 0 AND last_message_at > ?",
    args: [sinceTimestamp],
  });
  return Number((rs.rows[0] as any)?.c ?? 0);
}
