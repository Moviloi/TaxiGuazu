import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage, handleSlotResponse } from "@/lib/services/lead.service";
import {
  isGroupMessage,
  handleDriverResponse,
  handleDriverAccept,
  handleDriverButtonAccept,
  handleDriverArrived,
  handleDriverEnViaje,
  handleDriverCompleted,
  handleDriverTakeLead,
  handleDriverReconfirmOk,
  handleDriverReconfirmNo,
  handleComisionOk,
  handleComisionRevision,
  handleContingenciaSi,
  handleContingenciaNo,
  handleDriverDisponible,
  handleDriverVoy,
} from "@/lib/services/driver.service";
import { getConversationByPhone, getDriverByPhone } from "@/lib/db/database";
import { checkTimeouts } from "@/lib/utils/timeouts";
import { handleSurveyResponse, handleNewTripResponse } from "@/lib/services/survey.service";
import { getEnv } from "@/config/env";

function getBotPhone(): string {
  try { return getEnv().BOT_PHONE; } catch { return "+543757646645"; }
}

function getAppSecret(): string | null {
  try { return getEnv().WHATSAPP_APP_SECRET || null; } catch { return null; }
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getAppSecret();
  if (!secret) {
    console.warn("[WEBHOOK] WHATSAPP_APP_SECRET not set — skipping signature verification");
    return true;
  }
  if (!signatureHeader) {
    console.warn("[WEBHOOK] No signature header — rejecting");
    return false;
  }
  const expected = crypto
    .createHmac("sha256", secret)
    .update(rawBody, "utf-8")
    .digest("hex");
  const received = signatureHeader.replace(/^sha256=/, "");
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(received));
}

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
  let VERIFY_TOKEN: string;
  try { VERIFY_TOKEN = getEnv().WHATSAPP_VERIFY_TOKEN; } catch { VERIFY_TOKEN = "redcolaborativa-bot-2025"; }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("[WEBHOOK] Verificación exitosa");
    return new NextResponse(challenge, { status: 200 });
  }

  console.warn(`[WEBHOOK] Verificación fallida: token=${token}, esperado=${VERIFY_TOKEN}`);
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, sig)) {
      console.warn("[WEBHOOK] Signature verification failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await checkTimeouts();

    const body = JSON.parse(rawBody);
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

      if (buttonId.startsWith("disponible_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverDisponible(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("voy_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverVoy(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("realizado_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverCompleted(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("enviaje_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverEnViaje(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("rechazar_")) {
        console.log(`[RECHAZADO] ${phone} rechazó viaje`);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("reconfirm_ok_")) {
        await handleDriverReconfirmOk(buttonId, phone);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("reconfirm_no_")) {
        await handleDriverReconfirmNo(buttonId, phone);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("comision_ok_")) {
        await handleComisionOk(buttonId, phone);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("comision_revision_")) {
        await handleComisionRevision(buttonId, phone);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("tomar_lead_")) {
        const convId = parseInt(buttonId.split("_")[2]);
        if (convId) {
          await handleDriverTakeLead(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("contingencia_si_")) {
        const convId = parseInt(buttonId.split("_")[2]);
        if (convId) {
          await handleContingenciaSi(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("contingencia_no_")) {
        const convId = parseInt(buttonId.split("_")[2]);
        if (convId) {
          await handleContingenciaNo(convId, phone);
          return NextResponse.json({ status: "ok" }, { status: 200 });
        }
      }

      if (buttonId.startsWith("survey_")) {
        await handleSurveyResponse(phone, buttonId);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("newtrip_")) {
        await handleNewTripResponse(phone, buttonId);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (buttonId.startsWith("slot_")) {
        await handleSlotResponse(phone, buttonId);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      if (phone === getBotPhone()) {
        console.log(`[WEBHOOK_DEBUG] botPhone matched, skipping interactive`);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      console.log(`[WEBHOOK_DEBUG] calling handleLeadMessage for interactive button ${buttonId}`);
      await handleLeadMessage(phone, buttonId);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const text = message.text?.body;
    if (!text) {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(`[MSG] ← ${phone}: ${text.substring(0, 50)}`);
    console.log(`[WEBHOOK_DEBUG] phone=${phone} botPhone=${getBotPhone()} isGroup=${isGroupMessage(phone)}`);

    if (isGroupMessage(phone)) {
      const conv = await getConversationByPhone(phone);
      if (conv) {
        await handleDriverResponse(text, phone, conv.id);
      }
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (phone === getBotPhone()) {
      console.log(`[WEBHOOK_DEBUG] botPhone matched, skipping text`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const driver = await getDriverByPhone(phone);
    console.log(`[WEBHOOK_DEBUG] driverLookup=${!!driver}`);
    if (driver && ["acepto", "yo estoy", "yo voy", "lo tomo"].some((k) => text.toLowerCase().includes(k))) {
      console.log(`[WEBHOOK_DEBUG] matched accept keyword, routing to handleDriverAccept`);
      await handleDriverAccept(phone, text);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (driver && text.toLowerCase().trim() === "llegué") {
      console.log(`[WEBHOOK_DEBUG] matched llegue, routing to handleDriverArrived`);
      await handleDriverArrived(phone);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    console.log(`[WEBHOOK_DEBUG] falling through to handleLeadMessage`);
    await handleLeadMessage(phone, text);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    console.error("[WEBHOOK] Error procesando mensaje:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";