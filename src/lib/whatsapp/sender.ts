import axios from "axios";

export async function sendWhatsAppMessage(to: string, text: string): Promise<void> {
  const token = process.env.WHATSAPP_TOKEN;
  if (!token) {
    console.error("[SENDER] WHATSAPP_TOKEN no está definido");
    return;
  }

  const phone = to.replace(/\D/g, "");
  const url = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

  const payload = {
    messaging_product: "whatsapp",
    to: phone,
    type: "text",
    text: { body: text },
  };

  try {
    await axios.post(url, payload, {
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
    });
    console.log(`[SEND] → ${phone}: ${text.substring(0, 50)}`);
  } catch (error: any) {
    console.error(`[ERROR] Enviando a ${phone}:`, error?.response?.data || error.message);
  }
}