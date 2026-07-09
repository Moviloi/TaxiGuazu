// Slot Extraction Pipeline — three-layer hybrid extractor.
// order of operations:
//   1. regexExtractor  (deterministic, no LLM)
//   2. entityExtractor (known location lookup)
//   3. LLM fallback    (generateGroqExtraction, only if 1+2 produce nothing)
//
// If regex or entity produces at least one slot (origin OR destination),
// the pipeline returns immediately — no LLM call.

import { regexExtractSlots } from "./regex-extractor";
import { entityExtractSlots } from "./entity-extractor";
import { generateGroqExtraction } from "@/lib/ai/groq";
import type { ExtractionContext } from "@/lib/ai/extraction-prompt";
import type { MessageClassification } from "@/lib/ai/conversation-interpreter";
import { log } from "@/lib/utils/logger";

interface Message {
  role: string;
  content: string;
  created_at: number;
}

// Detecta indicadores de multi-ride en el texto.
// Si el usuario describe múltiples viajes, regex/entity no pueden capturar legs
// y cortocircuitarían al LLM sin la información de multi-ride.
function hasMultiRideIndicators(text: string): boolean {
  const indicators = [
    /\bRide\s+\d\b/i,
    /\bLeg\s+\d\b/i,
    /\bTrip\s+\d\b/i,
    /\bViaje\s+\d\b/i,
    /\bTramo\s+\d\b/i,
    /(?:primero|first).+(?:luego|despu[eé]s|then|second)/i,
    /(?:pick up|recoger|buscar).+(?:drop off|dejar|deixar).+(?:pick up|recoger|buscar)/i,
  ];
  return indicators.some((re) => re.test(text));
}

export async function extractSlots(
  text: string,
  history: Message[],
  customerName?: string,
  extractionContext?: ExtractionContext,
  classification?: MessageClassification,
): Promise<Record<string, any> | null> {
  if (hasMultiRideIndicators(text)) {
    log.info("[EXTRACT] multi-ride indicators detected — skipping regex/entity, calling LLM directly");
    return generateGroqExtraction(text, history, customerName, extractionContext);
  }

  // 1. Try regex extractor (deterministic, no LLM)
  const regexResult = regexExtractSlots(text);
  const regexFull = regexResult && regexResult.origin && regexResult.destination;
  if (regexFull) {
    log.info("[EXTRACT] regex full match — both origin and destination found, returning early");
    return regexResult;
  }
  if (regexResult && (regexResult.origin || regexResult.destination)) {
    log.info("[EXTRACT] regex partial match — continuing to LLM to fill missing slots", regexResult);
  }

  // 2. Try entity extractor (known locations + DB aliases + fuzzy matching)
  // Only return early if entity found BOTH mandatory slots
  const entityResult = await entityExtractSlots(text, classification);
  const entityFull = entityResult && entityResult.origin && entityResult.destination;
  if (entityFull) {
    log.info("[EXTRACT] entity full match — both origin and destination found, returning early");
    return entityResult;
  }
  if (entityResult && (entityResult.origin || entityResult.destination)) {
    log.info("[EXTRACT] entity partial match — continuing to LLM", entityResult);
  }

  // 3. LLM fallback (when regex and entity couldn't find both slots)
  //    This catches partial matches too: e.g., regex found origin but LLM can find destination
  log.info("[EXTRACT] calling LLM to complete extraction", {
    regexPartials: !!regexResult,
    entityPartials: !!entityResult,
  });
  return generateGroqExtraction(text, history, customerName, extractionContext);
}
