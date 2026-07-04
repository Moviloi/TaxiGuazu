import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { handleLeadMessage } from "@/lib/services/lead.service";
import {
  isAdminBotGroup,
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
} from "@/lib/services/dispatch/driver.service";
import { getConversationByPhone, getDriverByPhone, tryRegisterMessage } from "@/lib/db/database";
import { handleSurveyResponse, handleNewTripResponse } from "@/lib/services/trip-execution/survey.service";
import { reverseGeocode } from "@/lib/services/geo/reverse-geocode";
import { getMediaDownloadUrl } from "@/lib/sender";
import { transcribeAudio } from "@/lib/ai/transcribe";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

function getBotPhone(): string {
  try { return getEnv().BOT_PHONE; } catch { return "+543757646645"; }
}

function getAppSecret(): string | null {
  try { return getEnv().WHATSAPP_APP_SECRET || null; } catch { return null; }
}

function verifySignature(rawBody: string, signatureHeader: string | null): boolean {
  const secret = getAppSecret();
  if (!secret) {
    log.error("[WEBHOOK] WHATSAPP_APP_SECRET not configured — cannot verify webhook signatures");
    return false;
  }
  if (!signatureHeader) {
    log.warn("[WEBHOOK] No signature header — rejecting");
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

function hashPayload(rawBody: string): string {
  return crypto.createHash("sha256").update(rawBody, "utf-8").digest("hex").slice(0, 32);
}

// ── Rate Limiting (sliding window per phone, via connection_state) ──
const RATE_LIMIT_MAX = 10;
const RATE_LIMIT_WINDOW_MS = 60_000;

async function checkRateLimit(phone: string): Promise<boolean> {
  const now = Date.now();
  const key = `rate_limit_${phone}`;
  const { getConnectionValue, setConnectionValue } = await import("@/lib/db/database");
  const raw = await getConnectionValue(key);
  if (raw) {
    const counts: number[] = JSON.parse(raw);
    const valid = counts.filter((ts) => now - ts < RATE_LIMIT_WINDOW_MS);
    if (valid.length >= RATE_LIMIT_MAX) return false;
    valid.push(now);
    await setConnectionValue(key, JSON.stringify(valid));
  } else {
    await setConnectionValue(key, JSON.stringify([now]));
  }
  return true;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const mode = params.get("hub.mode");
  const token = params.get("hub.verify_token");
  const challenge = params.get("hub.challenge");
  let VERIFY_TOKEN: string;
  try { VERIFY_TOKEN = getEnv().WHATSAPP_VERIFY_TOKEN; } catch { return NextResponse.json({ error: "Config missing" }, { status: 500 }); }

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    log.info("[WEBHOOK] Verificación exitosa");
    return new NextResponse(challenge, { status: 200 });
  }

  log.warn(`[WEBHOOK] Verificación fallida: token=${token}, esperado=${VERIFY_TOKEN}`);
  return NextResponse.json({ error: "Forbidden" }, { status: 403 });
}

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const sig = request.headers.get("x-hub-signature-256");
    if (!verifySignature(rawBody, sig)) {
      log.warn("[WEBHOOK] Signature verification failed");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // === RATE LIMIT (before any processing) ===
    const body = JSON.parse(rawBody);
    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (message) {
      const phone = normalizePhone(message.from);
      if (!(await checkRateLimit(phone))) {
        log.warn("[WEBHOOK] Rate limit exceeded", { phone: phone.slice(-4) });
        return NextResponse.json({ error: "Too Many Requests" }, { status: 429 });
      }
    } else {
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }
    // Re-parse for the rest of the flow (phone already normalized above)
    const phone = normalizePhone(message.from);
    const messageId: string | undefined = message.id;
    const messageType: string = message.type || "unknown";
    const payloadHash = hashPayload(rawBody);

    // === IDEMPOTENCY (atomic UNIQUE-based) ===
    // La unicidad es el mecanismo de sincronización. Si Meta reintenta o dos
    // webhooks concurrentes llegan con el mismo message_id, el primer INSERT
    // gana y el segundo ve rowsAffected=0. Sin check-then-act, sin races.
    if (messageId) {
      const registered = await tryRegisterMessage(messageId, phone, messageType, payloadHash);
      if (!registered) {
      log.info(JSON.stringify({
        event: "duplicate_message_ignored",
        message_id: messageId,
        phone: `******${phone.slice(-4)}`,
        timestamp: Math.floor(Date.now() / 1000),
      }));
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }
      log.info(JSON.stringify({
        event: "message_registered",
        message_id: messageId,
        phone: `******${phone.slice(-4)}`,
        timestamp: Math.floor(Date.now() / 1000),
      }));
    } else {
      log.warn(JSON.stringify({
        event: "webhook_no_message_id",
        phone: `******${phone.slice(-4)}`,
        message_type: messageType,
        timestamp: Math.floor(Date.now() / 1000),
      }));
    }

    // checkTimeouts() movido a cron exclusivo (R29).
    // Ver: src/app/api/cron/check-timeouts/route.ts

    if (message.type === "interactive") {
      const buttonId = message.interactive?.button_reply?.id || "";
      log.info(`[INTERACTIVE] event=button_received phone=******${phone.slice(-4)} button=${buttonId}`);

      if (buttonId.startsWith("aceptar_")) {
        const convId = parseInt(buttonId.split("_")[1]);
        if (convId) {
          await handleDriverButtonAccept(convId, phone);
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
        log.info(`[RECHAZADO] phone=******${phone.slice(-4)} event=trip_rejected`);
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

      if (phone === getBotPhone()) {
        log.info(`[WEBHOOK_DEBUG] botPhone matched, skipping interactive`);
        return NextResponse.json({ status: "ok" }, { status: 200 });
      }

      log.info(`[WEBHOOK_DEBUG] calling handleLeadMessage for interactive button ${buttonId}`);
      await handleLeadMessage(phone, buttonId);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // === FUT-03: Mensajes multimedia (location / image) ===
    if (message.type === "location" && message.location) {
      const { latitude, longitude } = message.location;
      log.info(`[LOCATION] lat=${latitude} lon=${longitude} phone=******${phone.slice(-4)}`);
      const address = await reverseGeocode(latitude, longitude);
      log.info(`[LOCATION] resuelto="${address}" phone=******${phone.slice(-4)}`);
      await handleLeadMessage(phone, address);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (message.type === "image" && message.image) {
      const caption = message.image.caption || "📷 [imagen recibida]";
      log.info(`[IMAGE] caption="${caption}" phone=******${phone.slice(-4)}`);
      await handleLeadMessage(phone, caption);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    // === FUT-02: Transcripción de audios WhatsApp ===
    if (message.type === "audio" && message.audio) {
      const mimeType = message.audio.mime_type || "audio/ogg";
      log.info(`[AUDIO] id=${message.audio.id} mime=${mimeType} phone=******${phone.slice(-4)}`);

      try {
        const { url } = await getMediaDownloadUrl(message.audio.id);
        const token = getEnv().WHATSAPP_TOKEN;

        const downloadRes = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(15_000),
        });

        if (!downloadRes.ok) {
          throw new Error(`Download failed: ${downloadRes.status}`);
        }

        const arrayBuffer = await downloadRes.arrayBuffer();
        const audioBuffer = Buffer.from(arrayBuffer);

        const transcribed = await transcribeAudio(audioBuffer, mimeType);
        log.info(`[AUDIO] transcribed="${transcribed.substring(0, 80)}" phone=******${phone.slice(-4)}`);
        await handleLeadMessage(phone, transcribed);
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        log.error(`[AUDIO ERROR] phone=******${phone.slice(-4)} error=${msg}`);
        await handleLeadMessage(phone, "🎤 [mensaje de voz]");
      }

      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const text = message.text?.body;
    if (!text) {
      log.info(`[WEBHOOK] mensaje ignorado: type=${message.type} phone=******${phone.slice(-4)}`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const convId = phone.replace(/\d/g, "").length > 0 ? "unknown" : phone.slice(-4);
    log.info(`[MSG] event=message_received conv=******${convId} len=${text.length}`);
    log.info(`[WEBHOOK_DEBUG] phone=******${phone.slice(-4)} botPhone=${getBotPhone()} isGroup=${isAdminBotGroup(phone)}`);

    if (isAdminBotGroup(phone)) {
      const conv = await getConversationByPhone(phone);
      if (conv) {
        await handleDriverResponse(text, phone, conv.id);
      }
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (phone === getBotPhone()) {
      log.info(`[WEBHOOK_DEBUG] botPhone matched, skipping text`);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    const driver = await getDriverByPhone(phone);
    log.info(`[WEBHOOK_DEBUG] driverLookup=${!!driver}`);
    if (driver && ["acepto", "yo estoy", "yo voy", "lo tomo"].some((k) => text.toLowerCase().includes(k))) {
      log.info(`[WEBHOOK_DEBUG] matched accept keyword, routing to handleDriverAccept`);
      await handleDriverAccept(phone, text);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    if (driver && text.toLowerCase().trim() === "llegué") {
      log.info(`[WEBHOOK_DEBUG] matched llegue, routing to handleDriverArrived`);
      await handleDriverArrived(phone);
      return NextResponse.json({ status: "ok" }, { status: 200 });
    }

    log.info(`[WEBHOOK_DEBUG] falling through to handleLeadMessage`);
    await handleLeadMessage(phone, text);

    return NextResponse.json({ status: "ok" }, { status: 200 });
  } catch (error) {
    log.error("[WEBHOOK] Error procesando mensaje:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export const dynamic = "force-dynamic";