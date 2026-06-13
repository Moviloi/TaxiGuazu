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
  if (regexResult && (regexResult.origin || regexResult.destination)) {
    log.info("[EXTRACT] regex match", { origin: regexResult.origin, destination: regexResult.destination });
    return regexResult;
  }

  // 2. Try entity extractor (known locations, no LLM)
  const entityResult = entityExtractSlots(text);
  if (entityResult && (entityResult.origin || entityResult.destination)) {
    log.info("[EXTRACT] entity match", { origin: entityResult.origin, destination: entityResult.destination });
    return entityResult;
  }

  // 3. LLM fallback (only if regex and entity both produced nothing)
  log.info("[EXTRACT] LLM fallback");
  return generateGroqExtraction(text, history, customerName, extractionContext);
}
