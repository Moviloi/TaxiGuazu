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
import { log } from "@/lib/utils/logger";

interface Message {
  role: string;
  content: string;
  created_at: number;
}

export async function extractSlots(
  text: string,
  history: Message[],
  customerName?: string,
  extractionContext?: ExtractionContext,
): Promise<Record<string, any> | null> {
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

  // 2. Try entity extractor (known locations, no LLM)
  // Only return early if entity found BOTH mandatory slots
  const entityResult = entityExtractSlots(text);
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
