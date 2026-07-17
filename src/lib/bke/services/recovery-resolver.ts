// BKE RECOVERY RESOLVER — Deterministic contextual recovery (replaces C6 generateContextualRecovery).
// PR-5C: Reutiliza slot context, roleLock y facts para generar preguntas de recuperación sin LLM.
// 0 LLM calls — 100% deterministic rules.
//
// Contrato de salida: compatible con generateContextualRecovery (string | null).

import { log } from "@/lib/utils/logger";
import type { ChatSessionRow } from "@/lib/db/types";

// ─── Resultado (mismo contrato que generateContextualRecovery) ─────────────

export interface RecoveryResult {
  message: string;
  source: string;
}

// ─── Métricas DRL ─────────────────────────────────────────────────────────

export interface RecoveryMetrics {
  attempts: number;
  resolved: number;
  escalated: number;
}

let drlMetrics: RecoveryMetrics = { attempts: 0, resolved: 0, escalated: 0 };

export function getRecoveryDrlMetrics(): RecoveryMetrics {
  return { ...drlMetrics };
}

export function resetRecoveryDrlMetrics(): void {
  drlMetrics = { attempts: 0, resolved: 0, escalated: 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseSessionSlots(session: ChatSessionRow | null): {
  origin: string | null;
  destination: string | null;
} {
  if (!session?.slots) return { origin: null, destination: null };
  try {
    const slots = JSON.parse(session.slots);
    return {
      origin: slots.origin?.value ?? null,
      destination: slots.destination?.value ?? null,
    };
  } catch {
    return { origin: null, destination: null };
  }
}

function getLangName(lang: string): string {
  return lang === "en" ? "English" : lang === "pt" ? "Portuguese" : "Spanish";
}

// ─── Reglas determinísticas ───────────────────────────────────────────────

/**
 * R1: Origen resuelto — preguntar destino contextual.
 */
function ruleOriginResolved(origin: string | null, langName: string): RecoveryResult | null {
  if (!origin) return null;

  let msg: string;
  if (langName === "English") {
    msg = `I understand you're going from ${origin}. What exact location are you going to?`;
  } else if (langName === "Portuguese") {
    msg = `Entendi que sua viagem é de ${origin}. Para qual local exato você está indo?`;
  } else {
    msg = `Entendí que tu viaje es desde ${origin}. ¿A qué lugar exacto vas?`;
  }
  log.info("[BKE_RECOVERY:RULE]", { rule: "origin_resolved", origin });
  return { message: msg, source: "origin_resolved" };
}

/**
 * R2: Destino resuelto — preguntar origen contextual.
 */
function ruleDestResolved(destination: string | null, langName: string): RecoveryResult | null {
  if (!destination) return null;

  let msg: string;
  if (langName === "English") {
    msg = `I understand you want to go to ${destination}. What exact location are you leaving from?`;
  } else if (langName === "Portuguese") {
    msg = `Entendi que você quer ir para ${destination}. De qual local exato você está saindo?`;
  } else {
    msg = `Entendí que querés ir a ${destination}. ¿De qué lugar exacto salís?`;
  }
  log.info("[BKE_RECOVERY:RULE]", { rule: "dest_resolved", dest: destination });
  return { message: msg, source: "dest_resolved" };
}

/**
 * R3: Texto menciona una ubicación reconocible — preguntar con referencia.
 */
function ruleTextMentionsLocation(userText: string, langName: string): RecoveryResult | null {
  const text = userText.toLowerCase();

  // Intentar extraer menciones de lugares comunes
  const locationPatterns: Array<{ regex: RegExp; label: string }> = [
    { regex: /\b(centro|downtown|centro urbano)\b/i, label: "centro" },
    { regex: /\b(aeropuerto|airport|aeroporto)\b/i, label: "aeropuerto" },
    { regex: /\b(hotel|hoteleria|hospedaje)\b/i, label: "hotel" },
    { regex: /\b(cataratas|falls|cataratas do iguaçu|iguazu falls)\b/i, label: "cataratas" },
    { regex: /\b(terminal|rodoviaria)\b/i, label: "terminal" },
    { regex: /\b(aduana|border|customs|frontera)\b/i, label: "aduana" },
  ];

  const matched = locationPatterns.find((p) => p.regex.test(text));
  if (!matched) return null;

  const locationLabels: Record<string, string> = {
    centro: "el centro",
    aeropuerto: "el aeropuerto",
    hotel: "un hotel",
    cataratas: "las cataratas",
    terminal: "la terminal",
    aduana: "la aduana",
  };

  const label = locationLabels[matched.label] ?? matched.label;
  let msg: string;
  if (langName === "English") {
    msg = `I see you mentioned ${label}. Can you give me more details about the exact location?`;
  } else if (langName === "Portuguese") {
    msg = `Vi que você mencionou ${label}. Pode me dar mais detalhes sobre o local exato?`;
  } else {
    msg = `Veo que mencionaste ${label}. ¿Podés darme más detalles sobre el lugar exacto?`;
  }
  log.info("[BKE_RECOVERY:RULE]", { rule: "text_mentions_location", label: matched.label });
  return { message: msg, source: "text_mentions_location" };
}

// ─── Orquestador ──────────────────────────────────────────────────────────

/**
 * Intenta resolver recuperación contextual usando reglas determinísticas (0 LLM).
 *
 * @returns RecoveryResult si DRL pudo generar un mensaje,
 *          o null si el DRL no aplica (debe escalar a LLM).
 */
export async function resolveRecovery(
  userText: string,
  lang: string,
  session: ChatSessionRow | null,
  facts?: string[],
): Promise<RecoveryResult | null> {
  drlMetrics.attempts++;

  const slots = parseSessionSlots(session);
  const langName = getLangName(lang);

  // Extraer location de facts si está disponible
  const locationFact = facts?.find((f) => f.startsWith("origin:") || f.startsWith("destination:"));
  const mentionedLocation = locationFact?.split(":")[1] ?? null;

  // ── R1: Origen resuelto → preguntar destino contextual ──
  const r1 = ruleOriginResolved(slots.origin ?? mentionedLocation, langName);
  if (r1) { drlMetrics.resolved++; return r1; }

  // ── R2: Destino resuelto → preguntar origen contextual ──
  const r2 = ruleDestResolved(slots.destination ?? mentionedLocation, langName);
  if (r2) { drlMetrics.resolved++; return r2; }

  // ── R3: Texto menciona ubicación reconocible ──
  const r3 = ruleTextMentionsLocation(userText, langName);
  if (r3) { drlMetrics.resolved++; return r3; }

  // ── Ninguna regla aplicó → escalar a LLM ──
  drlMetrics.escalated++;
  log.info("[BKE_RECOVERY:ESCALATE]", {
    userText: userText.slice(0, 80),
    hasOrigin: !!slots.origin,
    hasDest: !!slots.destination,
    hasLocationFact: !!mentionedLocation,
  });
  return null;
}
