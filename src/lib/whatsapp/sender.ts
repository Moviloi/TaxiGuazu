import axios from "axios";

function getUrl(): string {
  return `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;
}

function getToken(): string | null {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.error("[SENDER] WHATSAPP_TOKEN no está definido");
    return null;
  }
  return token;
}

function normalizeRecipient(to: string): string {
  return to.endsWith("@g.us") ? to : to.replace(/\D/g, "");
}

async function postToWhatsApp(payload: any): Promise<void> {
  const token = getToken();
  if (!token) return;

  try {
    await axios.post(getUrl(), payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
  } catch (error: any) {
    console.error(`[SEND ERROR]`, error?.response?.data || error.message);
  }
}

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const payload = {
    messaging_product: "whatsapp",
    to: normalizeRecipient(to),
    type: "text",
    text: { body: text },
  };
  console.log(`[SEND] → ${to}: ${text.substring(0, 50)}`);
  await postToWhatsApp(payload);
}

export async function sendInteractiveList(
  to: string,
  bodyText: string,
  buttonLabel: string,
  sections: { title: string; rows: { id: string; title: string; description?: string }[] }[]
): Promise<void> {
  const payload = {
    messaging_product: "whatsapp",
    to: normalizeRecipient(to),
    type: "interactive",
    interactive: {
      type: "list",
      body: { text: bodyText.substring(0, 1024) },
      action: {
        button: buttonLabel.substring(0, 20),
        sections: sections.map((s) => ({
          title: s.title.substring(0, 24),
          rows: s.rows.map((r) => ({
            id: r.id.substring(0, 256),
            title: r.title.substring(0, 24),
            description: r.description ? r.description.substring(0, 72) : undefined,
          })),
        })),
      },
    },
  };
  console.log(`[SEND LIST] → ${to}: ${bodyText.substring(0, 50)}`);
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
  console.log(`[SEND BUTTONS] → ${to}: ${bodyText.substring(0, 50)}`);
  await postToWhatsApp(payload);
}