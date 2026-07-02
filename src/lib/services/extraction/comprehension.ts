import type { ChatSessionRow } from "@/lib/db/types";
import type { ConfidenceMap, ConversationDomain, RoleLock, SlotStabilityMap } from "@/lib/ai/types";
import { clamp01 } from "@/lib/utils/clamp";
import { getAllDomainPatterns } from "@/lib/config/entity-catalog";
import { buildGenericClarify } from "@/lib/ai/response-builder";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";
import { detectLeadLang } from "@/lib/detect-lang";
import { log } from "@/lib/utils/logger";

export type ComprehensionState = "FULL_CONTROL" | "CLARIFICATION" | "RECOVERY" | "ESCALATION";

export interface ComprehensionProfile {
  requiredSlots: string[];
  slotWeight: number;
  extractionWeight: number;
}

const DOMAIN_PROFILES: Record<string, ComprehensionProfile> = {
  information: { requiredSlots: [], slotWeight: 0.05, extractionWeight: 0.05 },
  commercial: { requiredSlots: ["origin", "destination"], slotWeight: 0.15, extractionWeight: 0.15 },
  reservation: { requiredSlots: ["origin", "destination", "passengers"], slotWeight: 0.20, extractionWeight: 0.15 },
  dispatch: { requiredSlots: ["origin", "destination", "time"], slotWeight: 0.10, extractionWeight: 0.25 },
};

export function getProfile(domain?: ConversationDomain): ComprehensionProfile {
  return DOMAIN_PROFILES[domain ?? "reservation"] ?? DOMAIN_PROFILES.reservation;
}

export interface ComprehensionSignals {
  intentConfidence: number;
  entityConfidence: number;
  slotCompleteness: number;
  extractionConfidence: number;
  conversationStability: number;
}

export interface EffectiveSlots {
  origin: string | null;
  destination: string | null;
}

function buildEffectiveSlots(session: ChatSessionRow | null, roleLock: RoleLock): EffectiveSlots {
  let sessionOrigin: string | null = null;
  let sessionDest: string | null = null;
  if (session?.slots) {
    const s = parseSessionSlots(session.slots);
    sessionOrigin = (s.origin as string) ?? null;
    sessionDest = (s.destination as string) ?? null;
  }
  return {
    origin: sessionOrigin ?? roleLock.origin ?? null,
    destination: sessionDest ?? roleLock.destination ?? null,
  };
}

const ENTITY_SCAN_RE = getAllDomainPatterns().length > 0
  ? new RegExp(getAllDomainPatterns().map((p) => p.source).join("|"), "i")
  : /(?!)/i;

const INTENT_CONFIDENCE_MAP: Record<string, number> = {
  BOOKING: 0.9,
  NOW: 0.9,
  PRE_BOOKING: 0.7,
  COMMERCIAL: 0.7,
  GREETING: 0.6,
  INFORMATIONAL: 0.5,
  CONSULTA: 0.5,
  AMBIGUOUS: 0.3,
};

function scanEntities(text: string): number {
  return ENTITY_SCAN_RE.test(text) ? 0.9 : 0.3;
}

function computeSlotCompleteness(effective: EffectiveSlots, profile: ComprehensionProfile): number {
  if (profile.requiredSlots.length === 0) return 1.0;
  const hasOrigin = !!effective.origin;
  const hasDest = !!effective.destination;
  if (hasOrigin && hasDest) return 1.0;
  if (hasOrigin || hasDest) return 0.6;
  return 0.2;
}

function computeExtractionConfidence(session: ChatSessionRow | null, effective: EffectiveSlots): number {
  if (session?.confidence) {
    const conf = parseConfidenceJson(session.confidence);
    const vals = Object.values(conf).filter((v): v is number => typeof v === "number");
    if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    return 0.5;
  }
  const coreDetected = [effective.origin, effective.destination].filter(Boolean).length;
  if (coreDetected === 2) return 0.7;
  if (coreDetected === 1) return 0.6;
  return 0.5;
}

function computeMandatoryExtractionConfidence(session: ChatSessionRow | null, effective: EffectiveSlots, profile: ComprehensionProfile): number {
  if (profile.requiredSlots.length === 0) return 1.0;
  if (session?.confidence) {
    const conf = parseConfidenceJson(session.confidence);
    const vals = profile.requiredSlots
      .map((k) => conf[k])
      .filter((v): v is number => typeof v === "number");
    if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    return 0.5;
  }
  return computeExtractionConfidence(session, effective);
}

function computeConversationStability(stabilityMap: SlotStabilityMap): number {
  const vals = [stabilityMap.origin, stabilityMap.destination].filter(Boolean);
  if (vals.length === 0) return 0.7;
  const locked = vals.filter((v) => v === "locked").length;
  const ambiguous = vals.filter((v) => v === "ambiguous").length;
  if (ambiguous === vals.length) return 0.5;
  if (ambiguous > 0 && locked > 0) return 0.6;
  if (locked === vals.length) return 1.0;
  if (locked === 0) return 0.5;
  return 0.7;
}

