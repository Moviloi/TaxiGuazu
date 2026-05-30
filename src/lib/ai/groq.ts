import Groq from "groq-sdk";
import { getSystemPrompt } from "./system-prompt";
import { getExtractionPrompt } from "./extraction-prompt";
import { getEnv } from "@/config/env";
import type { TripRow } from "@/lib/db/types";
import { GROQ_MODEL, GROQ_MAX_TOKENS, GROQ_TIMEOUT_MS, GROQ_EXTRACTION_MAX_TOKENS } from "@/config/constants";

type Trip = Pick<TripRow, "trip_id" | "destination" | "status">;

interface Message {
  role: string;
  content: string;
  created_at: number;
}

function getGroq(): Groq | null {
  try {
    const env = getEnv();
    return new Groq({ apiKey: env.GROQ_API_KEY });
  } catch (e) {
    console.error("[GROQ]", e instanceof Error ? e.message : String(e));
    return null;
  }
}

function detectLang(text: string): "es" | "en" | "pt" {
  const lower = text.toLowerCase();
  const ptMarkers = ["você", "obrigado", "bom dia", "boa tarde", "boa noite", "quanto custa", "valor", "por favor"];
  const enMarkers = ["hello", "hi", "how much", "price", "airport", "booking", "tomorrow", "today", "please"];

  if (ptMarkers.some(marker => lower.includes(marker))) return "pt";
  if (enMarkers.some(marker => lower.includes(marker))) return "en";
  return "es";
}

export async function generateGroqExtraction(
  userText: string,
  history: Message[],
  customerName?: string
): Promise<Record<string, any> | null> {
  const groq = getGroq();
  if (!groq) return null;

  const lang = detectLang(userText);

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: getExtractionPrompt() },
    {
      role: "system",
      content: [
        `IDIOMA_DETECTADO: ${lang.toUpperCase()}`,
        `NOMBRE_CLIENTE_CONOCIDO: ${customerName || "ninguno"}`,
      ].join(" | "),
    },
  ];

  const nativeHistory = history
    .filter((m) => m.role !== "system")
    .slice(-6)
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    }));

  messages.push(...nativeHistory);
  messages.push({ role: "user", content: userText });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        response_format: { type: "json_object" },
        max_tokens: GROQ_EXTRACTION_MAX_TOKENS,
        temperature: 0.3,
      },
      { timeout: GROQ_TIMEOUT_MS }
    );

    const content = completion.choices[0]?.message?.content;
    if (!content) return null;

    return JSON.parse(content);
  } catch (e) {
    console.error("[GROQ_EXTRACTION_ERROR]", e);
    return null;
  }
}

