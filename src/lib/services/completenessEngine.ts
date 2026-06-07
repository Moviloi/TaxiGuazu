// Completeness Engine — single gate that decides what slot is missing
// and what to ask the user. No inference, no LLM, no pricing, no zones.
//
// Rule (absolute):
//   if origin  == null → ASK_ORIGIN
//   if dest    == null → ASK_DESTINATION
//   otherwise          → COMPLETE

export interface CompletenessResult {
  status: "ASK" | "COMPLETE";
  field?: "origin" | "destination";
  message: string;
}

export function evaluateCompleteness(slots: Record<string, any> | null | undefined): CompletenessResult {
  const origin = slots?.origin;
  const destination = slots?.destination;

  const hasOrigin = origin != null && String(origin).trim() !== "";
  const hasDestination = destination != null && String(destination).trim() !== "";

  if (!hasOrigin) {
    return {
      status: "ASK",
      field: "origin",
      message: "¿Desde dónde salís?",
    };
  }

  if (!hasDestination) {
    return {
      status: "ASK",
      field: "destination",
      message: "¿A dónde necesitás ir?",
    };
  }

  return { status: "COMPLETE", message: "" };
}

export type BookingCompletenessStatus = "MISSING_ROUTE" | "MISSING_DATETIME" | "COMPLETE";

export interface BookingCompletenessResult {
  status: BookingCompletenessStatus;
  message: string;
}

function readSlotValue(raw: unknown): string | null {
  if (raw == null) return null;
  if (typeof raw === "object" && raw !== null) {
    const obj = raw as Record<string, unknown>;
    return obj.value != null ? String(obj.value).trim() : null;
  }
  return String(raw).trim();
}

export function evaluateBookingCompleteness(slots: Record<string, any> | null | undefined): BookingCompletenessResult {
  const origin = slots ? readSlotValue(slots.origin) : null;
  const destination = slots ? readSlotValue(slots.destination) : null;
  const scheduledAt = slots ? readSlotValue(slots.scheduled_at) : null;

  if (!origin || !destination) {
    return { status: "MISSING_ROUTE", message: "Falta indicar origen o destino." };
  }

  if (!scheduledAt) {
    return { status: "MISSING_DATETIME", message: "¿Para qué fecha y hora necesitás el traslado?" };
  }

  return { status: "COMPLETE", message: "" };
}
