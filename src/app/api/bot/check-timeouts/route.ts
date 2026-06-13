import { NextResponse } from "next/server";
import { checkTimeouts } from "@/lib/services/housekeeping/timeouts";

// TODO: proteger este endpoint con un cron secret / shared secret header
// y remover el checkTimeouts() del webhook principal (R27, R29).
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