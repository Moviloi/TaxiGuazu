import type { ExtractionContext, TemporalMode } from "./types";
import { log } from "@/lib/utils/logger";

export interface OperationalReadiness {
  allowed: boolean;
  blockedBy: string[];
}

export function canPrepareQuote(extractionCtx?: ExtractionContext): OperationalReadiness {
  const blockedBy: string[] = [];
  if (!extractionCtx) {
    blockedBy.push("no_extraction_context");
    return logAndReturn("PREPARE_QUOTE", blockedBy);
  }
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  if (!origin?.value) blockedBy.push("missing_origin");
  if (!dest?.value) blockedBy.push("missing_destination");
  return logAndReturn("PREPARE_QUOTE", blockedBy);
}

export function canQuote(extractionCtx?: ExtractionContext): OperationalReadiness {
  const blockedBy: string[] = [];
  if (!extractionCtx) {
    blockedBy.push("no_extraction_context");
    return logAndReturn("QUOTE", blockedBy);
  }
  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;
  const passengers = extractionCtx.slots.passengers;

  if (!origin?.value) blockedBy.push("missing_origin");
  else if (origin.status !== "CONFIRMED") blockedBy.push("origin_pending");

  if (!dest?.value) blockedBy.push("missing_destination");
  else if (dest.status !== "CONFIRMED") blockedBy.push("destination_pending");

  if (!passengers?.value) blockedBy.push("missing_passengers");

  return logAndReturn("QUOTE", blockedBy);
}

export function canDispatch(
  extractionCtx?: ExtractionContext,
  temporal?: TemporalMode,
): OperationalReadiness {
  const blockedBy: string[] = [];
  if (!extractionCtx) {
    blockedBy.push("no_extraction_context");
    return logAndReturn("DISPATCH", blockedBy);
  }

  const origin = extractionCtx.slots.origin;
  const dest = extractionCtx.slots.destination;

  if (!origin?.value) blockedBy.push("missing_origin");
  else if (origin.status !== "CONFIRMED") blockedBy.push("origin_pending");

  if (!dest?.value) blockedBy.push("missing_destination");
  else if (dest.status !== "CONFIRMED") blockedBy.push("destination_pending");

  const passengers = extractionCtx.slots.passengers;
  if (!passengers?.value) blockedBy.push("missing_passengers");

  if (temporal !== "NOW") {
    const scheduledAt = extractionCtx.slots.scheduled_at;
    if (!scheduledAt?.value) blockedBy.push("missing_time");
  }

  return logAndReturn("DISPATCH", blockedBy);
}

type ReadinessAction = "PREPARE_QUOTE" | "QUOTE" | "DISPATCH";

function logAndReturn(
  action: ReadinessAction,
  blockedBy: string[],
): OperationalReadiness {
  const allowed = blockedBy.length === 0;
  log.info("[OPERATIONAL_READINESS]", { action, allowed, blockedBy });
  return { allowed, blockedBy };
}
