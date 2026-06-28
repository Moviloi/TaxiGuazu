import { NextRequest, NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/timeouts";
import { log } from "@/lib/utils/logger";
import { getEnv } from "@/config/env";

export async function GET(req: NextRequest) {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  const expected = getEnv().CRON_SECRET;
  if (!auth || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await checkTimeouts();
    return NextResponse.json({ ok: true });
  } catch (error) {
    log.error("[CRON] checkTimeouts error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";