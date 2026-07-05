import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { getDb } from "@/lib/db/database";
import { log } from "@/lib/utils/logger";

export const dynamic = "force-dynamic";

type MetricsRow = { value: number | null };

const SECONDS_24H = 86_400;
const SECONDS_7D = 604_800; // 86_400 * 7

function extractValue(rows: unknown): number | null {
  const arr = rows as MetricsRow[];
  const row = arr[0];
  return row?.value !== undefined && row?.value !== null ? Number(row.value) : null;
}

export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const now = Math.floor(Date.now() / 1000);
    const since24h = now - SECONDS_24H;
    const since7d = now - SECONDS_7D;

    const db = getDb();

    // ── 1. Conversaciones activas (últimas 24h) ──
    const activeConversations = extractValue(
      (
        await db.execute({
          sql: "SELECT COUNT(*) as value FROM conversations WHERE last_message_at > ?",
          args: [since24h],
        })
      ).rows,
    );

    // ── 2. Viajes completados (últimos 7d) ──
    // TEMPORAL: sourced from trips.trip_phase. Once all trips have TripCompleted events
    // (post AIT-042 migration), switch to trip_events as primary source:
    //   SELECT COUNT(DISTINCT trip_id) FROM trip_events
    //   WHERE event_type = 'TripCompleted' AND occurred_at > ?
    const completedTrips = extractValue(
      (
        await db.execute({
          sql: "SELECT COUNT(*) as value FROM trips WHERE trip_phase = 'CLOSED' AND updated_at > ?",
          args: [since7d],
        })
      ).rows,
    );

    // ── 3. Tasa de conversión (últimos 7d) ──
    // % de conversaciones activas en 7d que generaron al menos un viaje creado en el mismo período.
    // TEMPORAL: sourced from trips.created_at. Once all trips have TripCreated events,
    // add trip_events as supplementary source (see comment above).
    let conversionRate: number | null = null;
    try {
      conversionRate = extractValue(
        (
          await db.execute({
            sql: `SELECT ROUND(
              CAST(COUNT(DISTINCT CASE WHEN has_trip THEN id END) AS REAL)
              / CAST(NULLIF(COUNT(DISTINCT id), 0) AS REAL) * 100, 2
            ) as value
            FROM (
              SELECT c.id,
                EXISTS (
                  SELECT 1 FROM trips t
                  WHERE t.trip_id = c.trip_id
                    AND t.created_at > ?
                ) as has_trip
              FROM conversations c
              WHERE c.last_message_at > ?
            )`,
            args: [since7d, since7d],
          })
        ).rows,
      );
    } catch (e) {
      log.warn("[Metrics] Q3 (conversion) failed, returning null:", e);
    }

    // ── 4. Tiempo medio de respuesta (últimos 7d, en segundos) ──
    let avgResponseTime: number | null = null;
    try {
      avgResponseTime = extractValue(
        (
          await db.execute({
            sql: `SELECT ROUND(AVG(response_time), 0) as value
              FROM (
                SELECT
                  m1.created_at - m2.created_at as response_time
                FROM messages m1
                JOIN messages m2
                  ON m1.conversation_id = m2.conversation_id
                  AND m2.role = 'user'
                  AND m1.role = 'assistant'
                  AND m1.created_at = (
                    SELECT MIN(created_at) FROM messages
                    WHERE conversation_id = m1.conversation_id
                      AND role = 'assistant'
                      AND created_at > m2.created_at
                  )
                WHERE m1.created_at > ?
              )`,
            args: [since7d],
          })
        ).rows,
      );
    } catch (e) {
      log.warn("[Metrics] Q4 (avg_response_time) failed, returning null:", e);
    }

    // ── 5a. Tasa de escalación humana (últimos 7d) ──
    // % de conversaciones activas en 7d que requirieron intervención humana.
    const escalationRate = extractValue(
      (
        await db.execute({
          sql: `SELECT ROUND(
            CAST(SUM(CASE WHEN mode = 'HUMAN' OR taken_by_human = 1 THEN 1 ELSE 0 END) AS REAL)
            / CAST(NULLIF(COUNT(*), 0) AS REAL) * 100, 2
          ) as value
          FROM conversations
          WHERE last_message_at > ?`,
          args: [since7d],
        })
      ).rows,
    );

    // ── 5b. Escalaciones decididas por el sistema ──
    // Conversaciones donde F4 decidió escalar (independientemente de intervención humana).
    let escalationReasonCount: number | null = null;
    try {
      escalationReasonCount = extractValue(
        (
          await db.execute({
            sql: "SELECT COUNT(DISTINCT phone) as value FROM chat_sessions WHERE escalation_reason IS NOT NULL",
          })
        ).rows,
      );
    } catch (e) {
      log.warn("[Metrics] Q6 (escalation_reason) failed, column may not exist yet:", e);
    }

    return NextResponse.json({
      active_conversations_24h: {
        value: activeConversations ?? 0,
        unit: "conversaciones",
      },
      completed_trips_7d: {
        value: completedTrips ?? 0,
        unit: "viajes",
      },
      conversion_rate_7d: {
        value: conversionRate ?? null,
        unit: "%",
      },
      avg_response_time_7d: {
        value: avgResponseTime,
        unit: "segundos",
      },
      escalation_rate_7d: {
        value: escalationRate ?? null,
        unit: "%",
      },
      escalation_reason_count: {
        value: escalationReasonCount ?? 0,
        unit: "conversaciones",
      },
    });
  } catch (error) {
    log.error("[Metrics] Error fetching metrics:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
