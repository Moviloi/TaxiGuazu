import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage } from "@/lib/services/lead.service";
import { isGroupMessage, handleDriverResponse } from "@/lib/services/driver.service";
import { getConversationByPhone } from "@/lib/db/database";

const BOT_PHONE = process.env.BOT_PHONE || "+543757646645";

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "taxiguazu-bot-2025";

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK] Verificación exitosa");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn(`[WEBHOOK] Verificación fallida: token=${token}, esperado=${VERIFY_TOKEN}`);
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const phone = message.from;
    const text = message.text?.body;

    if (!text) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(`[MSG] ← ${phone}: ${text.substring(0, 50)}`);

    if (isGroupMessage(phone)) {
      const conv = await getConversationByPhone(phone);
      if (conv) {
        await handleDriverResponse(text, phone, conv.id);
      }
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (phone === BOT_PHONE) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    await handleLeadMessage(phone, text);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] Error procesando mensaje:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";