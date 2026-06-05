import type { ChatSessionRow } from "@/lib/db/types";
import type { RoleLock, SlotStabilityMap } from "@/lib/ai/types";
import { clamp01 } from "@/lib/utils/clamp";
import { getAllDomainPatterns } from "@/lib/config/entity-catalog";

export type F4State = "FULL_CONTROL" | "CLARIFICATION" | "RECOVERY" | "ESCALATION";

export interface F4Signals {
  intentConfidence: number;
  entityConfidence: number;
  slotCompleteness: number;
  extractionConfidence: number;
  conversationStability: number;
}

export interface F4Result {
  score: number;
  state: F4State;
  signals: F4Signals;
}

export interface EffectiveSlots {
  origin: string | null;
  destination: string | null;
}

export function buildEffectiveSlots(session: ChatSessionRow | null, roleLock: RoleLock): EffectiveSlots {
  let sessionOrigin: string | null = null;
  let sessionDest: string | null = null;
  if (session?.slots) {
    try {
      const s = JSON.parse(session.slots);
      sessionOrigin = s.origin ?? null;
      sessionDest = s.destination ?? null;
    } catch {}
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
  AMBIGUOUS: 0.3,
};

function scanEntities(text: string): number {
  return ENTITY_SCAN_RE.test(text) ? 0.9 : 0.3;
}

function computeSlotCompleteness(effective: EffectiveSlots): number {
  const hasOrigin = !!effective.origin;
  const hasDest = !!effective.destination;
  if (hasOrigin && hasDest) return 1.0;
  if (hasOrigin || hasDest) return 0.6;
  return 0.2;
}

function computeExtractionConfidence(session: ChatSessionRow | null, effective: EffectiveSlots): number {
  if (session?.confidence) {
    try {
      const conf = JSON.parse(session.confidence);
      const vals = Object.values(conf).filter((v): v is number => typeof v === "number");
      if (vals.length > 0) return vals.reduce((a, b) => a + b, 0) / vals.length;
    } catch {}
    return 0.5;
  }
  const coreDetected = [effective.origin, effective.destination].filter(Boolean).length;
  if (coreDetected === 2) return 0.7;
  if (coreDetected === 1) return 0.6;
  return 0.5;
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

export function buildF4Signals(params: {
  text: string;
  coreIntent: string;
  slotStability: SlotStabilityMap;
  roleLock?: RoleLock;
  session: ChatSessionRow | null;
}): F4Signals {
  const intentConfidence = clamp01(INTENT_CONFIDENCE_MAP[params.coreIntent] ?? 0.3);
  const entityConfidence = clamp01(scanEntities(params.text));
  const effective = buildEffectiveSlots(params.session, params.roleLock ?? { origin: null, destination: null });
  const slotCompleteness = clamp01(computeSlotCompleteness(effective));
  const extractionConfidence = clamp01(computeExtractionConfidence(params.session, effective));
  const conversationStability = clamp01(computeConversationStability(params.slotStability));

  return { intentConfidence, entityConfidence, slotCompleteness, extractionConfidence, conversationStability };
}

export function computeComprehensionScore(signals: F4Signals): number {
  return (
    signals.intentConfidence * 0.30 +
    signals.entityConfidence * 0.25 +
    signals.slotCompleteness * 0.20 +
    signals.extractionConfidence * 0.15 +
    signals.conversationStability * 0.10
  );
}

export function getF4State(score: number, thresholdAdjustment = 0): F4State {
  const escThreshold = 0.40 + thresholdAdjustment;
  if (score >= 0.85) return "FULL_CONTROL";
  if (score >= 0.65) return "CLARIFICATION";
  if (score >= escThreshold) return "RECOVERY";
  return "ESCALATION";
}

export function getF4RecoveryMessage(state: F4State, session: ChatSessionRow | null): string {
  if (state === "CLARIFICATION") {
    if (session?.slots) {
      try {
        const slots = JSON.parse(session.slots);
        if (!slots.origin) return "¿Desde qué lugar salís?";
        if (!slots.destination) return "¿A dónde necesitás ir?";
      } catch {}
    }
    return "¿Podrías repetir tu consulta?";
  }
  return "Necesito confirmar origen y destino para continuar.";
}
