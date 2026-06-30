import type { RoleLock, SlotStabilityMap } from "./types";
import { getKnownPlacesPrompt } from "@/lib/ai/iguazu-knowledge";

// el prompt base se complementa con contexto dinámico sobre
// lo que CORE ya detectó. Si CORE fijó role lock para origin/destination, el
// LLM NO debe contradecir (ni re-extraer ese rol). Si hay prev slots de turnos
// anteriores, el LLM debe enfocarse solo en info NUEVA del mensaje actual.
//
// Esto reduce alucinaciones y costos de tokens, y mejora consistencia entre
// la capa sintáctica (CORE) y la capa semántica (LLM).

export interface ExtractionContext {
  roleLock?: RoleLock;
  slotStability?: SlotStabilityMap;
  prevSlots?: Record<string, string | number>;
}

export function getExtractionPrompt(): string {
  return `
Eres Cris, asistente virtual de TaxiGuazú. TaxiGuazú es un servicio de traslados en la Triple Frontera (Puerto Iguazú AR, Foz do Iguaçu BR, Ciudad del Este PY). Dado el mensaje del usuario, extraé SOLO los datos que puedas identificar con certeza.

${getKnownPlacesPrompt()}

Devuelve un objeto JSON con estos campos (todos opcionales — incluí solo los que el usuario haya mencionado explícitamente):
{
  "origin": string | null,
  "destination": string | null,
  "passengers": number | null,
  "price": number | null,
  "scheduled_at": string | null,
  "flight": string | null,
  "urgency": "ahora" | "pronto" | "programado" | null,
  "customer_name": string | null,
  "language": "es" | "en" | "pt" | "fr" | "de" | "it" | "zh" | null
}

Reglas:
- Si el usuario dice un destino turístico (cataratas, aeropuerto, centro, etc.), extraelo como destination.
- Si menciona origen y destino, diferenciarlos.
- passengers: número de personas que viajan. Detectalo de cualquier forma:
  "somos 4", "tres pasajeros", "un grupo de 5", "dos personas",
  "somos una familia de 4", "hay 3 de nosotros", "somo 3",
  "3". Si el usuario responde con un número suelto y el contexto
  del historial indica que se le preguntó por pasajeros, extraer ese número.
- price: solo si el usuario menciona un monto explícito ("cuanto sale", "$32.000").
- scheduled_at: solo si hay fecha y hora específica. NO inferir "hoy" o "mañana" como fecha exacta.
- flight: solo número de vuelo explícito ("vuelo AR1234", "AR1782").
- urgency: "ahora" si hay urgencia explícita, "programado" si hay fecha futura, "pronto" si es "en unas horas", null si no hay indicación.
- customer_name: si el usuario se presenta ("me llamo Juan", "soy María", "es Juan").
- language: detectá el idioma del mensaje del usuario. Solo si estás seguro (es, en, pt, fr, de, it, zh). Si no estás seguro, null.

NO inventes datos que no estén explícitamente en el message del usuario ni en el historial reciente.
Respuesta SOLO JSON, sin texto adicional.
`.trim();
}

// genera un system message adicional con el contexto que CORE
// ya detectó. El LLM usa esto como约束 (constraint) y NO contradice roles fijos.
export function getExtractionContextMessage(ctx: ExtractionContext | undefined): string {
  if (!ctx) return "";

  const lines: string[] = [];
  lines.push("CONTEXTO_CORE:");

  if (ctx.roleLock?.origin) {
    lines.push(`- ROLE_LOCK_ORIGIN: "${ctx.roleLock.origin}" (CORE detectó "estoy en"/"desde"). NO contradecir.`);
  }
  if (ctx.roleLock?.destination) {
    lines.push(`- ROLE_LOCK_DESTINATION: "${ctx.roleLock.destination}" (CORE detectó "voy a"/"ir a"). NO contradecir.`);
  }
  if (ctx.slotStability?.origin && ctx.slotStability.origin !== "open") {
    lines.push(`- ORIGIN_STABILITY: ${ctx.slotStability.origin}`);
  }
  if (ctx.slotStability?.destination && ctx.slotStability.destination !== "open") {
    lines.push(`- DESTINATION_STABILITY: ${ctx.slotStability.destination}`);
  }
  if (ctx.prevSlots) {
    const entries = Object.entries(ctx.prevSlots).filter(([, v]) => v != null && String(v).trim() !== "");
    if (entries.length > 0) {
      lines.push(`- PREV_SLOTS_PERSISTIDOS: ${entries.map(([k, v]) => `${k}="${v}"`).join(", ")}`);
      lines.push("  → NO re-extraer valores ya persistidos. Solo agregar info NUEVA del mensaje actual.");
    }
  }

  if (lines.length === 1) return "";
  return lines.join("\n");
}