export function buildComprehensionSignals(params: {
  text: string;
  coreIntent: string;
  slotStability: SlotStabilityMap;
  roleLock?: RoleLock;
  session: ChatSessionRow | null;
  confidenceMap?: ConfidenceMap;
  coreConfidence?: number;
  domain?: ConversationDomain;
}): ComprehensionSignals {
  const profile = getProfile(params.domain);
  const intentConfidence = clamp01(
    params.confidenceMap?.intent
    ?? params.coreConfidence
    ?? INTENT_CONFIDENCE_MAP[params.coreIntent]
    ?? 0.3,
  );
  const entityConfidence = clamp01(scanEntities(params.text));
  const effective = buildEffectiveSlots(params.session, params.roleLock ?? { origin: null, destination: null });
  const slotCompleteness = clamp01(computeSlotCompleteness(effective, profile));
  const extractionConfidence = clamp01(computeMandatoryExtractionConfidence(params.session, effective, profile));
  const conversationStability = clamp01(computeConversationStability(params.slotStability));

  return { intentConfidence, entityConfidence, slotCompleteness, extractionConfidence, conversationStability };
}

export function computeComprehensionScore(signals: ComprehensionSignals, domain?: ConversationDomain): number {
  const w = getProfile(domain);
  const remaining = 1.0 - w.slotWeight - w.extractionWeight;
  const baseScale = 0.65;
  const scale = baseScale > 0 ? remaining / baseScale : 1;
  return (
    signals.intentConfidence * 0.30 * scale +
    signals.entityConfidence * 0.25 * scale +
    signals.slotCompleteness * w.slotWeight +
    signals.extractionConfidence * w.extractionWeight +
    signals.conversationStability * 0.10 * scale
  );
}

export function getComprehensionState(score: number, thresholdAdjustment = 0): ComprehensionState {
  const escThreshold = 0.40 + thresholdAdjustment;
  if (score >= 0.85) return "FULL_CONTROL";
  if (score >= 0.65) return "CLARIFICATION";
  if (score >= escThreshold) return "RECOVERY";
  return "ESCALATION";
}

export async function getRecoveryMessage(
  state: ComprehensionState,
  session: ChatSessionRow | null,
  roleLock?: RoleLock,
  text?: string,
  facts?: string[],
): Promise<string> {
  const lang = text ? detectLeadLang(text) : "es";

  // ADR 005: If there's ambiguity, try LLM for contextual recovery first
  if (facts?.includes("location_ambiguous:true") && text) {
    const llmMsg = await generateContextualRecovery(text, lang);
    if (llmMsg) return llmMsg;
  }

  // ADR 005: If there's a location mention in text but no roleLock/slots,
  // the user already provided info — acknowledge it
  if (text && facts?.some(f => f.startsWith("origin:") || f.startsWith("destination:"))) {
    const mentioned = facts.find(f => f.startsWith("origin:") || f.startsWith("destination:"))?.split(":")[1];
    if (mentioned) {
      // User mentioned a place but comprehension is still low — ask with context
      if (lang === "en") return `I see you mentioned "${mentioned}". Where do you need to go?`;
      if (lang === "pt") return `Vi que você mencionou "${mentioned}". Para onde precisa ir?`;
      return `Entendí que mencionaste "${mentioned}". ¿A dónde necesitás ir?`;
    }
  }

  if (state === "CLARIFICATION") {
    // 1) Check current extraction state (roleLock) first
    if (roleLock) {
      const hasOrigin = !!roleLock.origin;
      const hasDest = !!roleLock.destination;
      if (hasOrigin && !hasDest) return buildGenericClarify("destination", lang);
      if (hasDest && !hasOrigin) return buildGenericClarify("origin", lang);
    }

    // 2) Fall back to persisted session slots
    if (session?.slots) {
      const slots = parseSessionSlots(session.slots);
      if (!slots.origin) return buildGenericClarify("origin", lang);
      if (!slots.destination) return buildGenericClarify("destination", lang);
    }

    // 3) Generic fallback
    return buildGenericClarify(null, lang);
  }

  return buildGenericClarify(null, lang);
}

// ── AI-FIRST: contextual recovery via LLM (ADR 005) ──────────────────────
// P5: Ahora usa LLMProvider (Gemini por defecto, Groq fallback)

async function generateContextualRecovery(userText: string, _lang: string): Promise<string | null> {
  try {
    const { getLLMProvider } = await import("@/lib/ai/llm-provider");
    const provider = getLLMProvider();

    const prompt = [
      `Sos Cris, asistente de TaxiGuazú.`,
      `El usuario escribió: "${userText}"`,
      ``,
      `El sistema no entendió completamente el mensaje y necesita pedir aclaración.`,
      `Redactá UNA SOLA PREGUNTA breve que demuestre que entendiste algo de lo que dijo el usuario.`,
      `No seas genérico — referenciá específicamente lo que mencionó.`,
      ``,
      `Ejemplo bueno: "Entendí que tu viaje es desde el centro. ¿De qué lugar exacto salís?"`,
      `Ejemplo malo: "¿Desde dónde salís?" (demasiado genérico, ignora lo que dijo el usuario)`,
      ``,
      `Respondé EN EL MISMO IDIOMA que el usuario. Máximo 2 líneas.`,
      `No inventes datos. No agregues opciones numeradas.`,
    ].join("\n");

    return await provider.generateResponse(prompt, 80, 0.3);
  } catch (e) {
    log.warn("[RECOVERY_LLM]", e instanceof Error ? e.message : String(e));
    return null;
  }
}


