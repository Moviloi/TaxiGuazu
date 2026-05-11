import axios from "axios";

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}/messages`;

async function sendMessage(to: string, text: string): Promise<void> {
  const payload = {
    messaging_product: "whatsapp",
    to,
    type: "text",
    text: { body: text },
  };

  await axios.post(WHATSAPP_API_URL, payload, {
    headers: {
      Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
      "Content-Type": "application/json",
    },
  });
}

async function pollOutbox() {
  const { getPendingOutbox, markOutboxSent } = await import("../src/lib/db.js");

  const pending = getPendingOutbox(20);
  for (const item of pending) {
    try {
      const phone = item.phone.replace(/\D/g, "");
      await sendMessage(phone, item.content);
      markOutboxSent(item.id);
      console.log(`[OUTBOX] Enviado a ${item.phone}: ${item.content.substring(0, 50)}`);
    } catch (error) {
      console.error(`[OUTBOX] Error enviando a ${item.phone}:`, error);
    }
  }
}

console.log("═══════════════════════════════════════════");
console.log("  📦 OUTBOX WORKER - TaxiGuazú Bot");
console.log("═══════════════════════════════════════════");

setInterval(pollOutbox, 3000);

pollOutbox().catch(console.error);