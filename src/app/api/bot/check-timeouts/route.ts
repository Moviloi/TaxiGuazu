import { NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/utils/timeouts";

export async function GET() {
  try {
    await checkTimeouts();
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[CRON] checkTimeouts error:", error);
    return NextResponse.json({ error: "Error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";