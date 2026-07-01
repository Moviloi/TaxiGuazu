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

/**
 * Parsea el JSON de confidence de una sesión con type guard.
 * Previene crashes cuando el valor es un string triple-serializado (ej: '"{}"').
 */
export function parseConfidenceJson(json: string | null): Record<string, number> {
  if (!json) return {};
  try {
    const parsed = JSON.parse(json);
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) return {};
    return parsed as Record<string, number>;
  } catch { return {}; }
}
