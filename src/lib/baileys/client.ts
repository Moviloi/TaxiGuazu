import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  proto,
  DisconnectReason,
  Browsers,
} from "@whiskeysockets/baileys";
import { Boom } from "@hapi/boom";
import pino from "pino";
import QRCode from "qrcode";
import {
  AUTH_DIR,
  BOT_PHONE,
  TITULAR_DRIVER_PHONE,
  DRIVERS_GROUP_ID,
  TIMEOUT_TITULAR_RESPONSE,
  TIMEOUT_GROUP_RESPONSE,
  TIMEOUT_HUMAN_RESPONSE,
  DISCOUNT_MAX_EXPLICIT,
} from "@/config/constants";
import {
  setConnectionStateBatch,
  getOrCreateConversation,
  getConversationById,
  insertMessage,
  getRecentHistory,
  enqueueOutbox,
  getPendingOutbox,
  markOutboxSent,
  getActiveTripByPhone,
  createTrip,
  updateTripState,
  updateTripDiscountExplicit,
  addEscalationLog,
} from "../db";
import { generateGeminiReply, analyzeClientIntent } from "./gemini";

const logger = pino({ level: "silent" });
let sock: any = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let outboxInterval: NodeJS.Timeout | null = null;

function extractText(message: proto.IMessage | null | undefined): string | null {
  if (!message) return null;
  return (
    message.conversation ||
    message.extendedTextMessage?.text ||
    message.imageMessage?.caption ||
    message.videoMessage?.caption ||
    message.documentMessage?.caption ||
    null
  );
}

function normalizeJid(phone: string): string {
  const cleaned = phone.replace(/\D/g, "");
  if (cleaned.endsWith("@s.whatsapp.net")) return cleaned;
  return `${cleaned}@s.whatsapp.net`;
}

async function sendText(jid: string, text: string) {
  if (!sock) return;
  try {
    await sock.sendMessage(jid, { text });
    console.log(`[SEND] → ${jid}: ${text.substring(0, 50)}...`);
  } catch (error) {
    console.error(`[ERROR] Sending to ${jid}:`, error);
  }
}

async function notifyTitular(message: string) {
  const jid = normalizeJid(TITULAR_DRIVER_PHONE);
  await sendText(jid, message);
}

async function sendToGroup(message: string) {
  if (!sock) return;
  try {
    await sock.sendMessage(DRIVERS_GROUP_ID, { text: message });
    console.log(`[GROUP] → Enviado al grupo de choferes`);
  } catch (error) {
    console.error("[ERROR] Enviando al grupo:", error);
  }
}

function startOutboxPolling() {
  if (outboxInterval) clearInterval(outboxInterval);
  
  outboxInterval = setInterval(async () => {
    if (!sock) return;
    
    const pending = getPendingOutbox(20);
    for (const item of pending) {
      try {
        const jid = normalizeJid(item.phone);
        await sock.sendMessage(jid, { text: item.content });
        markOutboxSent(item.id);
        console.log(`[OUTBOX] Enviado mensaje pendiente a ${item.phone}`);
      } catch (error) {
        console.error(`[OUTBOX] Error enviando a ${item.phone}:`, error);
      }
    }
  }, 2000);
}

async function handleIncomingMessage(message: proto.IWebMessageInfo) {
  if (message.key.fromMe) return;
  
  const remoteJid = message.key.remoteJid;
  if (!remoteJid || !remoteJid.endsWith("@s.whatsapp.net")) return;
  
  const text = extractText(message.message);
  if (!text) return;

  const phone = remoteJid.split("@")[0];
  console.log(`[MSG] ← ${phone}: ${text.substring(0, 50)}`);

  if (text.trim().toLowerCase() === ".id") {
    await sendText(remoteJid, `📍 Tu número: ${phone}`);
    return;
  }

  if (text.trim().toLowerCase() === "sigo yo") {
    await sendText(remoteJid, "Perfecto, continuás vos. Avisame cuando termines para volver al bot.");
    return;
  }

  if (text.trim().toLowerCase() === "seguí vos" || text.trim().toLowerCase() === "seguimos vos") {
    await sendText(remoteJid, "¡Genial! Retomo la atención. ¿En qué estábamos?");
    return;
  }

  let conversation = getOrCreateConversation(phone, message.pushName);
  const freshConv = getConversationById(conversation.id);
  
  if (freshConv.taken_by_human) {
    console.log(`[MSG] Conversación tomada por humano, ignorando`);
    return;
  }

  insertMessage(conversation.id, "user", text);

  const trip = getActiveTripByPhone(phone);
  const intent = await analyzeClientIntent(text, trip);

  if (intent.shouldRespond) {
    await sock?.sendPresenceUpdate("composing", remoteJid);
    
    const history = getRecentHistory(conversation.id, 20);
    const response = await generateGeminiReply(text, history, trip, phone);
    
    insertMessage(conversation.id, "assistant", response);
    await sendText(remoteJid, response);

    if (intent.needsNotification) {
      await notifyTitular(intent.notificationMessage);
    }

    if (intent.tripCompleted) {
      await handleTripEscalation(phone, conversation.id);
    }
  }
}

