import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage } from "@/lib/services/lead.service";
import { checkAdminAuth } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const auth = checkAdminAuth(request);
  if (auth) return auth;

  try {
    const body = await request.json();
    const { phone, text } = body;

    if (!phone || !text) {
      return NextResponse.json({ error: "Faltan phone o text" }, { status: 400 });
    }

    console.log(`[SIMULATE] event=message_received phone=******${phone.slice(-4)} len=${text.length}`);
    await handleLeadMessage(phone, text);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[SIMULATE] Error:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";