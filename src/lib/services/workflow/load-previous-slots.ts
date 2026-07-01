import { getChatSession } from "@/lib/db/database";
import { CONTEXT_SLOT_TIMEOUT_S } from "@/config/constants";
import type { SlotStateEntry } from "@/lib/ai/slot-state";
import { parseSessionSlots, parseConfidenceJson } from "@/lib/services/shared/session-helpers";

export async function loadPreviousSlots(phone: string): Promise<Record<string, string>> {
  try {
    const session = await getChatSession(phone);
    if (!session?.slots) return {};
    const now = Math.floor(Date.now() / 1000);
    const sessionAge = session.updated_at ? now - session.updated_at : 0;
    if (sessionAge > CONTEXT_SLOT_TIMEOUT_S) return {};
    const parsed = parseSessionSlots(session.slots);
    if (!parsed || typeof parsed !== "object") return {};
    const result: Record<string, string> = {};
    for (const [k, v] of Object.entries(parsed)) {
      if (v != null && String(v).trim() !== "") {
        result[k] = String(v);
      }
    }
    return result;
  } catch {
    return {};
  }
}

export async function loadPreviousSlotStates(phone: string): Promise<Record<string, SlotStateEntry> | null> {
  try {
    const session = await getChatSession(phone);
    if (!session) return null;
    const now = Math.floor(Date.now() / 1000);
    const sessionAge = session.updated_at ? now - session.updated_at : 0;
    if (sessionAge > CONTEXT_SLOT_TIMEOUT_S) return null;

    // Try modern slot_states first
    if (session.slot_states) {
      try {
        const parsed = JSON.parse(session.slot_states);
        if (parsed && typeof parsed === "object") return parsed as Record<string, SlotStateEntry>;
      } catch { /* fall through to backward compat */ }
    }

    // Backward compat: reconstruct from slots + confidence
    if (!session.slots) return null;
    let slots: Record<string, any>;
    slots = parseSessionSlots(session.slots);
    if (Object.keys(slots).length === 0) return null;
    if (!slots || typeof slots !== "object") return null;

    let confidence: Record<string, number> = {};
    if (session.confidence) {
      confidence = parseConfidenceJson(session.confidence);
    }

    const result: Record<string, SlotStateEntry> = {};
    for (const [k, v] of Object.entries(slots)) {
      if (v == null || String(v).trim() === "") continue;
      const score = confidence[k] ?? 0;
      const status = score >= 1.0 ? "CONFIRMED" : score > 0 ? "INFERRED" : "RAW";
      result[k] = { value: String(v), source: "SYSTEM_INFERRED", status };
    }
    return result;
  } catch {
    return null;
  }
}