export async function generateGroqReply(
  userText: string,
  history: Message[],
  trip: Trip | null,
  clientPhone: string,
  promoNote?: string,
  customerName?: string,
  extractionNote?: string,
  skipMarkers = false,
): Promise<string> {
  const groq = getGroq();
  if (!groq) return "Disculpe, no pude responder. Un operador lo asistirá.";

  const lang = detectLang(userText);

  const dolar = process.env.COTIZACION_DOLAR || "1250";
  const real = process.env.COTIZACION_REAL || "250";

  const isExtranjero = !clientPhone.startsWith('+54') || lang !== 'es';
  const monedaSugerida = isExtranjero ? (lang === 'pt' ? 'BRL' : 'USD') : 'ARS';

  let dynamicContext = `[CONTEXTO_EJECUCIÓN_SESIÓN]\n`;
  dynamicContext += `IDIOMA_SALIDA: ${lang.toUpperCase()}\n`;
  dynamicContext += `Cotización Dólar: $${dolar} ARS | Cotización Real: $${real} ARS\n`;
  dynamicContext += `DESCUENTO_ESTANDAR: 10%\n`;
  dynamicContext += `DESCUENTO_MAXIMO: 15%\n`;
  dynamicContext += `Nota Promocional Vigente del Traslado: ${promoNote || "Ninguna promoción activa"}\n`;
  dynamicContext += `Teléfono del Cliente: ${clientPhone}\n`;
  dynamicContext += `[CLIENTE_EXTRANJERO: ${isExtranjero}]\n`;
  dynamicContext += `[MONEDA_SUGERIDA: ${monedaSugerida}]\n`;
  dynamicContext += `[REGLA_FORMATO_PRECIO]: Si vas a mostrar un precio al cliente y MONEDA_SUGERIDA es BRL o USD, calculá el valor aproximado usando las cotizaciones provistas y mostralo en ese formato, pero obligatoriamente agregá al lado el equivalente exacto en pesos argentinos (ARS) aclarando que se abona en base al precio oficial en ARS. Ejemplo para BRL: "R$ X BRL (aproximadamente $Y ARS)".\n`;

  dynamicContext += `[SESION_LIMPIA: ${!!customerName}]\n`;
  if (customerName) {
    dynamicContext += `[NOMBRE_CLIENTE: ${customerName}]\n`;
  }

  if (extractionNote) {
    dynamicContext += `[EXTRACCION_CONFIANZA]\n${extractionNote}\n`;

    const priceMatch = extractionNote.match(/VALOR_PRECIO:\s*(\d+)/);
    const routeMatch = extractionNote.match(/Ruta oficial:\s*(.*?)\s*→\s*(.*?)\./);

    if (priceMatch) {
      dynamicContext += `PRECIO: ${priceMatch[1]}\n`;
      dynamicContext += `HAY_TARIFA: true\n`;
    } else {
      dynamicContext += `HAY_TARIFA: false\n`;
    }

    if (routeMatch) {
      let canonicalOrigin = routeMatch[1].trim();
      let canonicalDest = routeMatch[2].trim();

      if (canonicalDest === "Centro (Urbano)") {
        canonicalDest = "Centro de la Ciudad (Puerto Iguazú)";
      }
      if (canonicalDest === "Puerto Iguazú Centro") {
        canonicalDest = "Ciudad de Puerto Iguazú";
      }
      if (canonicalDest === "Ciudad de Foz do Iguaçu" || canonicalDest === "Foz do Iguaçu" || canonicalDest === "Foz") {
        canonicalDest = "Ciudad de Foz";
      }

      dynamicContext += `ORIGEN_CANONICO: ${canonicalOrigin}\n`;
      dynamicContext += `DESTINO_CANONICO: ${canonicalDest}\n`;
    }
  }

  if (trip) {
    dynamicContext += `Viaje Actual Activo en Base de Datos: ID ${trip.trip_id} | Destino: ${trip.destination} | Estado: ${trip.status}\n`;
  } else {
    dynamicContext += `Viaje Actual Activo en Base de Datos: Ninguno.\n`;
  }

  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: getSystemPrompt(!skipMarkers),
    },
    {
      role: "system",
      content: `[CONTEXTO_EJECUCIÓN_SESIÓN]\n${dynamicContext}`,
    },
  ];

  const nativeHistory = history
    .filter((m) => m.role !== "system")
    .map((m) => ({
      role: (m.role === "assistant" ? "assistant" : "user") as "assistant" | "user",
      content: m.content,
    }));

  messages.push(...nativeHistory);

  messages.push({
    role: "user",
    content: userText,
  });

  try {
    const completion = await groq.chat.completions.create(
      {
        model: GROQ_MODEL,
        messages,
        max_tokens: GROQ_MAX_TOKENS,
        temperature: 0.3,
      },
      { timeout: GROQ_TIMEOUT_MS }
    );

    let response = completion.choices[0]?.message?.content?.trim() || "Disculpe, no pude responder.";
    if (extractionNote) {
      const precioReal = extractionNote.match(/VALOR_PRECIO:\s*(\d+)/)?.[1];
      if (precioReal) {
        response = response.replace(/\$?\s*\d[\d.,]+/g, `$${precioReal}`);
      }
    }
    return response;
  } catch (e) {
    console.error("[GROQ_ERROR]", e);
    return "Disculpe, no pude responder. Un operador lo asistirá.";
  }
}
