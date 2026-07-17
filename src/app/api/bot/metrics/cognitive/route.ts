// GET /api/bot/metrics/cognitive — Cognitive Budget & Event Stream
// PR-5F: Expone las métricas cognitivas del Cognitive Escalation Principle.
//
// Endpoints:
//   GET /api/bot/metrics/cognitive?since=<ts>&until=<ts>
//     → CognitiveBudget con eventos en el período
//   GET /api/bot/metrics/cognitive/events?limit=50
//     → Últimos N eventos
//   GET /api/bot/metrics/cognitive/requests?limit=10
//     → Últimos N requests
//   POST /api/bot/metrics/cognitive/reset
//     → Resetea el collector

import { NextRequest, NextResponse } from "next/server";
import { checkAdminAuth } from "@/lib/auth";
import { getCognitiveMetricsState, resetCognitiveMetricsState } from "@/lib/cognitive/collector";
import { calculateBudget } from "@/lib/cognitive/budget";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const since = searchParams.get("since") ? Number(searchParams.get("since")) : undefined;
    const until = searchParams.get("until") ? Number(searchParams.get("until")) : undefined;
    const mode = searchParams.get("mode") ?? "budget";

    const state = getCognitiveMetricsState();

    if (mode === "events") {
      const limit = Math.min(Number(searchParams.get("limit")) || 50, 1000);
      return NextResponse.json({
        events: state.events.slice(-limit),
        totalCaptured: state.totalEventsCaptured,
        buffered: state.events.length,
      });
    }

    if (mode === "requests") {
      const limit = Math.min(Number(searchParams.get("limit")) || 10, 100);
      return NextResponse.json({
        requests: state.requests.slice(-limit),
      });
    }

    // Default: budget mode
    const budget = calculateBudget(state.events, since, until);

    return NextResponse.json({
      budget,
      state: {
        totalEventsCaptured: state.totalEventsCaptured,
        eventsBuffered: state.events.length,
        requestsTracked: state.requests.length,
        lastResetAt: state.lastResetAt,
        activeFlags: state.activeFlags,
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const body = await request.json().catch(() => ({}));
    if (body.action === "reset") {
      resetCognitiveMetricsState();
      return NextResponse.json({ ok: true, action: "reset", timestamp: Date.now() });
    }
    return NextResponse.json({ error: "Acción no reconocida" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
