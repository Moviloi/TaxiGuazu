import { log } from "@/lib/utils/logger";

export function parseSessionSlots(slotsJson: string | null): Record<string, unknown> {
  if (!slotsJson) return {};
  try {
    const parsed = JSON.parse(slotsJson);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      log.error("[SLOT_TYPE_GUARD] parseSessionSlots: JSON.parse returned non-object", { type: typeof parsed, value: String(parsed).substring(0, 80) });
      return {};
    }
    return parsed as Record<string, unknown>;
  } catch {
    return {};
  }
}