async function handleTripEscalation(phone: string, conversationId: number) {
  const trip = getActiveTripByPhone(phone);
  if (!trip) return;

  await notifyTitular(`🔔 *NUEVO VIAJE*\n\n📱 Cliente: ${phone}\n📍 Destino: ${trip.destination}\n💰 Precio: $${trip.price_base}\n\nEsperando confirmación...`);

  setTimeout(async () => {
    await sendToGroup(`🚕 *VIAJE DISPONIBLE*\n\n📍 Destino: ${trip.destination}\n💰 Precio: $${trip.price_base}\n\n¿Alguien disponible? Respondé "acepto" para tomar el servicio.`);
  }, TIMEOUT_TITULAR_RESPONSE);
}

export async function startWhatsApp() {
  console.log(`[BOT] Iniciando TaxiGuazú Bot...`);

  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);
  
  let version: [number, number, number] | undefined;
  try {
    const fetched = await fetchLatestBaileysVersion();
    version = fetched.version;
    console.log(`[BOT] Usando Baileys v${version.join(".")}`);
  } catch (err) {
    console.warn("[BOT] No se pudo obtener última versión de Baileys:", err);
  }

  sock = makeWASocket({
    auth: state,
    version: version || [2, 2400, 7],
    logger,
    browser: Browsers.macOS("Desktop"),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    patchMessageBeforeSending: (message) => {
      const requiresPatch = !!(
        message.buttonsMessage ||
        message.templateMessage ||
        message.listMessage
      );
      if (requiresPatch) {
        return {
          viewOnceMessage: {
            message: {
              messageContextInfo: {
                deviceListMetadata: {},
                deviceListMetadataVersion: 2,
              },
              ...message,
            },
          },
        };
      }
      return message;
    },
  });

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log("[BOT] QR recibido");
      const qrDataUrl = await QRCode.toDataURL(qr);
      setConnectionStateBatch({ status: "qr", qr_string: qr, phone: null });
    }

    if (connection === "connecting") {
      const currentState = (await import("@/lib/db")).getConnectionState();
      if (currentState?.status !== "qr") {
        setConnectionStateBatch({ status: "connecting" });
      }
    }

    if (connection === "open") {
      const botJid = sock.user?.id || "";
      const phone = botJid.split(":")[0];
      console.log(`[BOT] ✓ Conectado como ${phone}`);
      setConnectionStateBatch({ status: "connected", qr_string: null, phone });
      startOutboxPolling();
    }

    if (connection === "close") {
      const code = (lastDisconnect?.error as Boom)?.output?.statusCode;
      
      if (code === DisconnectReason.loggedOut) {
        console.log("[BOT] Sesión cerrada, requiring new QR");
        setConnectionStateBatch({ status: "disconnected", qr_string: null, phone: null });
        return;
      }

      console.log(`[BOT] Conexión cerrada (code: ${code}). Reconnecting...`);
      
      if (reconnectTimer) return;
      
      const delay = code === 440 ? 15000 : 5000;
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        if (sock) {
          try { sock.end(undefined); } catch {}
          sock = null;
        }
        startWhatsApp();
      }, delay);
    }
  });

  sock.ev.on("messages.upsert", async (upsert) => {
    if (upsert.type !== "notify") return;
    for (const message of upsert.messages) {
      await handleIncomingMessage(message);
    }
  });

  return sock;
}

export async function stopWhatsApp() {
  if (outboxInterval) {
    clearInterval(outboxInterval);
    outboxInterval = null;
  }
  if (sock) {
    try {
      await sock.logout();
      sock.end(undefined);
    } catch {}
    sock = null;
  }
}
