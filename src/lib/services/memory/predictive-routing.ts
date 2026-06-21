import type { ComprehensionSignals } from "@/lib/services/extraction/comprehension";
import type { Memory, SessionMemory } from "@/lib/services/memory/memory";
import { clamp01 } from "@/lib/utils/clamp";
import { getAllEntityKeys } from "@/lib/config/entity-catalog";

export interface EntityPrediction {
  candidates: string[];
  confidence: number;
}

export interface IntentPrediction {
  predictedIntent: string;
  confidence: number;
}

export interface PredictedContext {
  entityPrediction: EntityPrediction;
  intentPrediction: IntentPrediction;
  entityBias: string[];
}

const KNOWN_ENTITY_PREFIXES: Record<string, string[]> = {
  raf: ["rafain"],
  mad: ["madero show"],
  ita: ["itaipu", "itaipú by night"],
  cat: ["cataratas"],
  aer: ["aeropuerto", "aeroparque"],
  par: ["parque das aves"],
};

function prefixMatch(text: string): string[] {
  const lower = text.toLowerCase().trim();
  const words = lower.split(/\s+/);
  const candidates: string[] = [];
  for (const word of words) {
    for (const [prefix, entities] of Object.entries(KNOWN_ENTITY_PREFIXES)) {
      if (word.startsWith(prefix) && word.length > prefix.length) {
        candidates.push(...entities);
      }
    }
  }
  return candidates;
}

function exactEntityMatch(text: string): string[] {
  return getAllEntityKeys().filter((e) => text.toLowerCase().includes(e));
}

export function predictEntity(text: string, _memory: Memory): EntityPrediction {
  const exact = exactEntityMatch(text);
  const prefixed = prefixMatch(text);
  const all = [...new Set([...exact, ...prefixed])];

  if (all.length > 0) return { candidates: all, confidence: 0.85 };

  const fromBias = _memory.sessionMemory.lastEntities;
  if (fromBias.length > 0) return { candidates: fromBias, confidence: 0.55 };

  return { candidates: [], confidence: 0 };
}

export function predictIntent(text: string, coreIntent: string, memory: Memory): IntentPrediction {
  const prediction = predictEntity(text, memory);

  if (prediction.confidence >= 0.85) {
    const isShowEntity = prediction.candidates.some(
      (c) => memory.semanticMemory.entityAssociations[c]?.some((a) => a.includes("show"))
    );
    if (isShowEntity) return { predictedIntent: "BOOKING", confidence: 0.82 };
    return { predictedIntent: coreIntent, confidence: 0.75 };
  }

  if (memory.sessionMemory.lastIntent && memory.sessionMemory.lastIntent !== "GREETING") {
    return { predictedIntent: memory.sessionMemory.lastIntent, confidence: 0.60 };
  }

  return { predictedIntent: coreIntent, confidence: 0.50 };
}

export interface EnrichedComprehensionSignals extends ComprehensionSignals {
  predictionBoost: number;
}

export function enrichComprehensionSignals(
  signals: ComprehensionSignals,
  entityPrediction: EntityPrediction,
  intentPrediction: IntentPrediction,
): EnrichedComprehensionSignals {
  let intentBoost = 0;
  let entityBoost = 0;

  if (intentPrediction.confidence >= 0.6) {
    intentBoost = (signals.intentConfidence < 0.9)
      ? Math.min(0.15, (1 - signals.intentConfidence) * 0.3)
      : 0;
  }

  if (entityPrediction.confidence >= 0.55) {
    entityBoost = (signals.entityConfidence < 0.9)
      ? Math.min(0.20, (1 - signals.entityConfidence) * 0.4)
      : 0;
  }

  const predictionBoost = clamp01(intentBoost * 0.30 + entityBoost * 0.25);

  return {
    intentConfidence: clamp01(signals.intentConfidence + intentBoost),
    entityConfidence: clamp01(signals.entityConfidence + entityBoost),
    slotCompleteness: clamp01(signals.slotCompleteness),
    extractionConfidence: clamp01(signals.extractionConfidence),
    conversationStability: clamp01(signals.conversationStability),
    predictionBoost,
  };
}

export function computeMemoryBoost(sessionMemory: SessionMemory, entityMatches: string[]): number {
  if (entityMatches.length === 0) return 0;
  const repeated = entityMatches.filter((e) => sessionMemory.lastEntities.includes(e));
  if (repeated.length > 0) return 0.20;
  return 0.10;
}

export function buildPredictedContext(text: string, coreIntent: string, memory: Memory): PredictedContext {
  const entityPrediction = predictEntity(text, memory);
  const intentPrediction = predictIntent(text, coreIntent, memory);
  const entityBias = [...new Set([
    ...entityPrediction.candidates,
    ...memory.sessionMemory.lastEntities,
  ])];

  return { entityPrediction, intentPrediction, entityBias };
}
