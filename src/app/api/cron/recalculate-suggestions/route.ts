import { NextRequest, NextResponse } from "next/server";
import { recalculateSuggestions } from "@/lib/services/learning/suggestion-recalculator";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = getEnv().CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log.warn("[CRON] Unauthorized recalculate-suggestions request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const results = await recalculateSuggestions();
    return NextResponse.json({ status: "ok", results });
  } catch (error) {
    log.error("[CRON] recalculate-suggestions failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
