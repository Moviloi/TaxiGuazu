import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/db/database", () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
  getConversationById: vi.fn().mockResolvedValue({ id: 1, taken_by_human: false, last_message_at: 9999999999 }),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getRecentHistory: vi.fn().mockResolvedValue([]),
  getActiveTripByPhone: vi.fn().mockResolvedValue(null),
  updateTripState: vi.fn().mockResolvedValue(undefined),
  clearConversationHistory: vi.fn().mockResolvedValue(undefined),
  setCustomerName: vi.fn().mockResolvedValue(undefined),
  getCustomerName: vi.fn().mockResolvedValue(null),
  resetChatSession: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/dispatch-workflow", () => ({
  resetToIdle: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/config/constants", () => ({
  SESSION_INACTIVITY_48H_S: 172800,
}));

vi.mock("@/lib/db/state-accessors", () => ({
  getConversationalState: vi.fn().mockResolvedValue("idle"),
  getDispatchState: vi.fn().mockResolvedValue("idle"),
}));

import { handleConversationSetup } from "@/lib/services/workflow/conversation-setup";
import * as stateAccessors from "@/lib/db/state-accessors";

describe("conversation-setup state guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("idle");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("idle");
  });

  it("Caso A: post-dispatch (awaiting_confirmation + closed) permite nueva conversacion", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("closed");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).not.toBeNull();
    expect(result!.conversation.id).toBe(1);
  });

  it("Caso B: trip con oportunidad (idle + closed + null) permite nueva conversacion", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("idle");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("closed");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).not.toBeNull();
    expect(result!.conversation.id).toBe(1);
  });

  it("Caso C: post-asignacion (idle + closed) permite nueva conversacion", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("idle");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("closed");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).not.toBeNull();
    expect(result!.conversation.id).toBe(1);
  });

  it("dispatch activo (waiting_driver) bloquea nuevo setup", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("waiting_driver");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).toBeNull();
  });

  it("dispatch activo (nivel_1) bloquea nuevo setup", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("awaiting_confirmation");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("nivel_1");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).toBeNull();
  });

  it("dispatch activo (nivel_2) bloquea nuevo setup", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("collecting_slots");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("nivel_2");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).toBeNull();
  });

  it("dispatch activo (nivel_3) bloquea nuevo setup", async () => {
    vi.mocked(stateAccessors.getConversationalState).mockResolvedValue("idle");
    vi.mocked(stateAccessors.getDispatchState).mockResolvedValue("nivel_3");
    const result = await handleConversationSetup("549111111", "Hola");
    expect(result).toBeNull();
  });
});
