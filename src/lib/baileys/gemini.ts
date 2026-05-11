import { GoogleGenerativeAI } from "@google/generative-ai";
import { getSystemPrompt } from "../system-prompt";
import { DISCOUNT_MAX_EXPLICIT } from "@/config/constants";

interface Trip {
  trip_id: string;
  destination?: string;
  price_base?: number;
  discount_explicit?: number;
  status?: string;
}

interface Message {
  role: string;
  content: string;
  created_at: number;
}

interface IntentAnalysis {
  shouldRespond: boolean;
  needsNotification: boolean;
  notificationMessage: string;
  tripCompleted: boolean;
  intent: "saludo" | "consulta" | "presupuesto" | "reserva" | "descuento" | "confirmacion" | "otro";
}

function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY no configurada");
  return new GoogleGenerativeAI(apiKey);
}

export async function generateGeminiReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  _phone: string
): Promise<string> {
  const genAI = getGenAI();
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const systemPrompt = getSystemPrompt();
  
  const tripInfo = trip
    ? `\n\nVIAJE ACTUAL:\n- Destino: ${trip.destination || "por definir"}\n- Precio base: $${trip.price_base || "por definir"}\n- Descuento actual: ${trip.discount_explicit || 0}%\n- Estado: ${trip.status || "en consulta"}`
    : "\n\n(No hay viaje activo aún)";

  const conversationHistory = history
    .filter((m) => m.role !== "system")
    .map((m) => {
      const role = m.role === "assistant" ? "Bot" : "Cliente";
      return `${role}: ${m.content}`;
    })
    .join("\n");

  const prompt = `${systemPrompt}

${tripInfo}

CONVERSACIÓN RECIENTE:
${conversationHistory || "(inicio de conversación)"}

Cliente: ${userText}

Bot (respondé en español, breve y servicial):`;

  try {
    const result = await model.generateContent(prompt);
    const response = result.response;
    return response.text().trim();
  } catch (error: any) {
    console.error("[GEMINI] Error:", error?.message || error);
    return "Disculpá, estoy teniendo problemas técnicos. Un operador te atenderá en breve.";
  }
}

export async function analyzeClientIntent(
  userText: string,
  trip: Trip | null,
  phone: string
): Promise<IntentAnalysis> {
  const text = userText.toLowerCase().trim();

  const patterns = {
    descuento: /(?:descuento|rebaja|menos|off|por\s*ciento|%\s*off)/i,
    confirmar: /(?:confirm[oa]r?|confirmado|confirmo|si|ok|dale|perfecto|confirmar\s*reserva)/i,
    reserva: /(?:reserva[sr]?|agendar|separar|book)/i,
    presupuesto: /(?:cu[áa]nto|costo|precio|pesos|ars|d[oó]lares|presupuesto|cotiz[oa])/i,
    saludo: /^(?:hola|buenos?\s*d[ií]as?|buenas?|como\s*estas?|que\s*tal|hi|hello|ola|oi)/i,
  };

  const hasDescuento = patterns.descuento.test(text);
  const hasConfirmar = patterns.confirmar.test(text);
  const hasReserva = patterns.reserva.test(text);
  const hasPresupuesto = patterns.presupuesto.test(text);
  const isSaludo = patterns.saludo.test(text);

  let needsNotification = false;
  let notificationMessage = "";
  let tripCompleted = false;
  let intent: IntentAnalysis["intent"] = "otro";

  if (isSaludo) {
    intent = "saludo";
  } else if (hasDescuento) {
    intent = "descuento";
  } else if (hasConfirmar) {
    intent = "confirmacion";
    if (trip && trip.destination && trip.price_base) {
      tripCompleted = true;
    }
  } else if (hasReserva) {
    intent = "reserva";
  } else if (hasPresupuesto) {
    intent = "presupuesto";
  } else {
    intent = "consulta";
  }

  if (
    trip?.discount_explicit &&
    trip.discount_explicit > 10 &&
    (intent === "confirmacion" || intent === "reserva")
  ) {
    needsNotification = true;
    notificationMessage = `🔔 *ALERTA VIAJE CON DESCUENTO*\n\n📱 Cliente: ${phone}\n📍 Destino: ${trip.destination}\n💰 Precio con ${trip.discount_explicit}% descuento: $${Math.round((trip.price_base || 0) * (1 - trip.discount_explicit / 100))}\n\n⚠️ Descuento alto aplicado`;
  }

  return {
    shouldRespond: true,
    needsNotification,
    notificationMessage,
    tripCompleted,
    intent,
  };
}

export function calculatePriceWithDiscount(basePrice: number, discountPercent: number): number {
  const discount = Math.min(discountPercent, DISCOUNT_MAX_EXPLICIT);
  return Math.round(basePrice * (1 - discount / 100));
}

export function formatPrice(price: number): string {
  return `$${price.toLocaleString("es-AR")}`;
}
