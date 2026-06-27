export function parseSessionSlots(slotsJson: string | null): Record<string, unknown> {
  if (!slotsJson) return {};
  try {
    return JSON.parse(slotsJson);
  } catch {
    return {};
  }
}
