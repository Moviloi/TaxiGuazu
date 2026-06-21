import type { ConversationDomain } from "@/lib/ai/types";

export interface CompletenessResult {
  status: "ASK" | "COMPLETE";
  field?: "origin" | "destination";
}

export function evaluateCompleteness(
  slots: Record<string, any> | null | undefined,
  domain?: ConversationDomain,
): CompletenessResult {
  if (domain === "information") {
    return { status: "COMPLETE" };
  }

  const origin = slots?.origin;
  const destination = slots?.destination;

  const hasOrigin = origin != null && String(origin).trim() !== "";
  const hasDestination = destination != null && String(destination).trim() !== "";

  if (!hasOrigin) {
    return { status: "ASK", field: "origin" };
  }

  if (!hasDestination) {
    return { status: "ASK", field: "destination" };
  }

  return { status: "COMPLETE" };
}
