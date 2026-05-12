import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage } from "@/lib/services/lead.service";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { convId, phone, text } = body;

    if (!phone || !text) {
      return NextResponse.json({ error: "Faltan phone o text" }, { status: 400 });
    }

    console.log(`[SIMULATE] ← ${phone}: ${text}`);
    await handleLeadMessage(phone, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SIMULATE] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";