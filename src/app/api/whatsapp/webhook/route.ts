import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage } from "@/lib/services/lead.service";
import {
  isGroupMessage,
  handleDriverResponse,
  handleDriverAccept,
  handleDriverButtonAccept,
} from "@/lib/services/driver.service";
import { getConversationByPhone, getDriverByPhone } from "@/lib/db/database";
import { checkTimeouts } from "@/lib/utils/timeouts";

const BOT_PHONE = process.env.BOT_PHONE || "+543757646645";

function normalizePhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("549")) return "+54" + digits.slice(3);
  return "+" + digits;
}

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
    await checkTimeouts();

    const body = await request.json();
    const entry = body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];

    if (!message) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const phone = normalizePhone(message.from);

    if (message.type === "interactive") {
      const buttonId = message.interactive?.button_reply?.id || "";
      console.log(`[INTERACTIVE] ← ${phone}: ${buttonId}`);

      if (buttonId.startsWith("aceptar_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverButtonAccept(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("rechazar_")) {
        console.log(`[RECHAZADO] ${phone} rechazó viaje`);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (phone === BOT_PHONE) {
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      await handleLeadMessage(phone, buttonId);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

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

    const driver = await getDriverByPhone(phone);
    if (driver && ["acepto", "yo estoy", "yo voy", "lo tomo"].some((k) => text.toLowerCase().includes(k))) {
      await handleDriverAccept(phone, text);
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