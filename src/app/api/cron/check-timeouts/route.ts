import { NextRequest, NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/timeouts";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = getEnv().CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    log.warn("[CRON] Unauthorized check-timeouts request");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await checkTimeouts();
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    log.error("[CRON] check-timeouts failed:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
