import { getChatSession } from "@/lib/db/database";
import { CONTEXT_SLOT_TIMEOUT_S } from "@/config/constants";

export async function loadPreviousSlots(phone: string): Promise<Record<string, string>> {
  try {
    const session = await getChatSession(phone);
    if (!session?.slots) return {};
    const now = Math.floor(Date.now() / 1000);
    const sessionAge = session.updated_at ? now - session.updated_at : 0;
    if (sessionAge > CONTEXT_SLOT_TIMEOUT_S) return {};
    const parsed = JSON.parse(session.slots);
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
