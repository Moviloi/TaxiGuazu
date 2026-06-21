import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetChatSession = vi.fn();

vi.mock("@/lib/db/database", () => ({
  getChatSession: (...args: any[]) => mockGetChatSession(...args),
}));

import { loadPreviousSlots } from "@/lib/services/workflow/load-previous-slots";

function makeSession(updatedAt: number, slots: Record<string, string> | null) {
  return { phone: "+549111", updated_at: updatedAt, slots: slots ? JSON.stringify(slots) : null } as any;
}

const NOW = Math.floor(Date.now() / 1000);

beforeEach(() => {
  vi.clearAllMocks();
});

describe("loadPreviousSlots — context slot timeout", () => {
  it("slot reciente (dentro del timeout) → merge permitido", async () => {
    mockGetChatSession.mockResolvedValue(makeSession(NOW - 300, { origin: "hotel", destination: "aeropuerto" }));
    const result = await loadPreviousSlots("+549111");
    expect(result).toEqual({ origin: "hotel", destination: "aeropuerto" });
  });

  it("slot viejo (fuera del timeout) → no merge", async () => {
    mockGetChatSession.mockResolvedValue(makeSession(NOW - 7200, { origin: "hotel", destination: null as any }));
    const result = await loadPreviousSlots("+549111");
    expect(result).toEqual({});
  });

  it("nuevo mensaje con datos completos → no usa contexto viejo (session fresca, slots retornados)", async () => {
    mockGetChatSession.mockResolvedValue(makeSession(NOW - 60, { origin: "hotel", destination: "centro" }));
    const result = await loadPreviousSlots("+549111");
    expect(result).toEqual({ origin: "hotel", destination: "centro" });
  });

  it("session sin slots → retorna vacío", async () => {
    mockGetChatSession.mockResolvedValue(makeSession(NOW, null));
    const result = await loadPreviousSlots("+549111");
    expect(result).toEqual({});
  });

  it("session sin updated_at → retorna slots (defensa)", async () => {
    mockGetChatSession.mockResolvedValue({ phone: "+549111", updated_at: null, slots: JSON.stringify({ origin: "hotel" }) });
    const result = await loadPreviousSlots("+549111");
    expect(result).toEqual({ origin: "hotel" });
  });
});
