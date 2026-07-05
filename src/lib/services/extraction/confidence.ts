import type { TripExtraction, ExtractionResult } from "@/lib/ai/extraction-schema";
import { resolveAlias } from "@/lib/db/database";
import { CONFIDENCE_PROCEED, CONFIDENCE_CLARIFY } from "@/config/constants";
import { AMBIGUOUS_LOCATION_TERMS } from "@/lib/ai/patterns";

const CONFIDENCE_AMBIGUOUS = 0.6;

type SlotKey = "origin" | "destination" | "passengers" | "price" | "scheduled_at" | "flight" | "urgency" | "customer_name" | "airport_code";

const RELATIVE_DAY_RE = /\b(hoy|mañana|pasado\s*mañana|esta\s*semana|próximos?\s*días)\b/i;
const AMBIGUOUS_PAX_RE = /\b(varios?|unas?|familia|grupo|compañía|tripulación|gente|personas?)\b/i;

export async function calculateSlotConfidence(
  extractedData: TripExtraction,
  originalMessage: string,
): Promise<ExtractionResult> {
  const slots: Record<string, { value: string | number | null; score: number; reason: string }> = {};

  // ── Passengers ──
  if (extractedData.passengers != null && extractedData.passengers > 0) {
    slots.passengers = { value: extractedData.passengers, score: 1.0, reason: "direct_extraction" };
  } else if (AMBIGUOUS_PAX_RE.test(originalMessage) && extractedData.passengers == null) {
    slots.passengers = { value: null, score: 0.3, reason: "ambiguous_mention_no_number" };
  } else {
    slots.passengers = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Origin ──
  if (extractedData.origin) {
    const aliasResult = await resolveAlias(extractedData.origin);
    if (!aliasResult.resolved) {
      slots.origin = { value: extractedData.origin, score: 0.0, reason: "unknown_location" };
    } else {
      const aliases = aliasResult.names;
      const text = extractedData.origin.toLowerCase();
      const isAmbiguous = AMBIGUOUS_LOCATION_TERMS.some(t => text === t || text.includes(t));
      if (isAmbiguous) {
        slots.origin = { value: aliases[0], score: CONFIDENCE_AMBIGUOUS, reason: "ambiguous_term" };
      } else {
        const exactMatch = aliases.some(a => a.toLowerCase() === text);
        if (exactMatch) {
          slots.origin = { value: extractedData.origin, score: 1.0, reason: "exact_alias_match" };
        } else {
          slots.origin = { value: aliases[0], score: CONFIDENCE_AMBIGUOUS, reason: "fuzzy_alias_match" };
        }
      }
    }
  } else {
    slots.origin = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Destination ──
  if (extractedData.destination) {
    const aliasResult = await resolveAlias(extractedData.destination);
    if (!aliasResult.resolved) {
      slots.destination = { value: extractedData.destination, score: 0.0, reason: "unknown_location" };
    } else {
      const aliases = aliasResult.names;
      const text = extractedData.destination.toLowerCase();
      const isAmbiguous = AMBIGUOUS_LOCATION_TERMS.some(t => text === t || text.includes(t));
      if (isAmbiguous) {
        slots.destination = { value: aliases[0], score: CONFIDENCE_AMBIGUOUS, reason: "ambiguous_term" };
      } else {
        const exactMatch = aliases.some(a => a.toLowerCase() === text);
        if (exactMatch) {
          slots.destination = { value: extractedData.destination, score: 1.0, reason: "exact_alias_match" };
        } else {
          slots.destination = { value: aliases[0], score: CONFIDENCE_AMBIGUOUS, reason: "fuzzy_alias_match" };
        }
      }
    }
  } else {
    slots.destination = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Price ──
  if (extractedData.price != null && extractedData.price > 0) {
    slots.price = { value: extractedData.price, score: 1.0, reason: "direct_extraction" };
  } else {
    slots.price = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Scheduled At (date) ──
  if (extractedData.scheduled_at) {
    const parsed = Date.parse(extractedData.scheduled_at);
    if (!isNaN(parsed)) {
      slots.scheduled_at = { value: extractedData.scheduled_at, score: 1.0, reason: "valid_iso_date" };
    } else {
      slots.scheduled_at = { value: extractedData.scheduled_at, score: CONFIDENCE_AMBIGUOUS, reason: "unparseable_date_format" };
    }
  } else if (RELATIVE_DAY_RE.test(originalMessage)) {
    const computed = computeRelativeDate(originalMessage);
    slots.scheduled_at = { value: computed, score: 0.8, reason: "relative_date_computed" };
  } else {
    slots.scheduled_at = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Flight ──
  if (extractedData.flight) {
    slots.flight = { value: extractedData.flight, score: 1.0, reason: "direct_extraction" };
  } else {
    slots.flight = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Urgency ──
  if (extractedData.urgency) {
    slots.urgency = { value: extractedData.urgency, score: 1.0, reason: "direct_extraction" };
  } else {
    slots.urgency = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Customer Name ──
  if (extractedData.customer_name) {
    slots.customer_name = { value: extractedData.customer_name, score: 1.0, reason: "direct_extraction" };
  } else {
    slots.customer_name = { value: null, score: 0.0, reason: "missing" };
  }

  // ── Airport Code (AIT-060) ──
  // Solo se setea cuando el usuario menciona explícitamente IGR/IGU/AGT.
  // Las inferencias del OI layer (airport-inference.ts) se agregan en pipeline con score < 1.0.
  if (extractedData.airport_code) {
    slots.airport_code = { value: extractedData.airport_code, score: 1.0, reason: "explicit" };
  }

  // ── Determine urgency mode ──
  const urgency = extractedData.urgency || (RELATIVE_DAY_RE.test(originalMessage) ? "programado" : "ahora");
  const isAhora = urgency === "ahora";

  // ── Mandatory fields for action ──
  const mandatoryFields: SlotKey[] = isAhora
    ? ["origin", "destination", "passengers"]
    : ["origin", "destination", "passengers", "scheduled_at"];

  const mandatoryScores = mandatoryFields
    .map(k => slots[k]?.score ?? 0);

  const overallConfidence =
    mandatoryScores.length > 0
      ? mandatoryScores.reduce((a, b) => a + b, 0) / mandatoryScores.length
      : 0;

  // ── Find the lowest-confidence mandatory field ──
  // Priority: ambiguous_term > missing > low-confidence
  let clarifyField: string | undefined;

  if (overallConfidence < CONFIDENCE_PROCEED) {
    const ambiguousField = mandatoryFields.find(k => slots[k]?.reason === "ambiguous_term");
    if (ambiguousField) {
      clarifyField = ambiguousField;
    } else {
      let minScore = Infinity;
      for (const k of mandatoryFields) {
        const s = slots[k]?.score ?? 0;
        if (s < minScore) {
          minScore = s;
          clarifyField = k;
        }
      }
    }
  }

  const action =
    overallConfidence >= CONFIDENCE_PROCEED
      ? "proceed"
      : overallConfidence >= CONFIDENCE_CLARIFY
        ? "clarify"
        : "fallback_regex";

  return {
    slots,
    overall_confidence: Math.round(overallConfidence * 100) / 100,
    action,
    clarify_field: clarifyField,
  };
}

function computeRelativeDate(text: string): string {
  const now = new Date();
  const lower = text.toLowerCase();
  if (/\bpasado\s*mañana\b/.test(lower)) {
    now.setDate(now.getDate() + 2);
  } else if (/\bmañana\b/.test(lower)) {
    now.setDate(now.getDate() + 1);
  }
  // "hoy" — keep as-is
  return now.toISOString().split("T")[0];
}
