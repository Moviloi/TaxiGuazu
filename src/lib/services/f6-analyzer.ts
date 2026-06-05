import { getDbInstance } from "@/lib/db/database";

export interface SessionAnalysis {
  predictionAccuracy: number;
  f4Escalations: number;
  f4Total: number;
  f3ConversionRate: number;
  entityPrecision: number;
  intentPrecision: number;
  falsePositives: number;
  falseNegatives: number;
  overEscalation: boolean;
  underEscalation: boolean;
}

export async function analyzeSession(sessionId: string): Promise<SessionAnalysis> {
  const rs = await getDbInstance().execute({
    sql: "SELECT event_type, metadata FROM conversation_events WHERE session_id = ? ORDER BY timestamp",
    args: [sessionId],
  });
  const events = rs.rows as unknown as { event_type: string; metadata: string | null }[];

  const shown = events.filter((e) => e.event_type === "opportunity_shown").length;
  const accepted = events.filter((e) => e.event_type === "user_accepted").length;
  const declined = events.filter((e) => e.event_type === "user_declined").length;
  const ignored = events.filter((e) => e.event_type === "user_ignored").length;
  const escalated = events.filter((e) => e.event_type === "escalated_to_human").length;
  const f4Total = events.filter((e) => e.event_type === "intent_detected").length;

  const responded = accepted + declined + ignored;
  const f3ConversionRate = shown > 0 ? accepted / shown : 0;
  const f4Escalations = escalated;
  const predictionAccuracy = responded > 0 ? accepted / responded : 0;

  const entityEvents = events.filter((e) => e.event_type === "entity_detected");
  const entityPrecision = entityEvents.length > 0
    ? entityEvents.filter((e) => {
        try {
          const m = JSON.parse(e.metadata ?? "{}");
          return m.entities && m.entities.length > 0;
        } catch { return false; }
      }).length / entityEvents.length
    : 0;

  const intentEvents = events.filter((e) => e.event_type === "intent_detected");
  const intentPrecision = intentEvents.length > 0
    ? intentEvents.filter((e) => {
        try {
          const m = JSON.parse(e.metadata ?? "{}");
          return m.confidence && m.confidence > 0.5;
        } catch { return false; }
      }).length / intentEvents.length
    : 0;

  const falsePositives = shown > 0 && accepted === 0 ? shown : 0;
  const falseNegatives = shown === 0 ? 1 : 0;
  const overEscalation = f4Escalations > 0 && f4Total > 0 && f4Escalations / f4Total > 0.5;
  const underEscalation = f4Escalations === 0 && f4Total > 0 && predictionAccuracy < 0.3;

  return {
    predictionAccuracy,
    f4Escalations,
    f4Total,
    f3ConversionRate,
    entityPrecision,
    intentPrecision,
    falsePositives,
    falseNegatives,
    overEscalation,
    underEscalation,
  };
}
