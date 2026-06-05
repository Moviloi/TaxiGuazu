import { getDbInstance } from "@/lib/db/database";
import { adjustWeight } from "./f6-learning";
import type { HumanFeedbackType } from "./f7-types";

export async function logHumanFeedback(
  sessionId: string,
  feedbackType: HumanFeedbackType,
  entity: string | null,
  operatorId: string,
): Promise<void> {
  await getDbInstance().execute({
    sql: "INSERT INTO human_feedback (session_id, feedback_type, entity, operator_id, timestamp) VALUES (?, ?, ?, ?, unixepoch())",
    args: [sessionId, feedbackType, entity, operatorId],
  });

  switch (feedbackType) {
    case "good_offer":
      if (entity) await adjustWeight(`entity_weight:${entity}`, 1, 0.05);
      break;
    case "bad_offer":
      if (entity) await adjustWeight(`entity_weight:${entity}`, -1, 0.05);
      break;
    case "wrong_route":
      await adjustWeight("f7_weight:conversion", -0.5, 0.02);
      break;
    case "high_value_missed":
      await adjustWeight("f7_weight:revenue", 1, 0.03);
      break;
    case "spam_detected":
      break;
  }
}

export async function getRecentHumanFeedback(sessionId: string, limit = 10): Promise<{
  goodOffers: number;
  badOffers: number;
  highValueMissed: number;
  recentFeedback: string[];
}> {
  const rs = await getDbInstance().execute({
    sql: "SELECT feedback_type FROM human_feedback WHERE session_id = ? ORDER BY timestamp DESC LIMIT ?",
    args: [sessionId, limit],
  });
  const rows = rs.rows as unknown as { feedback_type: string }[];
  return {
    goodOffers: rows.filter((r) => r.feedback_type === "good_offer").length,
    badOffers: rows.filter((r) => r.feedback_type === "bad_offer").length,
    highValueMissed: rows.filter((r) => r.feedback_type === "high_value_missed").length,
    recentFeedback: rows.map((r) => r.feedback_type),
  };
}

export async function countTotalHumanFeedback(): Promise<number> {
  const rs = await getDbInstance().execute("SELECT COUNT(*) as c FROM human_feedback");
  const row = rs.rows[0] as unknown as { c: number } | undefined;
  return row?.c ?? 0;
}
