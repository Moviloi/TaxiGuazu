import axios from "axios";
import { getEnv } from "@/config/env";
import { log } from "@/lib/utils/logger";

function getUrl(): string {
  const env = getEnv();
  return `https://graph.facebook.com/v18.0/${env.WHATSAPP_PHONE_ID}/messages`;
}

function getToken(): string | null {
  try {
    const env = getEnv();
    return env.WHATSAPP_TOKEN;
  } catch (e) {
    log.error("[SENDER]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function normalizeRecipient(to: string): string {
  return to.endsWith("@g.us") ? to : to.replace(/\D/g, "");
}

async function postToWhatsApp(payload: any): Promise<void> {
  const token = getToken();
  if (!token) throw new Error("WhatsApp token not configured");

  try {
    await axios.post(getUrl(), payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    const detail = error?.response?.data || error.message;
    log.error(`[SEND ERROR]`, detail);
    throw new Error("WhatsApp send failed");
  }
}

/**
 * Obtiene la URL de descarga y MIME type de un media de WhatsApp.
 * GET a `https://graph.facebook.com/v18.0/{mediaId}` con token de acceso.
 * Retorna la URL efímera y el MIME type para descargar el archivo.
 */
export async function getMediaDownloadUrl(
  mediaId: string
): Promise<{ url: string; mimeType: string }> {
  const token = getToken();
  if (!token) throw new Error("WhatsApp token not configured");

  const url = `https://graph.facebook.com/v18.0/${mediaId}`;
  log.info(`[MEDIA URL] fetching download info for media ${mediaId}`);

  try {
    const res = await axios.get(url, {
      headers: { Authorization: `Bearer ${token}` },
      timeout: 10_000,
    });
    const { url: downloadUrl, mime_type } = res.data;
    if (!downloadUrl || !mime_type) {
      throw new Error(`Invalid media response for ${mediaId}`);
    }
    log.info(`[MEDIA URL] ${mime_type} → ${downloadUrl.substring(0, 60)}...`);
    return { url: downloadUrl, mimeType: mime_type };
  } catch (error: any) {
    const detail = error?.response?.data || error.message;
    log.error(`[MEDIA URL ERROR] media ${mediaId}:`, detail);
    throw new Error("Failed to get media download URL");
  }
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const payload = {
    messaging_product: "whatsapp",
    to: normalizeRecipient(to),
    type: "text",
    text: { body: text },
  };
  log.info(`[QA_RESPONSE] phone=******${to.slice(-4)} text="${text}"`);
  log.info(`[SEND] → ******${to.slice(-4)}: ${text.substring(0, 50)}`);
  await postToWhatsApp(payload);
}

export async function sendInteractiveButtons(
  to: string,
  bodyText: string,
  buttons: { id: string; title: string }[]
): Promise<void> {
  if (buttons.length < 1 || buttons.length > 3) return;

  const payload = {
    messaging_product: "whatsapp",
    to: normalizeRecipient(to),
    type: "interactive",
    interactive: {
      type: "button",
      body: { text: bodyText.substring(0, 1024) },
      action: {
        buttons: buttons.map((b) => ({
          type: "reply",
          reply: { id: b.id.substring(0, 256), title: b.title.substring(0, 20) },
        })),
      },
    },
  };
  log.info(`[QA_RESPONSE] phone=******${to.slice(-4)} buttons="${bodyText.substring(0, 1024)}"`);
  log.info(`[SEND BUTTONS] → ******${to.slice(-4)}: ${bodyText.substring(0, 50)}`);
  await postToWhatsApp(payload);
}