// BKE COMPREHENSION RESOLVER — Deterministic reinterpretation (replaces C4 generateReinterpretResponse).
// PR-5C: Reutiliza slot context y session data para generar preguntas aclaratorias sin LLM.
// 0 LLM calls — 100% deterministic rules.
//
// Contrato de salida: compatible con generateReinterpretResponse (string | null).

import { log } from "@/lib/utils/logger";
import { detectLangWithFallback } from "@/lib/detect-lang";
import type { ChatSessionRow } from "@/lib/db/types";

// ─── Resultado (mismo contrato que generateReinterpretResponse) ────────────

export interface ComprehensionResult {
  message: string;
  source: string;
}

// ─── Métricas DRL ─────────────────────────────────────────────────────────

export interface ComprehensionMetrics {
  attempts: number;
  resolved: number;
  escalated: number;
}

let drlMetrics: ComprehensionMetrics = { attempts: 0, resolved: 0, escalated: 0 };

export function getComprehensionDrlMetrics(): ComprehensionMetrics {
  return { ...drlMetrics };
}

export function resetComprehensionDrlMetrics(): void {
  drlMetrics = { attempts: 0, resolved: 0, escalated: 0 };
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function parseSessionSlots(session: ChatSessionRow | null): {
  origin: string | null;
  destination: string | null;
  passengers: string | null;
  scheduledAt: string | null;
} {
  if (!session?.slots) return { origin: null, destination: null, passengers: null, scheduledAt: null };
  try {
    const slots = JSON.parse(session.slots);
    return {
      origin: slots.origin?.value ?? null,
      destination: slots.destination?.value ?? null,
      passengers: slots.passengers?.value ?? null,
      scheduledAt: slots.scheduled_at?.value ?? null,
    };
  } catch {
    return { origin: null, destination: null, passengers: null, scheduledAt: null };
  }
}

function getLangName(userText: string, session: ChatSessionRow | null): string {
  const lang = detectLangWithFallback(userText, session?.lang);
  return lang === "en" ? "English" : lang === "pt" ? "Portuguese" : "Spanish";
}

// ─── Reglas determinísticas ───────────────────────────────────────────────

/**
 * R1: Ambos slots resueltos — generar pregunta de confirmación.
 */
function ruleBothSlotsReady(slots: ReturnType<typeof parseSessionSlots>, langName: string): ComprehensionResult | null {
  if (slots.origin && slots.destination) {
    let msg: string;
    if (langName === "English") {
      msg = `Just to confirm, do you want to go from ${slots.origin} to ${slots.destination}?`;
    } else if (langName === "Portuguese") {
      msg = `Só para confirmar, você quer ir de ${slots.origin} para ${slots.destination}?`;
    } else {
      msg = `Solo para confirmar, ¿querés ir de ${slots.origin} a ${slots.destination}?`;
    }
    log.info("[BKE_COMPREHENSION:RULE]", { rule: "both_slots_ready", origin: slots.origin, dest: slots.destination });
    return { message: msg, source: "both_slots_ready" };
  }
  return null;
}

/**
 * R2: Un slot resuelto — preguntar por el faltante.
 */
function ruleOneSlotReady(slots: ReturnType<typeof parseSessionSlots>, langName: string): ComprehensionResult | null {
  if (slots.origin && !slots.destination) {
    let msg: string;
    if (langName === "English") {
      msg = `I see you're starting from ${slots.origin}. Where do you want to go?`;
    } else if (langName === "Portuguese") {
      msg = `Entendi que você sai de ${slots.origin}. Para onde você quer ir?`;
    } else {
      msg = `Entendí que salís desde ${slots.origin}. ¿A dónde querés ir?`;
    }
    log.info("[BKE_COMPREHENSION:RULE]", { rule: "one_slot_ready_origin", origin: slots.origin });
    return { message: msg, source: "one_slot_ready" };
  }
  if (!slots.origin && slots.destination) {
    let msg: string;
    if (langName === "English") {
      msg = `I understand you want to go to ${slots.destination}. Where are you leaving from?`;
    } else if (langName === "Portuguese") {
      msg = `Entendi que você quer ir para ${slots.destination}. De onde você está saindo?`;
    } else {
      msg = `Entendí que querés ir a ${slots.destination}. ¿Desde dónde salís?`;
    }
    log.info("[BKE_COMPREHENSION:RULE]", { rule: "one_slot_ready_dest", dest: slots.destination });
    return { message: msg, source: "one_slot_ready" };
  }
  return null;
}

/**
 * R3: Sin slots pero el texto menciona lugares conocidos — preguntar con contexto.
 * Detecta palabras clave de ubicación en el texto del usuario.
 */
function ruleLocationMentioned(userText: string, langName: string): ComprehensionResult | null {
  const text = userText.toLowerCase();

  // Palabras clave de lugares conocidos en la triple frontera
  const locationKeywords = [
    "aeropuerto", "airport", "aeroporto",
    "centro", "downtown", "centro urbano",
    "hotel", "cataratas", "iguazú", "iguacu", "iguassu",
    "terminal", "rodoviaria", "aduana",
    "puerto iguazú", "puerto iguazu", "foz", "ciudad del este",
    "igr", "igt", "cde",
  ];

  const found = locationKeywords.some((kw) => text.includes(kw));
  if (!found) return null;

  let msg: string;
  if (langName === "English") {
    msg = "I see you mentioned a location. Could you tell me more details about where you want to go?";
  } else if (langName === "Portuguese") {
    msg = "Vi que você mencionou um lugar. Pode me dar mais detalhes sobre onde quer ir?";
  } else {
    msg = "Veo que mencionaste un lugar. ¿Podés darme más detalles sobre adónde querés ir?";
  }
  log.info("[BKE_COMPREHENSION:RULE]", { rule: "location_mentioned", keywords: found });
  return { message: msg, source: "location_mentioned" };
}

// ─── Orquestador ──────────────────────────────────────────────────────────

/**
 * Intenta resolver reinterpretación usando reglas determinísticas (0 LLM).
 *
 * @returns ComprehensionResult si DRL pudo generar un mensaje,
 *          o null si el DRL no aplica (debe escalar a LLM).
 */
export async function resolveComprehension(
  userText: string,
  session: ChatSessionRow | null,
  _comprehensionScore: number,
): Promise<ComprehensionResult | null> {
  drlMetrics.attempts++;

  const slots = parseSessionSlots(session);
  const langName = getLangName(userText, session);

  // ── R1: Ambos slots resueltos → pregunta de confirmación ──
  const r1 = ruleBothSlotsReady(slots, langName);
  if (r1) { drlMetrics.resolved++; return r1; }

  // ── R2: Un slot resuelto → preguntar por el faltante ──
  const r2 = ruleOneSlotReady(slots, langName);
  if (r2) { drlMetrics.resolved++; return r2; }

  // ── R3: Sin slots pero texto menciona lugares ──
  const r3 = ruleLocationMentioned(userText, langName);
  if (r3) { drlMetrics.resolved++; return r3; }

  // ── Ninguna regla aplicó → escalar a LLM ──
  drlMetrics.escalated++;
  log.info("[BKE_COMPREHENSION:ESCALATE]", {
    userText: userText.slice(0, 80),
    hasOrigin: !!slots.origin,
    hasDest: !!slots.destination,
    score: _comprehensionScore,
  });
  return null;
}
