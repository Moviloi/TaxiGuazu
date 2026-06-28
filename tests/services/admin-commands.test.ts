import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/config/env", () => ({
  getEnv: vi.fn().mockReturnValue({ ADMIN_PHONE: "+54911" }),
}));

vi.mock("@/lib/db/database", () => ({
  getOrCreateConversation: vi.fn().mockResolvedValue({ id: 1 }),
  getConversationByPhone: vi.fn().mockResolvedValue(null),
  insertMessage: vi.fn().mockResolvedValue(undefined),
  getDriverByPhone: vi.fn().mockResolvedValue(null),
  updateDriverShiftIfNull: vi.fn().mockResolvedValue("day"),
}));

vi.mock("@/lib/sender", () => ({
  sendWhatsAppMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/lib/services/dispatch/shift-utils", () => ({
  buildShiftActivationMsg: vi.fn().mockReturnValue("✅ Activado!"),
  buildShiftEndPrompt: vi.fn().mockReturnValue("Recordá finalizar turno con .desactivar"),
}));

vi.mock("@/lib/services/admin/admin-commands", () => ({
  handleAdminCommand: vi.fn().mockResolvedValue(false),
}));

vi.mock("@/lib/services/learning/admin", () => ({
  isAdminCommand: vi.fn().mockReturnValue(false),
  parseAdminCommand: vi.fn().mockReturnValue(null),
  executeAdminCommand: vi.fn().mockResolvedValue({ message: "ok" }),
}));

import { handleAdminCommands } from "@/lib/services/workflow/command-router";
import { getDriverByPhone } from "@/lib/db/database";
import { sendWhatsAppMessage } from "@/lib/sender";
import { handleAdminCommand } from "@/lib/services/admin/admin-commands";
import { isAdminCommand, parseAdminCommand, executeAdminCommand } from "@/lib/services/learning/admin";

describe("handleAdminCommands", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it(".activar with existing driver → activates", async () => {
    vi.mocked(getDriverByPhone).mockResolvedValue({ name: "Carlos", phone: "+54911" } as any);

    const result = await handleAdminCommands("+54911", ".activar", ".activar");

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", expect.stringContaining("✅"));
  });

  it(".activar with NO driver → error message", async () => {
    vi.mocked(getDriverByPhone).mockResolvedValue(null);

    const result = await handleAdminCommands("+54911", ".activar", ".activar");

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", expect.stringContaining("No estás registrado"));
  });

  it(".registrar with existing driver → activates", async () => {
    vi.mocked(getDriverByPhone).mockResolvedValue({ name: "Maria", phone: "+54911" } as any);

    const result = await handleAdminCommands("+54911", ".registrar", ".registrar");

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", expect.stringContaining("✅"));
  });

  it(".registrar with NO driver → error message", async () => {
    vi.mocked(getDriverByPhone).mockResolvedValue(null);

    const result = await handleAdminCommands("+54911", ".registrar", ".registrar");

    expect(result).toBe(true);
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", expect.stringContaining("No estás registrado"));
  });

  it("handles admin command from admin-commands module", async () => {
    vi.mocked(handleAdminCommand).mockResolvedValueOnce(true);

    const result = await handleAdminCommands("+54911", ".ping", ".ping");

    expect(result).toBe(true);
    expect(handleAdminCommand).toHaveBeenCalledWith("+54911", ".ping");
  });

  it("handles admin command from learning/admin module", async () => {
    vi.mocked(handleAdminCommand).mockResolvedValueOnce(false);
    vi.mocked(isAdminCommand).mockReturnValueOnce(true);
    vi.mocked(parseAdminCommand).mockReturnValueOnce({ command: "stats" } as any);

    const result = await handleAdminCommands("+54911", ".stats", ".stats");

    expect(result).toBe(true);
    expect(executeAdminCommand).toHaveBeenCalled();
    expect(sendWhatsAppMessage).toHaveBeenCalledWith("+54911", "ok");
  });

  it("non-command text → returns false", async () => {
    const result = await handleAdminCommands("+54911", "quiero un viaje", "quiero un viaje");

    expect(result).toBe(false);
    expect(sendWhatsAppMessage).not.toHaveBeenCalled();
  });

  it(".activo shorthand → activates driver", async () => {
    vi.mocked(getDriverByPhone).mockResolvedValue({ name: "Luis", phone: "+54911" } as any);

    const result = await handleAdminCommands("+54911", ".activo", ".activo");

    expect(result).toBe(true);
  });
});
