import { NextRequest, NextResponse } from "next/server";
import { insertMessage, getOrCreateConversation, getConversationById, getRecentHistory, getActiveTripByPhone } from "@/lib/db";
import { generateGeminiReply, analyzeClientIntent } from "@/lib/baileys/gemini";
import { sendWhatsAppMessage } from "@/lib/whatsapp-api/sender";

const VERIFY_TOKEN = process.env.WHATSAPP_VERIFY_TOKEN || "taxiguazu-bot-2025";
const TITULAR_DRIVER_PHONE = process.env.TITULAR_DRIVER_PHONE || "+543757613215";
const DRIVERS_GROUP_ID = process.env.DRIVERS_GROUP_ID || "120363394046775162@g.us";
const TIMEOUT_TITULAR_RESPONSE = 2 * 60 * 1000;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");

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

    if (text.trim().toLowerCase() === ".id") {
      await sendWhatsAppMessage(phone, `📍 Tu número: ${phone}`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (text.trim().toLowerCase() === "sigo yo") {
      await sendWhatsAppMessage(phone, "Perfecto, continuás vos. Avisame cuando termines para volver al bot.");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (text.trim().toLowerCase() === "seguí vos" || text.trim().toLowerCase() === "seguimos vos") {
      await sendWhatsAppMessage(phone, "¡Genial! Retomo la atención. ¿En qué estábamos?");
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    let conversation = getOrCreateConversation(phone, undefined);
    const freshConv = getConversationById(conversation.id);

    if (freshConv.taken_by_human) {
      console.log(`[MSG] Conversación tomada por humano, ignorando`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    insertMessage(conversation.id, "user", text);

    const trip = getActiveTripByPhone(phone);
    const intent = await analyzeClientIntent(text, trip, phone);

    if (!intent.shouldRespond) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const history = getRecentHistory(conversation.id, 20);
    const response = await generateGeminiReply(text, history, trip, phone);

    insertMessage(conversation.id, "assistant", response);
    await sendWhatsAppMessage(phone, response);

    if (intent.needsNotification) {
      await notifyTitular(intent.notificationMessage);
    }

    if (intent.tripCompleted) {
      await handleTripEscalation(phone, intent.notificationMessage);
    }

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] Error procesando mensaje:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

async function notifyTitular(message: string) {
  const phone = TITULAR_DRIVER_PHONE.replace(/\D/g, "");
  await sendWhatsAppMessage(phone, message);
}

async function handleTripEscalation(phone: string, _baseMessage: string) {
  const trip = getActiveTripByPhone(phone);
  if (!trip) return;

  await notifyTitular(`🔔 *NUEVO VIAJE*\n\n📱 Cliente: ${phone}\n📍 Destino: ${trip.destination}\n💰 Precio: $${trip.price_base}\n\nEsperando confirmación...`);

  setTimeout(async () => {
    const groupMsg = `🚕 *VIAJE DISPONIBLE*\n\n📍 Destino: ${trip.destination}\n💰 Precio: $${trip.price_base}\n\n¿Alguien disponible? Respondé "acepto" para tomar el servicio.`;
    try {
      await sendWhatsAppMessage(DRIVERS_GROUP_ID, groupMsg);
      console.log(`[GROUP] → Enviado al grupo de choferes`);
    } catch (error) {
      console.error("[GROUP] Error enviando al grupo:", error);
    }
  }, TIMEOUT_TITULAR_RESPONSE);
}

export const dynamic = "force-dynamic";